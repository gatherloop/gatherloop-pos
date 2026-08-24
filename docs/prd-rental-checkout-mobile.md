# PRD: Rental Checkout — Mobile (Small Screen) Flow

**Status:** Proposed
**Scope:** `libs/ui` presentation layer only — shared by `apps/web` (Next.js) and `apps/mobile` (React Native/Expo)
**Affected flow:** Checkout Rental (`/rentals/checkout`, mobile route `rentalCheckout`)
**Precedent:** [`docs/prd-rental-checkin-mobile.md`](./prd-rental-checkin-mobile.md) and [`docs/prd-transaction-form-mobile.md`](./prd-transaction-form-mobile.md) — this PRD deliberately reuses their flow shape, hook and vocabulary. Checkout is the sibling screen the checkin PRD listed under "Future Work".

---

## Problem Statement

Rental checkout is the counter's closing screen: a staff member finds each ongoing rental (by scanning/keying its code, or by tapping it in the list), collects them into a cart, and submits — which creates a transaction and navigates to it. It is currently a **desktop-first two-column layout** rendered by `RentalCheckoutFormView.tsx`:

```
XStack
├── YStack flex=1          → RentalList (search by code, filter popover, list, pagination)
└── YStack width=400 flex=1 → Card: "Items"
                            → per rental → remove button, customer name, variant,
                                           code, checkin datetime, duration, subtotal
                            → Grand Total
                          → Submit (right-aligned, below the Card)
```

That `XStack` has **no responsive branching**, so on a phone-sized viewport (mobile browser and the React Native app alike):

1. **Both columns are crushed.** A ~390dp viewport is split between a `flex: 1` list and a `width: 400` card that cannot fit — so every `RentalListItem`, which carries a title, a subtitle and up to five footer chips (`TICKET`, `CHECKIN DATE`, `DURATION`, `TOTAL`), renders in roughly half a screen. Identifying the right ongoing rental — the action repeated for every returning group — is the slowest step.
2. **The cart is always on screen even when it is empty.** On entry the right column shows an "Items" heading with nothing under it and a Submit button that can never succeed (the resolver requires `rentals.min(1)`). It costs half the viewport and contributes nothing.
3. **Everything is one long vertical scroll.** `RentalCheckoutScreen` wraps the form in a `ScrollView`, so the rental `FlatList` has no bounded height of its own; the page scrolls as a single document and the `Pagination` control scrolls off with it.
4. **The keyboard opens on arrival and covers the list.** The handler passes `isSearchAutoFocus: true` — correct at a desktop counter with a barcode scanner, actively harmful on a phone, where the software keyboard immediately hides the ongoing rentals the user came to tap.
5. **Grand Total — the number staff quote to the customer — is buried.** It sits below the item list inside a half-width card, at the bottom of a page-length scroll.

The desktop layout is fine and stays as it is. The fix is a **second, compact layout for small screens**, driven off the same component tree, the same form state and the same usecases — exactly what shipped for the transaction form and for rental checkin.

### Goals

- On a small screen, opening Checkout lands the user directly on a **full-screen list of ongoing rentals** (`RentalList`, already filtered to `checkoutStatus: 'ongoing'` by the handler).
- Tapping an ongoing rental adds it to the cart and reveals a **floating cart button** pinned to the bottom of the screen, showing the item count and the running grand total.
- Tapping the cart button opens a **cart sheet** containing exactly what the desktop right column contains — one row per rental with its remove button, code, checkin datetime, duration and subtotal — plus Grand Total and Submit in a pinned footer.
- Submitting still creates the transaction and **redirects to `/transactions/{id}`**, with no sheet left mounted over the destination screen.
- **Zero visual or behavioural change on desktop / large screens.**
- One shared implementation for web and React Native — no `Platform.OS` branching for layout.

### Non-Goals (explicitly out of scope)

- No change to the rental API contract, the Zod resolver, `RentalCheckoutUsecase`, `RentalListUsecase`, or the pricing-tier calculation.
- No change to `RentalCheckoutController` — `onAddItem`, its duplicate-`id` guard, and `rentalsFieldArray` are consumed as-is.
- No redesign of the desktop layout, the rental card, the filter popover, or pagination.
- **Rental checkin** (`RentalCheckinFormView`) and the rental **list** screen (`RentalListScreen`) are untouched — checkin already shipped its mobile flow; the list screen has no cart.
- No change to what happens after the redirect (the transaction detail screen).
- No barcode/NFC scanner integration, no offline draft recovery, no partial checkout.
- No live-ticking totals (see Future Work).

