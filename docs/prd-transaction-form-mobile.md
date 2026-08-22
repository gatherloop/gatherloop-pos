# PRD: Transaction Form — Mobile (Small Screen) Flow

**Status:** Proposed
**Scope:** `libs/ui` presentation layer only — shared by `apps/web` (Next.js) and `apps/mobile` (React Native/Expo)
**Affected flows:** Create Transaction (`/transactions/create`), Update Transaction (`/transactions/{id}`)

---

## Problem Statement

The transaction form is the highest-traffic screen in the POS: a barista opens it for every single order. It is currently a **desktop-first two-column layout** rendered by a single shared component, `TransactionFormView.tsx`:

```
XStack
├── YStack flex=1   → TransactionItemSelect  (search, category tabs, product grid, pagination)
└── YStack          → Card maxWidth=400      (customer name, order number, items, coupons, total)
                    → Submit button
```

That `XStack` has **no responsive branching**. On a phone-sized viewport (both the mobile browser and the React Native app) the two columns are squeezed side by side into ~360–430 dp:

1. **The product picker becomes unusable.** It shares the width with a 400px-max cart card, so the search input, the category `Tabs`, and every `ProductListItem` are crushed into roughly half the screen. Selecting a product — the one thing staff do dozens of times an hour — is the slowest part of the flow.
2. **The cart is permanently on screen even when it is empty.** On a fresh Create, the right column shows an empty "Items" list, an empty "Coupons" list, a `Rp. 0` total and a Submit button that cannot succeed (`transactionItems` has a `.min(1)` Zod rule). It occupies half the viewport while contributing nothing.
3. **Everything is stacked into one long vertical scroll.** Both screens wrap the form in a `ScrollView`, so the product list has no bounded height of its own; the page scrolls as one document and the staff member loses their place between "browse products" and "check the order".
4. **The variant dialog does not fit.** `TransactionItemSelect` renders its option/amount picker in a `Dialog.Content` with a hard-coded `width={500}`. On a 390px-wide phone the dialog is wider than the screen.

The desktop layout is good and is not the problem — a cashier on a 1440px monitor wants the cart visible at all times. The fix is a **second, compact layout for small screens** driven off the same component tree, the same form state and the same usecases.

### Goals

- On a small screen, opening Create or Update lands the user directly on a **full-screen product picker**.
- Selecting a product opens the **existing** variant + amount step, sized for the screen.
- Submitting the variant adds the item to the cart and reveals a **floating cart button** pinned to the bottom of the screen.
- Tapping the cart button opens a **cart sheet** containing exactly what the desktop right column contains — customer name, order number, items, per-item notes and coupons, transaction coupons, total, and Submit.
- **Zero visual or behavioural change on desktop / large screens.**
- One shared implementation for web and React Native — no `Platform.OS` branching for layout.

### Non-Goals (explicitly out of scope for this PRD)

- No change to the transaction API contract, Zod schema, usecases, or state machines (`transactionCreate`, `transactionUpdate`, `transactionItemSelect`, `transactionPay`).
- No redesign of the desktop layout, the product card, the category tabs, or pagination.
- No change to the payment flow (`TransactionPaymentAlert`), the print/invoice flow, or the order-slip prompt — beyond making the cart sheet close cleanly before the payment alert appears (FR-7).
- No offline cart persistence, no draft recovery, no cart badge on the transaction list.
- Not a rewrite of the customer-facing ordering app (`apps/order`) — that app already has its own cart bar; this PRD only borrows the pattern.

---

## Context: The Existing System

### Files that matter

