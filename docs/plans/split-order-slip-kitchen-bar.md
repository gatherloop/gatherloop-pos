# Plan: One Order Slip Grouped by Kitchen & Bar Stations

> **Update (2026-06-22):** an earlier iteration of this plan printed **two
> separate** slips (one kitchen, one bar) at separate times. That confused the
> bar: after finishing the drinks they couldn't tell whether the kitchen still
> owed the customer food, because the kitchen items weren't on the bar slip. The
> current design instead prints **one combined `ORDER_SLIP`** whose items are
> **grouped by station** (`bars` / `kitchens`), so both stations see the whole
> order. Sections below have been updated to match; the backend `station`-on-
> `Category` work (Phases 1–2) is unchanged.

## Background

Currently, when a transaction is created, a single "order slip" is printed
containing **all** order items. Items still need to be routed to the **bar** and
the **kitchen**, but printing two separate slips at separate times meant neither
station could see the other's items — so the bar never knew if the kitchen had
finished, or whether to call the customer.

This plan introduces a way to mark which products belong to the kitchen, which
belong to the bar, and which belong to neither (e.g. a "Board Game Ticket",
which is not made by either station). From that marking we produce **one order
slip whose items are grouped by station**, printed once after creating a
transaction and from the transaction list menu.

## Design Summary

- **Station lives on `Category`**: add a `station` enum =
  `KITCHEN | BAR | NONE`. Every product inherits its station from its category.
  Products in a `NONE` category (e.g. "Board Game Ticket") appear on the invoice
  but on **neither** group of the order slip.
- **Print flow after create**: sequential confirmations —
  *Print Invoice?* → *Print Order Slip?* — where the order slip dialog only
  appears if at least one item belongs to the bar or kitchen.
- **Transaction menu**: a single *Print Order Slip* action (shown when the
  transaction has any bar/kitchen item).

### Why station on Category (not Product)?

Products already each belong to exactly one `Category` (many-to-one). Tagging at
the category level matches how a cafe organizes its menu (Drinks → bar, Food →
kitchen, Tickets → none) and avoids re-tagging every individual product. New
products inherit a sensible station automatically from their category.

## Key Facts Driving the Design

- Order slips are rendered by an **external printer service** at
  `ws://localhost:8080`; the app sends a JSON `PrintPayload`
  (`libs/ui/src/utils/print.ts`). The `TransactionPrintEmployee.tsx` component is
  effectively legacy — the service does the actual rendering. So splitting the
  slip = **filtering `items` by station + telling the service which station** it
  is.
- The OpenAPI spec (`libs/api-contract/src/api.yaml`) is the **single source of
  truth**; backend Go types and frontend TS types/hooks are codegen'd from it via
  `@kubb`. Any model change starts there.
- Station must be reachable from a transaction item at print time:
  `transactionItem.variant.product.category.station`. We must confirm the
  transaction GET response serializes the nested category (it should once the
  field is added to the Category schema).

## Relevant Files

| Concern | File |
| --- | --- |
| API contract (source of truth) | `libs/api-contract/src/api.yaml` |
| DB migrations | `apps/api/migrations/` |
| Category backend entity | `apps/api/domain/category_entity.go` |
| Category frontend entity | `libs/ui/src/domain/entities/Category.ts` |
| Print payload + hook | `libs/ui/src/utils/print.ts` |
| Create-transaction print flow | `libs/ui/src/presentation/screens/TransactionCreateHandler.tsx` |
| Transaction list print flow | `libs/ui/src/presentation/screens/TransactionListHandler.tsx` |
| Transaction list item menu | `libs/ui/src/presentation/components/transactions/TransactionListItem.tsx` |
| Legacy slip template (reference) | `libs/ui/src/presentation/components/transactions/TransactionPrintEmployee.tsx` |

---

## System Design

### 1. Where the marking is stored

A single new column on the existing `categories` table. No new tables, no new
relationships — products already reference a category via `products.category_id`,
so a product's station is `product → category → station`.

**`categories` table — before:**

