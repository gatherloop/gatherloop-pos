# PRD: Transaction Screens — Mobile UI/UX

The POS (`apps/web` + `apps/mobile`, both rendering `libs/ui`) was laid out for a
desktop cashier station. The transaction flow — list, create, update, detail,
statistic — is the part staff actually use on a phone, and it is the part that
degrades worst below ~660px. This PRD collects what is broken there, and splits
the fix into small, independently reviewable phases.

**Scope: transaction screens and the components they render.** Shared base
components (`ListItem`, `Pagination`, `InputNumber`) are in scope only where a
transaction screen is the thing that breaks; each such change is called out with
its blast radius. Products, materials, expenses, wallets, rentals, checklists and
the customer-facing order app are out of scope for this PRD.

---

## Problem Statement

Nine issues, in the order a cashier meets them on a 360×640 phone.

### 1. List rows are ~2.5× taller than they need to be

`libs/ui/src/presentation/components/base/ListItem.tsx:113-150` renders each
footer item as a 40px circular icon chip plus two stacked `Paragraph`s — a bold
uppercase label (`ORDER NUMBER`, `TRANSACTION DATE`, `PAYMENT DATE`, `WALLET`)
over its value — inside a `flexWrap` row. Every one of those items needs roughly
170–200px, so on a 360px screen at most one fits per row and a paid transaction
(which shows all four, `TransactionListItem.tsx:91-115`) stacks them vertically.
Add the `H4` title and the `size="$6"` subtitle and a single row is ~260px tall:
fewer than three transactions fit on screen, and scanning a day's sales becomes
a long scroll.

Two smaller defects live in the same block:

- `<Separator vertical />` is emitted after **every** footer item including the
  last (`ListItem.tsx:145`), leaving a dangling divider at the end of the row.
- A vertical separator inside a `flexWrap` row has no intrinsic height, so it
  contributes spacing but draws nothing — the visual grouping it was meant to
  provide never appears.

### 2. Create/Update transaction is a two-column desktop layout with no mobile branch

`TransactionFormView.tsx:76` opens a hard `<XStack gap="$3">`: the product picker
in column one (`flex={1}`), the summary `Card maxWidth={400}` in column two.
There is no `$sm`/`$xs` override anywhere in the file, so the two columns survive
down to 320px, each getting well under 180px. Consequences:

- The picker's product cards, search field and tab bar are compressed to about
  half a phone width.
- The summary `Card` is `maxWidth={400} alignSelf="flex-start"` with no width
  fallback, so it is sized by its content and squeezed by its sibling; totals
  like `Rp. 1.250.000` wrap mid-number.
- Item rows (`:109-149`) hold trash button + product name + option values + price
  in one non-wrapping `XStack`; the amount stepper and subtotal in another
  (`:151-181`). On a phone the product name truncates to a few characters.
- The amount field is `<InputNumber ... maxWidth={50} />` (`:157-161`) flanked by
  `size="$2"` (~28px) circular ± buttons — all three below the ~44px touch target
  guideline, on the control a cashier taps most.
- Coupon rows use `$lg={{ flexDirection: 'column' }}` (`:270`) — the ≤1280px
  bucket, i.e. they stack on a laptop but for the wrong reason, and the rest of
  the file has no matching breakpoint. The file has no consistent responsive
  strategy at all.
- `Submit` (`:402-410`) is the last child of the second column, below every item
  and coupon. On a phone the cashier scrolls the whole order to reach it, and the
  running total is off-screen while items are being added — exactly when it
  matters.

### 3. The product picker dialog is wider than the phone

`TransactionItemSelect.tsx:126` sets `width={500}` on `Dialog.Content`. Every
common phone viewport is 360–430px, so the dialog is clipped or forces the page
to pan. Inside it, the option `RadioGroup`s, the ±/amount row and the
`Cancel`/`Submit` pair (`:194-203`) are all left-aligned at default size rather
than full-width — the primary action is a small button in the middle of the
screen.

Two related problems in the same component:

- `autoFocus` on the product search `Input` (`:219`) opens the soft keyboard the
  moment the create screen mounts, covering the product list the cashier came to
  read. `autoFocus` is a keyboard-station affordance, not a touch one.