| File | Role |
|---|---|
| `libs/ui/src/presentation/components/transactions/TransactionFormView.tsx` | The two-column layout. Owns the `XStack`, the cart `Card`, the items field array rendering, the coupons list, the total, the Submit button, and the coupon `Sheet`. |
| `libs/ui/src/presentation/components/transactions/TransactionItemSelect.tsx` | Product search + category tabs + product list + pagination, plus the variant/amount `Dialog`. |
| `libs/ui/src/presentation/screens/TransactionCreateScreen.tsx` | Wraps `TransactionFormView` in `Layout` + `ScrollView`; also mounts `TransactionPaymentAlert`. |
| `libs/ui/src/presentation/screens/TransactionUpdateScreen.tsx` | Same, without the payment alert. |
| `libs/ui/src/presentation/screens/TransactionCreateHandler.tsx` / `TransactionUpdateHandler.tsx` | Wire controllers → screen props. Own the "variant loaded → `onAddItem`" effect and the "submit success → show payment" effect. |
| `libs/ui/src/presentation/controllers/TransactionCreateController.tsx` / `TransactionUpdateController.tsx` | `react-hook-form` form + `useFieldArray` for `transactionItems` / `transactionCoupons`, coupon-sheet open state, `onAddItem`, `onAddCoupon`, `onRemoveItemCoupon`. |
| `libs/ui/src/presentation/components/base/Sheet/Sheet.tsx` | Shared bottom sheet wrapper (`modal`, `snapPoints={[90, 0]}`, `zIndex: 100_000`, `Frame height="100vh"`). |
| `libs/ui/src/presentation/components/cart/CartBar.tsx` | **Precedent** — the floating cart bar already built for `apps/order` (`{n} item · {total} · Lihat Keranjang`). Not reusable as-is (Indonesian copy, no item-count/total plumbing for the POS form) but it is the visual reference. |

### How an item gets into the cart today

The product picker and the cart are two independent state machines joined by an effect in the handler:

1. `TransactionItemSelect` → `SELECT_PRODUCT` → `transactionItemSelect` state becomes `selectingOptions` → the `Dialog` opens.
2. User picks option values + amount → `FETCH_VARIANT` → `loadingVariant` → `loadingVariantSuccess` with a `selectedVariant`.
3. `TransactionCreateHandler`'s `useEffect` sees `loadingVariantSuccess` and calls `transactionCreateController.onAddItem(variant, amount)`, which appends to (or increments in) the `transactionItems` field array.

**This mechanism is untouched by this PRD.** The compact layout changes *where the cart is rendered*, not *how items reach it*.

### Responsive precedent in this codebase

- Tamagui `@tamagui/config/v3` breakpoints: `xs ≤660`, `sm ≤800`, `md ≤1020`, `lg ≤1280`, plus `gt*` counterparts.
- `Sidebar.state.tsx` is the only place that branches on layout in JS: `const isMobile = media.xs` — the sidebar collapses to an overlay at ≤660px.
- Everywhere else uses static responsive props (`$sm={{ flexDirection: 'column' }}`, `$md={{ flexBasis: '45%' }}`).

Static props are **not sufficient here**: the cart has to *move* from an inline column into a modal sheet, and a Tamagui `Sheet` cannot be conjured by a style prop. This PRD therefore introduces one JS-level layout branch, centralised in a single hook.

### Constraint: the Jest Tamagui mock

`libs/ui/jest.config.ts` maps `tamagui` → `libs/ui/src/__mocks__/tamagui.tsx`, where:

```ts
export const useMedia = () => ({});
```

Every media flag is therefore `undefined` in unit tests. Existing tests (`TransactionCreateHandler.test.tsx`, `TransactionUpdateHandler.test.tsx`) assert that **Customer Name, Order Number and Submit are directly visible** on mount. If the compact branch is chosen on falsy media flags, all of those tests break and the *default* rendering in tests stops matching production desktop rendering.

The layout hook must therefore be written so that **`undefined` means desktop** (see FR-1), and the mock must be made overridable so compact-branch tests can exist.

### Constraint: nested modals

The desktop cart already contains a coupon `Sheet` (`isCouponSheetOpen`). If the compact cart is itself a `Sheet`, "Apply Coupon" would open a **sheet inside a sheet** — two `modal` Tamagui sheets, both at `zIndex: 100_000`, competing for the same portal host. This is a known-fragile pattern and is addressed explicitly in FR-5.

