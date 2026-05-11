# TRD: Board Game Rental Pricing

## Problem Statement

The cafe rents board games under three pricing modes:

1. **Hourly** — stepped tier table priced per person (1h → 15K, 1.5h → 20K, 2h → 30K, ...). Duration is rounded **up** into the next tier; the largest tier acts as the cap.
2. **All Day Weekday** — flat Rp. 50,000 per person.
3. **All Day Weekend** — flat Rp. 60,000 per person.

The current system cannot represent any of this:

- `variants.price` is a single flat number — no notion of "by hour", "by tier", or "by day".
- `RentalUsecase.CheckoutRentals()` (`apps/api/domain/rental_usecase.go:107-128`) hardcodes `MAX_HOUR := 6.0`, multiplies the variant price by rounded hours, and contains a `// TODO: set these from DB` comment.
- A `Rental` row records only `variant_id` + check-in timestamp — no pricing context.
- There is no admin screen for any pricing parameter.

The owner needs to **add, edit, and price-change all pricing from the admin UI** — both rental rates and purchase prices — without engineering involvement.

This TRD also takes the opportunity to **unify pricing across the whole catalog**: today, purchase variants and rental variants live in two parallel worlds (`variants.price` vs. nothing). A single `PricingScheme` model covers both — flat for purchases and All-Day rentals, tiered for Hourly rentals.

---

## Context: Existing System

- **Backend**: Go REST API with MySQL + GORM, Clean Architecture (`domain → data → presentation`). Migrations in `apps/api/migrations/` via `golang-migrate`.
- **Frontend**: Next.js web (`apps/web/`) and React Native mobile (`apps/mobile/`) sharing a Tamagui UI library. React Query for server state, Zod for validation.
- **API contract**: OpenAPI at `libs/api-contract/src/api.yaml`, codegen consumed by both frontends.
- **Rental domain today** (`apps/api/domain/`):
  - `rental_entity.go` — `Rental { Id, Code, Name, VariantId, CheckinAt, CheckoutAt, ... }`
  - `rental_usecase.go` — `CheckinRentals`, `CheckoutRentals`, `GetRentalList`, `DeleteRentalById`
  - `variant_entity.go` — `Variant { Id, ProductId, Name, Price, ... }`
  - `product_entity.go` — `Product { ..., SaleType: "purchase" | "rental" }`
- **Rental DB** (`apps/api/migrations/000001_initial_schema.up.sql:258`):
  ```
  rentals(id, code, name, variant_id, checkin_at, checkout_at, created_at, deleted_at)
  ```
- **Frontend rental flow**: `apps/web/src/pages/rentals/{index,checkin,checkout}.tsx`.
- **Auth**: JWT, no RBAC.

### Key Architectural Decisions (Per Design Review)

1. **One rental row = one person.** A group of three players is three rental rows, each with its own check-in/check-out and snapshot.
2. **Every variant has exactly one pricing scheme.** A single `pricing_scheme_id` FK on `variants` replaces the existing `variants.price` column. Purchase variants use `flat`; rental variants use `flat` or `tiered`.
3. **Pricing scheme is its own entity** (`pricing_schemes` + child `pricing_scheme_tiers`), 1:1 with the variant. The scheme has no name — the parent variant supplies the display name.
4. **Snapshot on the rental row, not an FK.** The rental copies the scheme's parameters at check-in. The `variant_id` already lets you join back for reporting.

---

## Proposed Solution: Unified Pricing Schemes

### Feature Overview

Introduce a `PricingScheme` entity owned **1:1 by every variant**. Each scheme is either:

- **`tiered`** — an ordered list of `(up_to_minutes, price_per_person)` tiers. Duration is rounded up to the first tier whose `up_to_minutes ≥ duration_minutes`; if duration exceeds every tier, the last tier's price is the cap. **Only allowed for rental variants.**
- **`flat`** — a single `price_per_person` (or, for purchase variants, simply `price_per_unit`), regardless of duration. Allowed for both purchase and rental variants.

Admin manages schemes inside the variant create/edit form. At check-in, the chosen variant's scheme is **snapshotted onto the rental row**, so later edits don't affect already-running rentals. For purchase transactions, the scheme's flat price is read at sale time and recorded in the existing `transaction_items.price` column (no separate snapshot mechanism needed — that column already serves as the historical record).

### Core Concepts

