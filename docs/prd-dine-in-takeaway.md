# PRD: Dine-in vs Takeaway — a dining option on every transaction, chosen at the POS and at order-app checkout

## Problem Statement

Transactions come from three creation paths, and none of them records whether the customer is
eating in or taking the order away:

1. **POS** — a cashier fills `TransactionCartView` (`libs/ui/src/presentation/views/components/transactions/TransactionCartView.tsx`),
   whose only header fields are `Customer Name` and `Pager Number`. The form schema
   (`transactionFormSchema` in `libs/ui/src/domain/entities/Transaction.ts`) is `name`,
   `pagerNumber`, `transactionItems`. It is sent as `TransactionRequest` (`name`, `pagerNumber`,
   `transactionItems`, `transactionCoupons` in `libs/api-contract/src/api.yaml`) and persisted by
   `TransactionUsecase.CreateTransaction` (`apps/api/domain/transaction_usecase.go`).
2. **Order app** — a guest at a table taps checkout; `CustomerDetailsSheet`
   (`libs/ui/src/presentation/views/components/checkout/CustomerDetailsSheet.tsx`) asks for a
   name, a WhatsApp number and a payment method, and `PaymentUsecase.Checkout`
   (`apps/api/domain/payment_usecase.go:86`) creates the transaction from the cart. Its request,
   `PaymentCheckoutRequest`, is `customerName`, `customerWhatsappNumber`, `method`.
3. **Rental checkout** — `RentalUsecase.CheckoutRentals` (`apps/api/domain/rental_usecase.go:90`)
   builds a `Transaction` literal with only `CreatedAt`, `Name` and `PagerNumber`.

Because nothing captures it, the dine-in/takeaway decision lives only in the cashier's head or a
guest's spoken request. Staff preparing the order look at the POS transaction list
(`TransactionListItem.tsx`) or, for a guest, the guest looks at their order history
(`OrderHistoryListItem.tsx`) — and neither can tell whether the order must be **plated** or
**packaged**. A takeaway order plated by mistake is redone; a dine-in order packaged by mistake
wastes packaging and looks careless at the table.

### Root cause

The `transactions` table (`000001_initial_schema.up.sql`, extended by `000023_add_transaction_source`
and later migrations) has no column for how the order is served, so there is nothing for any
screen to display and nothing for any form to write. This is a missing attribute, not a UI gap:
every surface in the acceptance criteria reads from `transactions`, directly
(`GET /transactions`) or through the order-history summary
(`GetTransactionSummariesByIds` in `apps/api/data/mysql/transaction_repo.go:311`).

---

## How the Industry Handles This

1. **It is called a "dining option", and it is an attribute of the order.** Toast pre-populates
   Dine In, Take Out, Delivery and Curbside as *dining options*, and states the purpose plainly:
   the dining option tells the kitchen whether to **plate or package** the food. Square uses the
   same name (For Here, To Go, Delivery, Pickup).
2. **There is always a default, and it is applied without asking.** In Square, the first dining
   option in the list is the default for every new sale and is applied to the ticket
   automatically; the cashier changes it only for the exception. Toast offers restaurant-wide and
   per-device defaults, with an optional "force a choice" prompt.
3. **Only the non-default is shown.** Square prints only non-default dining options on the order
   ticket — the default is implied by absence. This is exactly the acceptance criterion
   "no indicator if dine in".
4. **The option set grows.** Both vendors ship four options out of the box, not two. A design that
   can only express "takeaway: yes/no" will be rebuilt the first time delivery is added.

This PRD adopts 1–3 directly and designs the storage for 4 without building it (D2).

---

## Alternatives Considered

### Option A — A boolean `is_takeaway` column ❌

- ✅ Smallest possible change; reads naturally in `if` statements.
- ❌ **Cannot be switched back to dine-in on edit.** `Repository.UpdateTransactionById`
  (`apps/api/data/mysql/transaction_repo.go:191`) writes through GORM's
  `Updates(&dbTransaction)` with a struct, and GORM skips zero-value fields in a struct update — a
  `false` would silently never be written. The column would need special-casing in a method every
  other field shares.
- ❌ Not extensible: delivery or pickup would mean a second migration and a data rewrite.

### Option B — A MySQL `ENUM('dine_in','takeaway')` column ❌

- ✅ The database rejects invalid values.
- ❌ Adding a value later is an `ALTER TABLE … MODIFY` on the largest table in the schema.
- ❌ No precedent here: `source` (`000023_add_transaction_source.up.sql`) and `cancel_reason`
  (`000041_add_payment_cancellation.up.sql`) are both `VARCHAR(16)`, validated in Go.

### Option C — Store it on the cart or the payment, not the transaction ❌