### Constraint: `Sheet.Frame height="100vh"`

`vh` is a web-only CSS unit. On React Native the value is not a valid RN style height. The coupon sheet already ships with this on native, so this is pre-existing, but the compact cart makes the sheet a *primary* flow on phones — it must be verified and, if broken, fixed (FR-4 / Risks).

---

## Target UX

### Compact — step 1: product picker (full screen)

```
┌────────────────────────────┐
│ ←  Create Transaction    ⋮ │  Navbar
├────────────────────────────┤
│ Select Product             │
│ ┌────────────────────┐ ┌─┐ │
│ │ Search Products…   │ │✕│ │
│ └────────────────────┘ └─┘ │
│ [ Coffee ][ Tea ][ Food ]  │  category Tabs
│ ┌────────────────────────┐ │
│ │ ▣  Espresso            │ │
│ │ ▣  Latte               │ │  scrolls INSIDE this region
│ │ ▣  Cappuccino          │ │
│ │ ▣  Americano           │ │
│ └────────────────────────┘ │
│        ‹  1  2  3  ›       │  Pagination
│                            │
│ ┌────────────────────────┐ │
│ │ 3 items · Rp 45.000 ▸  │ │  floating cart button (only when items > 0)
│ └────────────────────────┘ │
└────────────────────────────┘
```

### Compact — step 2: variant + amount (unchanged flow, resized)

Same `Dialog` content as today (radio groups per option, amount stepper, Cancel / Submit) but sized to the viewport instead of a fixed 500px.

### Compact — step 3: cart sheet

```
┌────────────────────────────┐
│           ────             │  drag handle
│ Cart                    ✕  │
├────────────────────────────┤
│ Customer Name  [_________] │
│ Order Number   [_________] │
│ ────────── Items ───────── │
│ 🗑  Latte                   │
│    Large - Hot   Rp 25.000 │
│              [2]  Rp 50.000│
│    [ Add Notes…          ] │
│    + Apply Coupon          │
│ ─────────────────────────  │
│ ───────── Coupons ──────+─ │
│ 🗑  WELCOME10   - Rp 5.000  │
├────────────────────────────┤
│ Total          Rp 45.000   │  pinned footer
│ [        Submit         ]  │
└────────────────────────────┘
```

The sheet body is the **same component** that renders the desktop right column — extracted once, rendered in two containers.

### Large screens — unchanged

```
XStack
├── TransactionItemSelect (flex 1)
└── Card(cart) + Submit
```

Pixel-identical to today.

---