- **Nested scrolling.** `TransactionCreateScreen.tsx:80` wraps everything in a
  `ScrollView`; the picker renders `Tabs` → `ScrollView flex={1}` (`:252`) →
  `FlatList nestedScrollEnabled` (`:253`). Three vertical scrollers nest, and the
  inner two have no bounded height inside an unbounded outer `ScrollView`, so on
  mobile the product list either collapses to nothing or captures drags that were
  meant for the page.

### 4. Transaction detail spends ~630px on seven cards

`TransactionDetail.tsx:73-167` renders Customer Name, Order Number, Transaction
Date, Paid At, Paid Amount, Change and Wallet as seven separate `Card`s in an
`XStack` that flips to a column at `$md` (≤1020px). Each card is a `Card.Header`
with a `size="$3"` icon and a two-line label/value — about 90px. Stacked, the
header block is ~630px of chrome before the first transaction item, on a screen
that is 640px tall. Each card carries exactly one label/value pair, so the
elevation, border and padding buy nothing.

Two defects sit inside that block:

- **Unpaid transactions display a fabricated payment.** `Paid At`, `Paid Amount`,
  `Change` and `Wallet` render unconditionally. When `paidAt` is `undefined`,
  `dayjs(undefined)` resolves to *now*, so the detail page of an unpaid order
  shows today's date and time as its payment date (`:121`), plus an empty wallet
  card. This is a correctness bug that also costs three cards of vertical space.
- Item rows (`:195-221`) put up to five label/value columns — Note, Price,
  Amount, Discount Amount, Subtotal — in an `XStack gap="$5"` with no
  `flexWrap`, so on a phone they overflow horizontally and the note is crushed.

### 5. The list toolbar and pagination overflow

- `TransactionList.tsx:76-92` places the search `Input`, a clear button and a
  labelled `Filter` button in a single row; on 360px the search field — the
  primary control — ends up with roughly half the width.
- The filter `Popover.Content` is a fixed `width={300}` (`:102`) anchored to a
  button near the right edge, and its wallet `RadioGroup` grows with the number
  of wallets with no scroll container.
- `base/Pagination` renders up to nine `size="$2"` buttons in an `XStack` with no
  `flexWrap`, so with several pages the control overflows horizontally.
- Minor, same file: the wallet radio `XStack` at `TransactionList.tsx:137` is
  missing a React `key`.

### 6. The payment alert is a desktop dialog

`TransactionPaymentAlert.tsx` pairs Wallet + Total Amount in one `XStack`
(`:61`) and Paid Amount + Change in another (`:85`); neither wraps. On a phone
the wallet `Select` collapses to ~140px and the total wraps. `AlertDialog.Content`
declares no `width`, `maxWidth` or `maxHeight` and has no inner scroll, so with
several wallets the dialog can exceed the viewport with no way to reach the
Submit button. `paidAmount` is additionally pinned to `maxWidth={150}` (`:87`).

This is the screen a cashier uses under time pressure with a customer waiting; it
is the least forgiving place for a squeezed layout.

### 7. No numeric keyboard anywhere in the flow

`base/Form/InputNumber.tsx` never sets `keyboardType` (native) or `inputMode`
(web), and neither does the picker's raw amount `Input`
(`TransactionItemSelect.tsx:175-185`). Every numeric field in the transaction
flow — order number, item amount, paid amount — opens a full alphabetic keyboard
on a phone, forcing a keyboard switch on each entry.

### 8. The statistic chart has a hardcoded 600px canvas

`TransactionStatistic.tsx:178-183` renders `<VictoryChart width={600} height={300}
padding={{ left: 80, right: 50 }} />`. On a 360px screen the SVG is clipped or
drags the whole page horizontally. The preset buttons already wrap, but the
custom-range row (two `YYYY-MM-DD` inputs plus Apply, `:130-147`) does not shrink
gracefully, and free-text date entry on a phone is its own friction.

### 9. Row actions are a 28px target behind an off-screen-prone popover

`ListItem.tsx:159-165` uses a `size="$2"` (~28px) `MoreVertical` button — under
the ~44px minimum — and the popover is `placement="left-start"` with
`width={240}`, which on a 360px screen can render partly outside the viewport.
Every row action, including **Pay** (the most frequent one on mobile), lives
behind that target.