```sql
CREATE TABLE IF NOT EXISTS `categories` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(255) NOT NULL,
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` DATETIME     NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**`categories` table — after (new column shown):**

```sql
CREATE TABLE IF NOT EXISTS `categories` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(255) NOT NULL,
    `station`    VARCHAR(20)  NOT NULL DEFAULT 'NONE',  -- KITCHEN | BAR | NONE
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` DATETIME     NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> **Why `VARCHAR(20)` and not a native `ENUM`?** It matches the existing
> convention in this codebase — `products.sale_type` and other status-like fields
> are stored as `VARCHAR` and validated at the application/contract layer (Zod +
> Go), keeping the enum's source of truth in the OpenAPI spec rather than split
> across the DB. `NOT NULL DEFAULT 'NONE'` means every existing row is valid
> immediately and no backfill is required.

**Migration** (`apps/api/migrations/0000NN_add_category_station.up.sql`):

```sql
ALTER TABLE categories ADD COLUMN station VARCHAR(20) NOT NULL DEFAULT 'NONE';
```

**Down** (`...down.sql`):

```sql
ALTER TABLE categories DROP COLUMN station;
```

This mirrors the existing `000011_add_wallet_is_payment_target` migration pattern.

### 2. Entity-relationship view

```
┌──────────────┐        ┌──────────────┐        ┌──────────────────────┐
│  categories  │ 1    * │   products   │ 1    * │      variants        │
│──────────────│◄───────│──────────────│◄───────│──────────────────────│
│ id           │        │ id           │        │ id                   │
│ name         │        │ category_id  │        │ product_id           │
│ station ◄NEW │        │ name         │        │ ...                  │
│ created_at   │        │ sale_type    │        └──────────┬───────────┘
│ deleted_at   │        └──────────────┘                   │ 1
└──────────────┘                                           │
                                                           │ *
                                              ┌────────────▼───────────┐
                                              │   transaction_items    │
                                              │────────────────────────│
                                              │ id                     │
                                              │ transaction_id         │
                                              │ variant_id             │
                                              │ product_name           │
                                              └────────────────────────┘
```

A transaction item resolves its station by walking
`transaction_item → variant → product → category → station`. No schema change is
needed on `transactions` / `transaction_items`; the station is derived, not
copied. (See §5 for the one nuance this creates.)

### 3. Type changes per layer (the contract is the source of truth)

All of these flow from one edit to `libs/api-contract/src/api.yaml`, then `@kubb`
regenerates the Go and TS types.

**OpenAPI — `Category` schema** (`api.yaml`, add to `properties` + `required`):

```yaml
Category:
  required:
    - id
    - name
    - station        # NEW
    - createdAt
  properties:
    id: { type: integer, format: int64 }
    name: { type: string }
    station:         # NEW
      type: string
      enum: [KITCHEN, BAR, NONE]
    createdAt: { type: string, format: date-time }
    deletedAt: { type: string, format: date-time }

CategoryRequest:
  required:
    - name
    - station        # NEW
  properties:
    name: { type: string }
    station:         # NEW
      type: string
      enum: [KITCHEN, BAR, NONE]
```

**Backend Go — three structs + four transformers must carry the field:**

| Layer | File | Change |
| --- | --- | --- |
| Domain entity | `apps/api/domain/category_entity.go` | add `Station string` |
| DB model | `apps/api/data/mysql/category_entity.go` | add `Station string` |
| DB ↔ domain | `apps/api/data/mysql/category_transformer.go` | map `Station` in `ToCategoryDB` + `ToCategoryDomain` |
| domain ↔ API | `apps/api/presentation/restapi/category_transformer.go` | map `Station` in `ToApiCategory` + `ToCategory` (request→domain) |

GORM here uses `db.Table("categories")` with field-name→column mapping, so adding
`Station` to the struct is enough for it to be selected/inserted/updated — no
extra tags required.

**Frontend TS — `libs/ui/src/domain/entities/Category.ts`:**

```ts
export type CategoryStation = 'KITCHEN' | 'BAR' | 'NONE';

export type Category = {
  id: number;
  name: string;
  station: CategoryStation;   // NEW
  createdAt: string;
};

export type CategoryForm = {
  name: string;
  station: CategoryStation;   // NEW
};
```

