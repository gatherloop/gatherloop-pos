# PRD: Daily Transaction Number — a human-readable, daily-resetting identifier shared by the order slip and the POS

## Problem Statement

Today the counter-to-station flow works like this:

1. A cashier builds a cart and checks out on `TransactionCreateScreen`. On successful payment,
   `TransactionCreateHandler.tsx` offers to print an **invoice** for the customer, then a
   **station order slip** for the bar and kitchen (`buildOrderSlipPayload` in
   `libs/ui/src/utils/print.ts`).
2. The order slip carries exactly four identifying fields — `createdAt`, `paidAt`, `name`, and
   `orderNumber` (`OrderSlipPrintPayload` in `libs/ui/src/utils/print.ts`) — plus the items,
   grouped into `bars` / `kitchens`.
3. When the drinks and food are ready, staff must go back to the POS and find the matching
   transaction: to hand over the pager, mark something, check a note, or reprint. The only way
   to find it is to read the **customer name** and the **printed timestamp** off the slip and
   match them against the transaction list, whose list items are titled by name
   (`TransactionListItem.tsx` passes `title={name}`) and carry `TRANSACTION DATE` as a footer
   item formatted `DD/MM/YYYY - HH:mm`.

Matching by name and time is slow and error-prone at the counter:

- **Names repeat and are not unique.** Two "Andi"s an hour apart look identical in the list, and
  the list search is a `name LIKE '%query%'` scan (`GetTransactionList` in
  `apps/api/data/mysql/transaction_repo.go`) that returns both.
- **Names are often missing or wrong.** `name` is a free-text field with no validation beyond
  `z.string().min(1)` (`transactionFormSchema` in `libs/ui/src/domain/entities/Transaction.ts`),
  and the order-app path fills it from the customer record while the rental checkout path sets
  it to `""` outright (`CheckoutRentals` in `apps/api/domain/rental_usecase.go`).
- **Timestamps are read to the minute** but the list shows them to the minute too, so two
  transactions in the same minute are indistinguishable, and the reader has to compare
  `DD/MM/YYYY - HH:mm` character by character.
- **The `orderNumber` on the slip is not an identifier.** It is a *pager number* — a physical
  buzzer handed to the customer, typed in by the cashier via
  `<Field name="orderNumber" label="Order Number">` (`TransactionCartView.tsx:69`). It is
  optional in practice (rendered only when `orderNumber > 0`), it is `0` for every order-app
  transaction (`apps/api/domain/payment_usecase.go:129`) and every rental checkout
  (`apps/api/domain/rental_usecase.go:96`), it is reused across the day as pagers come back, and
  the cashier can mistype it. It cannot identify a transaction.

### Root cause

**A transaction has no short, human-readable, staff-facing identity.** It has exactly one stable
identifier — the database `id` — and that identifier is deliberately not printed: it is a
monotonically increasing, never-resetting primary key, so a slip reading "#4182" tells any
customer or competitor holding it roughly how many sales the shop has ever made, and makes
adjacent transaction ids trivially guessable. So the shop prints attributes (name, time) instead
of an identity, and pays for it with a lookup every single time an order is ready.

A second, smaller problem compounds it: the field that *sounds* like an identifier —
`order_number` — is a pager number. Adding a real transaction number next to a field called
"order number" without renaming it guarantees a permanent confusion at the counter and in the
codebase (`apps/api/data/mysql/migrations/000001_initial_schema.up.sql:161`, and 46 other files).

---

## How the Industry Handles This

1. **A short, auto-assigned, daily-resetting ticket number is a first-class POS setting, not an
   afterthought.** Square for Restaurants has an *Order tickets* setting that auto-assigns a
   ticket number when an order is sent, with a configurable **maximum ticket number** per
   location (so the number wraps rather than growing without bound), and resetting that number
   daily is a shipped, opt-in behaviour. The ticket number is deliberately *not* the vendor's
   internal order id — it is a display identity scoped to a short window, printed on the ticket
   the kitchen sees.
2. **In food service, "the day" often is not the calendar day.** Toast auto-closes the business
   day at **4:00 a.m. local time** by default, and everything scoped to a business day follows
   that boundary. A venue that closes before midnight never notices; one that serves past
   midnight would otherwise split a single night's trade across two days.
3. **Numbers are gapped, not compacted.** This one follows from the printing itself rather than
   from any vendor doc: a voided ticket must burn its number, because renumbering would
   invalidate every slip already printed and every number already called out loud.
4. **The number is short enough to shout across a room.** Two to three digits, no prefix, no
   check digit, no padding — "forty-two", not "TXN-2026-09-13-0042". Square's per-location
   *maximum ticket number* exists for exactly this reason.

This PRD adopts all four, with the business-day cutoff fixed at midnight for now (D6) and made
configurable only if the shop actually serves past it — see Open Questions, which is the one
place where point 2 could still change the design.

---

## Alternatives Considered

### Option A — Print the transaction `id` ❌

- ✅ Zero new schema, zero new code; guaranteed unique.
- ❌ Leaks lifetime sales volume to anyone holding a slip, which the acceptance criteria rule out
  explicitly.
- ❌ Grows without bound: a 5-digit number on a slip is read slowly and misread often.
- ❌ Enumerable — `GET /transactions/{id}` for id−1 is a guess away.

### Option B — A random short code (UUID, or a 4-char base32 code like `7K2M`) ❌

- ✅ Unique with no coordination, no counter, no day boundary.
- ❌ Not readable or sayable: staff have to spell it, and `0`/`O`, `1`/`I` collisions are a
  known support cost. The acceptance criteria rule this out explicitly.