- ✅ The order-app flow already has a per-guest cart and payment to hang it on.
- ❌ POS transactions have no cart and no payment row, and the POS list — one of the two
  surfaces the acceptance criteria name — reads `transactions` only. The value would have to live
  in two places.

### Option D — A `dining_option VARCHAR(16) NOT NULL DEFAULT 'dine_in'` column on `transactions` ✅ **Recommended**

- ✅ Mirrors the `source` column exactly: same type, same validation style, same transformer
  pattern through every layer.
- ✅ Survives GORM's struct `Updates`: `"takeaway"` and `"dine_in"` are both non-zero strings, so
  editing either way writes; an **absent** value (`""`) is skipped, so a client that doesn't send
  the field on update can't clobber it (D6).
- ✅ `NOT NULL DEFAULT 'dine_in'` backfills every existing row in the same `ALTER`, with no data
  migration step.
- ✅ Delivery/pickup later is a new constant and a new enum value in the contract — no migration.

---

## Proposed Solution

### Concept mapping

| Today | After |
|---|---|
| Service style known only verbally | `transactions.dining_option` — `dine_in` or `takeaway`, on every transaction from every source |
| POS form: Customer Name, Pager Number | POS form: Customer Name, Pager Number, **Dining Option** (Dine In \| Takeaway), Dine In preselected |
| Order-app checkout sheet: name, WhatsApp, payment method | Checkout sheet: name, WhatsApp, **Makan di sini \| Bawa pulang**, payment method; Makan di sini preselected |
| POS list item: `Order` / fulfillment / cash badges for order-app rows only | Same, plus a purple **Takeaway** badge on any takeaway row, POS or order-app |
| Order history item: number + status pill | Same, plus a purple **Bawa pulang** pill on takeaway orders |

### FR-1 — Every transaction has a dining option

`dine_in` or `takeaway`, stored on `transactions.dining_option`, defaulting to `dine_in`. All three
creation paths get a value with no per-path code, because the default is applied in the one
repository method all three call, `Repository.CreateTransaction`
(`apps/api/data/mysql/transaction_repo.go:130`) — see D5.

### FR-2 — The POS transaction form offers the choice, defaulting to Dine In

A two-segment control labelled **Dining Option** with segments **Dine In** and **Takeaway**,
placed directly under `Pager Number` in `TransactionCartView`. On create it starts on Dine In
(`transactionCreate.ts`'s initial form values). On edit it is prefilled from the transaction
(`transactionUpdate.ts`), so an order-app transaction edited at the POS keeps the guest's choice
unless the cashier changes it.

```
┌───────────────────────────────────────────┐
│ Customer Name                             │
│ [ Andi                                  ] │
│ Pager Number                              │
│ [ 7                                     ] │
│ Dining Option                             │
│ ┌───────────────────┬───────────────────┐ │
│ │ ■ Dine In         │   Takeaway        │ │  ← Dine In preselected
│ └───────────────────┴───────────────────┘ │
│ ───────────────────────────────────────── │
│ Items                                     │
```

### FR-3 — The order-app checkout sheet offers the choice, defaulting to "Makan di sini"

In `CustomerDetailsSheet`, a new block titled **Makan di sini atau bawa pulang?** sits between the
WhatsApp field and the payment-method buttons, rendered as two side-by-side buttons in the same
selected/outlined style the payment-method buttons already use (`theme="blue"` when selected,
`variant="outlined"` otherwise, `minHeight={44}`). "Makan di sini" is preselected. The block is
always shown, regardless of `isCashPaymentEnabled`.

```
┌───────────────────────────────────────────┐
│ Data pemesan                              │
│ [ Nama Anda                             ] │
│ [ 0812 3456 7890                        ] │
│   Nomor ini akan kami gunakan …           │
│                                           │
│ Makan di sini atau bawa pulang?           │
│ ┌───────────────────┐┌──────────────────┐ │
│ │▓ Makan di sini   ▓││  Bawa pulang     │ │
│ └───────────────────┘└──────────────────┘ │
│                                           │
│ ┌───────────────────────────────────────┐ │
│ │ Bayar dengan QRIS                     │ │
│ └───────────────────────────────────────┘ │
│ [      Lanjutkan ke pembayaran          ] │
│ [               Batal                   ] │
└───────────────────────────────────────────┘
```

### FR-4 — The POS transaction list highlights takeaway, and only takeaway

`TransactionListItem` gains a `diningOption` prop. When it is `takeaway` a **Takeaway** badge with
a `ShoppingBag` icon renders in the subtitle's badge row; when `dine_in`, nothing renders. Purple
(`$purple5` background, `$purple11` text) is the one hue no existing badge uses — blue is `Order`,
orange is `Preparing`, green is `Ready`, yellow is `Cash · awaiting payment`, and red is the unpaid
card theme.

Today the subtitle is a plain `Rp.` string for POS rows and a `YStack` with a badge row only for
`source === 'order'`. The subtitle becomes: total on the first line, then a badge row rendered
whenever **any** badge applies, so a POS takeaway row gets a badge row it did not have before.

```
┌──────────────────────────────────────────────┐
│ ╭──────╮                                 ⋮   │  ← POS, takeaway
│ │ #44  │  Siti                               │
│ ╰──────╯  Rp. 35.000                         │
│           ( 🛍 Takeaway )                     │
│ ──────────────────────────────────────────── │
│ (🗓) 13/09 - 14:51   (🔔) PAGER NUMBER  3     │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│ ╭──────╮                                 ⋮   │  ← order app, takeaway
│ │ #43  │  Budi                               │
│ ╰──────╯  Rp. 52.000                         │
│           ( Order ) ( Preparing ) ( 🛍 Takeaway ) │
│ ──────────────────────────────────────────── │
│ (🗓) 13/09 - 14:47   (📍) TABLE  A1           │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│ ╭──────╮                                 ⋮   │  ← POS, dine in: unchanged
│ │ #42  │  Andi                               │
│ ╰──────╯  Rp. 87.000                         │
│ ──────────────────────────────────────────── │
│ (🗓) 13/09 - 14:32   (👛) WALLET  Cash        │
└──────────────────────────────────────────────┘
```

The badge row already sits in an `XStack gap="$2"`; it gains `flexWrap="wrap"` so three badges
reflow on compact width instead of overflowing.

### FR-5 — The order history highlights takeaway, and only takeaway

`OrderHistoryListItem` gains a `diningOption` prop. For `takeaway` a **Bawa pulang** pill (same
purple, same `StatusPill` component the file already defines) renders **next to the `#N` number**
on the left of the top row, leaving the payment/fulfillment status pill where it is on the right.
The item's `accessibilityLabel` becomes `Pesanan #N · Bawa pulang` for takeaway (unchanged for
dine-in), because the row is a single `accessibilityRole="button"` and a screen reader would not
otherwise announce the pill.