---

## Context: The Existing System

### Files that matter

| File | Role |
|---|---|
| `libs/ui/src/presentation/components/rentals/RentalCheckoutFormView.tsx` | The two-column layout. Owns the `XStack`, the cart `Card`, the per-rental rows, the `calculateSubtotal` / `formatDuration` helpers, the Grand Total row and the Submit button. |
| `libs/ui/src/presentation/screens/RentalCheckoutScreen.tsx` | Wraps `RentalCheckoutFormView` in `Layout` + `ScrollView` and feeds it a `RentalList` through the `RentalItemSelect` render prop. |
| `libs/ui/src/presentation/screens/RentalCheckoutHandler.tsx` | Wires controllers → screen props. Forces `checkoutStatus: 'ongoing'`, owns the "exact code match → `onAddItem`" effect and the "submit success → `router.push('/transactions/{id}')`" effect. |
| `libs/ui/src/presentation/controllers/RentalCheckoutController.tsx` | `react-hook-form` form + `useFieldArray` for `rentals`; `onAddItem` appends one row per rental and **ignores a rental whose `id` is already in the cart**. |
| `libs/ui/src/presentation/components/rentals/RentalList.tsx` | The picker. Search-by-code input (`autoFocus` driven by `isSearchAutoFocus`), filter `Popover`, `FlatList` of `RentalListItem`, `Pagination`. **Not compact-aware** — no bottom inset, no responsive branching. Also used by `RentalListScreen`, which has no floating button. |
| `libs/ui/src/presentation/components/rentals/RentalCheckinFormView.tsx` | **Reference implementation** of the compact branch on this exact feature: `useIsCompactLayout()`, floating button, `Sheet` with header / scrolling body / pinned footer, `FormProvider` re-established inside the sheet, close-on-`isSubmitSuccess`. |
| `libs/ui/src/presentation/components/base/FloatingCartButton.tsx` | Shared floating-bar chrome (absolute bottom, safe-area padding, `minHeight: 44`), already extracted by the checkin PRD's Phase 1. Takes `label` + `onPress`. |
| `libs/ui/src/presentation/components/base/Sheet/Sheet.tsx` | Shared bottom sheet (`modal`, `snapPoints={[90, 0]}`, `zIndex: 100_000`, `disableDrag`, `moveOnKeyboardChange`, `useWebVisualViewportHeight`). |
| `libs/ui/src/presentation/components/base/useIsCompactLayout.ts` | `media.sm === true` → compact. Already shipped; **no foundation work needed for this PRD.** |
| `libs/ui/src/utils/currency.ts` | `formatRupiah` — used by `TransactionCartButton`'s copy and reused here. |

### How a rental gets into the cart today

Unlike checkin, checkout has **two** entry paths and both must keep working on compact:

1. **Tap** — `RentalList`'s `onItemPress` → `rentalCheckout.onAddItem(rental)` → the handler clears the search query (`CHANGE_PARAMS query: ''`), so the list falls back to the full ongoing page.
2. **Exact code match** — an effect in `RentalCheckoutHandler` watches the loaded list; when the current search query equals a rental's `code` and that rental is not already in `values.rentals`, it calls `onAddItem` and clears the query. This is the scanner path: type/scan a code, the rental lands in the cart with no tap at all.

**Neither mechanism is touched by this PRD.** The compact layout changes *where the cart is rendered*, not *how rows reach it*. Path 2 in particular means the cart button's count and total can change without any tap — the button must derive its content from the field array, not from a tap handler.

### What checkout does NOT share with checkin

