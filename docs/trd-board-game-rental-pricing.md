# TRD: Board Game Rental Pricing

## Problem Statement

The cafe rents board games under three pricing modes:

1. **Hourly** — stepped tier table priced per person (60min → 15K, 90min → 20K, 120min → 30K, ...). Duration rounds **up** into the next tier; the largest tier acts as the cap.
2. **All Day Weekday** — Rp. 50,000 per person for any duration up to the cafe's 14h operating window.
3. **All Day Weekend** — Rp. 60,000 per person for any duration up to the cafe's 14h operating window.

The current system cannot represent any of this:

- `variants.price` is a single flat number — no notion of duration-based tiers.
- `RentalUsecase.CheckoutRentals()` (`apps/api/domain/rental_usecase.go:107-128`) hardcodes `MAX_HOUR := 6.0`, multiplies the variant price by rounded hours, and contains a `// TODO: set these from DB` comment.
- A `Rental` row records only `variant_id` + check-in timestamp — no pricing context.
- There is no admin screen for any pricing parameter.

The owner needs to **add, edit, and price-change rental pricing from the admin UI** without engineering involvement.

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

### Key Architectural Decisions (After Iterative Design Review)

1. **One rental row = one person.** A group of three players is three rental rows, each with its own check-in/check-out and snapshot.
2. **`sale_type` drives the pricing source.**
   - `purchase` → price comes from `variants.price` (existing column, unchanged).
   - `rental` → price comes from `pricing_tiers` rows attached to the variant. There is always at least one tier; "All Day" is a single-tier variant.