```
┌──────────────────────────────────────────┐
│ #43  ( Bawa pulang )    ( Sedang disiapkan ) │
│ 13/09/2026 14:47                         │
│ A1 · Budi                                │
│ 3 item · Rp52.000                        │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ #38                      ( Siap diambil )│  ← dine in: unchanged
│ 13/09/2026 12:05                         │
│ A1 · Budi                                │
│ 1 item · Rp18.000                        │
└──────────────────────────────────────────┘
```

### FR-6 — API contract

- A shared component schema `DiningOption: { type: string, enum: [dine_in, takeaway] }`.
- `Transaction.diningOption` — **required** in the response.
- `TransactionRequest.diningOption` — **optional** in the request.
- `PaymentCheckoutRequest.diningOption` — **optional** in the request.
- `PaymentSummary.diningOption` — **required** in the response (the order-history list item).

Optional-on-request / required-on-response is deliberate; see D7.

### FR-7 — Invalid values are rejected

A value other than `dine_in`, `takeaway` or absent returns `400`. The API decodes request bodies
with a bare `json.NewDecoder(...).Decode` (e.g. `GetTransactionRequest` in
`apps/api/presentation/restapi/transaction_transformer.go`), so the OpenAPI `enum` is not enforced
at runtime — validation is a domain method, `DiningOption.IsValid()`, called from the use cases.

---

## Design decisions

**D1 — The attribute is named `dining_option` / `diningOption` / `DiningOption`.** It is the term
Toast and Square both use for exactly this concept. *Alternatives rejected:* `order_type` —
"order" already means "came from the order app" in this codebase (`TransactionSourceOrder`,
`OrderBadge`), so "order type: order" would be a permanent confusion; `service_type` — generic
enough to be mistaken for payment or fulfillment; `is_takeaway` — see Option A.

**D2 — Stored values are `dine_in` and `takeaway`, as `VARCHAR(16) NOT NULL DEFAULT 'dine_in'`.**
Snake-case enum values have precedent in the contract (`sale_reversal`, `manual_set` on
`AvailabilityMovement`). The column is sized and typed like `source`. `delivery` / `pickup`
are anticipated but not added — adding one later is a constant, a contract enum value and a UI
segment, with no migration.

**D3 — The display labels are UI-only.** POS (English): **Dine In** / **Takeaway**. Order app
(Indonesian, matching the rest of the sheet): **Makan di sini** / **Bawa pulang**. The API never
carries a label.