## Confirmed Product & Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Breakpoint for "compact" | **`media.sm`** (viewport ≤ 800px) | The desktop cart card is `maxWidth: 400`; below ~800px the remaining space for the product grid drops under 400px and the picker degrades. Diverges deliberately from `Sidebar`'s `xs` (≤660): between 661–800px the sidebar stays expanded while the cart becomes a sheet, which is the correct behaviour for a tablet in portrait. |
| How the branch is expressed | A single hook, `useIsCompactLayout()`, wrapping `useMedia()` | One place to change the breakpoint; keeps `Platform.OS` out of layout code; makes the test story explicit. |
| Behaviour when media flags are `undefined` (SSR first paint, Jest mock) | **Desktop** | Matches the current default rendering, keeps every existing unit test green, and makes the compact layout an explicit opt-in rather than an accidental fallback. |
| Cart button visibility | Visible **iff `transactionItems.length > 0`**, compact only | Matches the requirement ("after submitting the variant … the cart button will [be] shown"). With zero items the form cannot pass validation anyway, so there is nothing to open. On Update, an existing transaction already has items, so the button is there on first paint. |
| Does adding an item auto-open the cart? | **No.** The button appears/updates its count and total; the sheet stays closed. | Staff add several items per order. Auto-opening after every add would force a dismiss per item. "It goes to the cart" is satisfied by the button reflecting the new state. |
| Cart button content | `{n} item(s) · Rp {total} · View Cart` | Mirrors `apps/order`'s `CartBar`, in English to match the POS app's copy ("Customer Name", "Submit"). Shows the discounted final total, the same number the cart footer shows. |
| Where Submit lives on compact | **Inside the cart sheet**, in a pinned footer next to the total | Submit requires customer name + order number, which are only in the sheet. Keeping Submit outside the sheet would let staff submit a form they cannot see the errors of. |
| Sheet behaviour on validation failure | **Stays open**; the `FormErrorBanner` and field errors render inside the sheet | Errors must be visible where the offending fields are. |
| Sheet behaviour on submit success | **Closes**, then the payment alert opens (Create) / navigation happens (Update) | Prevents an `AlertDialog` stacked on top of a `Sheet` (FR-7). |
| Coupon selection on compact | The cart sheet **swaps its content** to the coupon list with a back header — **no nested sheet** | Avoids two `modal` Tamagui sheets fighting over the same portal at the same `zIndex`. Desktop keeps the existing nested-sheet behaviour untouched. |
| Product picker scrolling on compact | The screen's outer `ScrollView` is **removed on compact**; the product list scrolls inside a bounded, `flex: 1` region | A `flex: 1` list inside a `ScrollView` has no height; the current nested `ScrollView`+`FlatList` is exactly why the page scrolls as one long document. |
| Search input `autoFocus` on compact | **Disabled** | On a phone, autofocus raises the keyboard over the product list before the user has seen it. |
| Variant dialog sizing on compact | Width follows the viewport (`width: '90%'`, `maxWidth: 500`) and the content area scrolls | Products with many options currently overflow a phone screen with no way to reach the Submit button. |
| React Native parity | Same components, same hook — `useMedia()` reads `Dimensions` on native, so a phone is compact and a landscape tablet (>800dp) gets the desktop layout | No `Platform.OS` branching for layout; one code path to review and test. |

### Core Rules

1. **The form state is untouched by layout.** `form`, `itemsFieldArray`, `couponsFieldArray` and every controller handler are passed through unchanged. Switching layouts (e.g. rotating a tablet across the breakpoint) MUST NOT reset, remount-clear, or drop any entered value.
2. **The cart body is a single component.** Desktop renders it inside the `Card`; compact renders it inside the `Sheet`. No duplicated JSX, no per-layout copies of the items/coupons/total markup.
3. **One layout branch, one hook.** No component may call `useMedia()` directly for this feature, and no layout decision may key off `Platform.OS`.
4. **Desktop rendering is byte-for-byte unchanged.** Any PR in this plan that alters desktop output is a bug in that PR.
5. **No new runtime dependencies.** Tamagui (`Sheet`, `Dialog`, `useMedia`), `react-hook-form` and `react-native-safe-area-context` (already a dependency) cover everything.
6. **Accessibility:** the cart button must carry an accessible name that includes the item count; the cart sheet must be dismissable by an explicit close control, not only by a drag gesture (`Sheet` is configured with `disableDrag`).

---

## Feature Requirements

### FR-1 — `useIsCompactLayout()` hook

A single hook that answers "should this screen use the compact transaction layout?".

- Lives in `libs/ui/src/presentation/components/base/` and is exported from `base/index.tsx` (alongside the existing `Sidebar.state.tsx` precedent).
- Implementation shape:

```ts
export const useIsCompactLayout = () => {
  const media = useMedia();
  // `undefined` (SSR first paint, Jest mock) intentionally falls back to the
  // desktop layout — see PRD "Behaviour when media flags are undefined".
  return media.sm === true;
};
```

- The Jest Tamagui mock's `useMedia` must become overridable so tests can render either branch — e.g. a mutable default that tests can set, or a per-file `jest.mock` override. Existing tests keep passing with **no edits**.

### FR-2 — Extract `TransactionCartView`

Move the cart body out of `TransactionFormView` into its own component, with **no behavioural or visual change**.