| Concept | Description |
|---|---|
| **Pricing Scheme** | A pricing configuration attached 1:1 to a variant. Has a `pricing_type` and type-specific data. No name — the parent variant supplies it. |
| **Pricing Type** | Enum: `tiered` or `flat`. Immutable after create. |
| **Pricing Tier** | For `tiered` schemes: a row with `up_to_minutes` and `price_per_person`. Tiers are evaluated in ascending order. |
| **Rental Pricing Snapshot** | A frozen copy of the scheme (and its tiers, if any) stored on the `rental` row at check-in. The check-out calculator reads only from the snapshot. |

### Why Unify Purchase + Rental Pricing?

- **One mental model** for staff and admin: every product/variant has "a pricing scheme", regardless of how it's sold.
- **One UI surface**: the variant form always has a "Pricing" section; the conditional is `pricing_type`, not `sale_type`.
- **Removes the dead `variants.price` column** that's currently authoritative for purchase but ignored for rental.
- **Future-proof**: if purchase ever wants tiered/quantity-discount pricing, the schema is already there (would extend tier semantics, not add a new mechanism).

### Why Snapshot on the Rental?

A customer checks in at 7pm under the Hourly variant (1.5h → 20K). At 8pm the admin raises the 1.5h tier to 22K. The customer checks out at 8:30pm. They must be billed **20K** — the rate they agreed to. Snapshot survives later admin edits, soft-deletes, and even scheme replacement.

Purchase transactions don't need a separate snapshot because `transaction_items.price` already records the per-unit price at sale time.

---

## Feature Requirements

### FR-1: Every Variant Has a Pricing Scheme

- Add `pricing_scheme_id BIGINT NOT NULL` to `variants` (after backfill — see migration plan).
- Drop the legacy `variants.price` column.
- A `purchase`-type variant **must** use `pricing_type='flat'`.
- A `rental`-type variant may use `pricing_type='flat'` (e.g., All Day) or `'tiered'` (e.g., Hourly).
- Validation lives in the variant create/update usecase. The DB only enforces the FK.

### FR-2: Pricing Scheme Management

The system shall allow users to create, view, edit, and soft-delete pricing schemes through the variant edit form. (There is no standalone `/pricing-schemes` page — schemes are managed inside the variant they belong to.)

**A scheme consists of:**
- **Pricing Type** (required, immutable after create): `tiered` or `flat`
- **Description** (optional)
- For **`tiered`**: an ordered list of tiers `{ up_to_minutes, price_per_person }`, at least one tier required, `up_to_minutes` strictly ascending.
- For **`flat`**: `flat_price` (> 0).

**Rules:**
- `pricing_type` cannot change after create. To switch types, the admin replaces the variant's scheme via "create a new variant" (preserves history of any past sales/rentals).
- `tiered` is rejected for purchase variants at the usecase layer.
- Soft-delete only.
- The seed migration creates a `flat` scheme for every existing variant, copying `variants.price` into `flat_price`. Then the migration drops `variants.price`.

### FR-3: Check-in Snapshots the Scheme (Rental Only)

The check-in screen and `POST /rentals/checkin` shall accept one rental per person. The existing payload shape is unchanged — staff who serve a group of 3 submit 3 rental items.

On insert, the server:
1. Loads `variant.pricing_scheme` (with tiers).
2. Snapshots onto the rental row:
   - `snapshot_pricing_type` (`tiered` | `flat`)
   - `snapshot_flat_price` (nullable; only for `flat`)
   - `snapshot_tiers_json` (nullable; only for `tiered`) — JSON array of `[{up_to_minutes, price_per_person}]` ascending

The snapshot is the **sole source of truth** for billing. The scheme id is intentionally **not** stored on the rental.

### FR-4: Check-out Computes Price From Snapshot

`POST /rentals/checkout` shall replace the current ad-hoc math with a `PricingCalculator` that switches on `snapshot_pricing_type`:

**`tiered`:**
```
duration_minutes = ceil((checkout_at - checkin_at) in minutes)
tiers            = parse(snapshot_tiers_json)        // ascending by up_to_minutes
match            = first tier where tier.up_to_minutes >= duration_minutes
                   or, if none match, the last tier   // largest tier acts as cap
price            = match.price_per_person
```

**`flat`:**
```
price = snapshot_flat_price
```

