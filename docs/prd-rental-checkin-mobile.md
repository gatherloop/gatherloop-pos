# PRD: Rental Checkin — Mobile (Small Screen) Flow

**Status:** Proposed
**Scope:** `libs/ui` presentation layer only — shared by `apps/web` (Next.js) and `apps/mobile` (React Native/Expo)
**Affected flow:** Checkin Rental (`/rentals/checkin`, mobile route `rentalCheckin`)
**Precedent:** [`docs/prd-transaction-form-mobile.md`](./prd-transaction-form-mobile.md) — this PRD deliberately reuses that flow's shape, hook and vocabulary.

---

## Problem Statement

Rental checkin is the counter's fastest-turnaround screen: a staff member scans/keys a card code for every board game handed out. It is currently a **desktop-first two-column layout** rendered by `RentalCheckinFormView.tsx`:

```
XStack
├── YStack flex=1        → TransactionItemSelect (search, category tabs, product grid, pagination)
└── Card width=350 flex=1 → Customer Name
                          → "Customize Checkin Date Time" (+ 5 selects when enabled)
                          → Items: per rental → remove button, product name, option values,
                                                Code input, ticket-lookup feedback
                          → Submit (below the XStack, right-aligned)
```

That `XStack` has **no responsive branching**, so on a phone-sized viewport (mobile browser and the React Native app alike):

1. **The product picker is crushed.** It splits ~390dp with a 350px-wide card, leaving the search field, the category `Tabs` and every `ProductListItem` roughly half a screen wide. Picking a game — the action repeated dozens of times a shift — is the slowest step.
2. **The cart is always on screen even when it is empty.** On entry, the right column shows an empty Customer Name, the checkin-datetime checkbox, an empty "Items" heading and a Submit button that can never succeed (the resolver requires `rentals.min(1)` and `name.min(1)`). It costs half the viewport and contributes nothing.
3. **Everything is one long vertical scroll.** `RentalCheckinScreen` wraps the form in a `ScrollView`, so the product `FlatList` has no bounded height of its own; the page scrolls as a single document and staff lose their place between "pick a game" and "type the card code".
4. **The code inputs — the actual point of the screen — are the hardest thing to reach.** Each added rental appends one row (`amount` expands to N rows), each with its own `Code` input and an `onSubmitEditing` focus chain to the next one. On a phone those rows sit below a squeezed product grid, and the software keyboard covers them as soon as one is focused.
5. **The print dialog after submit is not sized for a phone.** On success the handler opens the shared `ConfirmationAlert` ("Print Checkin Slip"). `ConfirmationAlert.Content` has no width bound and no scroll region, and nothing closes an open overlay before it appears — so on a small viewport its buttons can end up off-screen or behind another layer, and the confirm/cancel choice that decides whether the slip prints becomes unreachable.

The desktop layout is fine and stays as it is. The fix is a **second, compact layout for small screens**, driven off the same component tree, the same form state and the same usecases — exactly what shipped for the transaction form in `prd-transaction-form-mobile.md`.

### Goals

- On a small screen, opening Checkin lands the user directly on a **full-screen ticket picker** (`TransactionItemSelect`, already filtered to `saleType: 'rental'`).
- Tapping a product opens the **existing** variant + amount step, already sized for small screens by the transaction PRD's FR-6.
- Submitting the variant appends the rental rows and reveals a **floating cart button** pinned to the bottom of the screen.
- Tapping the cart button opens a **cart sheet** containing exactly what the desktop right column contains — Customer Name, the checkin-datetime block, one row per ticket with its **Code** input and ticket-lookup feedback — plus Submit.
- After a successful submit, the **print confirmation dialog** appears over a clean screen, fully visible and fully usable at 360–430px, on web and native.
- **Zero visual or behavioural change on desktop / large screens.**
- One shared implementation for web and React Native — no `Platform.OS` branching for layout.

### Non-Goals (explicitly out of scope)

- No change to the rental API contract, the Zod resolver, `RentalCheckinUsecase`, `TicketListUsecase`, or `TransactionItemSelectUsecase`.
- No redesign of the desktop layout, the product card, the category tabs, or pagination.
- **Rental checkout** (`RentalCheckoutFormView`, `/rentals/checkout`) and the rental list are untouched. They have their own mobile problems; they get their own PRD.
- No change to what the checkin slip prints (`CheckinPrintPayload`, `usePrinter`) — only to the dialog that asks whether to print it.
- No barcode/NFC scanner integration, no offline draft recovery, no auto-assign of codes.
- No redesign of `TransactionItemSelect` itself — it is consumed as-is.