---

## Context: Existing System

### Component map (transaction flow)

| Layer | File |
|---|---|
| List screen | `libs/ui/src/presentation/screens/TransactionListScreen.tsx` |
| List | `presentation/components/transactions/TransactionList.tsx` |
| List row | `presentation/components/transactions/TransactionListItem.tsx` |
| Create screen | `presentation/screens/TransactionCreateScreen.tsx` |
| Update screen | `presentation/screens/TransactionUpdateScreen.tsx` |
| Form | `presentation/components/transactions/TransactionFormView.tsx` |
| Product picker | `presentation/components/transactions/TransactionItemSelect.tsx` |
| Detail screen | `presentation/screens/TransactionDetailScreen.tsx` |
| Detail | `presentation/components/transactions/TransactionDetail.tsx` |
| Payment dialog | `presentation/components/transactions/TransactionPaymentAlert.tsx` |
| Delete / Unpay | `TransactionDeleteAlert.tsx`, `TransactionUnpayAlert.tsx` |
| Statistic | `presentation/components/transactions/TransactionStatistic.tsx` |
| Shared (in scope where noted) | `base/ListItem.tsx`, `base/Pagination`, `base/Form/InputNumber.tsx`, `base/Sheet` |

Handlers (`Transaction*Handler.tsx`) and controllers (`Transaction*Controller.tsx`)
own state and data; **this PRD changes presentation only.** No handler,
controller, usecase, repository, API contract or Go code changes.

### Breakpoints

`libs/ui/src/config.ts` (web) and `config.native.ts` both build on
`@tamagui/config/v3`, whose default media buckets are approximately
`xs` ≤ 660, `sm` ≤ 800, `md` ≤ 1020, `lg` ≤ 1280, plus the `gt*` inverses.
`$xs` is therefore the phone bucket, and it is what the codebase already uses for
mobile behaviour: `Sidebar.state.tsx:70` (`media.xs` → sidebar overlays and starts
collapsed) and `ListItem.tsx:96` (`$xs` hides the row thumbnail). **We reuse `$xs`
as the mobile bucket throughout** rather than introducing a new convention.

### Existing responsive precedent in the repo

- `ExpenseFormView.tsx:46,83-111` — `$xs={{ flexDirection: 'column' }}` and
  `$xs={{ flexBasis: '100%' }}`.
- `ProductFormView.tsx:65,85`, `VariantFormView.tsx:81,229` — `$sm` column flip.
- `RentalList.tsx:62` — `$xs` column flip on a toolbar row.
- `Sidebar.tsx:41,55` — `$xs` overlay positioning.

The transaction components are the ones that never got this treatment.

### Shell

`base/Layout.tsx` wraps every screen in `Sidebar` + `Navbar` + a
`YStack padding="$5"`. The 20px padding on both sides costs 40px of a 360px
screen. Layout is shared by every screen in the POS, so **changing its padding is
out of scope here**; the transaction fixes must work inside the ~320px of usable
width it leaves.

### Tests that will need attention

- `apps/web-e2e/src/transactions.spec.ts` — selectors are mostly role/text based,
  but `page.locator('p').filter({ hasText: … })` (`:104`, `:230`) depends on
  Tamagui `Paragraph` rendering as a `<p>` on web. Any swap of `Paragraph` for
  `SizableText`/`Text` in a touched component breaks it.
- `libs/ui/src/presentation/screens/TransactionDetailHandler.test.tsx` — asserts
  on detail content; the summary-block rewrite will need it updated.
- `TransactionPaymentAlert.test.tsx` — asserts on the payment dialog.
- `.stories.tsx` exists for every component in the table above; each phase
  refreshes the stories it touches.

---

## Proposed Solution

### Core rules

1. **One mobile bucket.** All new responsive props key off `$xs`. No new
   breakpoint conventions, no `useMedia` in presentation components where a
   media prop will do (`useMedia` forces a re-render and breaks SSR parity;
   `Sidebar` uses it because it drives state, not style).