- ❌ No ordering: "which order came first" is unanswerable from the code, which is precisely what
  a queue needs.

### Option C — Derive the number at read time with `ROW_NUMBER() OVER (PARTITION BY DATE(created_at))` ❌

- ✅ No new column, no allocation, no race — it is a pure function of the rows.
- ❌ **Deleting a transaction renumbers every later one that day.** Every slip already printed
  becomes wrong, silently. Transactions are deletable while unpaid
  (`DeleteTransactionById` in `apps/api/domain/transaction_usecase.go`), so this is a routine
  event, not an edge case.
- ❌ The number cannot be indexed, so "find transaction 42" becomes a full-day scan.
- ❌ It would have to be recomputed identically in three places (list, detail, create response).

### Option D — A persisted per-day sequential integer allocated from a counter table ✅ **Recommended**

Add a single column, `transactions.transaction_number`, allocated at insert time from a
one-row-per-day counter table using MySQL's atomic
`INSERT … ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)`. The day it
belongs to stays derived from the existing `created_at` (D6).

- ✅ Short, ordered, readable, resets daily — exactly what the slip needs.
- ✅ Immutable once assigned: a delete leaves a gap, printed slips stay correct forever.
- ✅ Indexable, so search-by-number is a key lookup.
- ✅ Leaks only *today's* transaction count, which anyone standing in the shop can already see.
- ✅ Allocation is a single atomic statement — correct under concurrent cashiers without
  `SELECT … FOR UPDATE` gymnastics.
- ⚠ Trade-off: one extra table and one extra write per transaction create, and the counter row
  lock serializes concurrent creates for the same day (see Risks).

---

## Proposed Solution

### Concept mapping

| Today | After |
|---|---|
| `order_number` — a pager number, misleadingly named, `0` for order/rental transactions | `pager_number` — same field, same meaning, honest name |
| No staff-facing identity; slips carry name + timestamp | `transaction_number` — 1, 2, 3… per business day, on every transaction from every source |
| Transaction found by reading a name and a `HH:mm` off a slip | Transaction found by reading one number off a slip and spotting it in the list |
| `TransactionListItem` titled by customer name, pager number buried as a footer item | Number rendered as the dominant visual element in the list item's leading slot; pager number stays a footer item |

### FR-1 — Every transaction gets a daily transaction number

Assigned server-side at creation, starting at `1` for the first transaction of each business day.
All three creation paths get one, with no per-path code:
`TransactionUsecase.CreateTransaction` (POS), `PaymentUsecase` order checkout
(`apps/api/domain/payment_usecase.go`), and `RentalUsecase.CheckoutRentals`
(`apps/api/domain/rental_usecase.go`) — because assignment lives in the one repository method all
three call, `Repository.CreateTransaction` (`apps/api/data/mysql/transaction_repo.go:91`).

### FR-2 — The number is immutable and never reused

`UpdateTransactionById` never changes it. Deleting a transaction burns its number; the next
transaction that day takes the next value. Gaps are expected and correct.

### FR-3 — The number is response-only in the API contract

`Transaction` in `libs/api-contract/src/api.yaml` gains a required `transactionNumber`.
`TransactionRequest` does **not** — a client can never propose or override it.

### FR-4 — The number is the dominant element of the transaction list item

`ListItem` (`libs/ui/src/presentation/views/components/base/ListItem.tsx`) currently renders an
optional 60×60 `thumbnailSrc` image in its leading slot; transactions are the one list that
never uses it (wallets, categories, products, variants and budgets all do). That slot becomes the
number badge: a 60×60 rounded tile showing `#42` at display size, with the customer name
remaining the `title` beside it.

#### What it looks like

**Today** — the number the staff member needs is nowhere, and the pager number is a footer chip
the same size as everything else:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                     ⋮   │
│  Andi                                                                   │
│  Rp. 87.000                                                             │
│  ─────────────────────────────────────────────────────────────────────  │
│  (🗓) TRANSACTION DATE   (💵) PAYMENT DATE    (👛) WALLET   (🔔) ORDER NUMBER │
│       13/09 - 14:32           13/09 - 14:35        Cash          7      │
└─────────────────────────────────────────────────────────────────────────┘
```

**After** — the leading slot carries the number; everything else stays exactly where it is:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ╭────────╮                                                         ⋮   │
│  │        │  Andi                                                       │
│  │  #42   │  Rp. 87.000                                                 │
│  │        │                                                             │
│  ╰────────╯                                                             │
│  ─────────────────────────────────────────────────────────────────────  │
│  (🗓) TRANSACTION DATE   (💵) PAYMENT DATE    (👛) WALLET   (🔔) PAGER NUMBER │
│       13/09 - 14:32           13/09 - 14:35        Cash          7      │
└─────────────────────────────────────────────────────────────────────────┘
     ▲                          ▲                              ▲
     └ new: 60×60 badge          └ unchanged                    └ relabelled (FR-7)
```

**Scanning a list** is the case that matters — this is the view a staff member holding a slip
that says `#42` is looking at:

```
┌──────────────────────────────────────────────┐
│ ╭──────╮                                 ⋮   │   ← unpaid (red theme)
│ │ #44  │  Siti                               │
│ ╰──────╯  Rp. 35.000                         │
│ ──────────────────────────────────────────── │
│ (🗓) 13/09 - 14:51   (🔔) PAGER NUMBER  3     │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│ ╭──────╮                                 ⋮   │   ← unpaid, from the order app
│ │ #43  │  Budi                               │
│ ╰──────╯  Rp. 52.000                         │
│ ╰──────╯  ( Order )                          │
│ ──────────────────────────────────────────── │
│ (🗓) 13/09 - 14:47   (📍) TABLE  A1           │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│ ╭──────╮                                 ⋮   │   ← paid (gray theme)
│ │ #42  │  Andi                               │
│ ╰──────╯  Rp. 87.000                         │
│ ──────────────────────────────────────────── │
│ (🗓) 13/09 - 14:32   (👛) WALLET  Cash        │
└──────────────────────────────────────────────┘
```

The number column reads top-to-bottom as a single scannable strip, which the name column never
could — names vary in length, start with any letter, and repeat.

**Digit ramp.** The tile is fixed at 60×60, so the type shrinks rather than the box. Four digits
is the designed limit (Open Question 5):

```
╭────────╮   ╭────────╮   ╭────────╮   ╭────────╮
│   #7   │   │  #42   │   │  #128  │   │ #1024  │
╰────────╯   ╰────────╯   ╰────────╯   ╰────────╯
   1 digit      2 digits     3 digits     4 digits
```

**Compact / mobile width.** No layout change is needed: the badge occupies the same 60×60 box the
thumbnail already occupies in `ProductListItem` and `VariantListItem` on mobile, and the footer
chips already `flexWrap` (`XStack gap="$3" flexWrap="wrap"` in `ListItem.tsx`), so they reflow
under the badge as they do today.

```
┌────────────────────────────────┐
│ ╭──────╮                   ⋮   │
│ │ #42  │  Andi                 │
│ ╰──────╯  Rp. 87.000           │
│ ────────────────────────────── │
│ (🗓) TRANSACTION DATE          │
│      13/09 - 14:32             │
│ (👛) WALLET   Cash             │
└────────────────────────────────┘
```

#### Badge spec

| Property | Value | Why |
|---|---|---|
| Size | 60×60 | Matches the `thumbnailSrc` `Image` exactly, so no sibling list item shifts |
| Corner | `borderRadius="$5"` | Same token the thumbnail `Image` uses |
| Background | `$color5` within the item's existing theme | `ListItem` is already themed `gray` when paid, `red` when unpaid — the badge inherits that, so it carries payment state too |
| Text | `$color12`, `#` prefix at the same size | Contrast against `$color5` in both light and dark |
| Font size | `$9` / `$8` / `$7` / `$6` for 1 / 2 / 3 / 4 digits | Fixed box, shrinking type |
| Position | `leading` prop on `ListItem` | See D9 |

The background and font tokens are a **starting point to tune in Storybook**, not a settled
choice — the one thing Phase 5 must not change is the 60×60 box, because that is what keeps every
other list item's alignment intact. The red-when-unpaid inheritance in particular is worth a look
on a real screen: it may read as an error state rather than a queue position, in which case the
badge should take a neutral tone and leave payment state to the card theme alone.

### FR-5 — The number appears on the transaction detail screen

As a card alongside "Customer Name" and "Order Number" in `TransactionDetail.tsx`, using the same
`Card` + icon shape as its neighbours.

### FR-6 — Both printed documents carry the number

`TransactionPrintPayload` (invoice) and `OrderSlipPrintPayload` (order slip) both gain
`transactionNumber`. This includes the print that fires immediately after checkout, which today
builds its payload from *form values* (`TransactionCreateHandler.tsx:159`) and therefore has no
server-assigned data — so the create flow must carry the number back from the create response.

### FR-7 — `orderNumber` becomes `pagerNumber` everywhere

DB column, Go domain and MySQL entities, OpenAPI schema, generated types, TS entity, form field
name, form label (`"Order Number"` → `"Pager Number"`), footer label (`ORDER NUMBER` →
`PAGER NUMBER`), detail card, e2e selectors, stories, mocks and docs — 88 occurrences across 47
files, all mechanical.

### FR-8 — Search finds a transaction by its number *(optional, last phase)*

When the POS transaction-list query string is all digits, the backend matches
`transaction_number = ?` in addition to `name LIKE ?`. Because the list is ordered by
`created_at desc` by default (`ToSortByColumn` supports only `created_at`), today's match sorts
to the top ahead of the same number from previous days.

---

## Design decisions

**D1 — The identifier is a per-business-day sequential integer, assigned server-side.**
*Alternative rejected:* a random short code or UUID (Option B) — unreadable and unordered; the
transaction `id` (Option A) — leaks lifetime volume and is enumerable.

**D2 — One sequence shared by all sources.** A POS sale, an order-app checkout and a rental
checkout all draw from the same daily sequence. *Alternative rejected:* per-source sequences —
"number 7" would then be ambiguous at the counter, which defeats the entire purpose. Order-app
transactions still get a number even though the customer never sees one (they are found by table
label, see `docs-site/sales/order-checkout.md`), because *staff* still find them in the same POS
list and print the same order slips for them.

**D3 — The number is a persisted column; the day it belongs to is not.**
`transactions.transaction_number BIGINT NOT NULL DEFAULT 0`, with a unique index whose date half
is a **functional key part** over the existing `created_at` rather than a second stored column:

```sql
ALTER TABLE `transactions`
  ADD COLUMN `transaction_number` BIGINT NOT NULL DEFAULT 0 AFTER `pager_number`;

-- … backfill existing rows here (Phase 2) …

ALTER TABLE `transactions`
  ADD UNIQUE KEY `uq_transactions_date_number` ((CAST(`created_at` AS DATE)), `transaction_number`);
```