**D4 — The default is `dine_in` everywhere, and it is preselected, not blank.** The acceptance
criteria require it; Square's default-applied-automatically model is the precedent. Forcing a
choice on every order (Toast's optional prompt) was rejected: it adds a tap to the majority case to
protect the minority case, and the takeaway state is visually loud enough (FR-2's segment, FR-4's
badge) that a missed toggle is noticeable before the food is ready.

**D5 — The create-time default lives in `Repository.CreateTransaction`, not in the use cases.**
When `DiningOption` is empty the repository sets `dine_in` before the insert. All three creation
paths funnel through that method, so none can forget. The need is not hypothetical:
`TransactionUsecase.CreateTransaction` defaults `Source` to `pos` (`transaction_usecase.go:60`),
but `CheckoutRentals` builds its `Transaction` without a `Source` and never passes through that
use case — so rental transactions are written with an empty `source` today. The DB column
`DEFAULT` alone would not cover it either: GORM inserts a zero-value `""` explicitly for a
non-pointer string field without a `default` struct tag. *Alternative rejected:* a
`gorm:"default:dine_in"` struct tag — it works, but it hides a domain rule in a persistence
annotation that the domain tests cannot see.

**D6 — On update, an absent value leaves the stored one unchanged.** `UpdateTransactionById`
passes the request through GORM's struct `Updates`, which skips `""`. So a client that omits
`diningOption` (an installed `pos-mobile` build predating this feature) edits a transaction without
resetting a takeaway order to dine-in. This falls out of Option D for free and is covered by a repo
test so a future refactor to `Select("*").Updates` doesn't silently break it.

**D7 — `diningOption` is optional on requests and required on responses.** Optional on
`TransactionRequest` and `PaymentCheckoutRequest` so installed `pos-mobile` builds and order-web
tabs left open across a deploy keep working and fall back to `dine_in` (create) or unchanged
(update). Required on `Transaction` and `PaymentSummary` so no frontend consumer needs a `?? 'dine_in'`.

**D8 — Order-app idempotent checkout updates the dining option on the reused transaction.**
`PaymentUsecase.Checkout` reuses a still-pending payment and its transaction when the guest retries
(`payment_usecase.go:127-151`), and already updates the reused payment's WhatsApp snapshot so "a
guest who retries checkout with a corrected number is heard" (FR-3 of
`docs/prd-order-whatsapp-notifications.md`). A guest who backs out and switches to Bawa pulang
must be heard the same way, so the reuse branch writes the submitted dining option to the
transaction through a narrow new repository method,
`UpdateTransactionDiningOptionById(ctx, id, diningOption)`. *Alternative rejected:* calling the
general `UpdateTransactionById` — it re-diffs transaction items and item values, which is far more
than one column and risky inside the payment path.

**D9 — Validation is a domain method, called by the use cases.** `DiningOption.IsValid()` in
`apps/api/domain/transaction_entity.go`, invoked by `TransactionUsecase.CreateTransaction`,
`TransactionUsecase.UpdateTransactionById` and `PaymentUsecase.Checkout`; `""` is valid (it means
"default" on create and "unchanged" on update). Returns `*Error{Type: BadRequest}` per the
`(T, *domain.Error)` rule in `apps/api/CLAUDE.md`.