3. **No separate `pricing_schemes` table.** Tiers attach directly to variants via `pricing_tiers.variant_id`. A "scheme" was just a 1:1 indirection between a variant and its tiers; cutting it out removes a table without losing anything.
4. **`variants.price` stays `NOT NULL DEFAULT 0`.** Rental variants store `0`; the discriminator is `sale_type`, not nullability. The form simply doesn't render a price input for rentals; the write path zeroes it server-side. Avoids a contract change and a cross-codebase nullable-deref audit.
5. **Snapshot on the rental row.** At check-in, the variant's tier list is JSON-encoded into `rentals.pricing_tiers` (a MySQL `JSON` column). The check-out calculator reads only from this snapshot, so admin edits to the live tiers never alter the bill of a rental already in progress.
6. **Uniform pricing model for rentals.** Every rental variant has tiers — no flat-vs-tiered discriminator anywhere in the code. The "flatness" of an All Day rental is just a 1-row tier table at `up_to_minutes = 840` (the cafe's operating window).

---

## Proposed Solution: Per-Variant Pricing Tiers

### Feature Overview

Every **rental** variant owns a list of `(up_to_minutes, price)` tier rows in `pricing_tiers`. At check-in, those tiers are JSON-snapshotted onto the rental's `pricing_tiers` JSON column. At check-out, a single-branch calculator picks the first tier whose `up_to_minutes ≥ duration_minutes`; if duration exceeds every tier, the last tier's price applies as a cap.

Purchase variants are untouched — they continue to use `variants.price` exactly as today. Rental variants store `variants.price = 0`; the value is never read for rentals.

### Core Concepts

| Concept | Description |
|---|---|
| **Pricing Tier** | An `(up_to_minutes, price)` row attached to a rental variant. ≥1 row per rental variant, strictly ascending by `up_to_minutes`. |
| **Rental Pricing Snapshot** | A JSON copy of the variant's tiers stored on `rentals.pricing_tiers` at check-in. Sole source of truth for billing math. |
| **All-Day variant** | A rental variant with exactly one tier (e.g., `840 → 50,000`). The single tier acts as both "the price" and "the cap." |
| **Hourly variant** | A rental variant with multiple tiers (e.g., 60→15K, 90→20K, …). |

### Why a Single Tiered Model for Rentals

The cafe's actual examples (1h=15K, 1.5h=20K, 2h=30K, "All Day 50K") are not all expressible by a single hourly rate plus grace; a tier table fits faithfully. Collapsing "All Day" into a one-tier variant means the *whole rental pricing model has one shape* — one Go branch, one UI editor, one JSON snapshot — and "flat-priced rental" is just the natural degenerate case (`len(tiers) == 1`).

### Why Snapshot on the Rental

A customer checks in at 7pm under the Hourly variant (90min tier = 20K). At 8pm the admin raises that tier to 22K. The customer checks out at 8:30pm. They must be billed **20K** — the rate they agreed to. Snapshot survives later edits, soft-deletes, and even tier-list rewrites on the variant.

---

## Feature Requirements

### FR-1: `sale_type` Drives Pricing Source

Validation in the variant create/update usecase:

- `sale_type='purchase'` variant: `variants.price > 0` (existing rule), **no** `pricing_tiers` rows.
- `sale_type='rental'` variant: `variants.price = 0` (force-set by the server), **at least one** `pricing_tiers` row.

The DB does not enforce this coupling — the usecase does, and the form prevents invalid input by hiding the price field for rental variants.

### FR-2: Pricing Tier Management

Pricing tiers are managed inline inside the rental variant form. There is no standalone `/pricing-tiers` page.

**A rental variant's tier list consists of:**
- ≥1 tier rows, each with:
  - `up_to_minutes` (required, > 0; strictly ascending across the list)
  - `price` (required, ≥ 0)

**Rules:**
- A rental variant cannot be saved with zero tiers.
- A rental variant's `variants.price` is force-set to `0` by the server.
- Tier `up_to_minutes` is unique per `(variant_id, up_to_minutes)`.

### FR-3: Check-in Snapshots the Tiers

The check-in screen and `POST /rentals/checkin` shall accept one rental per person. The existing payload shape is unchanged — staff serving a group of 3 submit 3 rental items.

On insert, the server:
1. Loads `variant.pricing_tiers`.
2. Rejects with `400` if the variant is rental-type and has zero tiers (a state that should be unreachable through the variant form, but defensive).
3. JSON-encodes the tier list (ascending by `up_to_minutes`) into `rentals.pricing_tiers`.

The snapshot is the **sole source of truth** for billing.

### FR-4: Check-out Computes Price From Snapshot

`POST /rentals/checkout` replaces the current ad-hoc math with a single-branch calculator:

```
duration_minutes = ceil((checkout_at - checkin_at) in minutes)
tiers            = parse(rental.pricing_tiers)        // ascending
for tier in tiers:
    if tier.up_to_minutes >= duration_minutes:
        return tier.price
return tiers[last].price                   // cap
```

The resulting `TransactionItem` has `Amount = 1`, `Price = price`, `Subtotal = price`. Each rental row produces exactly one transaction item.

### FR-5: Worked Examples (Acceptance Tests)

The seeded **Hourly** tier set spans 60 → 480 minutes in 30-minute steps. Pricing rule: *each full hour adds 15K; each half-hour boundary adds 5K from the previous hour*.

| up_to_minutes | price |
|---:|---:|
| 60 | 15,000 |
| 90 | 20,000 |
| 120 | 30,000 |
| 150 | 35,000 |
| 180 | 45,000 |
| 210 | 50,000 |
| 240 | 60,000 |
| 270 | 65,000 |
| 300 | 75,000 |
| 330 | 80,000 |
| 360 | 90,000 |
| 390 | 95,000 |
| 420 | 105,000 |
| 450 | 110,000 |
| 480 | 120,000 |

Plus "All Day Weekday" `{840→50K}` and "All Day Weekend" `{840→60K}`.

| # | Variant | Duration | People | Rentals | Total | Per-rental Math |
|---|---|---|---:|---:|---:|---|
| 1 | Hourly | 2h 0m | 1 | 1 | 30,000 | 120min → tier 120 → 30K |
| 2 | Hourly | 3h 0m | 2 | 2 | 90,000 | each rental: 180min → tier 180 → 45K |
| 3 | Hourly | 1h 15m | 1 | 1 | 20,000 | 75min → first tier ≥75 is 90 → 20K |
| 4 | Hourly | 1h 35m | 1 | 1 | 30,000 | 95min → first tier ≥95 is 120 → 30K |
| 5 | Hourly | 7h 0m | 1 | 1 | 105,000 | 420min → tier 420 → 105K |
| 6 | Hourly | 9h 0m | 1 | 1 | 120,000 | 540min > 480 → cap at last tier (120K) |
| 7 | All Day Weekday | any | 1 | 1 | 50,000 | 1-tier variant |
| 8 | All Day Weekday | any | 3 | 3 | 150,000 | each rental: 50K |
| 9 | All Day Weekend | any | 2 | 2 | 120,000 | each rental: 60K |

### FR-6: Admin UI Surface

The variant create/edit screen (`apps/web/src/pages/products/[productId]/variants/...`) is split conditionally on the parent product's `sale_type`:

- **`sale_type === 'purchase'`** — existing simple `price` input. Unchanged.
- **`sale_type === 'rental'`** — `price` field hidden; **Pricing Tiers** editor shown:
  - Editable list of tier rows with Add / Remove buttons (`up_to_minutes` numeric, `price` numeric).
  - Zod validates ≥1 row, strictly ascending minutes, positive prices.
  - Help text: *"A single tier behaves like a flat rate. e.g., 'All Day' = one tier at 840 minutes (the cafe's 14-hour operating window)."*

The check-in screen needs **no new fields** — picking the variant picks the tiers.

The check-out confirmation displays, per rental: `variant name • duration → subtotal`.

---

## Data Model Changes

### New table: `pricing_tiers`
```
id              BIGINT       NOT NULL AUTO_INCREMENT
variant_id      BIGINT       NOT NULL REFERENCES variants(id)
up_to_minutes   INT          NOT NULL CHECK (up_to_minutes > 0)
price           FLOAT        NOT NULL DEFAULT 0
created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
PRIMARY KEY (id)
UNIQUE KEY uniq_variant_up_to (variant_id, up_to_minutes)
KEY idx_variant_id (variant_id)
```

No `pricing_schemes` table. Tiers attach directly to variants.

### Unchanged: `variants.price`

`variants.price` stays `FLOAT NOT NULL DEFAULT 0`. Rental variants store `0`; the value is never read for rentals (the calculator reads only the snapshot). No DDL on `variants`. No OpenAPI contract change.

### Altered table: `rentals`
```
ALTER TABLE rentals
  ADD COLUMN pricing_tiers JSON NULL;        -- initially nullable for backfill
-- (backfill happens)
ALTER TABLE rentals
  MODIFY COLUMN pricing_tiers JSON NOT NULL;
```

One new column. MySQL 5.7+ supports `JSON` natively (the existing schema is InnoDB + utf8mb4, so this is fine).

### Backfill plan

The current hardcoded behavior was `variant.price × hours, 6h cap`. The migration shall:

1. Insert the 15-row Hourly tier set for every existing **rental** variant:
   ```sql
   INSERT INTO pricing_tiers (variant_id, up_to_minutes, price)
   SELECT v.id, t.up_to_minutes, t.price
   FROM variants v
   JOIN products p ON p.id = v.product_id
   CROSS JOIN (
     SELECT  60 AS up_to_minutes, 15000 AS price UNION ALL
     SELECT  90, 20000  UNION ALL SELECT 120, 30000 UNION ALL
     SELECT 150, 35000  UNION ALL SELECT 180, 45000 UNION ALL
     SELECT 210, 50000  UNION ALL SELECT 240, 60000 UNION ALL
     SELECT 270, 65000  UNION ALL SELECT 300, 75000 UNION ALL
     SELECT 330, 80000  UNION ALL SELECT 360, 90000 UNION ALL
     SELECT 390, 95000  UNION ALL SELECT 420, 105000 UNION ALL
     SELECT 450, 110000 UNION ALL SELECT 480, 120000
   ) t
   WHERE p.sale_type = 'rental';
   ```
2. Zero out `price` for existing rental variants (no-op if they already happen to be 0):
   ```sql
   UPDATE variants v
   JOIN products p ON p.id = v.product_id
   SET v.price = 0
   WHERE p.sale_type = 'rental';
   ```
3. Backfill `rentals.pricing_tiers` for every existing rental from its variant's new tier list (JSON-encode the 15 Hourly tiers).
4. Tighten `rentals.pricing_tiers` to `NOT NULL`.

Purchase variants are untouched throughout. The admin creates new "All Day Weekday" / "All Day Weekend" variants per rental product post-migration through the UI.

---

## API Changes

| Method | Path | Purpose |
|---|---|---|
| (existing) `POST /products/{id}/variants` | Body adds optional `pricing_tiers: [{up_to_minutes, price}, ...]`. **Required** when parent product is `rental`; ignored (and not rendered by the FE form) when `purchase`. For rental variants the server force-sets `price = 0` regardless of input. |
| (existing) `PUT /variants/{id}` | Same — request can include `price` (purchase) or `pricing_tiers` (rental). Server replaces tier rows wholesale. |
| (existing) `GET /variants/{id}` | Response includes `pricing_tiers` array (non-empty for rentals; empty for purchases). `price` remains a non-null number (always 0 for rentals). |
| (existing) `POST /rentals/checkin` | Unchanged signature. Server reads `variant.pricing_tiers`, JSON-encodes into `rentals.pricing_tiers`, persists. |
| (existing) `POST /rentals/checkout` | Unchanged signature. Server uses snapshot-driven calculator. |
| (existing) `GET /rentals`, `GET /rentals/{id}` | Response gains `pricing_tiers` (parsed array of the snapshot) and, for ongoing rentals, server-computed `running_total`. |

There is **no** standalone `/pricing-tiers` or `/pricing-schemes` resource. Tiers are nested under variants.

OpenAPI updates live in `libs/api-contract/src/api.yaml`. The `Variant.price` field stays a non-null number — no nullability change to the contract. Only additive shape changes (`Variant.pricing_tiers`, `Rental.pricing_tiers`, `Rental.running_total`).

---

## Out of Scope

- **Time-of-day pricing** (peak/off-peak within a day).
- **Auto-detecting weekday vs. weekend at check-in.** Staff picks the correct variant manually.
- **Discount / coupon stacking on rental subtotals.** Coupons today apply to transactions and continue to.
- **Mid-rental scheme switching** (model as check-out + immediate re-check-in if needed).
- **Quantity-tier pricing for purchase** (bulk discounts). Out of scope; if ever needed, a future TRD.

---

## Open Questions

1. **Historical rental backfill fidelity.** Backfilling existing rentals' snapshots with the new 15-tier Hourly table is approximate vs. the old `price × hours, 6h cap` rule. Default: approximate — the 15-tier table is the new normal anyway.
2. **Deposit / damage handling** — out of scope here.
3. **"Late check-out" UX** — when a tiered rental passes the largest tier (capped), should the UI prompt staff to convert to "All Day"? Current behavior: keep accruing real time, keep capped bill, no auto-conversion.
