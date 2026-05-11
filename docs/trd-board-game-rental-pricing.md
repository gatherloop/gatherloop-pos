# TRD: Board Game Rental Pricing

## Problem Statement

The cafe rents board games under three pricing modes:

1. **Hourly** — stepped tier table priced per person (1h → 15K, 1.5h → 20K, 2h → 30K, ...). Duration is rounded **up** into the next tier; the largest tier acts as the cap.
2. **All Day Weekday** — flat Rp. 50,000 per person.
3. **All Day Weekend** — flat Rp. 60,000 per person.

The current system cannot represent any of this:

- `variants.price` is a single flat number — there's no notion of "by hour", "by tier", or "by day".
- `RentalUsecase.CheckoutRentals()` (`apps/api/domain/rental_usecase.go:107-128`) hardcodes `MAX_HOUR := 6.0`, multiplies the variant price by rounded hours, and contains a `// TODO: set these from DB` comment.
- A `Rental` row records only `variant_id` + check-in timestamp — no notion of what pricing mode applies.
- There is no admin screen for any pricing parameter. Any change today requires a Go edit and a deploy.

The owner needs to **add, edit, and price-change rental schemes from the admin UI** without engineering involvement: change the 1.5-hour tier from 20K to 22K, add a new "0.5h → 8K" tier, raise the weekend rate for a holiday, etc.

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
- **Frontend rental flow**: `apps/web/src/pages/rentals/{index,checkin,checkout}.tsx`. Check-in is "pick a variant + name + code"; check-out emits a transaction.
- **Auth**: JWT, no RBAC.

### Key Architectural Decisions (Per Design Review)

1. **One rental row = one person.** A group of three players is three rental rows, each with its own check-in/check-out and its own snapshot. This handles "one person leaves early" naturally and removes any `player_count × …` math.
2. **One variant = one pricing scheme.** The 1:1 relation lives as a single `rental_pricing_scheme_id` FK column on `variants`. The cafe will create three rental variants per board game family: "Board Game — Hourly", "Board Game — All Day Weekday", "Board Game — All Day Weekend". Picking a variant at check-in *is* picking a pricing mode.
3. **No join table, no name on the scheme.** The scheme is a pure pricing configuration; its display name is the parent variant's name (`variant.name`).
4. **Snapshot on the rental row, not an FK.** The rental copies the scheme's parameters at check-in time. No `pricing_scheme_id` on `rentals` — the snapshot is sufficient for billing math and historical audit. The `variant_id` already lets you join back to "what was this rental about" for reporting.

`variants.price` remains the unit price for purchase variants and is unused for rental variants.

---

## Proposed Solution: Per-Variant Tiered Pricing Schemes

### Feature Overview

Introduce a `RentalPricingScheme` entity owned **1:1 by a variant**. Each scheme is either:

- **`tiered`** — an ordered list of `(up_to_minutes, price_per_person)` tiers. Duration is rounded up to the first tier whose `up_to_minutes ≥ duration_minutes`; if duration exceeds every tier, the last tier's price is the cap.
- **`flat`** — a single `price_per_person`, regardless of duration.

Admin CRUDs schemes from the UI (via the variant edit form). At check-in, the chosen variant's scheme is **snapshotted onto the rental row**, so later edits to the scheme do not affect already-running or already-completed rentals.

### Core Concepts

| Concept | Description |
|---|---|
| **Rental Pricing Scheme** | A pricing configuration attached 1:1 to a rental variant. Has a `pricing_type` and type-specific data. No name — the parent variant supplies it. |
| **Pricing Type** | Enum: `tiered` or `flat`. Immutable after creation. |
| **Pricing Tier** | For `tiered` schemes: a row with `up_to_minutes` and `price_per_person`. Tiers are evaluated in ascending order. |
| **Rental Pricing Snapshot** | A frozen copy of the scheme (and its tiers, if any) stored on the `rental` row at check-in. The check-out calculator reads only from the snapshot. |

### Why Snapshot on the Rental?