The two `ALTER`s must stay separate and in that order: adding the unique index while every
existing row still holds the default `0` would collide on the first day that has more than one
transaction.

Functional key parts are available from MySQL 8.0.13, and CI runs `mysql:8.0`
(`.github/workflows/e2e-main.yml:61`). The expression is deterministic because `created_at` is
`DATETIME`, not `TIMESTAMP` — a `TIMESTAMP` column would make `CAST(… AS DATE)` session-timezone
dependent and MySQL would reject it in an index.

*Alternative rejected:* Option C — deriving the **number** too. A delete silently renumbers every
later transaction that day and invalidates printed slips. The number is an assigned identity and
must be frozen; the date is merely the scope it was assigned within, and that scope is already
recorded truthfully by `created_at`.

*Alternative rejected (settled in review):* a stored `transaction_date DATE` column. Its only
real advantage is freezing the day-boundary rule against a *future change* to that rule — if the
cutoff ever moved from midnight to, say, 04:00, a derived date would retroactively reassign every
historical 00:00–04:00 transaction to the previous day and could collide with a number already
issued there. The shop closes before midnight, so that rule will not change (Open Question 1,
answered), and the column would buy nothing at the cost of a second source of truth for "which
day is this" — one the dashboard's existing `DATE_FORMAT(created_at, …)` grouping
(`apps/api/data/mysql/transaction_repo.go:210`) would not use anyway. See **Settled in review**
for what revisiting this would cost.

**D4 — Allocation uses a counter table and MySQL's atomic `LAST_INSERT_ID()` sequence idiom.**

```sql
CREATE TABLE `transaction_number_counters` (
  `transaction_date` DATE   NOT NULL,
  `last_number`      BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`transaction_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- allocate, inside the enclosing DB transaction
INSERT INTO `transaction_number_counters` (`transaction_date`, `last_number`)
VALUES (?, LAST_INSERT_ID(1))
ON DUPLICATE KEY UPDATE `last_number` = LAST_INSERT_ID(`last_number` + 1);
SELECT LAST_INSERT_ID();
```

Both statements run on the same connection inside the existing `BeginTransaction` wrapper
(`apps/api/data/mysql/base_repo.go:19`), so the returned value is this transaction's own.
*Alternatives rejected:* `SELECT COALESCE(MAX(transaction_number),0)+1 … WHERE DATE(created_at) = ?` —
two concurrent cashiers read the same `MAX` and collide unless the whole day's range is locked;
a per-day `AUTO_INCREMENT` — MySQL has no per-partition sequence and resetting `AUTO_INCREMENT`
nightly is a cron job that fails silently; a DB trigger — invisible to `go test` and to anyone
reading the Go code, which is exactly the class of bug this repo's CLAUDE.md warns about.

**D5 — Assignment lives in `Repository.CreateTransaction`, not in the domain use cases.** It must
be atomic with the `INSERT`, and all three creation paths already funnel through it, so there is
one place to get right and one place to test. `domain.Transaction.TransactionNumber` is
output-only: the use cases read it, never set it. *Alternative rejected:* allocating in
`TransactionUsecase.CreateTransaction` — the order-app and rental paths bypass that method
entirely and would silently get `0`.

**D6 — The business day is the calendar day of `created_at` in the API host's local timezone, and
the boundary is midnight.** The MySQL DSN already pins `loc=Local`
(`apps/api/data/mysql/base_repo.go:53`), so `created_at` is written and read as host-local wall
clock. The counter table is keyed by `createdAt.Format("2006-01-02")` in that same zone, and the
unique index's `CAST(created_at AS DATE)` agrees with it by construction — provided the
repository writes `created_at` itself rather than letting MySQL default it, which is what makes
Phase 3's explicit `CreatedAt` the load-bearing detail of this decision rather than a nicety.

*Alternative rejected:* UTC — a UTC+7 shop would roll its numbering over at 07:00, mid-morning.

*Alternative rejected:* a configurable cutoff hour, as Toast's 4:00 a.m. default. The shop closes
before midnight (Open Question 1, answered), so midnight and the close of business never disagree.

**D7 — Deleted transactions burn their number.** No compaction, no reuse. A gap in the day's
sequence is the correct record of a voided order, and any slip already printed stays truthful.

**D8 — Display format is a bare integer with a `#` prefix, applied in the UI only.** `#42`, not
`0042`, not `20260913-042`, not `TXN-42`. The stored value is a plain integer. Three- and
four-digit numbers shrink the badge font rather than wrapping.

**D9 — The list badge reuses `ListItem`'s leading slot, generalised to accept a node.** `ListItem`
gains `leading?: ReactNode` beside the existing `thumbnailSrc`; `thumbnailSrc` keeps working
unchanged for the five list items that use it. *Alternative rejected:* another `footerItems`
entry — that is where the pager number lives today, and it is precisely the "too small to spot
across a counter" treatment this PRD exists to fix.

**D10 — `transactionNumber` is required on the `Transaction` response schema and absent from
`TransactionRequest`.** Making it optional would push a `?? 0` into every consumer; letting a
client send it would let a mistyped value collide with the unique index.

**D11 — The `orderNumber` → `pagerNumber` rename ships as one cross-stack PR.** The TS types in
`libs/ui` are generated from `api.yaml`, so a contract-only PR fails `tsc` in `libs/ui` and a
frontend-only PR fails against the live API — there is no green intermediate state. The PR is
large in files (47) and trivial in thought.