### 4. Print payload design

The order slip is not rendered by the app — it is serialized to JSON and sent
over a WebSocket to an external printer service (`ws://localhost:8080`). The app
sends **one** `ORDER_SLIP` message whose items are pre-grouped into `bars` and
`kitchens`; the printer service prints both groups under their own headers on a
single slip.

**`libs/ui/src/utils/print.ts` — `PrintPayload` change:**

```ts
// before
{ type: 'INVOICE' | 'ORDER_SLIP'; transaction: TransactionPrintPayload }

// after
| { type: 'INVOICE'; transaction: TransactionPrintPayload }
| { type: 'ORDER_SLIP'; orderSlip: OrderSlipPrintPayload }

// where the order slip transaction is grouped by station and only carries the
// fields the slip needs (no price/coupons):
type OrderSlipItem = { name: string; amount: number; note: string };
type OrderSlipPrintPayload = {
  createdAt: string;
  paidAt?: string;
  name: string;
  orderNumber: number;
  items: { bars: OrderSlipItem[]; kitchens: OrderSlipItem[] };
};
```

**Shared helper** (grouping lives in one place, used by both the create flow and
the list menu):

```ts
function buildOrderSlipPayload(transaction: OrderSlipSource): PrintPayload | null {
  const group = (station: 'KITCHEN' | 'BAR') =>
    transaction.items
      .filter((item) => item.variant.product.category.station === station)
      .map(({ variant, amount, note }) => ({ name: nameOf(variant), amount, note }));

  const bars = group('BAR');
  const kitchens = group('KITCHEN');
  if (bars.length === 0 && kitchens.length === 0) return null; // skip empty slip
  return { type: 'ORDER_SLIP', orderSlip: { ...mapped, items: { bars, kitchens } } };
}
```

Items whose category station is `NONE` (e.g. Board Game Ticket) match neither
group, so they never appear on the order slip — but they still appear on the
INVOICE, which is unfiltered.

### 5. Data-availability check (important)

For filtering to work at print time, every code path that prints must be able to
read `item.variant.product.category.station`:

- **Create flow** (`TransactionCreateHandler`): builds the payload from the
  **form** values (`variant.product...`). The products loaded into the create
  screen already include their `category`, so the field is present once the TS
  type carries it. ✅ Low risk.
- **List menu** (`TransactionListHandler`): builds from the **fetched
  transaction**. We must confirm the `GET /transactions` (and
  `/transactions/{id}`) response serializes the nested
  `transactionItems[].variant.product.category` **including the new `station`
  field**. Adding `station` to the `Category` schema makes it available wherever
  Category is already nested; the task is to **verify** it is not stripped by an
  intermediate transformer. This verification is an explicit step in Phase 1/3.

> Design note: because station is *derived* from the live category, re-printing an
> old transaction reflects the category's **current** station, not the station at
> the time of sale. That is the desired behavior here (a slip is an operational
> routing document, not a historical record), and it avoids denormalizing station
> onto `transaction_items` the way `product_name` was snapshotted. If historical
> accuracy were ever required, the alternative would be to copy `station` onto
> `transaction_items` at creation time — explicitly **not** chosen.

### 6. End-to-end sequence (create flow)

```
Cashier submits transaction
        │
        ▼
  Payment success
        │
        ▼
  "Print Invoice?" ──Yes──► print({type:'INVOICE', ...all items})
        │                                │
        └──No──────────────┐             ▼
                           ▼     "Print Order Slip?"  (only if any bar/kitchen item exists)
                                          │
                                   Yes──► print({type:'ORDER_SLIP', items:{bars, kitchens}})
                                          │
                                          ▼
                                  navigate to /transactions
```

The list-menu flow (Phase 5) reuses the same `buildOrderSlipPayload` helper but
is triggered directly from a single menu action, with no chained dialogs.

---

## Phase 1 — Add `station` to Category (backend + contract only)