The resulting `TransactionItem` has `Amount = 1`, `Price = price`, `Subtotal = price`. Each rental row produces exactly one transaction item.

### FR-5: Purchase Pricing Read-Through

Purchase transactions (today's flow that reads `variants.price`) shall instead read `variant.pricing_scheme.flat_price`. The usecase pre-loads the scheme on every variant fetch.

`transaction_items.price` continues to record the per-unit price at sale time (unchanged column, unchanged semantics) — that's the historical snapshot for purchase.

### FR-6: Worked Examples (Acceptance Tests)

Using the seeded "Hourly" scheme with tiers `{60→15K, 90→20K, 120→30K, 180→45K, 240→60K, 300→75K, 360→90K}`:

| # | Variant / Scheme | Duration | People | Rentals Created | Expected Total | Per-rental Math |
|---|---|---|---:|---:|---:|---|
| 1 | Hourly | 2h 0m | 1 | 1 | 30,000 | 120 min → tier 120 → 30K |
| 2 | Hourly | 3h 0m | 2 | 2 | 90,000 | each rental: 180 min → tier 180 → 45K |
| 3 | Hourly | 1h 15m | 1 | 1 | 20,000 | 75 min → first tier ≥75 is 90 → 20K |
| 4 | Hourly | 1h 35m | 1 | 1 | 30,000 | 95 min → first tier ≥95 is 120 → 30K |
| 5 | Hourly | 7h 0m | 1 | 1 | 90,000 | 420 min > 360 → cap at last tier → 90K |
| 6 | All Day Weekday | any | 1 | 1 | 50,000 | flat |
| 7 | All Day Weekday | any | 3 | 3 | 150,000 | each rental: 50K |
| 8 | All Day Weekend | any | 2 | 2 | 120,000 | each rental: 60K |
| 9 | Purchase: T-shirt @ 100K | n/a | n/a | (transaction, not rental) | 100,000 per unit | scheme.flat_price = 100K |

(Row 3 matches the cafe's stated "1h 15m → 20K" exactly.)

### FR-7: Admin UI Surface

The variant create/edit screen (`apps/web/src/pages/products/[productId]/variants/...`) gains an unconditional **Pricing** section:

- **Pricing Type** radio: `flat` (always) and `tiered` (only enabled when the parent product's `sale_type === 'rental'`).
- For `tiered`: an editable list of tier rows (add/remove/reorder; minutes + Rupiah inputs).
- For `flat`: a single `flat_price` input.
- Form-level validation: tier minutes strictly ascending, all prices positive, at least one tier for `tiered`.

The check-in screen needs **no new fields** — picking the variant implicitly picks the pricing mode.

The check-out confirmation displays, per rental: `variant name • duration → subtotal`.

---

## Data Model Changes

### New table: `pricing_schemes`
```
id              BIGINT PK AUTO_INCREMENT
pricing_type    ENUM('tiered','flat') NOT NULL
description     TEXT NULL
flat_price      FLOAT NULL                     -- only for flat
created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
deleted_at      DATETIME NULL
CHECK (
  (pricing_type='flat'   AND flat_price IS NOT NULL)
  OR
  (pricing_type='tiered' AND flat_price IS NULL)
)
```

### New table: `pricing_scheme_tiers`
```
id                  BIGINT PK AUTO_INCREMENT
scheme_id           BIGINT NOT NULL REFERENCES pricing_schemes(id)
up_to_minutes       INT NOT NULL CHECK (up_to_minutes > 0)
price_per_person    FLOAT NOT NULL CHECK (price_per_person >= 0)
created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
UNIQUE KEY uniq_scheme_up_to (scheme_id, up_to_minutes)
KEY idx_scheme_id (scheme_id)
```

### Altered table: `variants`
```
ALTER TABLE variants
  ADD COLUMN pricing_scheme_id BIGINT NULL;     -- nullable during backfill
-- (backfill happens here)
ALTER TABLE variants
  MODIFY COLUMN pricing_scheme_id BIGINT NOT NULL,
  ADD CONSTRAINT fk_variants_scheme FOREIGN KEY (pricing_scheme_id) REFERENCES pricing_schemes(id),
  DROP COLUMN price;
```

### Altered table: `rentals` (snapshot only)
```
ALTER TABLE rentals
  ADD COLUMN snapshot_pricing_type   ENUM('tiered','flat') NULL,  -- nullable during backfill
  ADD COLUMN snapshot_flat_price     FLOAT      NULL,
  ADD COLUMN snapshot_tiers_json     JSON       NULL;
-- (backfill happens here)
ALTER TABLE rentals
  MODIFY COLUMN snapshot_pricing_type ENUM('tiered','flat') NOT NULL;
```

### Backfill plan

1. `INSERT INTO pricing_schemes (pricing_type, flat_price) SELECT 'flat', price FROM variants` — one `flat` scheme per variant. Capture `OLD variant id ↔ NEW scheme id` via a temporary mapping (most pragmatic: insert with a deterministic ordering and `LAST_INSERT_ID()` per row, or use a temp table joining on auto-id).
2. `UPDATE variants v JOIN pricing_schemes s ON s.id = (...) SET v.pricing_scheme_id = s.id`.
3. Insert one **shared** seeded "Hourly" `tiered` scheme with the seven tiers from FR-6 (this is the *new* scheme the cafe will start using; not auto-attached to any variant — admin attaches it manually by creating a new "Hourly" variant per board game).
4. For every existing rental row, set `snapshot_pricing_type='flat'`, `snapshot_flat_price=<the variant's old price>`. (Existing rentals were billed under the old `15K × hours, 6h cap` rule, but no historical rentals exist yet for tiered pricing — backfilling them as `flat` at the variant's per-hour rate is the closest faithful approximation. If exact replay matters, alternative: backfill as `tiered` with the seeded Hourly tiers; document the chosen approach in the migration comment.)
5. `ALTER TABLE variants DROP COLUMN price` and tighten `pricing_scheme_id` to NOT NULL.
6. `ALTER TABLE rentals` tighten `snapshot_pricing_type` to NOT NULL.

---

## API Changes

| Method | Path | Purpose |
|---|---|---|
| (existing) `POST /products/{id}/variants` | Body **requires** `pricing_scheme: {pricing_type, description?, flat_price?, tiers?}`. Removes `price` field. Server creates the scheme atomically with the variant. |
| (existing) `PUT /variants/{id}` | Same — request **requires** the scheme block. Updates the existing scheme in place. `pricing_type` cannot change. |
| (existing) `GET /variants/{id}` | Response embeds `pricing_scheme` (with tiers). `price` field removed. |
| (existing) `POST /rentals/checkin` | Unchanged signature. Server reads `variant.pricing_scheme`, snapshots, persists. |
| (existing) `POST /rentals/checkout` | Unchanged signature. Server uses snapshot-driven calculator. |
| (existing) `GET /rentals`, `GET /rentals/{id}` | Response gains `snapshot_pricing_type`, `snapshot_flat_price`, `snapshot_tiers` and, for ongoing rentals, server-computed `running_total`. |
| (existing transaction endpoints) | Implementation reads `variant.pricing_scheme.flat_price` instead of `variants.price`. Response shape unchanged (`transaction_items.price` already exists). |

There is **no** standalone `/pricing-schemes` resource. Schemes are nested under variants in the API.

OpenAPI updates live in `libs/api-contract/src/api.yaml` and regenerate the TS client. **Removing `variants.price` from the schema is a breaking change** for any external consumer.

---

## Out of Scope

- **Time-of-day pricing** (peak/off-peak within a day).
- **Auto-detecting weekday vs. weekend at check-in.** Staff picks the correct variant manually.
- **Discount / coupon stacking on rental subtotals.** Coupons today apply to transactions and continue to.
- **Mid-rental scheme switching** (model as check-out + immediate re-check-in if needed).
- **Quantity-tier pricing for purchase** (e.g., "buy 5 for X each"). Tiers today only mean "by duration"; extending to quantity is a future TRD.

---

## Open Questions

1. **Historical rental backfill fidelity.** The pre-migration math is `15K × hours, 6h cap`. Backfilling old rentals as `flat` at the variant's prior price (option A) is approximate; backfilling as `tiered` with the seeded Hourly tiers (option B) more faithfully replays what *would* have been charged. Confirm with owner which to pick — defaults to (A) for simplicity.
2. **Deposit / damage handling** — out of scope here; revisit if the cafe needs it.
3. **"Late check-out" UX** — when a tiered rental passes the largest tier (effectively capped), should the UI prompt staff to convert to "All Day"? Current behavior: keep accruing real time, keep capped bill, no automatic conversion.