2. **Mobile is a density change, not a different component.** Same tree, same
   props, same test IDs — smaller type, tighter padding, stacked axis. This keeps
   each diff small and keeps desktop rendering byte-identical where possible.
3. **Desktop must not regress.** Every phase states the desktop rendering it
   preserves; the default (non-`$xs`) branch keeps today's values.
4. **Touch targets ≥ 44px** for anything a cashier taps repeatedly: amount ±,
   row menu, pagination, dialog actions.
5. **Money and totals are never truncated.** Where space is short, the total wins
   and the label shrinks.
6. **No data-layer changes.** If a fix appears to need one, it is out of scope and
   goes to Open Questions instead.

### Target metrics (360×640 viewport)

| Surface | Today | Target |
|---|---|---|
| Paid transaction row height | ~260px | ≤ 120px |
| Transactions visible per screen | ~2 | ≥ 4 |
| Detail header block height | ~630px | ≤ 200px |
| Horizontal overflow, any transaction screen | present (picker dialog, chart, pagination) | none |
| Smallest repeated tap target | ~28px | ≥ 44px |

---

## Feature Requirements

### FR-1 — Compact list-row footer on mobile

`base/ListItem.tsx`, applied to `TransactionListItem`.

- On `$xs`: drop the circular icon chip (or render a 16px inline icon), render
  each footer item as a single line `Label: value` at `size="$2"`, and lay them
  out in a wrapping row with `gap="$2"`.
- Title `H4` → `$5` on `$xs`; string subtitle `size="$6"` → `$4`.
- Render separators **between** items only — no trailing separator — and use a
  horizontal rule or plain gap rather than a zero-height vertical separator
  inside a wrapping row.
- Above `$xs`, rendering is unchanged.

**Blast radius:** every list in the POS renders `base/ListItem` (products,
materials, expenses, wallets, rentals, coupons, tickets, tables, suppliers,
stock checks, checklists). The change is a density improvement for all of them,
but the phase's acceptance includes a Storybook sweep of the other list items to
confirm nothing looks broken.

### FR-2 — Transaction list toolbar and pagination fit the viewport

- `$xs`: search `Input` takes its own full-width row; clear + `Filter` sit on a
  second row, `Filter` icon-only (keep the accessible name).
- Filter popover: `$xs={{ width: 260 }}`, `maxHeight` with an inner scroll for
  the wallet list, and `allowFlip`/`stayInFrame` retained.
- `base/Pagination`: `flexWrap="wrap"`, `size="$3"` buttons (≥44px effective).
- Add the missing `key` on the wallet radio row.

### FR-3 — Detail summary as one block, and no fabricated payment

Replace the seven `Card`s with a single bordered summary block: a definition list
of `label` (left, muted, `size="$2"`) and `value` (right, `size="$4"`, bold),
one row each, `$gtXs` may render two columns.

- Rows: Customer Name; Order Number (only when `> 0`); Transaction Date; then,
  **only when `paidAt` is set**, Paid At, Paid Amount, Change, Wallet.
- When `paidAt` is unset, show a single `Payment — Unpaid` row instead. This
  removes the "unpaid order shows today as its payment date" bug.
- Keep the icons, at `size="$1"`, inline before the label.

### FR-4 — Detail item and coupon rows wrap

- The metric row under each item becomes a wrapping key/value grid: `flexWrap`,
  `$xs={{ flexBasis: '48%' }}` per metric, right-aligned values, `Note` on its
  own full-width row when present.
- Discount and Subtotal keep their current conditional rendering.
- The grand `Total` stays right-aligned and is the largest type on the screen.

### FR-5 — The transaction form stacks on mobile

`TransactionFormView.tsx`:

- Outer `XStack` → `$xs={{ flexDirection: 'column' }}`; picker column first,
  summary card second.
- Summary `Card`: `width="100%"`, `$gtXs={{ maxWidth: 400 }}`, drop
  `alignSelf="flex-start"` on `$xs`.
- Item rows: `flexWrap` on the header row; amount stepper and subtotal on their
  own row with the subtotal right-aligned.
- Amount `InputNumber`: `$xs={{ minWidth: 64 }}` and `size="$3"` ± buttons.
- Replace the stray `$lg` on coupon rows with `$xs`, for consistency with the
  rest of the file.