A customer checks in at 7pm under the Hourly variant (1.5h → 20K). At 8pm the admin raises the 1.5h tier to 22K. The customer checks out at 8:30pm. They must be billed **20K** — the rate they agreed to. Snapshot survives later admin edits, soft-deletes, and even scheme replacement on the variant.

### Why Tiers Instead of "Block + Grace"?

The cafe's actual examples (1h=15K, 1.5h=20K, 2h=30K) are not consistent with any single hourly-rate-plus-grace formula. A tier table is the only model that captures them faithfully, and it's also the most flexible: the admin can add intermediate tiers (e.g., 0.5h=8K, 2.5h=37K) without code changes.

---

## Feature Requirements

### FR-1: Pricing Scheme Lives on the Variant

- Add `rental_pricing_scheme_id BIGINT NULL` to `variants`. References `rental_pricing_schemes(id)`.
- A `rental`-type variant **must** have a scheme to be checkin-able; a `purchase`-type variant **must not** have one.
- Validation lives in the variant create/update usecase.

### FR-2: Pricing Scheme Management

The system shall allow users to create, view, edit, and soft-delete pricing schemes through the variant edit form. (There is no standalone `/pricing-schemes` page — schemes are managed inside the variant they belong to.)

**A scheme consists of:**
- **Pricing Type** (required, immutable after create): `tiered` or `flat`
- **Description** (optional)
- For **`tiered`**: an ordered list of tiers `{ up_to_minutes, price_per_person }`, at least one tier required, `up_to_minutes` strictly increasing.
- For **`flat`**: `price_per_person` (> 0).

