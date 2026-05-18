# PRD: Stock Check Form UX — Filtering & Row Layout

## Problem Statement

The Stock Check form (`/stock-checks/create` and `/stock-checks/{id}/edit`) renders **every active material** as a single flat list of rows — one row per material, with the material name on the left and a numeric input for the current stock on the right.

Two concrete pain points have been raised by inventory staff:

1. **No way to find a specific material.** The real-world workflow is: a staff member walks the inventory shelves, picks up a physical item (say "Kopi Arabika 250g"), then opens the POS to record the count. With dozens of materials in the form, they have to scroll up and down hunting for that row. This is slow and error-prone — easy to miss a material entirely or accidentally key the count into the wrong row.

2. **The label and its input drift apart on wide screens.** Each row is `[material name — flex 1] [input — 100px] [unit — 60px]`. On a desktop or tablet in landscape, the material name stretches across most of the row, leaving a wide visual gap between the *end* of the name and the *start* of the input. Eyes have to track a long horizontal distance to confirm "this input belongs to this material," and the more rows there are, the easier it is to enter a number on the wrong line.

Both issues affect the same shared component (`StockCheckFormView`) and therefore both the **Create** and **Edit** stock check flows.

---

## Context: Existing System

- **Shared form component**: `libs/ui/src/presentation/components/stockChecks/StockCheckFormView.tsx`. Uses `react-hook-form` + `useFieldArray` (`name: 'items'`). Each item: `{ materialId, materialName, purchaseUnit, currentStock }`.
- **Screens**: `StockCheckCreateScreen.tsx` and `StockCheckUpdateScreen.tsx` both render `<StockCheckFormView />` inside a `ScrollView`. No filter or search UI exists today.
- **Data source**: For Create, the page (`apps/web/src/pages/stock-checks/create.tsx`) preloads all materials via `materialRepository.fetchMaterialList` with `itemPerPage: 1000` and seeds the form with one row per material, `currentStock: 0`. For Edit, the existing `stockCheck.items` are loaded as-is.
- **Existing search pattern in the codebase** (to be reused, not reinvented): `libs/ui/src/presentation/components/materials/MaterialList.tsx` uses a Tamagui `Input` inside an `XStack` with `placeholder="Search Materials by Name"`, an `onChangeText` callback, an optional clear button, and `autoFocus` support. `TransactionList`, `RentalList`, `ExpenseList`, `SupplierList` all follow the same shape. The Stock Check form should adopt this same visual pattern for consistency.
- **Form library constraint**: `react-hook-form` `useFieldArray` mounts and unmounts a row's `<Controller>` when the row is removed from the `fields` array. **We must not** filter the rendered list by removing items from `fields`, because that would unmount the inputs and lose their values. Filtering must be a **purely visual** operation — every row stays mounted; non-matching rows are hidden via `display: 'none'` (or equivalent).

---

## Proposed Solution

Two independent improvements to `StockCheckFormView`, shippable as two separate PRs:

1. **Row layout redesign** — make each row a self-contained, visually grouped unit so the label and input are unambiguously paired on any screen width.
2. **In-form search filter** — a search input at the top of the form that hides non-matching rows in real time, with a result count and a "clear" affordance.

Both improvements live entirely inside `StockCheckFormView.tsx` (plus a thin state hook for the filter). The form schema, the usecases, the repositories, and the API contract are **unchanged**.

### Confirmed Product Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Filter scope | **Material name only**, case-insensitive substring match. | Staff search by what they read off the physical item. No supplier/category dimension needed in this iteration. |
| Filter behavior | **Visual hide**, not unmount. All rows remain registered with `react-hook-form`; non-matches get `display: 'none'`. | Preserves entered values when the user clears the search or types a different query. Avoids `useFieldArray` re-mount churn. |
| Empty-result state | Render a muted "No materials match \"<query>\"" message in place of the list. | Standard pattern; avoids a blank screen that looks broken. |
| Result count | Show `"<n>/<total>" materials` next to the search input when a query is active. | Confirms the filter is doing what the user expects, and signals when to stop scrolling. |
| Search persistence | **Not persisted** across navigation. The search input resets on each mount. | Each stock-check session is a fresh walk through the inventory; persisting the last query would surprise the next user. |
| Row layout | **Two-line row on narrow screens, single-line with a constrained max-width on wide screens**, plus a subtle row separator (border-bottom). | Keeps mobile compact while preventing the desktop "tennis-court gap" between label and input. The separator gives the eye a horizontal guide. |
| Long material names | Truncate with ellipsis (`numberOfLines={1}`) — unchanged from today. | Avoids row reflow; the full name is visible on tap/hover via the native title attribute. |
| Submit button behavior | Submit always submits **all** items, regardless of the active filter. | The filter is a find-and-fill aid, not a scoping mechanism. Staff expect their previous entries on hidden rows to be preserved. |
| Filter input position | **Sticky at the top** of the scroll area (just under the screen header). | The form can be long; the search must stay reachable without scrolling back to the top. |