- New file: `libs/ui/src/presentation/components/transactions/TransactionCartView.tsx`, exported from `transactions/index.ts`.
- It renders: `FormErrorBanner`, Customer Name, Order Number, the coupon `Sheet` slot, the Items list (per-item remove, name, option values, price, amount stepper, line total, note input, apply/remove item coupon), the Coupons list with the running discount math, and the Total block.
- Props are the ones the body already needs: `form`, `itemsFieldArray`, `couponsFieldArray`, `onItemCouponSheetOpen`, `onRemoveItemCoupon`, `onCouponSheetOpenChange`, `serverError`, plus `TransactionCouponList`.
- The **Submit button and the coupon `Sheet` stay in the caller**, because their placement differs per layout (inline column vs. sheet footer, nested sheet vs. content swap).
- `TransactionFormView` keeps rendering it inside the same `Card maxWidth={400}` as today.

### FR-3 — Compact layout in `TransactionFormView`

When `useIsCompactLayout()` is true:

- Render **only** `TransactionItemSelect`, filling the available height (`flex: 1`), plus the floating cart button. The `Card`, the inline Submit button and the cart body are not rendered.
- The container is a `YStack flex={1}` (not an `XStack`) so the picker owns the full width.
- The floating cart button is absolutely positioned at the bottom of the screen, above the safe-area inset, with a background/border so list content scrolling under it stays readable.
- The button renders only when `itemsFieldArray.fields.length > 0`; it shows the item count and the **final** total (items total minus item discounts minus transaction coupons, using the same `roundToNearest500` math the cart footer uses — extract that calculation so the two cannot drift).
- Pressing it opens the cart sheet (FR-4).
- When false, the existing two-column `XStack` renders exactly as today.

Screens must cooperate: on compact, `TransactionCreateScreen` and `TransactionUpdateScreen` render the form in a `YStack flex={1}` instead of the outer `ScrollView`, so the product list gets a bounded height and scrolls internally. On desktop they keep the `ScrollView`.

`TransactionItemSelect` on compact:
- `autoFocus` off on the search input.
- The list region is `flex: 1` and scrolls; `Pagination` stays pinned below it.
- Bottom padding reserves room for the floating cart button so the last product row is never covered.

### FR-4 — The cart sheet

- Uses the shared `Sheet` base component.
- Open state is **local UI state** (`useState` in the form view or a small state hook) — not in the usecase state machine, not in the form.
- Content, top to bottom: a header with the title "Cart" and an explicit close control; a scrollable body rendering `TransactionCartView` (FR-2); a pinned footer with the Total and the Submit button (same `disabled`/`Spinner` semantics as the desktop button).
- The sheet must not clip its content on a short viewport: the body scrolls, the footer stays reachable, and the software keyboard must not cover the focused input (keyboard-avoiding behaviour verified on both web and native).
- `Sheet.Frame`'s `height="100vh"` must be verified on React Native; if it does not resolve, replace it with a platform-safe height (e.g. a percentage/flex-based frame) in this phase. Any change to the shared `Sheet` must be checked against its other consumers (the coupon sheet and any other `Sheet` usage).

### FR-5 — Coupon selection inside the compact cart

- On compact, "Apply Coupon" (per item) and the Coupons "+" button do **not** open a second sheet. They switch the cart sheet's content to the coupon list, with a back affordance that returns to the cart.
- Selecting a coupon applies it through the existing `onAddCoupon` handler (which already distinguishes item-level vs. transaction-level via `couponSheetItemIndex`) and returns to the cart content.
- On desktop, the existing nested `Sheet` behaviour is unchanged.

### FR-6 — Variant/amount dialog on small screens

- `Dialog.Content`'s hard-coded `width={500}` becomes responsive: `width: '90%'`, `maxWidth: 500`, so it never exceeds the viewport.
- The options area scrolls when a product has many options, so Cancel/Submit remain reachable.
- Touch targets (radio items, the amount −/+ buttons) meet a ≥44px minimum on compact.
- Desktop rendering of the dialog is unchanged at ≥800px.