### FR-6 — Sticky action bar on create/update (mobile)

On `$xs`, the running total and `Submit` detach from the bottom of the form into
a bar pinned to the bottom of the viewport: `Total` on the left, full-height
`Submit` on the right, with the scroll content given matching bottom padding so
the last item is never covered. Above `$xs` the button stays where it is today.

Use the same sticky approach already proven in the order app
(`CartScreen.tsx` checkout bar), including its `@ts-expect-error` note for
`position: 'sticky'` if that is still needed.

### FR-7 — The product picker is a sheet on mobile

- `$xs`: present the option/amount step in the shared `base/Sheet` (full-height,
  already used for the coupon list in this same form) instead of `Dialog`. Above
  `$xs` the `Dialog` stays, with `width` → `maxWidth={500} width="100%"`.
- Dialog/sheet actions: full-width, `size="$4"`, `Submit` primary.
- `autoFocus` on the search input only when `Platform.OS === 'web'` **and** not
  `$xs` — the same platform-guard pattern used for the print menus in
  `TransactionListItem.tsx:70,76`.
- Fix the nested scroll: the picker owns its own scrolling (`flex={1}` +
  bounded height); on `$xs` the create/update screen's outer `ScrollView` must
  not wrap it. The `Tabs` content keeps one scroller — the `FlatList` — and the
  intermediate `ScrollView` is removed.

### FR-8 — Numeric keyboards

`base/Form/InputNumber.tsx` sets `inputMode="numeric"` and
`keyboardType={fractionDigit > 0 ? 'decimal-pad' : 'number-pad'}` by default,
overridable by props. The picker's raw amount `Input` gets the same.

**Blast radius:** every numeric field in the POS. This is the intended outcome;
no field in the app wants an alphabetic keyboard.

### FR-9 — Payment alert fits a phone

- `$xs`: Wallet/Total and Paid Amount/Change each stack vertically.
- `AlertDialog.Content`: `width="90%"`, `maxWidth={480}`, `maxHeight="85%"` with
  the body in a `ScrollView` so the actions are always reachable.
- Actions full-width, `size="$4"`, `Submit` primary and last.
- Drop `maxWidth={150}` on `paidAmount` on `$xs`.

### FR-10 — Statistic chart fits its container

Measure the container with `onLayout` and pass the measured width (clamped to a
sensible minimum, e.g. 320) to `VictoryChart`, replacing the hardcoded `600`.
Reduce `padding.left` on `$xs` so the y-axis labels don't eat a third of a phone
screen. Custom-range inputs stack on `$xs`.

### FR-11 (optional) — Pay is reachable in one tap

Give `TransactionListItem` an inline primary `Pay` action on unpaid rows on
`$xs`, and raise the `ListItem` menu trigger to `size="$3"` with `hitSlop`, so
the most frequent mobile action is not two taps deep in a popover that may render
off-screen.

---

## Non-Goals

- Any change to handlers, controllers, usecases, repositories, the API contract,
  or Go code. Presentation only.
- `base/Layout` padding, `Navbar`, and `Sidebar` — shared shell, separate concern.
- Non-transaction screens (products, materials, expenses, wallets, rentals,
  checklists, tickets, tables) except as the incidental beneficiaries of FR-1 and
  FR-8, whose blast radius is stated and verified per phase.
- The customer-facing order app (`apps/order`) — covered by
  [`docs/prd-order-app-ux-improvements.md`](./prd-order-app-ux-improvements.md).
- A design-system rewrite, a new token scale, or a theming pass.
- Offline behaviour, performance work, and list virtualisation tuning.
- Print layouts (`TransactionPrintCustomer`, `TransactionPrintEmployee`) — those
  target paper, not phones.

---

## Risks

1. **FR-1 and FR-8 touch shared base components.** Mitigation: both are
   density/behaviour improvements that every consumer wants; each phase's
   acceptance includes a Storybook sweep of the other consumers, and the desktop
   branch keeps today's values.
2. **E2E selector coupling.** `transactions.spec.ts` matches on the `p` tag.
   Mitigation: keep `Paragraph` as the text primitive in touched components,
   changing only its `size`; run `web-e2e` in every phase that touches the list,
   form or payment dialog.