### Core Rules

1. **Filter does not mutate form state.** Typing into and clearing the search MUST leave `form.getValues()` byte-identical to before the search interaction.
2. **Hidden rows still validate.** If the schema rejects a row (e.g. `currentStock` is negative), submit must surface that error and, if the offending row is currently hidden by the filter, the filter must be cleared (or at minimum, the error banner must name the offending material) so the staff can find and correct it.
3. **Row layout must remain a single Tamagui component** (no platform-specific branching) — the existing form is shared with React Native via `libs/ui`. Use Tamagui responsive props (e.g. `$gtSm`) rather than `window.matchMedia`.
4. **Accessibility**: the row label and its input must be programmatically associated (Tamagui `Label` + `htmlFor`, or `aria-labelledby`) so screen readers and tab-key users can tell which input belongs to which material.

---

## Feature Requirements

### FR-1: Row layout redesign

Replace the current `XStack` row with a layout that visually groups the label and the input as one unit on all viewport widths.

**Target shape (single source of truth, responsive):**

```
┌─────────────────────────────────────────────────────────────────┐
│ Kopi Arabika 250g                            [ 12  ]   kg        │
├─────────────────────────────────────────────────────────────────┤
│ Susu UHT Full Cream                          [  3  ]   liter     │
├─────────────────────────────────────────────────────────────────┤
│ …                                                                │
└─────────────────────────────────────────────────────────────────┘
```

**Requirements:**

- The list container has a `maxWidth` (target: `$20` / ~640px equivalent — final value to be confirmed visually against existing form widths in the codebase) and is centered horizontally inside the scroll view. This is what prevents the desktop "tennis-court gap".
- Each row has a subtle `borderBottomWidth: 1` (or alternating background — pick one, not both) so the eye has a horizontal guide from label to input.
- The material name is `flex: 1` with `numberOfLines={1}` (unchanged), the input has a fixed width (~`$8` / 100px), and the unit text has a fixed width (~`$6` / 60px).
- On narrow viewports (`< $sm`), the row remains single-line — the constrained max-width naturally collapses to the screen width, so the label-to-input distance is already short.
- Vertical padding (`paddingVertical: '$2'`) so rows have breathing room and the border looks intentional.
- The row uses Tamagui `Label` to associate the material name with its `InputNumber` for a11y.

**Out of scope for this phase:**

- No icons, no per-row delete, no per-row supplier info, no minimum-stock badges. This is a pure layout change.

### FR-2: In-form material name filter

Add a search input above the rows that hides non-matching rows.

**Requirements:**

- A Tamagui `Input` with `placeholder="Search material by name"`, matching the visual style of `MaterialList.tsx`'s search input (same `XStack`-with-clear-button shape).
- An `X` clear button appears when the query is non-empty; pressing it sets the query to `""`.
- Filtering is **case-insensitive substring** on `materialName`. No fuzzy matching, no diacritic folding in this iteration.
- A counter `"<n>/<total>"` is shown next to the input only when the query is non-empty.
- The search input is **sticky** to the top of the scroll container so it stays reachable as the user scrolls.
- The filter is applied by toggling `display: 'none'` on the row's outer container based on whether `materialName.toLowerCase().includes(query.toLowerCase())`. The `<Controller>` and `InputNumber` for every row remain mounted.
- When the query produces zero matches, the rows area is replaced with a muted `SizableText`: `No materials match "<query>"`. The submit button stays enabled (it always submits all items).
- The search query lives in local component state (`useState`) — not in `react-hook-form`, not in the usecase, not in the URL.
- Clearing the search or unmounting the screen restores all rows; entered values are preserved.

### FR-3: Submit-time error visibility for hidden rows

If submit fails Zod validation on a row that is currently hidden by the filter:

- Either clear the filter automatically so the offending row scrolls into view, **or** include the offending `materialName` in the `FormErrorBanner` text.

Pick whichever is simpler to implement cleanly; document the choice in the phase 2 PR. The point is: the staff must not be left staring at "Submit failed" with no way to find the bad row.