| Rental checkin | Rental checkout |
|---|---|
| Cart rows are **input-heavy** — one `Code` text input per ticket, with a cross-portal `onSubmitEditing` focus chain | Cart rows are **read-only** — remove button plus rendered text. **No inputs in the sheet at all**, so the checkin PRD's Phase 4 (keyboard ergonomics inside the sheet) has no counterpart here. |
| No money — the cart button's second slot shows "codes left" | Money: a per-rental subtotal derived from `pricingTiers` × elapsed time, and a **Grand Total**. The button shows count + total, like `TransactionCartButton`. |
| Cart contents are **edited** after being added → the count needs `FieldWatch` on `rentals` | Cart contents are only **appended and removed** → `rentalsFieldArray.fields` alone is sufficient; **no `FieldWatch` is required**. |
| Picker is `TransactionItemSelect`, already compact-aware (bottom inset, no autofocus, responsive dialog) | Picker is `RentalList`, **not** compact-aware — the bottom inset and the autofocus suppression are new work. |
| Success → print `ConfirmationAlert` → `router.push('/rentals')` | Success → **direct** `router.push('/transactions/{id}')`. No dialog, but the sheet must not survive the navigation. |
| Validation can fail (`name.min(1)`, empty codes) | The only rule is `rentals.min(1)`, and the button that opens the sheet only exists when `fields.length > 0` — so in practice **only a server error can fail a compact submit**. |

### Constraint: one `now` per render pass

`RentalCheckoutFormView` computes `const now = new Date()` at render and feeds it to both `calculateSubtotal` (per row) and the Grand Total reduce. Once the cart lives in two places — the button label and the sheet body — two independent `new Date()` calls could land on opposite sides of a pricing-tier boundary and display **two different totals on one screen**. The helpers and a single `now` must therefore be shared, not duplicated (FR-1).

### Constraint: `FormProvider` inside the sheet

