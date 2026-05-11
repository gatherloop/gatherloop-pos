# TRD: Board Game Rental Pricing

## Problem Statement

The cafe rents board games using two different pricing schemes that vary by **duration** and by **number of players**:

1. **Hourly** — Rp. 15,000 per person per hour, with a 15-minute grace rule. Any minutes past the grace round up to the next half-hour billing block.
2. **All Day Weekday** — Rp. 50,000 per person, flat.
3. **All Day Weekend** — Rp. 60,000 per person, flat.

The current rental system cannot represent any of this:

- `variants.price` is a single flat number — there is no notion of "per hour", "per person", or "per day".
- `RentalUsecase.CheckoutRentals()` (`apps/api/domain/rental_usecase.go:107-128`) hardcodes `MAX_HOUR := 6.0`, multiplies the variant price by rounded hours, and contains a `// TODO: set these from DB` comment. This is the *only* pricing logic, so all pricing schemes collapse into "price × hours".
- A `Rental` row records only one `variant_id` and a check-in timestamp — it has no "number of players" and no "which pricing scheme was selected".
- There is no admin screen to change the hourly rate, the grace period, the half-hour rounding, the daily flat rate, or the weekend rate. Any change today requires a Go code edit, a deploy, and recompiling the migration logic.

The owner needs to be able to **add, edit, and price-change rental schemes from the admin UI** without engineering involvement, including:

- Changing the hourly rate (e.g., 15K → 17K) when costs go up.
- Changing the grace period (e.g., 15 min → 20 min) when policy changes.
- Adjusting the All Day Weekend price for a holiday season.
- Adding new schemes later (e.g., "Half Day", "Late Night Special") without a deploy.

---

## Context: Existing System

- **Backend**: Go REST API with MySQL + GORM, Clean Architecture (`domain → data → presentation`). All migrations live in `apps/api/migrations/` and use `golang-migrate`.
- **Frontend**: Next.js web (`apps/web/`) and React Native mobile (`apps/mobile/`) sharing a Tamagui-based UI library. State via React Query, validation via Zod.
- **API contract**: OpenAPI spec at `libs/api-contract/src/api.yaml`, codegen-driven types/clients consumed by both frontends.
- **Rental domain today** (`apps/api/domain/`):
  - `rental_entity.go` — `Rental { Id, Code, Name, VariantId, CheckinAt, CheckoutAt, ... }`
  - `rental_usecase.go` — `CheckinRentals`, `CheckoutRentals`, `GetRentalList`, `DeleteRentalById`
  - `variant_entity.go` — `Variant { Id, ProductId, Name, Price, ... }`
  - `product_entity.go` — `Product { Id, ..., SaleType: "purchase" | "rental" }`
- **Rental DB schema** (`apps/api/migrations/000001_initial_schema.up.sql:258`):
  ```
  rentals(id, code, name, variant_id, checkin_at, checkout_at, created_at, deleted_at)
  ```
- **Frontend rental flow**: `apps/web/src/pages/rentals/{index,checkin,checkout}.tsx`. Check-in is "pick a variant + name + code"; check-out is "select rentals → confirm → emit transaction".
- **Auth**: JWT, no RBAC — everyone authenticated is effectively an "admin" today. New admin screens follow the same pattern as `apps/web/src/pages/products/`.

### Key Architectural Consideration

The existing `Variant` is overloaded: it represents both a SKU for `purchase` products *and* a rentable thing for `rental` products. We will **not** repurpose `variants.price` to mean "per hour" — that breaks the purchase flow. Instead, **rental pricing is modeled as a separate, first-class entity** (`rental_pricing_scheme`) that a variant can opt into. `variants.price` remains the unit price for purchase variants and is unused for rental variants.

---

## Proposed Solution: Configurable Pricing Schemes

### Feature Overview

Introduce a **Rental Pricing Scheme** entity that the admin can CRUD from the UI. Each scheme defines *how* a rental is priced — by hour with rounding rules, or flat per session — and is selected at **check-in time** along with a **player count**. At check-out, the system computes the price from the captured scheme + player count + actual duration.