### FR-7 — Submit and payment hand-off

- Submitting from the sheet runs the same `form.handleSubmit(onSubmit)` as desktop.
- **Validation failure:** the sheet stays open; `FormErrorBanner` and per-field errors are visible inside it.
- **Success (Create):** the cart sheet closes *before* `TransactionPaymentAlert` opens, so an `AlertDialog` is never stacked over a `modal` `Sheet`. The subsequent print-invoice / print-order-slip confirmation dialogs must also render above nothing but the page.
- **Success (Update):** the sheet closes and navigation proceeds as it does today.
- The payment alert itself must be usable at compact width (wallet select, paid-amount input, buttons) — if it is not, fix it here.

### FR-8 — Test, story and E2E coverage

- Storybook stories for `TransactionCartView`, the cart button, and `TransactionFormView` in both layouts.
- Unit tests (RTL, `libs/ui`) for the compact branch: cart hidden on mount, button hidden with an empty cart, button appears with a count after an item is added, sheet opens/closes, submit-from-sheet path, validation errors visible inside the sheet.
- A Playwright project at a phone viewport (e.g. 390×844, `devices['Pixel 5']`) covering the full compact happy path: open Create → pick product → pick variant + amount → cart button shows `1 item` → open cart → fill name and order number → Submit → payment alert.
- Existing desktop E2E (`apps/web-e2e/src/transactions.spec.ts`) must pass unmodified.

---

## Non-Functional Requirements

- **No new dependencies.**
- **No API, schema, usecase or controller-state changes.** If a phase finds itself editing `libs/ui/src/domain`, that is a signal the design has drifted.
- **No regression in list performance.** The product `FlatList` keeps its current data flow; the compact layout changes the container, not the rendering strategy.
- **Web and native from one source.** No `Platform.OS` layout branches. Any native-only fix (e.g. the `Sheet` frame height) goes into the shared base component, not into the transaction feature.
- **SSR safety (web).** The Next.js server render must not crash or mis-render; the first client paint may flip from desktop to compact on a phone — see Risks.

---

## Success Metrics

- On a 390px viewport, the product picker occupies the full content width (vs. ~50% today) and the visible product count per screen increases materially.
- Taps to add the first item to an order on a phone: unchanged (product → variant → submit); taps to reach the cart: 1.
- No increase in desktop bundle behaviour or render count for the large-screen path.
- Existing desktop E2E suite green with zero edits.

---

## Implementation Phases

Seven self-contained PRs. Each ships with its own tests/stories and leaves `main` in a working state on **both** layouts. The order matters: phases 1–2 are pure groundwork, phase 3 is the first user-visible change.

### Phase 1 — Responsive foundation (FR-1)

**Files:**
- `libs/ui/src/presentation/components/base/useIsCompactLayout.ts` (new)
- `libs/ui/src/presentation/components/base/index.tsx` (export)
- `libs/ui/src/__mocks__/tamagui.tsx` (make `useMedia` overridable)
- `libs/ui/src/presentation/components/base/useIsCompactLayout.test.ts` (new)

**Acceptance:**
- The hook returns `true` only when `media.sm === true`; `undefined`/`false` → `false`.
- Tests can force either branch through the mock.
- **No component consumes the hook yet.** Zero rendering change anywhere; the entire existing suite passes untouched.

**Out of scope:** any layout change.

### Phase 2 — Extract `TransactionCartView` (FR-2)

**Files:**
- `libs/ui/src/presentation/components/transactions/TransactionCartView.tsx` (new)
- `libs/ui/src/presentation/components/transactions/TransactionCartView.stories.tsx` (new)
- `libs/ui/src/presentation/components/transactions/TransactionFormView.tsx` (render the extracted component)
- `libs/ui/src/presentation/components/transactions/index.ts`

**Acceptance:**
- Pure refactor: the rendered desktop DOM/tree is equivalent before and after (verified by the existing handler tests plus a story snapshot).
- The final-total calculation (items − item discounts − sequential coupon discounts with `roundToNearest500`) is extracted into one reusable function so the footer and, later, the cart button cannot disagree. Add unit tests for it, including percentage-coupon stacking.
- No new props threaded through the screens or handlers.