**D12 — The print payload keeps sending the legacy `orderNumber` key through the transition.**
Order slips and invoices are rendered by an **external printer service** at `ws://localhost:8080`
that this monorepo does not contain (`usePrinter` in `libs/ui/src/utils/print.ts`; see
`docs/plans/split-order-slip-kitchen-bar.md`). Renaming the key on the wire before that service
ships support would blank the pager number on every printed slip. So the payload carries
`transactionNumber`, `pagerNumber` **and** a deprecated `orderNumber` mirroring `pagerNumber`,
and a later phase drops the mirror once the printer service is updated. This is the one place
where FR-7's rename is deliberately incomplete, and it is marked with a one-line comment at the
field.

**D13 — The create flow carries the server-assigned number back into the print payload.**
`TransactionRepository.createTransaction` returns `{ transactionId, transactionNumber }` instead
of `{ transactionId }` (the API already returns the full `Transaction` — `TransactionCreateResponse`
wraps the `Transaction` schema, and `libs/ui/src/data/api/transaction.ts` simply discards
everything but `data.id`). `TransactionCreateUsecase`'s `Context` gains `transactionNumber`, set
by the existing `SUBMIT_SUCCESS` action. *Alternative rejected:* re-fetching the transaction by id
in the handler before printing — an extra round trip in the payment-confirmation path, and a
second failure mode between "paid" and "printed".

**D14 — The column rename uses `ALTER TABLE … RENAME COLUMN` (MySQL 8).** Data is preserved in
place and the down migration renames back. CI runs `mysql:8.0`
(`.github/workflows/e2e-main.yml:61`), so the syntax is available.

**D15 — A numeric search query matches `transaction_number` on any date, not just today.** Adding
a date restriction would surprise anyone looking up yesterday's slip; since results are ordered
`created_at desc`, today's match is the first row anyway.

---

## Phased plan

Each phase is one PR, leaves `main` green, and is shippable on its own.

```
Phase 1 (rename orderNumber → pagerNumber)      — independent; unblocks nothing, but must land first to avoid a merge-conflict storm
Phase 2 (BE: schema + counter table + backfill) — additive, no behaviour change
Phase 3 (BE: assign on create)                  — the feature exists in the database
Phase 4 (contract + FE data layer)              — the number reaches the frontend
Phase 5 (FE: list item badge)                   — AC-1 lands
Phase 6 (FE: detail card + print payloads)      — the loop closes: slip → POS
Phase 7 (BE+FE: search by number)               — optional
Phase 8 (docs-site + printer-service cleanup)   — after the printer service ships
```

Phase 1 is independent of 2–6 but touches many of the same files, so landing it first avoids
rebasing every later phase. Phases 2 → 3 → 4 → {5, 6} are strictly sequential. Phase 5 and Phase 6
are independent of each other. Phase 7 depends on 2. Phase 8 depends on 6 **and** on an external
release (see Risks).

| # | PR | Files | Size | Acceptance |
|---|---|---|---|---|
| **1** | Rename `orderNumber` → `pagerNumber` | migration `000026`, 8 Go files, `api.yaml`, 33 `libs/ui` files, 4 `pos-web-e2e` files | ~90 changed lines over 47 files | `grep -rn "orderNumber\|order_number\|OrderNumber" --include=*.go --include=*.ts --include=*.tsx --include=*.yaml --include=*.sql .` (excluding `__generated__`, `node_modules`) returns only the deliberate `print.ts` mirror from D12; `npx nx affected -t test lint` green; `pos-web-e2e` transactions specs pass locally |
| **2** | Schema: `transaction_number`, counter table, backfill | migration `000027` up/down, `apps/api/data/mysql/transaction_entity.go`, `transaction_transformer.go`, `apps/api/domain/transaction_entity.go` | ~70 L | `make migrate-up` on a seeded DB assigns every existing transaction a number starting at 1 per calendar day; the counter table matches `MAX(transaction_number)` per day; `make migrate-down` restores the old schema |
| **3** | Assign the number on create | `apps/api/data/mysql/transaction_repo.go`, a repo test | ~90 L | Two transactions created on the same day get 1 and 2; one created after the date rolls over gets 1; a deleted transaction's number is not reissued; order-app and rental checkouts get numbers without touching their use cases |
| **4** | Contract + FE data layer | `libs/api-contract/src/api.yaml`, `apps/api/presentation/restapi/transaction_transformer.go`, `libs/ui/src/domain/entities/Transaction.ts`, `domain/repositories/transaction.ts`, `domain/usecases/transactionCreate.ts`, `data/api/transaction.ts`, `data/api/transaction.transformer.ts`, `data/mock/transaction.ts`, `src/__mocks__/api-contract.ts`, usecase tests | ~140 L | `GET /transactions` and `POST /transactions` both return `transactionNumber`; `TransactionCreateUsecase` ends in `submitSuccess` carrying it; `npx nx run ui:test` green |
| **5** | List item number badge (FR-4 / AC-1) | `views/components/base/ListItem.tsx`, `views/components/transactions/TransactionListItem.tsx` + `.stories.tsx`, `TransactionList.tsx`, `handlers/pos/TransactionListHandler.tsx`, handler test | ~120 L | The number renders as a 60×60 badge left of the customer name on web and mobile; 1-, 2-, 3- and 4-digit stories all fit without wrapping; the five existing `thumbnailSrc` list items are visually unchanged |
| **6** | Detail card + print payloads (FR-5, FR-6) | `views/components/transactions/TransactionDetail.tsx` + stories, `views/screens/pos/TransactionDetailScreen.tsx`, `handlers/pos/TransactionDetailHandler.tsx`, `handlers/pos/TransactionListHandler.tsx`, `handlers/pos/TransactionCreateHandler.tsx`, `utils/print.ts` + `print.test.ts`, `TransactionCreateHandler.printFlow.test.tsx` | ~150 L | The number shows on the detail screen; invoice and order-slip payloads both carry `transactionNumber` from all three print entry points (post-checkout, list menu, detail); the post-checkout payload carries the **server-assigned** number, not `0` |
| **7** | *(optional)* Search by number (FR-8) | `apps/api/data/mysql/transaction_repo.go` (list + count), repo test, `docs-site/sales/transactions.md` | ~40 L | Typing `42` in the POS transaction search returns transaction #42, today's first; typing a name still behaves exactly as before |
| **8** | Docs-site page + drop the `orderNumber` print mirror (D12) | `docs-site/sales/transactions.md`, `libs/ui/src/utils/print.ts` + `print.test.ts` | ~50 L | The transactions page documents the number and the pager-number rename; the payload no longer sends `orderNumber`; a real printed slip from the updated printer service still shows the pager number |