### Core Concepts

| Concept | Description |
|---|---|
| **Rental Pricing Scheme** | A reusable, admin-editable pricing definition (e.g., "Hourly", "All Day Weekday", "All Day Weekend"). Has a name, a `pricing_type`, and type-specific configuration. Linked to one or more rental variants. |
| **Pricing Type** | Enum: `hourly` (duration-based with rounding) or `flat` (one price per session, regardless of duration). New types can be added later without breaking existing schemes. |
| **Hourly Tier** | For `hourly` schemes only: an ordered row defining the price for a billing block (e.g., "30 minutes = Rp. 7,500 per person"). The simplest hourly scheme has a single tier representing the per-block rate; richer schemes can layer multiple tiers (e.g., first hour 15K, then 10K/half-hour). |
| **Grace Minutes** | For `hourly` schemes: the threshold in minutes that determines whether a partial block rounds up or down (e.g., 15 minutes — anything ≤15 min over a block is forgiven, anything ≥15 min rounds up to the next block). |
| **Max Duration** | For `hourly` schemes: an optional cap (e.g., 6 hours) beyond which the customer is no longer charged additional blocks. Replaces the hardcoded `MAX_HOUR` constant. |
| **Player Count** | The number of people playing under one rental. Pricing is `per_person × players` for both pricing types. Captured at check-in. |
| **Rental Pricing Snapshot** | A frozen copy of the scheme's configuration stored on the `rental` row at check-in, so price recomputation at check-out (and historical audit) uses the rules that existed when the customer started — not whatever the admin edits later. |

### Why a Separate Entity (Not a Field on Variant)?

- **Reusability**: One "Hourly" scheme can be attached to multiple variants (different board games) without duplicating rates.
- **Editability**: Admin updates the scheme once; future check-ins pick up the new rate.
- **Auditability**: Snapshot on the rental row preserves what the customer was quoted at check-in, even if the scheme is edited or deleted later.
- **Extensibility**: New pricing types (`tiered_hourly`, `peak_offpeak`, `package_deal`) can be added as new `pricing_type` enum values without disturbing existing data.
- **Separation of concerns**: `variants.price` continues to mean "unit price for a purchase product"; rental economics live in their own table.

### Why Snapshot on the Rental Row?

A customer checks in at 7pm under "Hourly @ 15K". At 8pm the admin raises the rate to 17K for the next day. The customer checks out at 9pm. They must be billed at the **15K rate they agreed to**, not the new 17K. Snapshotting the relevant fields onto the `rental` row makes this trivial and survives scheme edits, soft-deletes, and migrations.

---

## Feature Requirements

### FR-1: Rental Pricing Scheme Management

The system shall allow users to create, view, edit, and soft-delete rental pricing schemes from an admin screen.

**A scheme consists of:**
- **Name** (required, unique among non-deleted schemes): e.g., "Hourly", "All Day Weekday", "All Day Weekend"
- **Pricing Type** (required, immutable after create): `hourly` or `flat`
- **Description** (optional): Free text explaining when to use this scheme
- **Active flag** (default `true`): Inactive schemes don't appear in the check-in picker but are kept for historical reference

**For `hourly` schemes (additional fields):**
- **Block Duration Minutes** (required, default `60`): The size of one billing block. `60` = bill per hour; `30` = bill per half-hour.
- **Grace Minutes** (required, default `15`): Partial block ≤ grace rounds **down** (not charged); partial block > grace rounds **up** to the next full block.
- **Price Per Person Per Block** (required, > 0): The base rate per block per person, e.g., `15000`.
- **Max Blocks** (optional): Cap on billable blocks per rental (e.g., 6 blocks of 60 min = 6-hour cap). When unset, no cap.

**For `flat` schemes (additional fields):**
- **Price Per Person** (required, > 0): The flat rate, e.g., `50000` for All Day Weekday.