3. **`position: sticky` parity (FR-6).** Sticky works on web; on React Native it
   needs an absolutely-positioned footer outside the scroll view. Mitigation:
   implement the bar as a sibling of the scroller (the `OrderLayout` footer
   pattern), not as a sticky child, so both platforms take the same path.
4. **Sheet vs Dialog divergence (FR-7).** Two presentations of the same step can
   drift. Mitigation: extract the step's body into one component rendered by both
   shells; only the shell is conditional.
5. **Removing the intermediate `ScrollView` (FR-7)** could regress scrolling on
   desktop where the current nesting happens to work. Mitigation: this phase is
   verified on both a 360px viewport and a 1440px one before merge.
6. **Storybook is the only mobile verification loop available in CI.** There is
   no mobile visual-regression harness. Mitigation: every phase adds a story
   pinned to a 360×640 viewport, and acceptance criteria are written so a
   reviewer can check them by hand in Storybook.

---

## Open Questions

1. **FR-11 — is an inline `Pay` button wanted on the row?** It is the highest-value
   mobile change in the list but it alters the row's visual weight. Ship the rest
   first and decide from the compacted row.
2. **Date entry on the statistic screen (FR-10).** Free-text `YYYY-MM-DD` is poor
   on a phone. A native date picker is a bigger change than this PRD's scope —
   flagged, not planned.
3. **Order number on mobile.** Should it be promoted into the row title
   (`#12 · Budi`) rather than living in the footer? Cheap once FR-1 lands, but it
   changes the list's information hierarchy, so it is deliberately not assumed.
4. **Should `paidAmount`/`change` appear on the list row at all on mobile,** or is
   wallet + payment date enough? FR-1 keeps today's set; trimming it is a product
   call.

---

## Implementation Phases

Eleven PRs. **All are independent** — none blocks another — with two soft
orderings:

- Phase 1 (compact rows) is best merged **before** Phase 11 (inline Pay), which
  is sized against the compacted row.
- Phase 3 and Phase 4 both touch `TransactionDetail.tsx` in different regions;
  merging 3 first avoids a trivial conflict.

Every phase: presentation only, adds/updates the `.stories.tsx` for the files it
touches with a 360×640 story, and must pass `nx run ui:lint`, `nx run ui:test`,
and — where noted — `apps/web-e2e`.

---

### Phase 1 — Compact `ListItem` footer on mobile

**Goal:** FR-1.

**Files**
- `base/ListItem.tsx`: `$xs` branch for footer items (single-line `label: value`,
  `size="$2"`, no icon chip); `$xs` type scale for title/subtitle; separators
  between items only; remove the trailing `Separator`.
- `base/ListItem.stories.tsx`: add a "mobile, four footer items" story.
- `transactions/TransactionListItem.stories.tsx`: paid + unpaid at 360px.

**Acceptance**
- At 360px, a paid transaction row (4 footer items) is ≤ 120px tall; ≥ 4 rows fit
  a 640px viewport.
- No dangling separator after the last footer item, at any width.
- At ≥ 1024px the row renders exactly as it does today (side-by-side comparison).
- Product, material, expense, wallet, rental, coupon, ticket and table list
  stories all still render sensibly at 360px and unchanged at desktop.
- `nx run ui:test` and `apps/web-e2e` pass.

**Estimated diff:** ~90 LoC.

---

### Phase 2 — Transaction list toolbar, filter popover and pagination

**Goal:** FR-2.

**Files**
- `transactions/TransactionList.tsx`: `$xs` toolbar stacking, icon-only `Filter`
  with `accessibilityLabel`, `$xs` popover width + `maxHeight` + inner scroll,
  missing `key` on the wallet radio row.
- `base/Pagination/Pagination.tsx`: `flexWrap="wrap"`, `size="$3"`.
- Stories for both at 360px, including a 10-page pagination and a 6-wallet filter.

**Acceptance**
- At 360px the search input spans the full row; no horizontal overflow on the
  toolbar or pagination at any page count.
- The filter popover stays fully on-screen at 360px and scrolls internally with
  6+ wallets.