### Phase detail

**Phase 1 — Rename `orderNumber` → `pagerNumber`.** Migration `000026_rename_order_number_to_pager_number`
(`ALTER TABLE transactions RENAME COLUMN order_number TO pager_number;`, reversed in `.down.sql`);
`OrderNumber` → `PagerNumber` in both Go entities and both transformers, plus the two literal
`OrderNumber: 0` sites in `payment_usecase.go` and `rental_usecase.go`; `orderNumber` →
`pagerNumber` in `api.yaml`'s `Transaction` and `TransactionRequest`; regenerate with
`npx nx run api-contract:generate:go && npx nx run api-contract:generate:ts`; then the `libs/ui`
sweep including the form field `name`, the `"Order Number"` label, the `ORDER NUMBER` footer
label, the `transactionFormSchema` key, stories and mocks; then
`apps/pos-web-e2e/src/utils/selectors.ts:103`'s `getByLabel('Order Number')` and the three other
e2e files. `print.ts` keeps the wire key `orderNumber` per D12 but renames its *source* to the
renamed field. E2E runs post-merge only, so run `pos-web-e2e` locally before merging.

**Phase 2 — Schema.** Migration `000027_add_transaction_number`: add the `transaction_number`
column and the D3 functional unique index, create `transaction_number_counters`, backfill
existing rows with `ROW_NUMBER() OVER (PARTITION BY DATE(created_at) ORDER BY created_at, id)`
(including soft-deleted rows, so the unique index holds), then **seed the counter table** from
`SELECT DATE(created_at), MAX(transaction_number) FROM transactions GROUP BY DATE(created_at)`.
Skipping that seed is the one way this phase can break production: a transaction created on
deploy day would start again at 1 and hit the unique index. Add the unique index *after* the
backfill, or every pre-existing row's `transaction_number = 0` collides on day one. The Go
entities gain the field so nothing else changes behaviour.

**Phase 3 — Assignment.** In `Repository.CreateTransaction`, before the `Create`, derive the
business date from the transaction's `CreatedAt`, run the D4 allocation, and set
`transaction_number` on the row. Allocate as late as possible in the enclosing DB transaction to
shorten the counter row lock.

**The load-bearing detail of this phase** is that the repository must write `created_at` itself.
Only the rental path sets `CreatedAt` today (`CheckoutRentals`,
`apps/api/domain/rental_usecase.go`); the POS path (`ToTransaction` in
`apps/api/presentation/restapi/transaction_transformer.go:155`) and the order-app path both leave
it zero and let MySQL's `DEFAULT CURRENT_TIMESTAMP` fill it. Since D3 derives the number's
uniqueness scope from `CAST(created_at AS DATE)` while the counter is keyed by a date Go
computed, the two must come from the same instant — otherwise a create at 23:59:59.9 can take
number 1 from a counter keyed to tomorrow while landing on a row whose `created_at` says today,
and collide with today's existing number 1. So when `CreatedAt` is zero the repository sets it to
`time.Now()` and derives the counter key from that same value.

Tests cover: sequential allocation, rollover to a new day, gap-after-delete, that
`CAST(created_at AS DATE)` matches the counter row the number came from, and all three creation
paths.

**Phase 4 — Contract and data layer.** `transactionNumber` becomes required on `Transaction`
only (D10). `data/api/transaction.ts`'s `createTransaction` stops discarding the response and
returns `{ transactionId: data.id, transactionNumber: data.transactionNumber }`;
`TransactionCreateUsecase`'s `Context` and `SUBMIT_SUCCESS` action carry it (D13); the mock
repository in `data/mock/transaction.ts` fakes a counter so handler tests exercise real use cases
over mock repositories, as `CLAUDE.md` requires. `libs/ui`'s Jest config stubs `api-contract`
entirely, so `src/__mocks__/api-contract.ts` may need the new field.

**Phase 5 — The badge.** `ListItem` gains `leading?: ReactNode`, rendered in the same 60×60 box
the thumbnail uses, with `thumbnailSrc` left intact. A `TransactionNumberBadge` component renders
`#{n}` on a themed tile, sizing the font down at 3 and 4 digits. `TransactionListItem` passes it
as `leading`; the pager number stays exactly where it is, as a footer item relabelled
`PAGER NUMBER` in Phase 1. FR-4 has the mockups and the badge spec; the four existing stories in
`TransactionListItem.stories.tsx` (`Paid`, `Unpaid`, `HighValue`, `FromOrderApp`) already cover
the theme and source cases, so this phase adds the digit ramp — one story per 1/2/3/4 digits —
and checks the five existing `thumbnailSrc` consumers are pixel-unchanged.