**Rules:**
- `pricing_type` cannot change after create (would invalidate snapshots' interpretation). To switch types, the admin replaces the variant's scheme with a new one.
- Soft-delete only.
- The seed migration creates three rental variants for the existing board game product (or for each existing rental-type product) with these schemes:
  - "Hourly" → `tiered` with starter tiers: `{60→15000, 90→20000, 120→30000, 180→45000, 240→60000, 300→75000, 360→90000}`. Admin tunes from there.
  - "All Day Weekday" → `flat 50000`
  - "All Day Weekend" → `flat 60000`

### FR-3: Check-in Snapshots the Scheme

The check-in screen and `POST /rentals/checkin` shall accept one rental per person. The existing payload shape is unchanged — staff who serve a group of 3 submit 3 rental items.

On insert, the server:
1. Looks up `variant.rental_pricing_scheme_id` (rejecting if `NULL` for a rental-type variant).
2. Snapshots the scheme onto the rental row:
   - `snapshot_pricing_type` (`tiered` | `flat`)
   - `snapshot_flat_price` (nullable; only for `flat`)
   - `snapshot_tiers_json` (nullable; only for `tiered`) — JSON array of `[{up_to_minutes, price_per_person}]` in ascending order

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

The resulting `TransactionItem` has `Amount = 1`, `Price = price`, `Subtotal = price`. Each rental row produces exactly one transaction item (consistent with the "one rental = one person" rule).

### FR-5: Worked Examples (Acceptance Tests)

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

(Row 3 matches the cafe's stated "1h 15m → 20K" exactly.)

### FR-6: Admin UI Surface

The variant create/edit screen (`apps/web/src/pages/products/[productId]/variants/...`) gains, for rental-type variants only:

- A **Pricing Type** radio (`tiered` | `flat`).
- For `tiered`: an editable list of tier rows (add/remove/reorder; minutes + Rupiah inputs).
- For `flat`: a single price input.
- Form-level validation ensures tier minutes are strictly ascending and prices are positive.

The check-in screen needs **no new fields** — picking the variant implicitly picks the pricing mode.

The check-out confirmation displays, per rental: `variant name • duration → subtotal`.

---

## Data Model Changes

### New table: `rental_pricing_schemes`
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

### New table: `rental_pricing_scheme_tiers`
```
id                  BIGINT PK AUTO_INCREMENT
scheme_id           BIGINT NOT NULL REFERENCES rental_pricing_schemes(id)
up_to_minutes       INT NOT NULL CHECK (up_to_minutes > 0)
price_per_person    FLOAT NOT NULL CHECK (price_per_person >= 0)
created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
UNIQUE KEY uniq_scheme_up_to (scheme_id, up_to_minutes)
KEY idx_scheme_id (scheme_id)
```

Tiers are sorted by `up_to_minutes ASC` when read. Strict-ascending and "at-least-one" rules are enforced at the usecase layer.

### Altered table: `variants`
```
ALTER TABLE variants
  ADD COLUMN rental_pricing_scheme_id BIGINT NULL,
  ADD CONSTRAINT fk_variants_scheme
    FOREIGN KEY (rental_pricing_scheme_id) REFERENCES rental_pricing_schemes(id);
```

### Altered table: `rentals` (snapshot columns only — no scheme FK, no player_count)
```
ALTER TABLE rentals
  ADD COLUMN snapshot_pricing_type   ENUM('tiered','flat') NOT NULL,
  ADD COLUMN snapshot_flat_price     FLOAT      NULL,
  ADD COLUMN snapshot_tiers_json     JSON       NULL;
```

### Backfill plan

The current hardcoded behavior is `15K × hours, 15-min round-up, 6h cap`, which is close to (but not identical to) the new seeded "Hourly" tiers. We:

1. Insert one seeded "Hourly" scheme (`tiered` with the seven tiers from FR-5) and a "Weekday"/"Weekend" pair (`flat`).
2. Point every existing rental-type variant at the seeded "Hourly" scheme via `variants.rental_pricing_scheme_id`.
3. Backfill every existing `rentals` row's snapshot columns from that "Hourly" scheme (`snapshot_pricing_type='tiered'`, `snapshot_tiers_json=<json of seven tiers>`).
4. After backfill, the admin manually creates "Weekday"/"Weekend" *variants* for any product where the cafe wants to offer those modes, attaching the corresponding seeded scheme.

---

## API Changes

| Method | Path | Purpose |
|---|---|---|
| (existing) `POST /variants` | Body adds optional `rental_pricing_scheme: {pricing_type, flat_price?, tiers?}`. Server creates the scheme atomically with the variant and stores the FK. |
| (existing) `PUT /variants/{id}` | Same — request can include the scheme block. Updates the existing scheme in place (or creates one if missing). `pricing_type` cannot change. |
| (existing) `GET /variants/{id}` | Response includes the embedded `rental_pricing_scheme` (with tiers). |
| (existing) `POST /rentals/checkin` | Unchanged signature. Server reads `variant.rental_pricing_scheme_id`, snapshots, persists. |
| (existing) `POST /rentals/checkout` | Unchanged signature. Server uses the snapshot-driven calculator. |
| (existing) `GET /rentals`, `GET /rentals/{id}` | Response gains `snapshot_pricing_type`, `snapshot_flat_price`, `snapshot_tiers` and, for ongoing rentals, a server-computed `running_total`. |

There is **no** standalone `/pricing-schemes` resource. Schemes are nested under variants in the API, matching the 1:1 ownership.

OpenAPI updates live in `libs/api-contract/src/api.yaml` and regenerate the TS client.

---

## Out of Scope

- **Time-of-day pricing** (peak/off-peak within a day).
- **Auto-detecting weekday vs. weekend at check-in.** Staff picks the correct variant manually.
- **Discount / coupon stacking on rental subtotals.** Coupons today apply to transactions and continue to.
- **Mid-rental scheme switching** (model as check-out + immediate re-check-in if needed).
- **Variant-side enforcement of unique scheme** (two variants pointing at the same scheme is technically allowed by the schema; the UI does not surface this, and the snapshot mechanism makes it harmless even if it happens).

---

## Open Questions

1. **Deposit / damage handling** — out of scope here; revisit if the cafe needs it.
2. **"Late check-out" UX** — when a tiered rental passes the largest tier (effectively capped), should the UI prompt the staff to convert to "All Day"? Current behavior: keep accruing real time, keep capped bill, no automatic conversion.