**D10 — The POS control is a new base form primitive, `SegmentedControl`.** Added to
`libs/ui/src/presentation/views/components/base/Form/` beside `Select` and `Switch`, bound through
react-hook-form's `Controller` and `useFieldContext` exactly as `Select.tsx` is, so it slots into a
`<Field name="diningOption" label="Dining Option">`. *Alternatives rejected:* `Switch` ("Takeaway:
on/off") — the acceptance criteria ask to *show options*, and a switch hides what "off" means;
`Select` — two taps and a sheet to see two options; the order sheet's button pair — it is not bound
to react-hook-form, and `useForm` belongs to the form component (`docs/forms.md`), so the POS form
needs a `Controller`-bound input.

**D11 — The order-app sheet reuses its own button-pair pattern, not `SegmentedControl`.**
`CustomerDetailsSheet` is a controlled, prop-driven view whose state lives in the `checkout` use
case (FSM), not in react-hook-form. Two buttons styled like the payment-method buttons keep the
sheet visually consistent and keep the state in the FSM: a new `CHANGE_DINING_OPTION` action in
`libs/ui/src/domain/usecases/checkout.ts`, mirroring `CHANGE_METHOD`.

**D12 — The indicator is a badge in the existing badge vocabulary, purple, takeaway-only.** No new
layout slot: the badge joins `OrderBadge` / `FulfillmentBadge` / `CashAwaitingPaymentBadge` in
`TransactionListItem` and `StatusPill` in `OrderHistoryListItem`. Nothing renders for dine-in
(acceptance criteria; Square's "only non-default" precedent). *Alternative rejected:* tinting the
whole card — `TransactionListItem` already uses the card theme for paid (`gray`) vs unpaid (`red`),
and a second meaning on the same channel would be unreadable.

**D13 — Order history reads the dining option through the existing transaction summary.**
`GetTransactionSummariesByIds` gains `transactions.dining_option` in its `SELECT`/`GROUP BY`;
`TransactionSummary` → `ToPaymentSummary` → `ToApiPaymentSummary` carry it through. No new query.

---

## Phased plan

Each phase is one PR, leaves `main` green, and is shippable on its own.

```
                    ┌──────────────────────────┐
                    │ P1  BE storage + schema  │
                    └────────────┬─────────────┘
                 ┌───────────────┴────────────────┐
     ┌───────────▼────────────┐       ┌───────────▼────────────┐
     │ P2  POS transaction API│       │ P3  Order checkout +   │
     │                        │       │     history API        │
     └───────────┬────────────┘       └───────────┬────────────┘
     ┌───────────▼────────────┐       ┌───────────▼────────────┐
     │ P4  POS FE data layer  │       │ P7  Order FE data +    │
     │                        │       │     checkout FSM       │
     └─────┬────────────┬─────┘       └─────┬────────────┬─────┘
  ┌────────▼───┐  ┌─────▼──────┐   ┌────────▼───┐  ┌─────▼──────┐
  │ P5 POS form│  │ P6 POS list│   │ P8 Checkout│  │ P9 Order   │
  │  selector  │  │  badge     │   │  sheet     │  │  history   │
  └────────┬───┘  └─────┬──────┘   └────────┬───┘  └─────┬──────┘
           └────────────┴──────────┬────────┴────────────┘
                        ┌──────────▼───────────┐
                        │ P10 docs-site pages  │
                        └──────────────────────┘
```

### What can run in parallel

| Wave | Phases | Why they're independent |
|---|---|---|
| 1 | **P1** | Everything depends on the column and the shared `DiningOption` contract schema |
| 2 | **P2 ∥ P3** | Different schemas in `api.yaml` (`Transaction*` vs `Payment*`), different Go files; P1 already added the shared `DiningOption` component and `TransactionSummary.DiningOption`, so neither creates what the other needs |
| 3 | **P4 ∥ P7** | POS track (`Transaction.ts`, `transaction*.ts`) vs order track (`Payment.ts`, `payment*.ts`, `checkout.ts`) — disjoint files |
| 4 | **P5 ∥ P6 ∥ P8 ∥ P9** | Four disjoint view/handler files: `TransactionCartView` + new `SegmentedControl`, `TransactionListItem`, `CustomerDetailsSheet` + `CartHandler`, `OrderHistoryListItem` |
| 5 | **P10** | Documents shipped behaviour, so after the UI phases |

The POS track (P2 → P4 → P5/P6) and the order track (P3 → P7 → P8/P9) never block each other;
with two people, each takes one track after P1.

| # | PR | Files | Size | Acceptance |
|---|---|---|---|---|
| **1** | BE storage: column, domain type, default, summary | migration `000042_add_transaction_dining_option` up/down; `apps/api/domain/transaction_entity.go`; `apps/api/data/mysql/transaction_entity.go`, `transaction_transformer.go`, `transaction_repo.go`, `transaction_repo_test.go`; `libs/api-contract/src/api.yaml` (component `DiningOption` only) | ~90 L | `make migrate-up` adds the column with every existing row `dine_in`; `make migrate-down` drops it; a POS, an order-app and a rental create each persist `dine_in` with no use-case change; updating with `""` leaves `takeaway` unchanged and updating with `dine_in` switches it back (D6); `GetTransactionSummariesByIds` returns the value; `npx nx run api:test` green |
| **2** | POS transaction API | `api.yaml` (`Transaction.diningOption` required, `TransactionRequest.diningOption` optional); `apps/api/presentation/restapi/transaction_transformer.go` (both directions); `apps/api/domain/transaction_usecase.go` (D9 validation) + tests; `transaction_handler_test.go`; `libs/ui/src/__mocks__/api-contract.ts` if a stubbed symbol needs it | ~100 L | `POST /transactions` with `takeaway` round-trips on `GET /transactions/{id}` and in the list; omitting the field creates `dine_in`; `"delivery"` returns `400`; `npx nx run api:test` and `npx nx run ui:test` green |
| **3** | Order checkout + history API | `api.yaml` (`PaymentCheckoutRequest.diningOption` optional, `PaymentSummary.diningOption` required); `apps/api/domain/payment_usecase.go` (`Checkout` param, validation, D8 reuse branch) + tests; `payment_entity.go` (`PaymentSummary`, `ToPaymentSummary`); `domain/transaction_repository.go` + regenerated `data/mock/transaction_repository.go` (`UpdateTransactionDiningOptionById`); `data/mysql/transaction_repo.go`; `presentation/restapi/payment_handler.go`, `payment_transformer.go` + tests | ~140 L | Checkout with `takeaway` creates a takeaway transaction; omitting it creates `dine_in`; retrying a pending checkout with a different value updates the reused transaction; `GET /payments` summaries carry `diningOption`; `400` on an invalid value |
| **4** | POS FE data layer | `libs/ui/src/domain/entities/Transaction.ts` (`TransactionDiningOption` type, `Transaction.diningOption`, `transactionFormSchema.diningOption`); `domain/usecases/transactionCreate.ts` (initial `dine_in`), `transactionUpdate.ts` (prefill + reset); `data/api/transaction.ts`, `transaction.transformer.ts`; `data/mock/transaction.ts`; use case tests | ~80 L | `TransactionCreateUsecase` submits `diningOption: 'dine_in'` when untouched; `TransactionUpdateUsecase` prefills from the fetched transaction (`toFormValues`) and its empty initial values carry `dine_in`; `npx nx run ui:test` green. No visible change |
| **5** | POS form selector (FR-2) | new `base/Form/SegmentedControl.tsx` + `.stories.tsx` + `.test.tsx`, `base/Form/index.ts`; `views/components/transactions/TransactionCartView.tsx` + stories; `TransactionCreateHandler` / `TransactionUpdateHandler` tests; `apps/pos-web-e2e/src/utils/selectors.ts`, `transactions.spec.ts` | ~170 L | The form shows **Dining Option** with Dine In selected on create; choosing Takeaway and saving persists `takeaway`; editing prefills it; handler tests assert on the radio/segment role; `pos-web-e2e` transactions spec passes locally |
| **6** | POS list badge (FR-4) | `views/components/transactions/TransactionListItem.tsx` + `.stories.tsx` + `.test.tsx`; `TransactionList.tsx` (pass-through) | ~90 L | A takeaway row shows a purple **Takeaway** badge for both POS and order-app sources; a dine-in row renders exactly as before; new stories `TakeawayPos`, `TakeawayFromOrderApp`; three badges wrap at compact width |
| **7** | Order FE data + checkout FSM | `libs/ui/src/domain/entities/Payment.ts` (`PaymentSummary.diningOption`); `domain/repositories/payment.ts` (`checkout` param); `domain/usecases/checkout.ts` (`Context.diningOption` = `dine_in`, `CHANGE_DINING_OPTION`, passed in `onStateChange`) + `checkout.test.ts`; `data/api/payment.ts`, `payment.transformer.ts`, `payment.test.ts`; `data/mock/payment.ts` | ~110 L | `UsecaseTester` shows `diningOption` starting `dine_in`, changing only in `askingDetails`, surviving `CANCEL_DETAILS` → `ASK_DETAILS`, and reaching `repository.checkout`; `npx nx run ui:test` green. No visible change |
| **8** | Order checkout sheet (FR-3) | `views/components/checkout/CustomerDetailsSheet.tsx` + stories; `handlers/order/CartHandler.tsx` + `CartHandler.test.tsx`; `apps/order-web-e2e/src/utils/selectors.ts`, `checkout.spec.ts` | ~110 L | The sheet shows Makan di sini (selected) / Bawa pulang with or without cash enabled; choosing Bawa pulang and paying creates a takeaway transaction visible as such in the POS list; `order-web-e2e` checkout spec passes locally |
| **9** | Order history pill (FR-5) | `views/components/orderHistory/OrderHistoryListItem.tsx` + `.stories.tsx` + `.test.tsx`; `views/screens/order/OrderHistoryScreen.tsx` (pass-through) | ~60 L | A takeaway order shows the purple **Bawa pulang** pill beside its number and an accessible name ending `· Bawa pulang`; dine-in rows unchanged; `order-web-e2e` `orderHistory.spec.ts` still passes |
| **10** | docs-site | `docs-site/sales/transactions.md`, `order-checkout.md`, `order-history.md` | ~40 L | Each page describes the dining option where the operator or guest meets it; `docs-site` builds |

### Phase detail

**Phase 1 — Storage.** Create the pair with `make migrate-create name=add_transaction_dining_option`
(not hand-numbered; it should land as `000042`):

```sql
-- up
ALTER TABLE `transactions`
  ADD COLUMN `dining_option` VARCHAR(16) NOT NULL DEFAULT 'dine_in' AFTER `source`;
-- down
ALTER TABLE `transactions` DROP COLUMN `dining_option`;
```

No index: nothing filters on it yet (see Out of Scope). In the domain, `type DiningOption string`
with `DiningOptionDineIn` / `DiningOptionTakeaway` constants and `IsValid()` beside
`TransactionSource`; the field on `Transaction` and `TransactionSummary`, mirrored in the MySQL
entity and both transformers. `Repository.CreateTransaction` sets `DiningOptionDineIn` when empty
(D5); `GetTransactionSummariesByIds` selects and groups by it (D13). The `DiningOption` component
schema is added to `api.yaml` here — unreferenced, so it generates a type and changes no endpoint —
so that P2 and P3 can both `$ref` it without one waiting on the other.

**Phase 2 — POS API.** `ToTransaction` maps the optional request pointer to the domain value
(`""` when absent); `ToApiTransaction` always emits it. Validation per D9 in both
`CreateTransaction` and `UpdateTransactionById`.

**Phase 3 — Order API.** `Checkout` gains a `diningOption DiningOption` parameter after `method`;
the handler passes `""` when the request omits it. The new-transaction branch sets it on the
`Transaction` literal (the repository defaults `""`). The reuse branch calls
`UpdateTransactionDiningOptionById` only when the submitted value is non-empty and differs, so a
retry from an old client doesn't rewrite a takeaway choice. Regenerate the mock with
`go generate ./...` — never hand-edit `data/mock/`.

**Phase 4 — POS data layer.** `transactionFormSchema` gains
`diningOption: z.enum(['dine_in', 'takeaway'])`. Both use cases' initial form values default it, and
`transactionUpdate.ts`'s prefill reads it from the transaction. The mock repository stores and
returns it so handler tests exercise real use cases over mock repositories.

**Phase 5 — POS form.** `SegmentedControl<Value extends string>` takes
`items: { label: string; value: Value }[]`, renders one pressable per item with
`accessibilityRole="radio"` and `accessibilityState={{ checked }}` inside a `radiogroup`, and binds
through `Controller` like `Select`. `TransactionCartView` adds
`<Field name="diningOption" label="Dining Option"><SegmentedControl items={…} /></Field>` under
`Pager Number`. `pos-mobile` shares `TransactionCartView`, so it gets the control with no extra
work; check it in the `transactions.mobile.spec.ts` layout.

**Phase 6 — POS list badge.** `TakeawayBadge` beside the existing three badge components. Refactor
the subtitle so the badge row exists whenever `source === 'order'` **or**
`diningOption === 'takeaway'`; the `source === 'order'`-only badges stay gated as they are.

**Phase 7 — Order data + FSM.** `diningOption` joins `Context` next to `method`, initialised to
`dine_in`; `CHANGE_DINING_OPTION` is accepted only in `askingDetails` (same guard as
`CHANGE_METHOD`); the `creatingPayment` `onStateChange` passes it to `repository.checkout`. It is
**not** reset by `CANCEL_DETAILS`, matching how `method` behaves, so a guest who closes and reopens
the sheet keeps their choice.

**Phase 8 — Checkout sheet.** `CustomerDetailsSheetProps` gains `diningOption` and
`onDiningOptionChange`; `CartHandler` wires them to `checkout.state.diningOption` and
`dispatch({ type: 'CHANGE_DINING_OPTION', … })` beside the existing `method` wiring. Buttons get
`accessibilityLabel`s `Makan di sini` / `Bawa pulang` for the e2e selectors.

**Phase 9 — Order history.** Pill and accessible name per FR-5. The existing e2e selector
`getByRole('button', { name: 'Pesanan #N' })` is a substring match, so the longer takeaway name
keeps it working.

**Phase 10 — docs-site.** One short section per page, with the labels exactly as the UI shows them.

---

## Risks

**R1 — A cashier forgets to switch to Takeaway.** Defaulting (D4) makes the wrong value silent.
*Mitigation:* the control sits in the header of the form next to Customer Name, not below the
items, and the list badge makes a takeaway order conspicuous — and its absence noticeable to the
barista who was told "to go". If this proves common, the cheap follow-up is Toast's "force a
choice" mode (Open Question 3), not a different data model.

**R2 — Historical transactions all read `dine_in`.** The backfill cannot know past takeaway orders.
*Mitigation:* none needed for the acceptance criteria; state it in the docs-site pages so nobody
reads pre-launch data as "we never did takeaway".

**R3 — GORM zero-value semantics are load-bearing.** D6 depends on `Updates` skipping `""`.
*Mitigation:* Phase 1's repo tests pin both directions (absent keeps the value; `dine_in` switches
it back), so a future move to `Select("*").Updates` or map-based updates fails a test rather than
silently resetting takeaway orders.

**R4 — The migration must run before the Phase 1 binary.** GORM's `Create` writes every struct
field, so a binary with `DiningOption` on the entity fails every transaction create against an
un-migrated database. *Mitigation:* Rollout Notes; `migrate-up` is not run at boot (root `CLAUDE.md`).

**R5 — E2E runs post-merge only.** Phases 5, 8 and 9 change DOM that `pos-web-e2e` /
`order-web-e2e` select on. *Mitigation:* run the affected specs locally in those phases, as the
table's acceptance column says.

**R6 — Badge row crowding.** An unpaid cash order-app takeaway row carries four badges
(`Order`, `Preparing`, `Cash · awaiting payment`, `Takeaway`). *Mitigation:* `flexWrap="wrap"` in
Phase 6 and a story for the four-badge case.

---

## Out of Scope

- **Printed documents and KDS.** The order slip / invoice payloads (`libs/ui/src/utils/print.ts`)
  and KDS push notifications do not carry the dining option. The kitchen is exactly who needs
  "package, don't plate" most, so this is the first follow-up — see Open Question 1. It is out of
  this PRD because the printer service is outside this repository
  (`docs/prd-daily-transaction-number.md`, R1).
- **Transaction detail screen** (`TransactionDetail.tsx`) and the order status screen. Not in the
  acceptance criteria; a small follow-up card if wanted.
- **Filtering or reporting by dining option** in the POS list or dashboard. No index is added until
  a query needs one.
- **Delivery / pickup** values, and a **takeaway packaging fee**. D2 leaves room; nothing is built.
- **Per-device defaults** (Toast's device default). One default, `dine_in`, everywhere.

---

## Open Questions

1. **Should the order slip and KDS notification say TAKEAWAY?** Recommended yes, as a follow-up
   phase: add `diningOption` to `OrderSlipPrintPayload`, gated on the external printer service
   rendering it. *Decides:* whether an eleventh phase is scheduled now.
2. **Copy for the order app.** "Makan di sini / Bawa pulang" is proposed; "Dine in / Take away" is
   also widely understood in Indonesian cafés. *Decides:* only Phase 8/9 strings and e2e selectors.
3. **Should the POS force an explicit choice?** Proposed no (D4). Revisit after two weeks if
   misrecorded takeaway orders are reported.
4. **Can a takeaway order still carry a table?** Order-app checkout requires a table
   (`cart.TableId == nil` → 400 in `Checkout`). A guest who waits at a table and takes the food home
   is a real case, so the proposal keeps the table and shows both. *Decides:* nothing unless the
   answer is "takeaway guests should not need a table", which would be its own PRD.

---

## Rollout Notes

- Phase 1: run `make migrate-up` (with `MIGRATIONS_DIR=data/mysql/migrations`, per the root
  `CLAUDE.md`) **before** deploying the Phase 1 API build (R4).
- Phases 2 and 3 are backwards compatible with every deployed frontend: the new request fields are
  optional and the new response fields are ignored by older clients.
- Phases 4–9 depend on their API phase being deployed, not merely merged. A frontend that sends
  `diningOption` to an older API has it silently ignored (bare JSON decode) and records `dine_in` —
  wrong but harmless, and avoided by deploying in phase order.
- No feature flag: every phase is invisible (1–4, 7) or additive (5, 6, 8, 9), and the default keeps
  today's behaviour for anyone who never touches the control.

---

## Success Criteria (post-rollout)

1. A cashier records a takeaway POS sale with one extra tap, and a dine-in sale with none.
2. A guest records takeaway at checkout with one extra tap, and dine-in with none.
3. Every takeaway transaction shows a Takeaway badge in the POS list and a Bawa pulang pill in the
   guest's order history; no dine-in transaction shows either.
4. Editing a takeaway transaction from any client — including one that doesn't know the field —
   never silently turns it into dine-in.

---

## Sources

- Toast Platform Guide — [Dining options](https://doc.toasttab.com/doc/platformguide/adminDiningOptions.html):
  Dine In / Take Out / Delivery / Curbside as pre-populated dining options; the dining option tells
  the kitchen whether to plate or package; restaurant-wide and device defaults.
- Toast Support — [Configure Custom Dining Options](https://support.toasttab.com/en/article/Dining-Options-1492794310377).
- Square Support — [Create and manage dining options](https://squareup.com/help/us/en/article/5573-use-dining-options-with-the-square-app):
  the first option is the default for every new sale and is applied automatically; only
  non-default dining options show on the order ticket.