**Phase 6 — Detail and print.** A `Card` in `TransactionDetail.tsx` matching its siblings; a
`transactionNumber` field on both print payload types; `buildOrderSlipPayload` passes it through;
the three print entry points supply it — the list and detail handlers from the fetched
transaction, the create handler from `transactionCreate.state.transactionNumber` (D13). This is
the phase where the original problem is actually solved, so it is worth confirming on a real
printer before calling it done.

**Phase 7 — Search.** In `GetTransactionList` and `GetTransactionListTotal`, when `query` parses
as an integer, widen the existing `name LIKE ?` clause to
`(name LIKE ? OR transaction_number = ?)`. Both methods must change together or the pagination
total disagrees with the page.

**Phase 8 — Cleanup.** Gated on the external printer service shipping `pagerNumber` support.
Until then Phase 8 stays open and the D12 mirror stays in the payload; that is a deliberate,
documented debt, not an oversight.

---

## Risks

**R1 — The printer service is outside this repo.** The order slip and invoice are rendered by an
external service at `ws://localhost:8080`; this monorepo only sends it JSON. Phase 6's
`transactionNumber` is invisible on paper until that service renders it, and Phase 8 cannot land
until it accepts `pagerNumber`. *Mitigation:* D12's dual-key payload means nothing breaks in the
meantime, and the ordering of Phases 5/6 means the POS-side half of the feature (spotting the
number in the list) ships independently of the printer. **The printer-service change should be
scheduled alongside Phase 6, not after it** — the feature's value is the slip and the POS
agreeing.

**R2 — Installed `pos-mobile` builds break on the rename, and break *silently*.** Phase 1 is a
breaking API change and `apps/pos-mobile` is a React Native app with no CI deploy pipeline in
`.github/workflows`. The API does not validate required request fields — `GetTransactionRequest`
is a bare `json.NewDecoder(r.Body).Decode(...)`
(`apps/api/presentation/restapi/transaction_transformer.go:20`) — so an old build sending
`orderNumber` gets a `200` with the pager number silently stored as `0`, and reads back a
`pagerNumber` its own types do not know about. There is no error to notice.
*Mitigation:* rebuild and redistribute the mobile app in the same release window; see
Open Questions for whether any installed build is actually in daily use, which decides whether a
one-release compatibility window (API accepting both request keys) is worth the extra phase.

**R3 — The counter row lock serializes same-day creates.** The `INSERT … ON DUPLICATE KEY UPDATE`
holds a row lock on the day's counter row until the enclosing DB transaction commits, which
includes the item inserts and coupon application. Two cashiers checking out simultaneously
serialize. At a single-counter cafe's volume this is microseconds of contention; it would matter
at multi-terminal scale. *Mitigation:* allocate as late as possible in the transaction (Phase 3);
revisit only if create latency shows it.

**R4 — The backfill must seed the counter table.** Covered in Phase 2; the unique index makes the
failure loud (a `409`-shaped error on the first create of deploy day) rather than silently
duplicating numbers.

