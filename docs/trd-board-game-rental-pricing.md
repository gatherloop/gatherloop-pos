# TRD: Board Game Rental Pricing

## Problem Statement

The cafe rents board games under three pricing modes:

1. **Hourly** — stepped tier table priced per person (60min → 15K, 90min → 20K, 120min → 30K, ...). Duration rounds **up** into the next tier; the largest tier acts as the cap.
2. **All Day Weekday** — Rp. 50,000 per person for any duration up to the 14h cafe operating window.
3. **All Day Weekend** — Rp. 60,000 per person for any duration up to the 14h cafe operating window.

The current system cannot represent any of this:

- `variants.price` is a single flat number — no notion of duration-based tiers.
- `RentalUsecase.CheckoutRentals()` (`apps/api/domain/rental_usecase.go:107-128`) hardcodes `MAX_HOUR := 6.0`, multiplies the variant price by rounded hours, and contains a `// TODO: set these from DB` comment.
- A `Rental` row records only `variant_id` + check-in timestamp — no pricing context.
- There is no admin screen for any pricing parameter.

The owner needs to **add, edit, and price-change rental schemes from the admin UI** without engineering involvement.

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

### Key Architectural Decisions (Per Iterative Design Review)

1. **One rental row = one person.** A group of three players is three rental rows, each with its own check-in/check-out and snapshot.
2. **`PricingScheme` is rental-only.** Purchase variants continue to use `variants.price` (unchanged). Only rental variants reference a `pricing_scheme_id`.
3. **Single pricing type.** Every scheme is a tier table. "All Day" is just a single-tier scheme (e.g., `840min → 50K`); "Hourly" is a multi-tier table. There is no `flat` vs `tiered` discriminator — a one-row table is the degenerate "flat" case.
4. **Scheme is 1:1 with variant.** A single `pricing_scheme_id BIGINT NULL` column on `variants`. No join table. No name field on the scheme — variant supplies the display name.
5. **Snapshot on the rental row.** At check-in, the scheme's tiers are JSON-serialized into `rentals.snapshot_tiers_json`. The check-out calculator reads only from the snapshot, so admin edits to the live scheme never alter the bill of a rental already in progress.

---

## Proposed Solution: Rental Pricing Schemes

### Feature Overview

Introduce a `PricingScheme` entity owned 1:1 by a **rental** variant. Each scheme is a list of `(up_to_minutes, price_per_person)` tiers in ascending order. The calculator picks the first tier whose `up_to_minutes ≥ duration_minutes`; if duration exceeds every tier, the last tier price applies as a cap.

Admin manages the scheme inside the variant create/edit form (the scheme has no standalone page). At check-in, the variant's current tier list is snapshotted onto the rental row.

### Core Concepts

| Concept | Description |
|---|---|
| **Pricing Scheme** | A rental pricing configuration attached 1:1 to a rental variant. Has only a `description` — the parent variant supplies the display name. |
| **Pricing Tier** | An `(up_to_minutes, price_per_person)` row inside a scheme. Tiers are strictly ascending by `up_to_minutes`. A scheme has ≥1 tier. |
| **Rental Pricing Snapshot** | A JSON copy of the scheme's tiers stored on the rental row at check-in. Source of truth for billing math. |

### Why a Tier-Only Model

The cafe's actual examples (1h=15K, 1.5h=20K, 2h=30K, "All Day 50K") are not expressible by a single hourly rate plus grace. A tier table fits faithfully. Collapsing "All Day" into a one-tier scheme means the *whole pricing model has one shape* — one Go branch, one UI editor, one JSON snapshot format — and "flat" is just the natural degenerate case.

### Why Snapshot on the Rental

A customer checks in at 7pm under the Hourly variant (90min tier = 20K). At 8pm the admin raises that tier to 22K. The customer checks out at 8:30pm. They must be billed **20K** — the rate they agreed to. Snapshot survives later edits, soft-deletes, and scheme replacement on the variant.

---

## Feature Requirements

### FR-1: Schemes Are Rental-Only

- Add `pricing_scheme_id BIGINT NULL` to `variants`. FK → `pricing_schemes(id)`.
- A `rental`-type variant **must** have a scheme to be checkin-able (`pricing_scheme_id NOT NULL` and the scheme has ≥1 tier). Validation lives in the variant create/update usecase.
- A `purchase`-type variant **must not** have a scheme (`pricing_scheme_id IS NULL`). `variants.price` remains the authoritative price for purchases — unchanged.
- The DB only enforces the nullable FK; the (rental↔scheme) / (purchase↔price) coupling is enforced at the usecase layer.