**Rules:**
- A scheme cannot change `pricing_type` after creation (would invalidate snapshots' interpretation). To "change type", create a new scheme and deactivate the old.
- Soft-delete only — historical rentals must still resolve their snapshot via the scheme id for read-only audit.
- `price_per_person_per_block` and `price_per_person` are stored in the same currency unit as `variants.price` (Rupiah, integer-like float).
- The seed migration shall create the three concrete schemes the cafe uses today: `Hourly` (60-min block, 15-min grace, 15K/block, 6-block cap), `All Day Weekday` (50K flat), `All Day Weekend` (60K flat).

### FR-2: Linking Schemes to Variants

A rental variant shall declare which pricing schemes are valid choices for it.

- A new join table `variant_pricing_schemes(variant_id, scheme_id)` lets one variant accept multiple schemes (e.g., a board game offers Hourly, All Day Weekday, and All Day Weekend) and one scheme power many variants.
- A variant of a `rental` product **must** have at least one linked active scheme to be checkin-able. The checkin endpoint returns `400` if the picked scheme is not linked to the picked variant.
- Purchase-type variants are unaffected — no scheme link is required, and the checkin flow does not apply.

### FR-3: Check-in Captures Scheme + Player Count + Snapshot

The check-in screen and `POST /rentals/checkin` endpoint shall accept and store, per rental:

- `variant_id` (existing)
- `pricing_scheme_id` (new, required for rental variants)
- `player_count` (new, integer ≥ 1, required)
- `name`, `code`, `checkin_at` (existing)

On insert, the server **snapshots** the chosen scheme's fields onto the `rentals` row:

- `snapshot_pricing_type`
- `snapshot_block_minutes` (nullable; only for hourly)
- `snapshot_grace_minutes` (nullable; only for hourly)
- `snapshot_price_per_block` (nullable; only for hourly)
- `snapshot_max_blocks` (nullable; only for hourly)
- `snapshot_flat_price` (nullable; only for flat)

These snapshot columns are the **source of truth** for pricing at check-out. The `pricing_scheme_id` foreign key remains for reporting/joins, but the math never re-reads the live scheme.

### FR-4: Check-out Computes Price From Snapshot

The check-out flow (`POST /rentals/checkout`) shall replace the current ad-hoc math with a `PricingCalculator` that switches on `snapshot_pricing_type`:

**`hourly`:**
```
duration_minutes = checkout_at - checkin_at
full_blocks      = duration_minutes / snapshot_block_minutes  (integer divide)
remainder        = duration_minutes % snapshot_block_minutes
billable_blocks  = full_blocks + (1 if remainder > snapshot_grace_minutes else 0)
billable_blocks  = min(billable_blocks, snapshot_max_blocks)  -- if cap set
price            = snapshot_price_per_block * billable_blocks * player_count
```

**`flat`:**
```
price = snapshot_flat_price * player_count
```

The `TransactionItem.Amount` field shall record the unit count used (`billable_blocks` for hourly, `1` for flat) and `Price` shall record the per-unit per-person rate, so the existing transaction reporting continues to work.

### FR-5: Worked Examples (Acceptance Tests)

Using the seeded schemes:

| # | Scheme | Players | Duration | Expected | Formula |
|---|---|---:|---|---:|---|
| 1 | Hourly | 1 | 2h 0m | 30,000 | `15000 × 2 × 1` |
| 2 | Hourly | 2 | 3h 0m | 90,000 | `15000 × 3 × 2` |
| 3 | Hourly | 1 | 1h 15m | 15,000 | remainder = 15m, **not** > 15m grace → no extra block → `15000 × 1 × 1` |
| 4 | Hourly | 1 | 1h 16m | 30,000 | remainder = 16m > 15m grace → +1 block → `15000 × 2 × 1` |
| 5 | Hourly | 1 | 1h 35m | 30,000 | remainder = 35m > 15m → +1 block → `15000 × 2 × 1` |
| 6 | Hourly | 1 | 7h 0m | 90,000 | capped at 6 blocks → `15000 × 6 × 1` |
| 7 | All Day Weekday | 1 | any | 50,000 | flat |
| 8 | All Day Weekday | 3 | any | 150,000 | `50000 × 3` |
| 9 | All Day Weekend | 2 | any | 120,000 | `60000 × 2` |

> **Open question / clarification needed.** The user-facing description in the request states *"1 hour 15 min → 20K (treated as 1.5 hours)"*. Under the rule above (and under a literal "15K/hour, half-hour blocks") that case yields **15K** (grace forgives the 15-minute remainder) or **22.5K** (round-up to 1.5h × 15K), not 20K. We propose to confirm with the owner whether (a) the example was a typo — in which case rows 3-5 above stand, or (b) the cafe actually runs a custom tier table where 1.5h costs 20K — in which case we extend the data model in **FR-6** below before implementing the calculator. **The rest of this TRD assumes (a).**

### FR-6: Optional — Multi-Tier Hourly (Deferred Until Confirmed)

If clarification of FR-5 reveals the cafe wants per-duration tier prices (e.g., up to 1h = 15K, up to 1.5h = 20K, up to 2h = 30K), introduce a child table:

```
rental_pricing_scheme_tiers(
  id, scheme_id, up_to_minutes INT, price_per_person FLOAT, sort_order INT
)
```

The hourly calculator becomes a lookup: find the smallest `up_to_minutes` ≥ `duration_minutes` and use that tier's price. Snapshotting copies the relevant tier rows into a JSON column on `rentals` (`snapshot_tiers_json`) to preserve history.

This is **deferred** because the three real-world schemes the cafe uses today (Hourly, All Day Weekday, All Day Weekend) are fully expressible by FR-1 through FR-5.

### FR-7: Admin UI Surface

A new screen at `/pricing-schemes` (web) shall expose:

- **List view**: name, type, headline rate (e.g., "Rp. 15,000/hour", "Rp. 50,000 flat"), active toggle, edit/delete actions.
- **Create/Edit form**: name, type (radio, locked on edit), description, active flag, and type-conditional fields per FR-1.
- **Variant linking**: from the existing variant edit screen (`apps/web/src/pages/products/[productId]/variants/...`), a multi-select of available schemes for rental-type variants.

The check-in screen shall add:
- A **scheme picker** (only schemes linked to the chosen variant, only `active = true`).
- A **player count** numeric input (default `1`, min `1`).

The check-out confirmation shall display, per rental, the computed line: `scheme name × player count × duration → subtotal`.

---

## Data Model Changes

### New table: `rental_pricing_schemes`
```
id                      BIGINT PK AUTO_INCREMENT
name                    VARCHAR(255) NOT NULL
pricing_type            ENUM('hourly','flat') NOT NULL
description             TEXT NULL
is_active               BOOLEAN NOT NULL DEFAULT TRUE
block_minutes           INT NULL          -- hourly only
grace_minutes           INT NULL          -- hourly only
price_per_block         FLOAT NULL        -- hourly only
max_blocks              INT NULL          -- hourly only, optional cap
flat_price              FLOAT NULL        -- flat only
created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
deleted_at              DATETIME NULL
UNIQUE KEY uniq_active_name (name, deleted_at)
CHECK (
  (pricing_type='hourly' AND block_minutes IS NOT NULL AND grace_minutes IS NOT NULL AND price_per_block IS NOT NULL AND flat_price IS NULL)
  OR
  (pricing_type='flat'   AND flat_price IS NOT NULL AND block_minutes IS NULL AND grace_minutes IS NULL AND price_per_block IS NULL AND max_blocks IS NULL)
)
```

### New table: `variant_pricing_schemes`
```
id          BIGINT PK AUTO_INCREMENT
variant_id  BIGINT NOT NULL  REFERENCES variants(id)
scheme_id   BIGINT NOT NULL  REFERENCES rental_pricing_schemes(id)
created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
UNIQUE KEY uniq_variant_scheme (variant_id, scheme_id)
```

### Altered table: `rentals` (add columns)
```
pricing_scheme_id           BIGINT NOT NULL  REFERENCES rental_pricing_schemes(id)
player_count                INT    NOT NULL DEFAULT 1  CHECK (player_count >= 1)
snapshot_pricing_type       ENUM('hourly','flat') NOT NULL
snapshot_block_minutes      INT    NULL
snapshot_grace_minutes      INT    NULL
snapshot_price_per_block    FLOAT  NULL
snapshot_max_blocks         INT    NULL
snapshot_flat_price         FLOAT  NULL
KEY idx_rentals_scheme_id (pricing_scheme_id)
```

### Backfill plan for existing rentals

The hardcoded behavior is `15K × hours, 15-min round-up, 6h cap, 1 player`. The migration shall:

1. Insert seed schemes (`Hourly`, `All Day Weekday`, `All Day Weekend`).
2. Backfill every existing `rentals` row with `pricing_scheme_id = id_of('Hourly')`, `player_count = 1`, and the snapshot columns set from the `Hourly` scheme.
3. Backfill `variant_pricing_schemes` so every existing rental-type variant is linked to all three seeded schemes.

---

## API Changes

All new endpoints follow the existing handler/usecase/repository conventions in `apps/api/presentation/restapi/`.

| Method | Path | Purpose |
|---|---|---|
| `GET`    | `/pricing-schemes`                    | List (paginated, filter by `is_active`) |
| `GET`    | `/pricing-schemes/{id}`               | Read one |
| `POST`   | `/pricing-schemes`                    | Create |
| `PUT`    | `/pricing-schemes/{id}`               | Update (cannot change `pricing_type`) |
| `DELETE` | `/pricing-schemes/{id}`               | Soft delete |
| `GET`    | `/variants/{id}/pricing-schemes`      | List schemes linked to a variant |
| `PUT`    | `/variants/{id}/pricing-schemes`      | Replace the linked-scheme set for a variant |

**Modified existing endpoints:**

- `POST /rentals/checkin` — request body adds required `pricing_scheme_id` and `player_count` per item; server validates link, snapshots scheme, persists.
- `POST /rentals/checkout` — no signature change. The math switches to the snapshot-driven calculator.
- `GET /rentals` and `GET /rentals/{id}` — response includes `pricing_scheme`, `player_count`, and (for ongoing rentals) a server-computed `running_total` so the UI can show "current cost so far".

OpenAPI updates live in `libs/api-contract/src/api.yaml` and regenerate the TS client consumed by both `apps/web` and `apps/mobile`.

---

## Out of Scope

- **Time-of-day pricing** (peak/off-peak hours within a day).
- **Auto-detecting weekday vs. weekend at check-in.** Staff selects the correct scheme manually; the form orders schemes so the right one is the obvious default for the current day, but no automatic switching.
- **Discount rules / coupons** stacked on top of rental pricing — coupons today apply to transactions, and that path remains unchanged.
- **Per-customer pricing or membership discounts.**
- **Multi-tier hourly pricing** (FR-6) — deferred pending clarification of the FR-5 example.
- **Mid-rental scheme switching** (e.g., starting hourly and converting to All Day partway through). If needed later, model as check-out + immediate re-check-in under the new scheme.

---

## Open Questions

1. **FR-5 row 3 ambiguity.** Confirm whether "1h 15m → 20K" is a typo or a real tier requirement that triggers FR-6.
2. **Deposit / damage handling.** Out of scope here, but if the cafe takes a deposit per rental, surface it as a separate line item in a follow-up TRD.
3. **Late check-out enforcement.** When a `Hourly` rental hits `max_blocks`, do we want the system to prompt staff to convert to "All Day"? Currently the behavior is: keep accruing real time but cap the bill — staff intervention is manual.