**R5 — E2E coverage lands after merge.** `.github/workflows/pr-test.yml` runs only the two unit
suites; Playwright runs post-merge (`e2e-main.yml`). Phases 1, 5 and 7 all touch e2e-visible
surfaces (a label, a list item's DOM, the search box). *Mitigation:* run `pos-web-e2e` locally on
those three phases.

**R6 — A host clock or timezone change shifts the day boundary.** The business day is derived
from host-local time (D6). Moving the API host to a different `TZ` changes where midnight falls
for *new* rows. *Mitigation, and the reason this is mild:* `created_at` is a `DATETIME`, which
stores wall-clock digits rather than an instant, so a `TZ` change does **not** re-interpret rows
already written — `CAST(created_at AS DATE)` returns the same day for them before and after.
Only transactions created around the moment of the change are affected, and the unique index
would reject a genuine collision rather than let a duplicate number through.

**R7 — Phase 1 touches 47 files and some occurrences are string literals.** `'Order Number'` (the
form label and the e2e selector) and `ORDER NUMBER` (the footer label) do not fail `tsc` if
missed. *Mitigation:* the Phase 1 acceptance check is a `grep` over all five file types, not a
green build.

---

## Out of Scope

- **Showing the number to order-app customers.** The order app deliberately has no pager and no
  order number — customers are found by table label
  (`docs-site/sales/order-checkout.md`). Order-app transactions still *get* a number (D2), staff
  just do not surface it to the customer.
- **A configurable business-day cutoff hour.** Midnight, permanently, because the shop closes
  before it (Open Question 1, answered). Unlike the other items here this one is not merely
  deferred — D3 deliberately trades away the cheap path to it; **Settled in review** records what
  reversing that would cost, should the shop's hours ever change.
- **A customer-facing "now serving" display.** The number is designed to support one, but nothing
  here builds one.
- **Sorting the transaction list by number.** `ToSortByColumn` supports only `created_at`, and
  ordering by `created_at desc` already orders by number within a day.
- **Removing the pager number.** It is a real physical workflow; it only gets an honest name.
- **Renumbering or compacting historical data** beyond Phase 2's one-time backfill.

---

## Open Questions

1. ~~**Does the shop ever serve past midnight?**~~ **Answered: no — the shop always closes before
   midnight.** Midnight and close of business never disagree, so the business day is the calendar
   day and no cutoff hour is needed. This is what allows D3 to derive the day from `created_at`
   instead of storing it; see **Settled in review**.
2. **Is any installed `pos-mobile` build in daily use?** If yes, Phase 1 needs a preceding
   compatibility phase where the API accepts both `orderNumber` and `pagerNumber` on
   `TransactionRequest` for one release. If the mobile app is rebuilt from the monorepo alongside
   web deploys, no such phase is needed. *Decides:* whether Phase 1 splits in two.
3. **Who owns the printer service repo, and what is its release cadence?** *Decides:* whether
   Phase 8 is a week or a quarter away, and whether R1's mitigation holds.
4. **Should the invoice carry the number, or only the order slip?** FR-6 puts it on both on the
   assumption that a customer holding a receipt and asking a question is the same lookup problem.
   If the receipt should stay clean, drop the invoice half of Phase 6.
5. **Four digits or three?** D8 assumes the daily count stays under 1000. If a peak day exceeds
   that, the badge needs a smaller type ramp — worth confirming against the busiest day on record.

---

## Rollout Notes

- Phases 2 and 3 must be deployed together with a migration run in between, in the order:
  `make migrate-up` (Phase 2 migration; remember `MIGRATIONS_DIR=data/mysql/migrations`, per
  `CLAUDE.md`), then the Phase 3 API build. Deploying Phase 3's binary against an un-migrated
  database fails every create.
- Phase 1's migration and API build must deploy together with the pos-web build; see R2 for
  mobile.
- After Phase 2's backfill, spot-check one historical day: the numbers should run 1..N in
  `created_at` order with no gaps, and `transaction_number_counters.last_number` for that day
  should equal N.
- No feature flag is proposed. Every phase is either invisible (2, 4) or additive and immediately
  useful (3, 5, 6, 7); Phase 1 is a rename with no behavioural surface.

---

## Success Criteria (post-rollout)

1. A member of staff holding a printed order slip can locate the matching transaction in the POS
   list **without reading a name or a timestamp** — one number, one glance.
2. Every transaction created on a given business day, from any of the three sources, has a
   distinct number, and the first one of each day is `1`.
3. No printed slip's number ever becomes wrong: deleting a transaction leaves a gap and changes
   nothing else.
4. No search of the codebase finds `orderNumber` / `order_number` outside the single documented
   printer-compatibility mirror, and that mirror is gone once Phase 8 lands.
5. The transaction `id` still appears nowhere on any printed document.

---

## Settled in review

**S1 — `transaction_date` dropped; the day is derived from `created_at` (amends D3, D6; Open
Question 1 answered).** The first draft added a stored `transaction_date DATE` column alongside
`transaction_number`. Review asked why `created_at` would not do, and it does. Two of the three
justifications did not survive:

- *Midnight skew between Go and MySQL* — real in the first draft, but dissolved by Phase 3's
  explicit `CreatedAt` write, which was already added for other reasons. Once one instant
  produces both the row and the counter key, `CAST(created_at AS DATE)` **is** the business date.
- *The unique index needs a date column* — it does not. MySQL 8.0.13+ functional key parts index
  the expression directly, and `created_at` being `DATETIME` rather than `TIMESTAMP` makes that
  expression deterministic and therefore indexable.

The third justification was real but conditional: a stored column **freezes** the day-boundary
rule, so a later move to a 4:00 a.m. cutoff would renumber nothing historical. With the shop
closing before midnight, that rule will not change, and the column would have left the codebase
with two sources of truth for "which day is this" — the new column, and the
`DATE_FORMAT(created_at, …)` the dashboard already uses
(`apps/api/data/mysql/transaction_repo.go:210`).

**Cost of reversing this, if the shop's hours ever change:** add the `transaction_date` column,
backfill it from `DATE(created_at)` (correct for every row issued under the midnight rule), swap
the functional unique index for a plain one over the column, and change the one Go function that
computes the counter key. One migration and one function — not free, but not a rewrite. The
thing that makes it safe is that the backfill reproduces history exactly, which is only true
while the old rule was midnight.

*Also rejected in the same review:* a `DATE AS (DATE(created_at)) STORED` generated column, as a
middle ground needing no Go code. It does not give the freeze property that is the stored
column's whole point — altering a generated column's expression makes MySQL rebuild the table and
recompute every existing row, which is precisely the retroactive reassignment it would be there
to prevent.

---

## Sources

- Square Support — [Set up order ticket settings](https://squareup.com/help/us/en/article/8322-set-up-order-manager-on-your-point-of-sale):
  auto-assigned ticket numbers, and a maximum ticket number configured per location.
- Square Community — [Can I reset my order ticket numbers to start at #1 every day?](https://community.squareup.com/t5/Square-for-Restaurants/Can-I-reset-my-order-ticket-numbers-to-start-at-1-every-day/m-p/754548):
  daily ticket-number reset, enabled from the Order Tickets dashboard settings.
- Toast Support — [Close Out Day, Z Report, and Auto-Capture Overview](https://support.toasttab.com/en/article/Close-Out-Day-Z-Report-Auto-Capture):
  the business day auto-closes at 4:00 a.m. local time by default — the basis for point 2 and for
  Open Question 1.
- MySQL 8.0 Reference Manual — [`INSERT … ON DUPLICATE KEY UPDATE`](https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html)
  and [`LAST_INSERT_ID(expr)`](https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_last-insert-id):
  the documented single-statement sequence-generator idiom, connection-scoped and safe under
  concurrency. This is the basis for D4.

Points 3 and 4 of "How the Industry Handles This" are reasoning from the printed artefact, not
vendor-documented claims, and are labelled as such above.