Learned on the transaction form (PR #308) and re-applied by checkin: Tamagui's modal `Sheet` portals its content, and on some platforms (Android) ambient React context does not travel down. The cart sheet re-establishes `<FormProvider {...form}>` inside itself. Checkout's cart body reads less from context than checkin's, but `FormErrorBanner` and any future field do — keep the provider.

### Constraint: the Jest Tamagui mock

`libs/ui/src/__mocks__/tamagui.tsx` exports `useMedia` as a `jest.fn(() => ({}))`, so every media flag is `undefined` by default and `useIsCompactLayout()` returns `false` → **tests render the desktop branch unless they opt in** with `(useMedia as jest.Mock).mockReturnValue({ sm: true })`. `RentalCheckoutHandler.test.tsx`'s existing assertions describe the desktop tree and stay valid untouched; compact-branch tests opt in explicitly. The mock's `Sheet` renders children only when `open` is true.

### Constraint: `RentalList` has a second consumer

`RentalList` is rendered by `RentalListScreen` as well, where there is no floating button. Any unconditional compact bottom inset added *inside* `RentalList` would leave a dead 90px gap on the rentals list screen. This PRD therefore puts the inset in the **caller** (FR-2) and leaves `RentalList`'s own layout alone until Phase 4's opt-in prop.

---

## Target UX

### Compact — step 1: ongoing rentals (full screen)

```
┌────────────────────────────┐
│ ←  Checkout Rental       ⋮ │  Navbar
├────────────────────────────┤
│ ┌──────────────────┐ ┌───┐ │
│ │ Search by Code…  │ │▼Fl│ │  no autofocus on compact
│ └──────────────────┘ └───┘ │
│ ┌────────────────────────┐ │
│ │ Andi · Catan Standard  │ │
│ │ 🎫 A12  📅 12/05 14:20 │ │  scrolls INSIDE this region
│ │ ⏱ 1h 20m               │ │
│ ├────────────────────────┤ │
│ │ Budi · Splendor        │ │
│ └────────────────────────┘ │
│        ‹  1  2  3  ›       │  Pagination, clear of the button
│ ┌────────────────────────┐ │
│ │ 2 items · Rp 40.000 ·  │ │  floating cart button
│ │            View Cart ▸ │ │  (only when rentals > 0)
│ └────────────────────────┘ │
└────────────────────────────┘
```

### Compact — step 2: cart sheet

```
┌────────────────────────────┐
│           ────             │  drag handle
│ Cart                    ✕  │
├────────────────────────────┤
│ 🗑  Andi                    │
│    Catan - Standard        │
│    🎫 A12   📅 12/05 14:20 │
│    1h 20m         Rp 25.000│
│ ─────────────────────────  │
│ 🗑  Budi                    │
│    Splendor - Standard     │
│    🎫 B07   📅 12/05 15:05 │
│    35m            Rp 15.000│
├────────────────────────────┤
│ Grand Total     Rp 40.000  │  pinned footer
│ [        Submit         ]  │
└────────────────────────────┘
```

Body scrolls; footer stays pinned. Removing the last row leaves an empty sheet — see Open Question 2.

### Compact — step 3: submit

Sheet closes, then `router.push('/transactions/{id}')`. Nothing of the checkout screen is left painted over the transaction detail screen.

### Large screens — unchanged

```
XStack
├── RentalList (flex 1)
└── Card(cart, width 400) + Grand Total ; Submit below
```

Pixel-identical to today.

---

## Confirmed Product & Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Breakpoint for "compact" | **`useIsCompactLayout()`** (`media.sm === true`, ≤800px) | Already shipped and already used by every other compact screen. A second breakpoint would make sibling screens disagree. |
| Foundation work needed | **None** | `useIsCompactLayout`, `FloatingCartButton`, the shared `Sheet` (with its keyboard handling) and the overridable Jest `useMedia` mock all landed with the transaction and checkin PRDs. This PRD starts at extraction. |
| Cart button copy | `{n} item(s) · Rp {total} · View Cart` | Identical to `TransactionCartButton`'s copy, because checkout has the same two numbers. Staff read the same button on both money screens. |
| Cart button component | **`FloatingCartButton` called directly** with a locally formatted label | `TransactionCartButton` is a two-line copy wrapper; importing a `Transaction*` component into the rentals feature to save one `formatRupiah` call would couple two features for nothing. If a third consumer of this exact copy appears, promote the formatter into `base/`. |
| Cart button visibility | Visible **iff `rentalsFieldArray.fields.length > 0`**, compact only | With zero rows the form cannot validate (`rentals.min(1)`), so there is nothing to open. |
| Count/total source | **`rentalsFieldArray.fields`**, no `FieldWatch` | Checkout rows are never edited in place — only appended and removed — so the field array already re-renders on every change that can move the numbers. Adding a watch would re-render the list for nothing. |
| Does adding a rental auto-open the cart? | **No.** The button appears and updates its numbers; the sheet stays closed. | Groups return several games at once, and the scanner path adds rows with no tap at all. Auto-opening would force a dismiss per scan. Consistent with checkin and the transaction form. |
| Where Submit lives on compact | **Inside the cart sheet**, in a pinned footer next to Grand Total | Submit is the moment staff quote the total; the two belong together. |
| Grand Total on compact | In the **sheet footer**, not inline in the scrolling body | Inline it would scroll away with a long cart. The cart view therefore suppresses its own Grand Total row on compact (`showGrandTotal={false}`) so the number is never rendered twice. |
| Search autofocus on compact | **Off** | On desktop the autofocused field is a scanner target; on a phone it is a keyboard that covers the list on arrival. Suppressed in `RentalCheckoutScreen` (`isSearchAutoFocus && !isCompactLayout`) so `RentalList` and the handler stay untouched. |
| Bottom inset for the floating button | Applied by the **caller** (`RentalCheckoutFormView`'s compact branch wraps the picker in a padded container), not inside `RentalList` | `RentalList` is shared with `RentalListScreen`, which has no floating button and must not gain a dead gap. |
| Sheet on submit error | **Stays open**; `FormErrorBanner` renders inside it | The error must be visible where Submit is. The existing "Checkout Rental Error" toast is unchanged. |
| Sheet on submit success | **Closes** via an `isSubmitSuccess` effect, before the redirect | A modal `Sheet` still mounted while `router.push` navigates can paint its overlay over the transaction detail screen on native. Mirrors `RentalCheckinFormView`. |
| Server error banner on desktop | **Stays exactly where it is** (above the two columns) | The extracted cart view renders a banner only when passed a `serverError`; the desktop branch omits the prop, so desktop output is byte-for-byte unchanged. |
| Already-in-cart feedback | An **"In Cart" affordance** on rows already added (Phase 4) | `onAddItem` silently ignores a duplicate `id`. On desktop the row visibly sits in the right column; on compact the cart is hidden, so the tap looks like a dead button. This is a regression the compact layout creates, so the compact layout owns the fix. |
| React Native parity | Same components, same hook — `useMedia()` reads `Dimensions` on native, so a phone is compact and a landscape tablet (>800dp) gets the desktop layout | No `Platform.OS` branching for layout; one code path to review and test. |

### Core Rules

1. **The form state is untouched by layout.** `form`, `rentalsFieldArray` and every controller handler are passed through unchanged. Switching layouts (rotating a tablet across 800px) MUST NOT reset, remount-clear, or drop the cart.
2. **The cart body is a single component.** Desktop renders it inside the `Card`; compact renders it inside the `Sheet`. No duplicated JSX, no per-layout copies of the rental rows.
3. **One layout branch, one hook.** No component may call `useMedia()` directly for this feature, and no layout decision may key off `Platform.OS`.
4. **Desktop rendering is unchanged in Phases 1–3.** Any PR in those phases that alters desktop output is a bug in that PR. Phase 4 deliberately adds the same "In Cart" affordance to both layouts and says so in its acceptance criteria.
5. **One `now` per render pass.** The button total and the sheet total are computed from the same `Date` instance, via shared helpers.
6. **No new runtime dependencies.** Tamagui (`Sheet`, `useMedia`), `react-hook-form`, `dayjs` and the existing base components already cover everything.
7. **Accessibility:** the cart button carries an accessible name including the item count; the cart sheet is dismissable by an explicit close control (`Sheet` runs with `disableDrag`); the remove buttons keep programmatic labels.

---

## Feature Requirements

### FR-1 — Extract `RentalCheckoutCartView` and the pricing helpers

Move the cart body out of `RentalCheckoutFormView` into its own component, with **no behavioural or visual change**.

- New file: `libs/ui/src/presentation/components/rentals/RentalCheckoutCartView.tsx`, exported from `rentals/index.ts`.
- It renders: one row per rental (remove button, customer name, `product - option values`, code chip, checkin-datetime chip, duration, subtotal, separator) and the Grand Total row.
- Props: `rentalsFieldArray`, `now: Date`, `showGrandTotal?: boolean` (default `true`), `serverError?: string` (renders `FormErrorBanner` at the top **only when provided**).
- `calculateSubtotal` and `formatDuration` move to a shared module (e.g. `rentals/rentalPricing.ts`) so the cart view and the cart-button label cannot drift. Behaviour is copied verbatim — no rounding, tier-selection or formatting changes.
- `now` is created once in `RentalCheckoutFormView` and passed down (Core Rule 5).
- `RentalCheckoutFormView` keeps rendering the cart view inside the same `Card padded` in a `width={400} flex={1}` column, keeps its top-level `FormErrorBanner`, and keeps Submit where it is.

### FR-2 — Compact layout, floating cart button, and cart sheet

When `useIsCompactLayout()` is true, `RentalCheckoutFormView`:

- Renders **only** the `RentalItemSelect()` render prop, filling the available height (`flex: 1`), plus the floating cart button. The `Card`, the inline Submit button and the cart body are not rendered.
- Uses a `YStack flex={1}` container (not the `XStack`) so the list owns the full width.
- Reserves bottom space for the floating button on the container that wraps the picker (≈90px, matching `TransactionItemSelect`'s compact reserve) so neither the last `RentalListItem` nor the `Pagination` control sits under the button.
- Shows the cart button only when `rentalsFieldArray.fields.length > 0`, labelled `{n} item(s) · {formatRupiah(grandTotal)} · View Cart`.
- Opens the cart sheet on press. Open state is **local UI state** (`useState`), not in the usecase state machine and not in the form.

The cart sheet:

- Uses the shared `Sheet` base component and re-establishes `<FormProvider {...form}>` inside it.
- Content top to bottom: a header with the title "Cart" and an explicit close control (`accessibilityLabel="Close Cart"`); a scrollable body rendering `RentalCheckoutCartView` with `showGrandTotal={false}` and `serverError`; a pinned footer with the Grand Total row and Submit (same `disabled`/`Spinner` semantics as the desktop button).
- Removing a row from inside the sheet updates the footer total and the button label immediately; removing the last row is covered by Open Question 2.

`RentalCheckoutScreen` must cooperate:

- On compact it renders the form inside a `YStack flex={1}` instead of the outer `ScrollView`, so the rental list gets a bounded height and scrolls internally. On desktop it keeps the `ScrollView`.
- On compact it passes `isSearchAutoFocus={false}` to `RentalList` (the handler keeps sending `true`; the screen suppresses it), so arriving on the screen does not raise the keyboard.

Native tap-through: the rental `FlatList` must register the **first** tap on a row while the search keyboard is open (`keyboardShouldPersistTaps="handled"` where needed), and the floating cart button must stay reachable with the keyboard up.

`RentalList` itself needs **no changes** in this phase.

### FR-3 — Submit hand-off

- Submitting from the sheet runs the same `form.handleSubmit(onSubmit)` as desktop; the usecase, the toast and the handler's redirect effect are unchanged.
- **Server error:** the sheet stays open and `FormErrorBanner` shows "Failed to submit. Please try again." inside it, above the rows. The existing error toast still fires.
- **Success:** `RentalCheckoutFormView` takes an `isSubmitSuccess` prop and closes the sheet in an effect, mirroring `RentalCheckinFormView`. `RentalCheckoutScreen`/`Handler` thread it through from `rentalCheckout.state.type === 'submitSuccess'`.
- The redirect target (`/transactions/{transactionId}`) and its effect are unchanged. After the push, no sheet overlay remains over the transaction detail screen on web or native.

### FR-4 — "In Cart" feedback on already-added rentals

`onAddItem` ignores a rental whose `id` is already in the cart. With the cart hidden behind a button, that tap has no visible effect.

- `RentalList` gains an optional `selectedRentalIds?: number[]` (or `Set<number>`); `RentalListItem` gains a matching optional flag and renders an unobtrusive "In Cart" affordance (badge or subdued state) when set.
- `RentalCheckoutScreen` derives the ids from `rentalsFieldArray.fields` and passes them; `RentalListScreen` passes nothing and is unaffected.
- The affordance renders on **both** layouts (the one deliberate desktop change in this plan) — an already-added row reading the same way in both places is worth more than a strict byte-for-byte invariant on a badge.
- Tapping an already-added row remains a no-op; it must not duplicate, remove or reorder the cart row.

### FR-5 — Test, story and E2E coverage

- Storybook stories for `RentalCheckoutCartView` (empty, one rental, several rentals with tiers) and the compact `RentalCheckoutFormView` (empty and with rentals).
- Unit tests (RTL, `libs/ui`) for the compact branch: cart hidden on mount; no cart button with an empty cart; button appears with the count and total after a rental is added; button updates when a rental is added via the exact-code-match path; sheet opens/closes with the cart intact; removing a row updates the button; submit-from-sheet; server error visible inside the open sheet; sheet closed on submit success.
- A Playwright spec under the existing `mobile-chromium` project covering the compact happy path.
- Existing desktop tests and E2E must pass **unmodified**.

---

## Non-Functional Requirements

- **No new dependencies.**
- **No API, schema, usecase or controller-state changes.** If a phase finds itself editing `libs/ui/src/domain` or `RentalCheckoutController`, the design has drifted.
- **No regression in list performance.** The rental `FlatList` keeps its current data flow; the compact layout changes the container, not the rendering strategy. No `FieldWatch` is introduced (see decisions), so typing in the search field must not re-render the cart button.
- **Web and native from one source.** No `Platform.OS` layout branches. Any native-only fix (sheet frame height, keyboard behaviour) goes into the shared base component, not into the rentals feature.
- **SSR safety (web).** The Next.js server render must not crash or mis-render; the first client paint may flip from desktop to compact on a phone — see Risks.

---

## Success Metrics

- On a 390px viewport, the ongoing-rental list occupies the full content width (vs. ~50% today), and a `RentalListItem`'s footer chips render on one line each instead of wrapping.
- Taps to add the first rental on a phone: 1 (unchanged); taps to reach Grand Total and Submit: 1.
- Arriving on Checkout on a phone shows the list with **no keyboard covering it**.
- The `Pagination` control is reachable without the floating button covering it.
- Existing desktop unit and E2E suites green with zero edits.

---

## Implementation Phases

Five self-contained PRs. Each ships with its own tests/stories and leaves `main` working on **both** layouts. Phase 1 is pure groundwork; Phase 2 is the first user-visible change.

### Phase 1 — Extract `RentalCheckoutCartView` + pricing helpers (FR-1)

**Files:**
- `libs/ui/src/presentation/components/rentals/RentalCheckoutCartView.tsx` (new) + story
- `libs/ui/src/presentation/components/rentals/rentalPricing.ts` (new — `calculateSubtotal`, `formatDuration`) + unit test
- `libs/ui/src/presentation/components/rentals/RentalCheckoutFormView.tsx` (render the extracted component, pass a single `now`)
- `libs/ui/src/presentation/components/rentals/index.ts`

**Acceptance:**
- Pure refactor: the rendered desktop tree is equivalent before and after, verified by the existing `RentalCheckoutHandler.test.tsx` plus the new story.
- `calculateSubtotal` and `formatDuration` are moved verbatim and covered directly by unit tests (no tiers → 0; duration under the first tier; duration past the last tier; exact boundary).
- `showGrandTotal` defaults to `true`; `serverError` is optional and the desktop caller omits it, so the desktop banner does not move.
- No new props threaded through the screen or handler.

**Out of scope:** the compact branch, the sheet, the cart button.

### Phase 2 — Compact list + floating cart button + cart sheet (FR-2)

The core PR. Larger than the others by necessity — splitting it further would ship a state where staff can add rentals on a phone but cannot see or submit the cart.

**Files:**
- `libs/ui/src/presentation/components/rentals/RentalCheckoutFormView.tsx` (the branch, the button, the sheet)
- `libs/ui/src/presentation/screens/RentalCheckoutScreen.tsx` (drop the outer `ScrollView` on compact; suppress search autofocus on compact)
- Tests + stories: compact-branch rendering and interaction

**Acceptance:**
- Compact, empty cart: only the rental list is visible; no "Items" heading, no Grand Total, no Submit anywhere in the tree; no cart button.
- Compact, after tapping one ongoing rental: the button reads `1 item · Rp {subtotal} · View Cart`; the list stays usable and neither its last row nor the `Pagination` control is covered.
- Adding a second rental updates the button to `2 items · Rp {sum} · View Cart` without opening the sheet.
- A rental added through the **exact-code-match** path (type a full code into search) updates the button identically and clears the search field.
- Tapping the button opens the sheet with every rental row and a pinned footer showing Grand Total + Submit; closing returns to the list with the cart intact.
- Removing a row inside the sheet updates both the footer total and the button label.
- Arriving on the screen on compact does not raise the software keyboard.
- Rotating/resizing across 800px preserves the cart.
- Desktop at ≥801px is unchanged; all existing unit and E2E tests pass unmodified.
- Verified on the React Native app (device or simulator): the sheet opens, scrolls and closes with 10+ rows; the first tap on a list row registers while the search keyboard is open; the cart button is reachable with the keyboard up.

**Out of scope:** the submit hand-off (Phase 3), in-cart feedback (Phase 4).

### Phase 3 — Submit hand-off (FR-3)

**Files:**
- `libs/ui/src/presentation/components/rentals/RentalCheckoutFormView.tsx` (`isSubmitSuccess` → close)
- `libs/ui/src/presentation/screens/RentalCheckoutScreen.tsx` / `RentalCheckoutHandler.tsx` (thread the prop)
- Tests

**Acceptance:**
- Compact: a server error keeps the sheet open and renders `FormErrorBanner` inside it; the "Checkout Rental Error" toast still fires.
- Compact: a successful submit closes the sheet and then redirects to `/transactions/{id}`; no sheet or overlay is left mounted over the destination.
- The Submit button shows the spinner and is disabled while `submitting`, in the sheet footer, exactly as on desktop.
- Desktop submit, redirect and toasts are unchanged.

### Phase 4 — "In Cart" feedback on already-added rentals (FR-4)

**Files:**
- `libs/ui/src/presentation/components/rentals/RentalListItem.tsx` (optional flag + affordance) + story
- `libs/ui/src/presentation/components/rentals/RentalList.tsx` (optional `selectedRentalIds`)
- `libs/ui/src/presentation/screens/RentalCheckoutScreen.tsx` (derive and pass the ids)
- Tests

**Acceptance:**
- A rental in the cart renders the "In Cart" affordance in the list on both layouts; removing it from the cart clears the affordance.
- Tapping an already-added row does not duplicate, remove or reorder the cart row, and the cart button's numbers do not change.
- `RentalListScreen` passes nothing and renders exactly as before.
- This is the one phase that intentionally changes desktop output; the diff is limited to the affordance.

### Phase 5 — Mobile E2E coverage (FR-5)

**Files:**
- `apps/web-e2e/src/rentals.checkout.mobile.spec.ts` (new)
- `apps/web-e2e/src/utils/selectors.ts` (checkout cart button / sheet selectors, alongside the existing `rentalCartButton` / `rentalCartSheet` groups)

**Acceptance:**
- The full compact happy path passes headless in CI under the existing `mobile-chromium` project: check in a rental → open Checkout → tap the ongoing rental → cart button shows `1 item · Rp … · View Cart` → open cart → Grand Total visible → Submit → land on the transaction detail page.
- A second case covers the scanner path: type the rental code into search → the rental is added with no tap and the search clears.
- The spec creates and cleans up its own data the way `rentals.checkin.mobile.spec.ts` does — the suite runs `workers: 1` against a shared database.
- No desktop spec is modified.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Two `new Date()` calls disagree across a pricing-tier boundary.** The button and the sheet would show different totals on one screen. | Staff quote the wrong price; trust in the total collapses. | Core Rule 5 + FR-1: one `now` per render pass, shared helpers, covered by a unit test that renders both surfaces from one clock. |
| **The floating button covers the `Pagination` control.** `RentalList` renders it below the `FlatList`, and unlike `TransactionItemSelect` it reserves no bottom space. | Staff cannot reach page 2 of ongoing rentals once the cart is non-empty. | FR-2 puts an explicit inset on the compact container; asserted in Phase 2's acceptance and in the E2E spec. |
| **Native: first tap on a list row is swallowed while the search keyboard is open.** | Every scan-then-tap flow costs a double tap. | `keyboardShouldPersistTaps="handled"`; verified on device in Phase 2. |
| **Sheet still mounted during `router.push`.** Checkout redirects immediately on success, unlike checkin which shows a dialog first. | A modal overlay paints over the transaction detail screen on native. | FR-3's `isSubmitSuccess` effect closes the sheet before the navigation; asserted in a test and checked on device. |
| **Removing the last rental leaves an empty sheet with a dead Submit.** | Confusing state with no way forward but Close. | Open Question 2 — decide visually in Phase 2; the safe default (auto-close on empty) is one line. |
| **Suppressing autofocus breaks a scanner workflow on a compact device.** Some counters run a tablet or a phone with a paired scanner. | A scanner-equipped small device needs an extra tap to focus the field. | Open Question 1: the field is still first in the DOM and one tap away; revisit with a preference if staff report it. |
| **SSR/hydration flash on web.** `useMedia()` resolves client-side, so a phone may paint the two-column layout for one frame. | Visible flicker on first load. | Same posture as the transaction and checkin PRDs: accept and measure. Do not "fix" it by defaulting to compact — that flips the flash onto desktop, the more common POS surface. |
| **Scope creep into `RentalList`.** It is shared with the rentals list screen. | A compact tweak here regresses a screen nobody tested. | FR-2 keeps `RentalList` untouched; FR-4's addition is opt-in and `RentalListScreen` passes nothing. |

---

## Open Questions

1. **Should search autofocus really be off on compact?** Current decision: off, because the keyboard covers the list on arrival. If counter staff use a paired scanner on a phone or a small tablet, they lose the zero-tap scan. Fallback: keep autofocus but scroll the list into view, or make it a per-device preference. Decide with staff after Phase 2 ships.
2. **What happens when the last rental is removed inside the sheet?** Options: close the sheet automatically (the cart button disappears with it), or keep it open with an empty state and a disabled Submit. Leaning toward auto-close for symmetry with the button's visibility rule; decide visually in Phase 2.
3. **Cart button copy at 360px.** `2 items · Rp 40.000 · View Cart` is long. Fallback: drop "View Cart" on the narrowest screens and keep the numbers. Keep the E2E selector stable (`/View Cart$/`, as the transaction and checkin specs already use).
4. **Should the total tick?** Subtotals grow with elapsed time but only recompute on render. Today's behaviour is the same on desktop, so this PRD does not change it — but a pinned footer makes a stale total more prominent. See Future Work.

---

## Future Work (explicitly deferred)

- **Live-ticking totals** — recompute subtotals on an interval (or on sheet open) so a cart left open for ten minutes does not quote a stale price. Applies to desktop equally.
- **Scanner input** — hardware barcode/NFC scanners that fill the search field and add the rental automatically; the exact-code-match effect is already the groundwork.
- **Partial checkout** — returning some of a group's rentals while others stay ongoing.
- **Denser rental rows** in the cart sheet once real usage shows how many rentals a typical group returns.
- **Sharing the compact cart shell** (`Sheet` + header + scrolling body + pinned footer) between the transaction cart, the checkin cart and the checkout cart as one base component, now that all three exist and their differences are known — the checkin PRD deferred this pending a third example, and this PRD is it.