---

## Context: The Existing System

### Files that matter

| File | Role |
|---|---|
| `libs/ui/src/presentation/components/rentals/RentalCheckinFormView.tsx` | The two-column layout. Owns the `XStack`, the cart `Card`, the customer-name field, the checkin-datetime block, the rentals field-array rendering (code input + focus chain + ticket lookup) and the Submit button. |
| `libs/ui/src/presentation/screens/RentalCheckinScreen.tsx` | Wraps `RentalCheckinFormView` in `Layout` + `ScrollView` and feeds it a `TransactionItemSelect` through the `RentalItemSelect` render prop. |
| `libs/ui/src/presentation/screens/RentalCheckinHandler.tsx` | Wires controllers → screen props. Owns the "variant loaded → `onAddItem`" effect and the "submit success → show the print confirmation → `router.push('/rentals')`" effect (guarded by `hasShownPrintDialogRef`). |
| `libs/ui/src/presentation/controllers/RentalCheckinController.tsx` | `react-hook-form` form + `useFieldArray` for `rentals`, `onAddItem` (appends **one row per unit** of `amount`), `onToggleCustomizeCheckinDateTime`. |
| `libs/ui/src/presentation/components/transactions/TransactionItemSelect.tsx` | Shared picker. **Already compact-aware**: `autoFocus` off, `paddingBottom: 90` reserved for a floating button, responsive variant dialog (`width: '90%'`, `maxWidth: 500`, scrolling body). |
| `libs/ui/src/presentation/components/transactions/TransactionCartButton.tsx` | The floating cart button built for the transaction form. Styling (absolute bottom bar, safe-area padding, `minHeight: 44`) is exactly what checkin needs; its copy and `total` are not. |
| `libs/ui/src/presentation/components/transactions/TransactionFormView.tsx` | **Reference implementation** of the compact branch: `useIsCompactLayout()`, floating button, `Sheet` with header / scrolling body / pinned footer, `FormProvider` re-established inside the sheet, close-on-`isSubmitSuccess`. |
| `libs/ui/src/presentation/components/base/useIsCompactLayout.ts` | `media.sm === true` → compact. Already shipped; **no foundation work needed for this PRD.** |
| `libs/ui/src/presentation/components/base/Sheet/Sheet.tsx` | Shared bottom sheet (`modal`, `snapPoints={[90, 0]}`, `zIndex: 100_000`, `disableDrag`, `Frame height="100vh"`). |
| `libs/ui/src/presentation/components/base/ConfirmationAlert/ConfirmationAlert.tsx` + `ConfirmationAlertContext.tsx` | The print dialog. A single provider-level `AlertDialog`; no width bound, no scroll region, default `zIndex`. Shared with the transaction print flow. |

### How a ticket gets into the cart today

The picker and the cart are two independent state machines joined by an effect in `RentalCheckinHandler`:

1. `TransactionItemSelect` → `SELECT_PRODUCT` → `transactionItemSelect` state becomes `selectingOptions` → the variant dialog opens.
2. User picks option values + amount → `FETCH_VARIANT` → `loadingVariant` → `loadingVariantSuccess` with a `selectedVariant`.
3. The handler's `useEffect` calls `rentalCheckin.onAddItem(variant, amount)`, which appends **`amount` separate rows** to the `rentals` field array, each `{ code: '', variant }`.

**This mechanism is untouched by this PRD.** The compact layout changes *where the cart is rendered*, not *how rows reach it*.

### What checkin does NOT share with the transaction form

| Transaction form | Rental checkin |
|---|---|
| Money: item prices, coupons, discounts, a running total | **No money at all** — no price, no total, nothing to sum |
| Nested coupon `Sheet` (solved by a content swap) | **No nested overlay** — the cart sheet has no second surface |
| One row per product with an amount stepper | **One row per physical ticket**, each needing a unique `code` |
| Success → payment alert → print dialogs | Success → **print dialog** → `router.push('/rentals')` |

The consequences: the cart button has no total to show, the sheet needs no back-navigation state, and the sheet body is **input-heavy** (one text input per ticket) rather than read-mostly. Keyboard handling, not overlay stacking, is the hard part here.

### Constraint: the code-input focus chain across a portal