**Goal:** the data model supports the marking. No UI, no behavior change yet —
a safe, isolated PR.

1. `libs/api-contract/src/api.yaml`: add a `station` enum
   (`KITCHEN` / `BAR` / `NONE`) to the `Category` response schema and to
   `CategoryRequest`. Regenerate contracts (Go + TS).
2. New migration `0000NN_add_category_station.up.sql` / `.down.sql`: add
   `station VARCHAR(20) NOT NULL DEFAULT 'NONE'` to `categories`. (All existing
   categories default to `NONE`; staff classify them in Phase 2.)
3. Backend `apps/api/domain/category_entity.go`: add a `Station` field; thread it
   through the category repository, usecase, and create/update handlers so it is
   persisted and returned.
4. Verify the field is included wherever `Category` is serialized nested
   (product responses, and transaction-item → variant → product → category).

**Reviewable as:** schema + contract + backend persistence.
**Tests:** category create/update round-trips `station`.

## Phase 2 — Category admin UI for setting station

**Goal:** staff can tag each category. Still no print change.

1. `libs/ui/src/domain/entities/Category.ts`: add `station` to `Category` and
   `CategoryForm`.
2. Category create/edit forms + controllers: add a station `Select`
   (Kitchen / Bar / None).
3. Show the station on the category list/detail (small badge) for visibility.

**Reviewable as:** a focused UI PR. After this ships, categories can be
classified in production ahead of the print change.

## Phase 3 — Station-grouped print payload + helper

**Goal:** the core logic to produce one order slip grouped by station. Pure
utility, unit-testable in isolation.

1. `libs/ui/src/utils/print.ts`: give `ORDER_SLIP` its own
   `OrderSlipPrintPayload` whose `items` is `{ bars, kitchens }`, each an
   `OrderSlipItem` (`name`, `amount`, `note`). The service prints both groups
   under their own headers on a single slip.
2. Add a shared helper `buildOrderSlipPayload(transaction)` that **groups items
   by `category.station`** and returns `null` when no item belongs to the bar or
   kitchen — so callers can skip an empty slip.
3. **Coordinate the printer service** (separate component/repo) to render the two
   station groups. This is an external dependency to flag and scope.

**Reviewable as:** pure utility + types.
**Tests:** items across stations → correct grouping; `NONE` excluded from both.

## Phase 4 — Wire the create-transaction flow

**Goal:** sequential confirmations after payment.

1. `TransactionCreateHandler.tsx` (the `payingSuccess` effect): change the chain
   to *Invoice → Order Slip*, where the order slip dialog is shown only if at
   least one item belongs to the bar or kitchen (using the Phase 3 helper).
   Preserve the existing cancel/skip and navigation-to-`/transactions` behavior.

**Reviewable as:** one screen-handler change, behavior visible end-to-end.

## Phase 5 — Wire the transaction-list menu

**Goal:** a single order-slip menu action.

1. `TransactionListItem.tsx`: a single `onPrintOrderSlipMenuPress` "Printer" menu
   entry (web-only as today). A transaction always has items, so the entry is
   always shown on web.
2. `TransactionListHandler.tsx`: implement the handler using the Phase 3 helper.

**Reviewable as:** menu + handler change, mirrors Phase 4.

---

## Sequencing & Risk Notes

- Phases **1 → 2** can ship and let staff classify categories **before** any
  print behavior changes — a zero-risk rollout.
- Phases **4 & 5** depend on **3** (and on the printer service being updated). If
  the printer-service update lags, Phases 4/5 can still send filtered items; only
  the printed header would be missing.
- Default `NONE` means that until categories are classified, **both groups on
  the order slip would be empty** — so Phase 2 classification must happen before
  Phases 4/5 reach production. Good candidate for a feature flag, or simply order
  the merges accordingly.

## Open Coordination Item

The **printer service** at `ws://localhost:8080` is external to this repo's
frontend. Confirming how it should render the two station groups (`bars` /
`kitchens`) under their own headers on a single slip is the one cross-team
dependency. We should check whether that service lives in an accessible repo so
its change can be scoped alongside Phase 3.