- Pagination buttons are ≥ 44px effective touch height.
- No React `key` warning in the console on the list screen.
- `apps/web-e2e` passes.

**Estimated diff:** ~70 LoC.

---

### Phase 3 — Detail summary block (and the unpaid-date bug)

**Goal:** FR-3.

**Files**
- `transactions/TransactionDetail.tsx`: replace the seven `Card`s with one
  summary block; gate the payment rows on `paidAt`; add the `Unpaid` row.
- `TransactionDetail.stories.tsx`: paid and **unpaid** stories at 360px.
- `TransactionDetailHandler.test.tsx`: update assertions; add a case proving an
  unpaid transaction shows no payment date.

**Acceptance**
- At 360px the summary block is ≤ 200px tall and the first transaction item is
  visible without scrolling on a 640px viewport.
- An unpaid transaction shows `Unpaid` and **no** Paid At / Paid Amount / Change /
  Wallet rows — in particular, never today's date as a payment date.
- Order Number is absent when `0`.
- At ≥ 1024px the block reads as two columns and fits above the fold.

**Estimated diff:** ~120 LoC (mostly deletion).

---

### Phase 4 — Detail item and coupon rows wrap

**Goal:** FR-4.

**Files**
- `transactions/TransactionDetail.tsx`: metric rows → wrapping key/value grid;
  `Note` full-width; total unchanged in position, largest in type.
- `TransactionDetail.stories.tsx`: a story with a long note, a discount, and 5+
  items.

**Acceptance**
- At 360px no metric row overflows horizontally, including an item with Note +
  Price + Amount + Discount + Subtotal.
- A long note wraps instead of truncating.
- Coupon rows show their negative subtotal right-aligned without overflow.
- Desktop rendering unchanged.

**Estimated diff:** ~60 LoC.

---

### Phase 5 — Transaction form stacks on mobile

**Goal:** FR-5.

**Files**
- `transactions/TransactionFormView.tsx`: outer `$xs` column flip; card width;
  item-row wrapping; amount stepper sizing; `$lg` → `$xs` on coupon rows.
- `TransactionFormView.stories.tsx`: 360px story with 3 items, one item coupon and
  one order coupon.

**Acceptance**
- At 360px the picker and the summary card are stacked full-width; no element is
  under ~300px wide.
- Product names in item rows are readable (no mid-word truncation) at 360px.
- The amount ± buttons and input are each ≥ 44px tall.
- At ≥ 1024px the two-column layout and the 400px card are unchanged.
- `apps/web-e2e` passes (it drives this form end to end).

**Estimated diff:** ~110 LoC.

---

### Phase 6 — Sticky total + submit bar on create/update

**Goal:** FR-6.

**Files**
- `transactions/TransactionFormView.tsx`: extract the total + `Submit` into a
  bar rendered as a sibling of the scroll content on `$xs`; bottom padding on the
  scroll content.
- `screens/TransactionCreateScreen.tsx`, `screens/TransactionUpdateScreen.tsx`:
  pass the bar through / adjust the `ScrollView` wrapper accordingly.
- Stories for both screens at 360px with enough items to scroll.

**Acceptance**
- At 360px with 10 items, the total and `Submit` are visible without scrolling and
  stay put while the item list scrolls.
- The last item is fully readable — not covered by the bar.
- The bar is absent (button in its current position) at ≥ 1024px.
- `Submit` remains disabled/enabled under exactly the same conditions as today,
  and the submitting spinner still shows.
- `apps/web-e2e` passes.

**Estimated diff:** ~90 LoC.

---

### Phase 7 — Product picker: sheet on mobile, single scroller, no autofocus

**Goal:** FR-7.

**Files**
- `transactions/TransactionItemSelect.tsx`: extract the option/amount step body
  into one component; render it in `base/Sheet` on `$xs` and `Dialog` above;
  `maxWidth={500} width="100%"` on the dialog; full-width actions; platform- and
  breakpoint-guarded `autoFocus`; remove the intermediate `ScrollView` inside
  `Tabs` and give the picker a bounded height.