**Out of scope:** the compact branch, the Sheet, the cart button.

### Phase 3 — Compact product picker + floating cart button + cart sheet (FR-3, FR-4)

The core PR. Larger than the others by necessity — splitting it further would ship a state where staff can add items on a phone but cannot submit.

**Files:**
- `libs/ui/src/presentation/components/transactions/TransactionCartButton.tsx` (new) + story
- `libs/ui/src/presentation/components/transactions/TransactionFormView.tsx` (the branch)
- `libs/ui/src/presentation/components/transactions/TransactionItemSelect.tsx` (compact: no `autoFocus`, bounded scroll region, bottom padding)
- `libs/ui/src/presentation/screens/TransactionCreateScreen.tsx`, `TransactionUpdateScreen.tsx` (drop the outer `ScrollView` on compact)
- `libs/ui/src/presentation/components/base/Sheet/Sheet.tsx` (only if the native height fix is needed)
- Tests: compact-branch rendering + interaction

**Acceptance:**
- Compact, empty cart: only the product picker is visible; no Customer Name / Order Number / Items / Coupons / Total / Submit anywhere in the tree; no cart button.
- Compact, after adding one item: the cart button appears reading `1 item · Rp {total} · View Cart`; the product list is still fully usable and its last row is not covered by the button.
- Tapping the button opens the sheet with the full cart body and a pinned Total + Submit; closing returns to the picker with all values intact.
- Adding a second item while the sheet is closed updates the button's count and total without opening the sheet.
- Rotating/resizing across 800px preserves every entered value (name, order number, notes, amounts, coupons).
- Desktop at ≥801px is unchanged; all existing unit and E2E tests pass unmodified.
- Verified on the React Native app (physical device or simulator): sheet opens, scrolls, and closes; the frame is not clipped.

**Out of scope:** coupon-sheet nesting (Phase 4), variant dialog sizing (Phase 5), payment hand-off polish (Phase 6).

### Phase 4 — Coupons inside the compact cart (FR-5)

**Files:**
- `libs/ui/src/presentation/components/transactions/TransactionFormView.tsx` / `TransactionCartView.tsx` — content-swap state and back header
- Tests

**Acceptance:**
- Compact: "Apply Coupon" on an item and the Coupons "+" both swap the sheet content to the coupon list with a working back control; no second sheet mounts.
- Selecting a coupon applies it to the right target (item vs. transaction) and returns to the cart content with the discount reflected in the item line / coupon row / total / cart button.
- Desktop coupon sheet behaviour is unchanged.

### Phase 5 — Variant/amount dialog on small screens (FR-6)

**Files:**
- `libs/ui/src/presentation/components/transactions/TransactionItemSelect.tsx`
- Story with a many-option product at a phone viewport

**Acceptance:**
- At 360px, 390px and 430px the dialog fits within the viewport with no horizontal overflow.
- A product with enough options to exceed the screen height scrolls, and Cancel/Submit stay reachable.
- Touch targets are ≥44px on compact.
- At ≥801px the dialog is identical to today (500px wide).

### Phase 6 — Submit and payment hand-off (FR-7)

**Files:**
- `libs/ui/src/presentation/components/transactions/TransactionFormView.tsx` (close-on-success)
- `libs/ui/src/presentation/screens/TransactionCreateScreen.tsx` (ordering of sheet close vs. payment alert)
- `libs/ui/src/presentation/components/transactions/TransactionPaymentAlert.tsx` (only if compact sizing needs it)
- Tests

**Acceptance:**
- Compact Create: Submit with an empty customer name keeps the sheet open and shows the error inside it.
- Compact Create: a successful submit closes the sheet, then shows the payment alert with nothing rendered behind it at a conflicting z-index; paying then reaches the print prompts and finally `/transactions`.
- Compact Update: a successful submit closes the sheet and navigates as today.
- The payment alert and both print confirmations are fully usable at 390px.
- Desktop submit/payment/print behaviour is unchanged.

