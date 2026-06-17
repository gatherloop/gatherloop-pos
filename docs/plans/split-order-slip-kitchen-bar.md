# Plan: Split Order Slip into Kitchen & Bar Slips

## Background

Currently, when a transaction is created, a single "order slip" is printed
containing **all** order items. In reality, after the cashier prints the slip,
the order has to be communicated to **two separate stations** — the **bar** and
the **kitchen** — each of which should only see the items it is responsible for
making.

This plan introduces a way to mark which products belong to the kitchen, which
belong to the bar, and which belong to neither (e.g. a "Board Game Ticket",
which is not made by either station). From that marking we produce **two order
slips** — one for the kitchen and one for the bar — both after creating a
transaction and from the transaction list menu.

## Design Summary

- **Station lives on `Category`**: add a `station` enum =
  `KITCHEN | BAR | NONE`. Every product inherits its station from its category.
  Products in a `NONE` category (e.g. "Board Game Ticket") appear on the invoice
  but on **neither** order slip.
- **Print flow after create**: sequential confirmations —
  *Print Invoice?* → *Print Kitchen Slip?* → *Print Bar Slip?* — where a slip
  dialog only appears if that station actually has items.
- **Transaction menu**: replace the single *Print Order Slip* with
  *Print Kitchen Slip* and *Print Bar Slip*.

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

## Phase 3 — Station-aware print payload + filtering helper

**Goal:** the core logic to produce a per-station order slip. Pure utility,
unit-testable in isolation.

1. `libs/ui/src/utils/print.ts`: extend the order-slip payload with a
   `station: 'KITCHEN' | 'BAR'` field (keep `type: 'ORDER_SLIP'` for backward
   compatibility, or introduce `ORDER_SLIP_KITCHEN` / `ORDER_SLIP_BAR` — decide
   with the printer-service owner). The service prints the station as a header.
2. Add a shared helper, e.g. `buildOrderSlipPayload(transaction, station)`, that
   **filters items to that station** via `category.station` and returns
   `null`/empty when no items — so callers can skip empty slips.
3. **Coordinate the printer service** (separate component/repo) to render the
   station header. This is an external dependency to flag and scope.

**Reviewable as:** pure utility + types.
**Tests:** items across stations → correct split; `NONE` excluded from both.

## Phase 4 — Wire the create-transaction flow

**Goal:** sequential confirmations after payment.

1. `TransactionCreateHandler.tsx` (the `payingSuccess` effect): change the chain
   to *Invoice → Kitchen slip → Bar slip*, each dialog shown only if that station
   has items (using the Phase 3 helper). Preserve the existing cancel/skip and
   navigation-to-`/transactions` behavior.

**Reviewable as:** one screen-handler change, behavior visible end-to-end.

## Phase 5 — Wire the transaction-list menu

**Goal:** per-station menu actions.

1. `TransactionListItem.tsx`: replace `onPrintOrderSlipMenuPress` with
   `onPrintKitchenSlipMenuPress` + `onPrintBarSlipMenuPress` (two "Printer" menu
   entries, web-only as today). Optionally hide a station's entry when the
   transaction has no items for it.
2. `TransactionListHandler.tsx`: implement both handlers using the Phase 3
   helper.

**Reviewable as:** menu + handler change, mirrors Phase 4.

---

## Sequencing & Risk Notes

- Phases **1 → 2** can ship and let staff classify categories **before** any
  print behavior changes — a zero-risk rollout.
- Phases **4 & 5** depend on **3** (and on the printer service being updated). If
  the printer-service update lags, Phases 4/5 can still send filtered items; only
  the printed header would be missing.
- Default `NONE` means that until categories are classified, **both order slips
  would be empty** — so Phase 2 classification must happen before Phases 4/5
  reach production. Good candidate for a feature flag, or simply order the merges
  accordingly.

## Open Coordination Item

The **printer service** at `ws://localhost:8080` is external to this repo's
frontend. Confirming how it should distinguish/label kitchen vs bar is the one
cross-team dependency. We should check whether that service lives in an
accessible repo so its change can be scoped alongside Phase 3.