`RentalCheckinFormView` keeps `inputCodeRefs: useRef<(Input | null)[]>` and advances focus to the next code input on `onSubmitEditing`. That is the single biggest speed win on this screen and it must keep working when the rows are rendered inside a Tamagui `Sheet`, which mounts its content through its own portal host. The ref array lives in whichever component renders the rows, so extraction (FR-1) must keep the refs and the rows in the **same** component.

### Constraint: `FormProvider` inside the sheet

Learned the hard way on the transaction form (PR #308): Tamagui's modal `Sheet` portals its content, and on some platforms (Android) ambient React context does not travel down. Everything in the cart body reads the form via `useFormContext()`, and `FieldWatch` must be passed an explicit `control`. The cart sheet therefore re-establishes `<FormProvider {...form}>` inside itself. The same applies here.

### Constraint: the Jest Tamagui mock

`libs/ui/src/__mocks__/tamagui.tsx` exports `useMedia` as a `jest.fn(() => ({}))`, so every media flag is `undefined` by default and `useIsCompactLayout()` returns `false` → **tests render the desktop branch unless they opt in** with `(useMedia as jest.Mock).mockReturnValue({ sm: true })`. `RentalCheckinHandler.test.tsx` asserts Customer Name and Submit are visible on mount; those assertions stay valid untouched, and compact-branch tests opt in explicitly.

The mock's `Sheet` renders children only when `open` is true, and its `Input` forwards refs — both compact-branch tests and the focus-chain test can rely on that.

### Constraint: `Sheet.Frame height="100vh"` on React Native

`vh` is a web-only CSS unit. The shared `Sheet` ships it today and the transaction cart sheet is already in production with it, so it is treated as pre-existing rather than introduced here — but the checkin cart is the first sheet whose content is a **long, keyboard-driven list**, so its height behaviour on native must be verified explicitly (FR-3) and any fix goes into the shared `Sheet` with its other consumers re-checked.

---

## Target UX

### Compact — step 1: ticket picker (full screen)

```
┌────────────────────────────┐
│ ←  Checkin Rental        ⋮ │  Navbar
├────────────────────────────┤
│ Select Product             │
│ ┌────────────────────┐ ┌─┐ │
│ │ Search Products…   │ │✕│ │
│ └────────────────────┘ └─┘ │
│ [ Board Game ][ Console ]  │  category Tabs
│ ┌────────────────────────┐ │
│ │ ▣  Catan               │ │
│ │ ▣  Splendor            │ │  scrolls INSIDE this region
│ │ ▣  Wingspan            │ │
│ └────────────────────────┘ │
│        ‹  1  2  3  ›       │  Pagination
│                            │
│ ┌────────────────────────┐ │
│ │ 3 tickets · View Cart ▸│ │  floating cart button (only when rentals > 0)
│ └────────────────────────┘ │
└────────────────────────────┘
```

### Compact — step 2: variant + amount

The **existing** `TransactionItemSelect` dialog, unchanged — already responsive (`width: '90%'`, `maxWidth: 500`, scrolling options area) from the transaction PRD's FR-6. Amount N appends N ticket rows.

### Compact — step 3: cart sheet (code entry)

```
┌────────────────────────────┐
│           ────             │  drag handle
│ Cart                    ✕  │
├────────────────────────────┤
│ Customer Name  [_________] │
│ ☐ Customize Checkin Date…  │
│ ───────── Tickets ──────── │
│ 🗑  Catan                   │
│    Standard                │
│    [ Code…              ]  │
│    ✓ → Ticket A12          │
│ ─────────────────────────  │
│ 🗑  Splendor                │
│    Standard                │
│    [ Code…              ]  │
│    ⚠ Unregistered card     │
├────────────────────────────┤
│ 3 tickets · 1 code left    │  pinned footer
│ [        Submit         ]  │
└────────────────────────────┘
```

Body scrolls; footer stays pinned; the focused code input is never covered by the keyboard.

### Compact — step 4: print confirmation

```
┌────────────────────────────┐
│                            │
│   ┌────────────────────┐   │  ≤90% viewport width,
│   │ Print Checkin Slip │   │  vertically centred,
│   │ Do you want to     │   │  body scrolls if it
│   │ print checkin slip?│   │  cannot fit
│   │        [ No ][Yes] │   │  buttons always visible
│   └────────────────────┘   │
│                            │
└────────────────────────────┘
```

The cart sheet is **closed before this opens** — no overlay behind it, nothing competing for `zIndex`.

### Large screens — unchanged

```
XStack
├── TransactionItemSelect (flex 1)
└── Card(cart, width 350) ; Submit below
```

Pixel-identical to today.

---

## Confirmed Product & Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Breakpoint for "compact" | **`useIsCompactLayout()`** (`media.sm === true`, ≤800px) | Already shipped and already used by `TransactionItemSelect`, which this screen renders. A second breakpoint would make the picker and its host disagree. |
| Foundation work needed | **None** | The hook, the overridable Jest `useMedia` mock, and the compact `TransactionItemSelect` all landed with the transaction PRD. This PRD starts at extraction. |
| Cart button copy | `{n} ticket(s) · {m} code(s) left · View Cart`, collapsing to `{n} ticket(s) · View Cart` when every code is filled | Checkin has no total, so the button's second slot is free — the remaining-code count is the one number that tells staff whether they can submit. |
| Cart button styling | A shared `FloatingCartButton` in `base/`, extracted from `TransactionCartButton` | Same bar, same safe-area padding, same 44px target on both screens; one place to fix. `TransactionCartButton` keeps its own copy/total and delegates the chrome. |
| Cart button visibility | Visible **iff `rentalsFieldArray.fields.length > 0`**, compact only | With zero rows the form cannot validate (`rentals.min(1)`), so there is nothing to open. |
| Does adding a ticket auto-open the cart? | **No.** The button appears and updates its counts; the sheet stays closed. | Staff hand out several games per group. Auto-opening would force a dismiss per add. Consistent with the transaction form. |
| Where Submit lives on compact | **Inside the cart sheet**, in a pinned footer | Submit needs Customer Name and every Code — both only exist in the sheet. Submitting from outside would hide the errors from the fields that caused them. |
| Sheet on validation failure | **Stays open**; `FormErrorBanner` and field errors render inside it | Errors must be visible where the offending fields are. |
| Sheet on submit success | **Closes**, then the print confirmation opens | Prevents an `AlertDialog` stacked over a `modal` `Sheet` — the exact failure the transaction PRD's FR-7 was written for. |
| Code-entry keyboard behaviour | The sheet keeps the focused input visible above the keyboard; the `onSubmitEditing` chain still advances to the next code input and scrolls it into view | This is the screen's core interaction; if it degrades in the sheet, the mobile layout is a net loss. |
| Checkin-datetime block on compact | Lives in the sheet, above Tickets; its 3-up / 2-up select rows **wrap** instead of squeezing | Three selects across 390px minus sheet padding are unusable; wrapping keeps each select at a legible width. |
| Print dialog sizing | `ConfirmationAlert` gets `width: '90%'` / `maxWidth` on compact and a scrollable body; desktop unbounded as today | Shared component — the same fix also protects the transaction print prompts, which the transaction PRD flagged but only ever verified for the payment alert. |
| React Native parity | Same components, same hook — `useMedia()` reads `Dimensions` on native, so a phone is compact and a landscape tablet (>800dp) gets the desktop layout | No `Platform.OS` branching for layout; one code path to review and test. |
| Rental **checkout** | Out of scope | Separate screen, separate flow, separate PRD. Mentioning it here only to state it is not silently included. |

### Core Rules

1. **The form state is untouched by layout.** `form`, `rentalsFieldArray` and every controller handler are passed through unchanged. Switching layouts (rotating a tablet across 800px) MUST NOT reset, remount-clear, or drop any entered value — customer name, codes, or datetime.
2. **The cart body is a single component.** Desktop renders it inside the `Card`; compact renders it inside the `Sheet`. No duplicated JSX, no per-layout copies of the ticket rows.
3. **One layout branch, one hook.** No component may call `useMedia()` directly for this feature, and no layout decision may key off `Platform.OS`.
4. **Desktop rendering is byte-for-byte unchanged.** Any PR in this plan that alters desktop output is a bug in that PR.
5. **No new runtime dependencies.** Tamagui (`Sheet`, `AlertDialog`, `useMedia`), `react-hook-form`, `react-native` (`KeyboardAvoidingView` if needed) and `react-native-safe-area-context` already cover everything.
6. **Accessibility:** the cart button carries an accessible name including the ticket count; the cart sheet is dismissable by an explicit close control (`Sheet` runs with `disableDrag`); every code input keeps a programmatic label.

---

## Feature Requirements

### FR-1 — Shared `FloatingCartButton`

Extract the floating-bar chrome out of `TransactionCartButton` so checkin and transactions cannot drift apart.

- New: `libs/ui/src/presentation/components/base/FloatingCartButton.tsx`, exported from `base/index.tsx`.
- Props: `label: string`, `onPress: () => void`, optional `accessibilityLabel`.
- Owns: absolute bottom positioning, `$background` + top border, `env(safe-area-inset-bottom, 13px)` on web / `$3` on native, `theme="blue"`, `size="$5"`, `minHeight: 44`.
- `TransactionCartButton` keeps its `itemCount`/`total` props and its `{n} item(s) · Rp {total} · View Cart` copy, and renders `FloatingCartButton` underneath. **Its rendered output is unchanged.**

### FR-2 — Extract `RentalCheckinCartView`

Move the cart body out of `RentalCheckinFormView` into its own component, with **no behavioural or visual change**.

- New file: `libs/ui/src/presentation/components/rentals/RentalCheckinCartView.tsx`, exported from `rentals/index.ts`.
- It renders: `FormErrorBanner`, Customer Name, the "Customize Checkin Date Time" checkbox and its five selects, the "Items" heading, and one row per rental (remove button, product name, option values, `Code` input, ticket-lookup feedback, separator).
- **The `inputCodeRefs` ref array and the `onSubmitEditing` focus chain move with the rows** — they are part of this component, not of the caller.
- Props: `form`, `rentalsFieldArray`, `tickets`, `onToggleCustomizeCheckinDateTime`, `serverError`.
- The **Submit button stays in the caller**, because its placement differs per layout (below the columns vs. sheet footer).
- `RentalCheckinFormView` keeps rendering it inside the same `Card width={350} flex={1}` as today.

### FR-3 — Compact layout, floating cart button, and cart sheet

When `useIsCompactLayout()` is true, `RentalCheckinFormView`:

- Renders **only** the `RentalItemSelect()` render prop, filling the available height (`flex: 1`), plus the floating cart button. The `Card`, the inline Submit button and the cart body are not rendered.
- Uses a `YStack flex={1}` container (not the `XStack`) so the picker owns the full width.
- Shows the cart button only when `rentalsFieldArray.fields.length > 0`, with the copy from the decisions table. The "codes left" count is derived from a watched `rentals` value (via `FieldWatch` with an explicit `control`) so it updates as codes are typed, without re-rendering the picker on every keystroke more than the existing form already does.
- Opens the cart sheet on press. Open state is **local UI state** (`useState`), not in the usecase state machine and not in the form.

The cart sheet:

- Uses the shared `Sheet` base component and re-establishes `<FormProvider {...form}>` inside it.
- Content top to bottom: a header with the title "Cart" and an explicit close control (`accessibilityLabel="Close Cart"`); a scrollable body rendering `RentalCheckinCartView` (FR-2); a pinned footer with the ticket/codes-left summary and Submit (same `disabled`/`Spinner` semantics as the desktop button).
- **Keyboard behaviour is a requirement, not a nicety:** focusing a code input must not hide it behind the keyboard, the pinned footer must remain reachable, and `onSubmitEditing` must both focus the next code input and bring it into view. Implement with the sheet's keyboard-change handling if the installed Tamagui version exposes it, otherwise a `KeyboardAvoidingView` inside the sheet frame; either way the fix belongs to shared code, verified on web **and** native.
- `Sheet.Frame height="100vh"` must be verified on React Native with a long ticket list; if it misbehaves, fix it in the shared `Sheet` and re-check its other consumers (the transaction cart sheet and the transaction coupon sheet).

The checkin-datetime block on compact: the date/month/year and hour/minute rows wrap (`flexWrap`) with a sensible `minWidth` per select rather than dividing 390px five ways.

`RentalCheckinScreen` must cooperate: on compact it renders the form inside a `YStack flex={1}` instead of the outer `ScrollView`, so the product list gets a bounded height and scrolls internally. On desktop it keeps the `ScrollView`.

`TransactionItemSelect` needs **no changes** — its compact behaviour (no autofocus, bounded scroll region, 90px bottom padding, responsive variant dialog) already applies here the moment the host renders it in a compact container.

### FR-4 — Submit and print hand-off

- Submitting from the sheet runs the same `form.handleSubmit(onSubmit)` as desktop.
- **Validation failure:** the sheet stays open; `FormErrorBanner` and per-field errors (empty customer name, any empty code) are visible inside it, and the first offending field is scrolled into view.
- **Success:** the cart sheet closes *before* the print confirmation opens. `RentalCheckinFormView` takes an `isSubmitSuccess` prop and closes the sheet in an effect, mirroring `TransactionFormView`; `RentalCheckinScreen`/`Handler` thread it through from `rentalCheckin.state.type === 'submitSuccess'`.
- The handler's existing `hasShownPrintDialogRef` guard and its `router.push('/rentals')` on both confirm and cancel are unchanged.
- Confirming the print, cancelling it, and a print failure all still end on `/rentals` — on compact as on desktop.

### FR-5 — `ConfirmationAlert` on small screens

The print dialog must be fully visible and fully usable at 360, 390 and 430px, on web and native.

- `AlertDialog.Content` gets a compact width bound (`width: '90%'`, `maxWidth` ≈ 420) and a `maxHeight` tied to the viewport; the title/description area scrolls when it cannot fit so the Cancel/Confirm row is **always** on screen. Follow `TransactionPaymentAlert`'s precedent: bound on compact only, leave desktop intrinsic.
- Give the alert a `zIndex` above the shared `Sheet`'s `100_000` (as `TransactionPaymentAlert` does with `100_001`), so a sheet still animating closed can never paint over it.
- Long titles/descriptions wrap instead of clipping; the buttons never overflow horizontally.
- `ConfirmationAlert` is shared — the transaction print prompts and any other `useConfirmationAlert()` caller must be re-checked for regressions, and desktop rendering must be unchanged.

### FR-6 — Test, story and E2E coverage

- Storybook stories for `RentalCheckinCartView`, the compact `RentalCheckinFormView` (empty and with tickets), and `ConfirmationAlert` at a phone viewport.
- Unit tests (RTL, `libs/ui`) for the compact branch: cart hidden on mount; no cart button with an empty list; button appears with the ticket count after an item is added; codes-left count updates as codes are typed; sheet opens/closes with values intact; the code focus chain advances inside the sheet; submit-from-sheet; validation errors visible inside the sheet; sheet closed before the print confirmation is shown.
- A Playwright spec under the existing `mobile-chromium` project covering the compact happy path: open Checkin → pick a rental product → variant + amount → cart button shows the count → open cart → fill customer name and codes → Submit → print dialog visible with both buttons → decline → land on `/rentals`.
- Existing desktop tests and E2E must pass **unmodified**.

---

## Non-Functional Requirements

- **No new dependencies.**
- **No API, schema, usecase or controller-state changes.** If a phase finds itself editing `libs/ui/src/domain`, the design has drifted.
- **No regression in list performance.** The product `FlatList` keeps its current data flow; the compact layout changes the container, not the rendering strategy. Watching `rentals` for the codes-left count must not re-render the picker per keystroke.
- **Web and native from one source.** No `Platform.OS` layout branches. Any native-only fix (sheet frame height, keyboard avoidance) goes into the shared base component, not into the rentals feature.
- **SSR safety (web).** The Next.js server render must not crash or mis-render; the first client paint may flip from desktop to compact on a phone — see Risks.

---

## Success Metrics

- On a 390px viewport, the ticket picker occupies the full content width (vs. ~50% today), materially increasing visible products per screen.
- Taps to add the first ticket on a phone: unchanged (product → variant → submit); taps to reach code entry: 1.
- Entering N codes takes N `onSubmitEditing` presses with no manual scrolling and no input hidden behind the keyboard.
- The print confirmation's Yes/No are visible without scrolling at 360px.
- Existing desktop unit and E2E suites green with zero edits.

---

## Implementation Phases

Six self-contained PRs. Each ships with its own tests/stories and leaves `main` working on **both** layouts. Phases 1–2 are pure groundwork; Phase 3 is the first user-visible change.

### Phase 1 — Shared `FloatingCartButton` (FR-1)

**Files:**
- `libs/ui/src/presentation/components/base/FloatingCartButton.tsx` (new) + story
- `libs/ui/src/presentation/components/base/index.tsx` (export)
- `libs/ui/src/presentation/components/transactions/TransactionCartButton.tsx` (delegate)

**Acceptance:**
- Pure refactor: `TransactionCartButton`'s rendered output, props and copy are unchanged; its existing story and any test that finds it by name still pass untouched.
- `FloatingCartButton` takes `label` + `onPress` and owns the bar chrome (absolute bottom, safe-area padding, 44px min target).
- **No rentals code consumes it yet.**

**Out of scope:** anything in `rentals/`.

### Phase 2 — Extract `RentalCheckinCartView` (FR-2)

**Files:**
- `libs/ui/src/presentation/components/rentals/RentalCheckinCartView.tsx` (new) + story
- `libs/ui/src/presentation/components/rentals/RentalCheckinFormView.tsx` (render the extracted component)
- `libs/ui/src/presentation/components/rentals/index.ts`

**Acceptance:**
- Pure refactor: the rendered desktop tree is equivalent before and after, verified by the existing `RentalCheckinHandler.test.tsx` plus the story.
- The `inputCodeRefs` array and the `onSubmitEditing` focus chain move into the extracted component and still advance from row to row (covered by a unit test).
- No new props threaded through the screen or handler.

**Out of scope:** the compact branch, the sheet, the cart button.

### Phase 3 — Compact picker + floating cart button + cart sheet (FR-3)

The core PR. Larger than the others by necessity — splitting it further would ship a state where staff can add tickets on a phone but cannot enter codes or submit.

**Files:**
- `libs/ui/src/presentation/components/rentals/RentalCheckinFormView.tsx` (the branch, the button, the sheet)
- `libs/ui/src/presentation/components/rentals/RentalCheckinCartView.tsx` (compact wrapping of the datetime selects)
- `libs/ui/src/presentation/screens/RentalCheckinScreen.tsx` (drop the outer `ScrollView` on compact)
- `libs/ui/src/presentation/components/base/Sheet/Sheet.tsx` (only if the native height fix is needed)
- Tests + stories: compact-branch rendering and interaction

**Acceptance:**
- Compact, empty cart: only the picker is visible; no Customer Name / Customize Checkin / Items / Submit anywhere in the tree; no cart button.
- Compact, after adding one ticket: the button reads `1 ticket · 1 code left · View Cart`; the product list stays usable and its last row is not covered.
- Adding amount = 3 appends three rows and the button reads `3 tickets · 3 codes left · View Cart` without opening the sheet.
- Tapping the button opens the sheet with the full cart body and a pinned footer + Submit; closing returns to the picker with every value intact.
- Typing a code decrements "codes left"; filling them all collapses the copy to `{n} tickets · View Cart`.
- Rotating/resizing across 800px preserves customer name, codes and datetime values.
- Desktop at ≥801px is unchanged; all existing unit and E2E tests pass unmodified.
- Verified on the React Native app (device or simulator): the sheet opens, scrolls, and closes; the frame is not clipped with 10+ ticket rows.

**Out of scope:** keyboard ergonomics beyond "nothing is clipped" (Phase 4), print hand-off (Phase 5).

### Phase 4 — Code-entry ergonomics in the sheet (FR-3, keyboard)

**Files:**
- `libs/ui/src/presentation/components/base/Sheet/Sheet.tsx` and/or `RentalCheckinFormView.tsx`
- Tests

**Acceptance:**
- Focusing any code input keeps it visible above the software keyboard on web and native; the pinned footer stays reachable.
- `onSubmitEditing` advances to the next code input **and** scrolls it into view; the last row's submit-editing does not steal focus or dismiss the sheet.
- The transaction cart sheet and coupon sheet are re-checked for regressions if the shared `Sheet` changed.
- Verified on a physical device or simulator with a list long enough to scroll.

### Phase 5 — Submit → print hand-off and the print dialog (FR-4, FR-5)

**Files:**
- `libs/ui/src/presentation/components/rentals/RentalCheckinFormView.tsx` (`isSubmitSuccess` → close)
- `libs/ui/src/presentation/screens/RentalCheckinScreen.tsx` / `RentalCheckinHandler.tsx` (thread the prop)
- `libs/ui/src/presentation/components/base/ConfirmationAlert/ConfirmationAlert.tsx` (compact sizing, scroll, `zIndex`)
- Tests + a phone-viewport story for the alert

**Acceptance:**
- Compact: Submit with an empty customer name or an empty code keeps the sheet open and shows the error inside it.
- Compact: a successful submit closes the sheet, then shows "Print Checkin Slip" with both buttons visible at 360/390/430px and nothing rendered behind it at a conflicting `zIndex`.
- Confirm → print → `/rentals`; cancel → `/rentals`; print failure → `/rentals`. The dialog is shown exactly once (the existing ref guard still holds).
- A long title/description scrolls inside the dialog instead of pushing the buttons off-screen.
- Desktop confirmation dialogs — including the transaction print prompts — are unchanged.

### Phase 6 — Mobile E2E coverage (FR-6)

**Files:**
- `apps/web-e2e/src/rentals.checkin.mobile.spec.ts` (new)
- `apps/web-e2e/src/utils/selectors.ts` (checkin cart button / sheet / print dialog selectors)

**Acceptance:**
- The full compact happy path passes headless in CI under the existing `mobile-chromium` project: Checkin → pick a rental product → variant + amount → cart button shows the count → open cart → fill name + codes → Submit → print dialog with both buttons visible → decline → `/rentals`.
- The spec creates and cleans up its own data (`saleType: 'rental'` product, ticket codes) the way `transactions.mobile.spec.ts` does — the suite runs `workers: 1` against a shared database.
- No desktop spec is modified.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Keyboard covers the code inputs inside the sheet.** The whole point of the screen. | Mobile layout is a net loss vs. today. | Phase 4 exists solely for this, verified on a real device; the shared `Sheet` carries the fix so the transaction cart benefits too. |
| **Focus chain breaks across the sheet portal.** | Staff must tap each input manually — slower than the current cramped layout. | FR-2 keeps refs and rows in one component; Phase 2 lands a focus-chain unit test **before** the sheet exists, so Phase 3 can only regress it visibly. |
| **`Sheet.Frame height="100vh"` on React Native** with a long ticket list. | Cart renders clipped or at zero height on native. | Verified explicitly in Phase 3 with 10+ rows; fixed in the shared `Sheet` with a regression check on its other consumers. |
| **`AlertDialog` over a closing `Sheet`.** | Print dialog unreachable behind the sheet overlay. | FR-4 closes the sheet on `isSubmitSuccess`; FR-5 raises the alert's `zIndex` above `100_000` for the animation window. Asserted in a test. |
| **`ConfirmationAlert` is shared.** A sizing change ripples to every confirmation in the app. | Unintended visual change on desktop or in the transaction print flow. | Bound on compact only (`TransactionPaymentAlert` precedent); Phase 5 re-checks every `useConfirmationAlert()` caller and asserts desktop output is unchanged. |
| **SSR/hydration flash on web.** `useMedia()` resolves client-side, so a phone may paint the two-column layout for one frame. | Visible flicker on first load. | Same posture as the transaction PRD: accept and measure. Do not "fix" it by defaulting to compact — that flips the flash onto desktop, the more common POS surface. |
| **Watching `rentals` for the codes-left count re-renders the picker.** | Typing a code janks the product list. | Scope the watch with `FieldWatch` around the button only; measure in Phase 3 and fall back to a count that updates on blur if needed. |
| **Scope creep into rental checkout.** | Phase 3 balloons and becomes unreviewable. | Explicitly out of scope — see Non-Goals and Future Work. |

---

## Open Questions

1. **Cart button copy.** `3 tickets · 1 code left · View Cart` is the current decision; it is long for a 360px button. Fallback: drop "View Cart" on narrow screens and keep the counts, or show the codes-left as a badge. Decide visually in Phase 3 and keep the E2E selector stable (`/View Cart$/` today).
2. **Should the sheet auto-open after the *first* ticket is added?** Checkin, unlike a transaction, is often a single game for a walk-in. Current decision: **no**, consistent with the transaction form. Revisit if staff report an extra tap per single-ticket checkin.
3. **Should an unregistered code block Submit?** Today it renders a yellow warning and submits anyway. This PRD does not change that — but the compact footer showing "codes left" makes the distinction more visible, and staff may expect the warning to be a blocker. Product call, not a layout call.
4. **Ticket-row density.** With 8+ tickets the sheet body is long. A future compaction (code input inline with the product name) is deferred to Future Work rather than decided under a layout PRD.

---

## Future Work (explicitly deferred)

- **Rental checkout on mobile** — the sibling screen with the same two-column problem; its own PRD.
- **Scanner input** — hardware barcode/NFC scanners fill the code field and advance automatically; the focus chain is the groundwork for it.
- **Denser ticket rows** in the cart sheet once real usage shows how many tickets a typical group takes.
- **Quick-add for single-variant rental products** — skip the variant dialog and append one row directly.
- **Sharing the compact cart shell** (`Sheet` + header + scrolling body + pinned footer) between the transaction cart and the checkin cart as one base component, once both have shipped and their differences are known.
- **Persisting an in-progress checkin** across accidental navigation or app backgrounding.