### Phase 7 — Mobile E2E coverage (FR-8)

**Files:**
- `apps/web-e2e/playwright.config.ts` (a `mobile-chromium` project at a phone viewport)
- `apps/web-e2e/src/transactions.mobile.spec.ts` (new)
- `apps/web-e2e/src/utils/selectors.ts` (cart button / cart sheet selectors)

**Acceptance:**
- The full compact happy path passes headless in CI: create → pick product → variant + amount → cart button shows the count → open cart → fill name + order number → Submit → pay.
- The desktop project still runs the existing spec unchanged; the mobile project does not slow CI beyond the existing budget (the suite runs `workers: 1` against a shared DB — the mobile spec must clean up after itself the same way `transactions.spec.ts` does).

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **SSR/hydration flash on web.** `useMedia()` resolves on the client; the server renders the desktop branch, so a phone may paint the two-column layout for one frame before flipping to compact. | Visible flicker on first load. | Accept for phase 3 and measure. If it is noticeable, gate the first paint on a mount flag or add a CSS-media-driven wrapper. Do not "fix" it by defaulting to compact — that would flip the flash onto desktop, the more common POS surface. |
| **`Sheet.Frame height="100vh"` on React Native.** | The compact cart may render at zero/incorrect height on native. | Verified explicitly in Phase 3 on a device/simulator; fixed in the shared `Sheet` with a regression check on its other consumers. |
| **Nested sheets (cart → coupon).** | Broken or unclosable overlay on compact. | Avoided by design (FR-5 content swap) rather than fixed after the fact. |
| **`AlertDialog` over `Sheet`.** | Payment alert unreachable behind the cart sheet. | FR-7 closes the sheet before the alert opens; asserted in a test. |
| **Jest media mock flips the default branch.** | Every existing transaction test breaks, and tests stop reflecting production desktop rendering. | FR-1's `media.sm === true` check means `undefined` → desktop; Phase 1 lands with zero edits to existing tests as proof. |
| **Two totals drifting apart** (cart footer vs. cart button). | Staff see one number on the button and another in the cart. | Phase 2 extracts one shared total function with unit tests; the button consumes it. |
| **Tablet at 700–800px** gets an expanded sidebar *and* a sheet cart. | Slightly unusual but coherent. | Accepted; documented. Revisit only if staff report it. |
| **Scope creep into the picker's visual design** (grid, thumbnails, denser cards). | Phase 3 balloons and becomes unreviewable. | Explicitly out of scope — see Future Work. |

---

## Open Questions

1. **Cart button placement relative to `Pagination`.** The button floats above the list; pagination sits directly under it. If they visually collide on short screens, the fallback is to dock the button in a bottom bar that pagination scrolls above. Decide visually in Phase 3.
2. **Does the Update flow want the cart open on first paint?** An existing transaction already has items, so the button is present immediately. Opening the sheet on mount would put the editable fields front and centre — but it would also hide the picker the requirement asks to land on. Current decision: **do not auto-open**, consistent with Create.
3. **Item count copy** with a single item: `1 item` vs `1 items`. Trivial, but pick one in Phase 3 and keep the E2E selector stable.

---

## Future Work (explicitly deferred)

- **Product picker visual redesign on compact** — two-column grid, larger thumbnails, sticky category chips. Real value, but a separate design conversation.
- **Quick-add from the product list** — for single-variant products, skip the dialog and add straight to the cart with amount 1.
- **Swipe-to-remove on cart lines** — replaces the small circular trash button, which is a tight touch target on a phone.
- **Cart badge on the navbar** as an alternative/companion to the floating button.
- **Sharing the compact cart with `apps/order`'s `CartBar`** — one cart-bar component for both apps once the copy/i18n story is settled.
- **Persisting an in-progress cart** across accidental navigation or app backgrounding.