---

## Non-Functional Requirements

- **No new dependencies.** Tamagui + react-hook-form already provide everything needed.
- **No API or schema changes.** This PRD touches presentation only.
- **No measurable performance regression** on a 200-material list. Filtering by toggling `display: 'none'` on already-mounted rows is O(n) per keystroke and is fine at this scale; do **not** memoize prematurely. If profiling shows a problem on lower-end Android devices, that's a follow-up, not part of this PRD.
- **Shared component** — both Create and Edit flows benefit from the same change without per-screen duplication.

---

## Implementation Phases

Each phase is a self-contained, independently shippable PR. They can be merged in either order, but the recommended order is Phase 1 → Phase 2 because the layout change makes the filter's "X/Y" counter look correct against a cleaner row.

### Phase 1 — Row layout redesign (FR-1)

**Files touched:**

- `libs/ui/src/presentation/components/stockChecks/StockCheckFormView.tsx` — replace the row `XStack` with the new constrained, separated layout. Add Tamagui `Label` for a11y.

**Acceptance:**

- On a desktop viewport (≥ 1024px), the gap between the end of the material name and the start of the input is visually small (label and input feel like one unit). Verified by manual inspection at 1024px, 1440px, and 1920px widths.
- On a mobile viewport (≤ 480px), the row still fits on a single line and looks unchanged in density from today.
- Each row has a visible separator (border or stripe) — verified by screenshot.
- The `Label`/`InputNumber` pair is announced together by screen readers (manual check with VoiceOver or NVDA, or at minimum a confirmed `htmlFor`/`aria-labelledby` link in the rendered DOM).
- Both the Create form (`/stock-checks/create`) and the Edit form (`/stock-checks/{id}/edit`) render the new layout; no per-screen overrides.
- Existing form behavior — typing, validation, submission — is unchanged. Existing Storybook stories (if any for this component) still pass.

**Out of scope for this phase:**

- No search input. No FR-2 work.

### Phase 2 — In-form material name filter (FR-2 + FR-3)

**Files touched:**

- `libs/ui/src/presentation/components/stockChecks/StockCheckFormView.tsx` — add `useState` for the query, a sticky search `XStack` at the top, the visual-hide logic on each row, the empty-state message, and the result counter.
- (If FR-3 path "clear filter on submit error" is chosen) the same file — add an effect that watches `form.formState.errors` and resets the query when a hidden row has errors.
- (If FR-3 path "name in banner" is chosen) — pass the failing material names into `FormErrorBanner` instead.

**Acceptance:**

- Typing `kop` filters the list in real time to only rows whose name contains `kop` (case-insensitive). Clearing the input restores all rows.
- After typing in a value, switching the filter, typing in another value, then clearing the filter — both originally-entered values are still in the form (verified by submitting and checking the payload, or by `console.log(form.getValues())` during dev).
- The result counter shows `3/47 materials` when the filter narrows 47 rows to 3, and disappears when the query is empty.
- The search input is anchored at the top of the scroll area: scrolling the form does **not** scroll the search input out of view.
- When no rows match, the list area shows `No materials match "<query>"` and the submit button remains enabled.
- Submitting a form with an invalid value in a row that is currently filtered-out triggers the FR-3 affordance (filter clears, or banner names the row). Verified by manually entering an invalid value, filtering it out, and pressing Submit.
- Both Create and Edit screens get the filter; no per-screen duplication.

**Out of scope for this phase:**

- No persistence of the query across navigation.
- No filtering by anything other than material name.
- No "show only unfilled" / "show only changed" toggle (potential future work — see below).

---

## Future Work (explicitly deferred, not in this PRD)

These have been raised in discussion but are **not** part of the work above. They are listed here so reviewers can see they were considered and intentionally pushed out.

- **"Show only unfilled" toggle** — a switch to hide rows whose `currentStock` is still at its initial value, so staff can see their remaining work. Useful, but adds a second filtering dimension and a definition of "initial" that differs between Create (always `0`) and Edit (the previously-saved value).
- **Group by category / supplier** — would let staff walk the shelves in the order they're physically arranged. Requires a `category` field on `materials` (does not exist today) or a stable ordering convention. Out of scope until the data model supports it.
- **Persistent search across navigation** — would survive accidental back-button presses. Adds state-management surface for marginal benefit; revisit if staff actually report losing their place.
- **Barcode / QR scan to jump to a row** — the natural endgame of "find the material on the form." Requires hardware and a separate UX. Tracked separately.