- `screens/TransactionCreateScreen.tsx` / `TransactionUpdateScreen.tsx`: stop
  wrapping the picker in the outer `ScrollView` on `$xs`.
- `TransactionItemSelect.stories.tsx`: 360px stories for the list and the
  selecting-options state.

**Acceptance**
- At 360px the option step fills the screen with no horizontal overflow, and its
  primary action is full-width and reachable with one thumb.
- The soft keyboard does not open automatically when the create screen mounts on
  a phone; `autoFocus` still works on desktop web.
- The product list scrolls smoothly at 360px — no dead zone, no captured drag —
  and the page behind it does not scroll simultaneously.
- At 1440px the dialog, tabs and product list behave exactly as today.

**Estimated diff:** ~150 LoC.

---

### Phase 8 — Numeric keyboards

**Goal:** FR-8.

**Files**
- `base/Form/InputNumber.tsx`: default `inputMode` / `keyboardType`, prop-overridable.
- `transactions/TransactionItemSelect.tsx`: same on the raw amount `Input`.

**Acceptance**
- On a phone, order number, item amount and paid amount all open a numeric
  keypad; a `fractionDigit > 0` field offers a decimal separator.
- Typing, clearing and the nullable-field behaviour in `InputNumber` are
  unchanged (existing unit tests pass untouched).
- Desktop web typing behaviour is unchanged.

**Estimated diff:** ~15 LoC. *Smallest, highest-value-per-line phase — good first merge.*

---

### Phase 9 — Payment alert fits a phone

**Goal:** FR-9.

**Files**
- `transactions/TransactionPaymentAlert.tsx`: `$xs` stacking, content
  width/maxHeight + inner scroll, full-width actions, `$xs` amount width.
- `TransactionPaymentAlert.stories.tsx`: 360px story, plus one with 6 wallets.
- `TransactionPaymentAlert.test.tsx`: unchanged assertions must still pass.

**Acceptance**
- At 360px with 6 wallets the dialog fits the viewport and both actions are
  reachable without the content being cut off.
- Wallet name, total, paid amount and change are each fully legible — no wrapped
  or truncated rupiah figures.
- The cashless branch (no paid-amount row) still renders correctly.
- `apps/web-e2e` payment flow passes.

**Estimated diff:** ~70 LoC.

---

### Phase 10 — Statistic chart fits its container

**Goal:** FR-10.

**Files**
- `transactions/TransactionStatistic.tsx`: `onLayout`-measured width with a
  minimum clamp, `$xs` padding, `$xs` stacking for the custom-range row.
- `TransactionStatistic.stories.tsx`: 360px story.

**Acceptance**
- At 360px the chart fits with no horizontal page scroll, and the y-axis labels
  remain readable.
- At 1440px the chart is at least as wide as today's 600px.
- The custom-range inputs and Apply button stack and remain usable at 360px.
- Preset and group-by buttons still wrap without overflow.

**Estimated diff:** ~60 LoC.

---

### Phase 11 (optional, decide after Phase 1) — One-tap Pay on the list row

**Goal:** FR-11.

**Files**
- `transactions/TransactionListItem.tsx`: inline `Pay` on unpaid rows at `$xs`.
- `base/ListItem.tsx`: menu trigger `size="$3"` + `hitSlop`.
- Stories for both.

**Acceptance**
- At 360px an unpaid row exposes `Pay` directly; it opens the same payment dialog
  as the menu item, and the menu still lists every action.
- The row menu trigger is ≥ 44px effective.
- The popover renders fully on-screen at 360px, including on the last row.
- Paid rows are visually unchanged apart from the larger menu trigger.

**Estimated diff:** ~50 LoC.

---

## Rollout & verification

There is no mobile visual-regression harness, so verification is:

1. **Storybook at 360×640** for every touched component (each phase adds the
   story).
2. **`apps/web` in a 360px browser viewport**, walking the full flow: list →
   create → pick product → apply coupon → submit → pay → detail.
3. **`apps/mobile`** on a device or simulator for the phases that change scroll
   or presentation behaviour (Phases 6, 7) — these are the two that can behave
   differently between `react-native-web` and React Native.
4. `nx run ui:lint`, `nx run ui:test`, and `apps/web-e2e` on every phase.