### FR-2: Scheme Management

The system shall allow users to create, view, edit, and soft-delete pricing schemes through the rental variant edit form. (No standalone `/pricing-schemes` page.)

**A scheme consists of:**
- **Description** (optional free text)
- **Tiers** (required, ≥1 row), each with:
  - `up_to_minutes` (required, > 0; strictly ascending across the tier list)
  - `price_per_person` (required, ≥ 0)

**Rules:**
- A scheme always has ≥1 tier. A 1-tier scheme is the "flat" case.
- Soft-delete only; historical rentals reference the scheme via `variant_id → variant.pricing_scheme_id` for read-only audit (though they don't need to — the snapshot is self-contained).

### FR-3: Check-in Snapshots the Tiers

The check-in screen and `POST /rentals/checkin` shall accept one rental per person. The existing payload shape is unchanged — staff serving a group of 3 submit 3 rental items.

On insert, the server:
1. Loads `variant.pricing_scheme` with its tiers.
2. Rejects with `400` if the rental-type variant has no scheme or an empty tier list.
3. Snapshots the tiers onto the rental row:
   - `snapshot_tiers_json` — JSON array `[{up_to_minutes, price_per_person}, ...]` sorted ascending.

The snapshot is the **sole source of truth** for billing.

### FR-4: Check-out Computes Price From Snapshot

`POST /rentals/checkout` replaces the current ad-hoc math with a single calculator:

```
duration_minutes = ceil((checkout_at - checkin_at) in minutes)
tiers            = parse(snapshot_tiers_json)        // ascending
for tier in tiers:
    if tier.up_to_minutes >= duration_minutes:
        return tier.price_per_person
return tiers[last].price_per_person                  // cap
```

The resulting `TransactionItem` has `Amount = 1`, `Price = price`, `Subtotal = price`. Each rental row produces exactly one transaction item.

### FR-5: Worked Examples (Acceptance Tests)

Using a seeded "Hourly" scheme with tiers `{60→15K, 90→20K, 120→30K, 180→45K, 240→60K, 300→75K, 360→90K}` and an "All Day Weekday" scheme with `{840→50K}`:

| # | Variant / Scheme | Duration | People | Rentals | Total | Per-rental Math |
|---|---|---|---:|---:|---:|---|
| 1 | Hourly | 2h 0m | 1 | 1 | 30,000 | 120min → tier 120 → 30K |
| 2 | Hourly | 3h 0m | 2 | 2 | 90,000 | each rental: 180min → tier 180 → 45K |
| 3 | Hourly | 1h 15m | 1 | 1 | 20,000 | 75min → first tier ≥75 is 90 → 20K |
| 4 | Hourly | 1h 35m | 1 | 1 | 30,000 | 95min → first tier ≥95 is 120 → 30K |
| 5 | Hourly | 7h 0m | 1 | 1 | 90,000 | 420min > 360 → cap at last tier |
| 6 | All Day Weekday | any | 1 | 1 | 50,000 | 1-tier scheme |
| 7 | All Day Weekday | any | 3 | 3 | 150,000 | each rental: 50K |
| 8 | All Day Weekend | any | 2 | 2 | 120,000 | each rental: 60K |

### FR-6: Admin UI Surface

The variant create/edit screen (`apps/web/src/pages/products/[productId]/variants/...`) gains a **Pricing Tiers** section, visible **only when the parent product `sale_type === 'rental'`**. Purchase variants keep the existing simple `price` input.

For rental variants:
- An editable list of tier rows (Add / Remove buttons; `up_to_minutes` numeric + `price_per_person` numeric per row).
- Validation: ≥1 row; `up_to_minutes` strictly ascending; positive values.
- A hint helps the admin: *"A single tier behaves like a flat rate (e.g., 'All Day' = one row at 840 minutes)."*

Check-in screen needs **no new fields** — picking the variant implicitly picks the pricing.

Check-out confirmation displays, per rental: `variant name • duration → subtotal`.

---

## Data Model Changes

### New table: `pricing_schemes`
```
id           BIGINT PK AUTO_INCREMENT
description  TEXT NULL
created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
deleted_at   DATETIME NULL
```

No `pricing_type`, no `flat_price`, no CHECK constraint.

### New table: `pricing_scheme_tiers`
```
id                 BIGINT PK AUTO_INCREMENT
scheme_id          BIGINT NOT NULL REFERENCES pricing_schemes(id)
up_to_minutes      INT NOT NULL CHECK (up_to_minutes > 0)
price_per_person   FLOAT NOT NULL CHECK (price_per_person >= 0)
created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
UNIQUE KEY uniq_scheme_up_to (scheme_id, up_to_minutes)
KEY idx_scheme_id (scheme_id)
```

### Altered table: `variants`
```
ALTER TABLE variants
  ADD COLUMN pricing_scheme_id BIGINT NULL,
  ADD CONSTRAINT fk_variants_scheme
    FOREIGN KEY (pricing_scheme_id) REFERENCES pricing_schemes(id);
```

`variants.price` is **untouched**. Existing rows, existing reads, and existing purchase transactions continue to work.

### Altered table: `rentals`
```
ALTER TABLE rentals
  ADD COLUMN snapshot_tiers_json JSON NULL;     -- initially nullable for backfill
-- (backfill happens)
ALTER TABLE rentals
  MODIFY COLUMN snapshot_tiers_json JSON NOT NULL;
```

Just **one** new column on `rentals`. No `snapshot_pricing_type`, no `snapshot_flat_price`.

### Backfill plan

The current hardcoded behavior is `variant.price × hours, 6h cap`. The migration shall:

1. Insert three seeded schemes (with tiers):
   - **"Hourly board game"** — 7 tiers `{60→15K, 90→20K, 120→30K, 180→45K, 240→60K, 300→75K, 360→90K}`.
   - **"All day weekday"** — 1 tier `{840→50K}`.
   - **"All day weekend"** — 1 tier `{840→60K}`.
2. Attach the "Hourly board game" scheme to every existing rental-type variant:
   ```sql
   UPDATE variants v
   JOIN products p ON p.id = v.product_id
   SET v.pricing_scheme_id = <hourly_scheme_id>
   WHERE p.sale_type = 'rental';
   ```
3. Backfill `rentals.snapshot_tiers_json` from each rental's variant's scheme tiers. (Existing rentals are all under "Hourly" semantics; seeding with the new 7-tier table is close to the old `price × hours, 6h cap` behavior without exact replay.)
4. Tighten `rentals.snapshot_tiers_json` to `NOT NULL`.

Purchase variants are untouched throughout.

---

## API Changes

| Method | Path | Purpose |
|---|---|---|
| (existing) `POST /products/{id}/variants` | Body adds optional `pricing_scheme: { description?, tiers: [...] }`. Required when the parent product is `rental`. Server creates scheme atomically with variant. |
| (existing) `PUT /variants/{id}` | Same — request can include the scheme block. Updates the existing scheme in place (replaces tier rows wholesale). |
| (existing) `GET /variants/{id}` | Response embeds `pricing_scheme` (with tiers) for rental variants; `null` for purchase variants. `price` field remains for purchase. |
| (existing) `POST /rentals/checkin` | Unchanged signature. Server reads `variant.pricing_scheme.tiers`, JSON-encodes into `snapshot_tiers_json`, persists. |
| (existing) `POST /rentals/checkout` | Unchanged signature. Server uses snapshot-driven calculator. |
| (existing) `GET /rentals`, `GET /rentals/{id}` | Response gains `snapshot_tiers` (parsed array) and, for ongoing rentals, server-computed `running_total`. |

There is **no** standalone `/pricing-schemes` resource. Schemes are nested under variants. Purchase variants are unchanged on the wire — `variants.price` still flows through.

OpenAPI updates live in `libs/api-contract/src/api.yaml` and regenerate the TS client. **This is additive for the variants API** — no breaking change to existing fields.

---

## Out of Scope

- **Time-of-day pricing** (peak/off-peak within a day).
- **Auto-detecting weekday vs. weekend at check-in.** Staff picks the correct variant manually.
- **Discount / coupon stacking on rental subtotals.** Coupons today apply to transactions and continue to.
- **Mid-rental scheme switching** (model as check-out + immediate re-check-in if needed).
- **Quantity-tier pricing for purchase** (bulk discounts). Out of scope; if ever needed, a future TRD.

---

## Open Questions

1. **Historical rental backfill fidelity.** Backfilling existing rentals' snapshots with the new 7-tier Hourly table is approximate. Exact replay of the old `price × hours, 6h cap` rule would require synthesizing custom tiers per rental. Default: approximate (the 7-tier table is the new normal anyway).
2. **Deposit / damage handling** — out of scope here.
3. **"Late check-out" UX** — when a tiered rental passes the largest tier (capped), should the UI prompt staff to convert to "All Day"? Current behavior: keep accruing real time, keep capped bill, no auto-conversion.
