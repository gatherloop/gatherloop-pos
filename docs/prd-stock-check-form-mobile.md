# PRD: Stock Check Form — Mobile (Small Screen) Layout

**Status:** Proposed
**Scope:** `libs/ui` presentation layer only — shared by `apps/web` (Next.js) and `apps/mobile` (React Native/Expo)
**Affected flows:** Create Stock Check (`/stock-checks/create`), Edit Stock Check (`/stock-checks/{id}`)
**Builds on:** `docs/prd-stock-check-form-ux.md` (row layout + search filter), `docs/prd-stock-check-required-fields.md` (nullable `currentStock`, pending rows), `docs/prd-transaction-form-mobile.md` (the `useIsCompactLayout` pattern this PRD reuses)

---

## Problem Statement

`StockCheckFormView` renders one row per material as a **single horizontal line** built for a desktop viewport:

```tsx
<XStack gap="$2" paddingHorizontal="$4">          // libs/ui/.../StockCheckFormView.tsx:162
  <Label flex={1} numberOfLines={1}>{name}</Label>
  <YStack><InputNumber width={100} /></YStack>     // ⊖ + <Input> + ⊕
  <SizableText width={60}>{purchaseUnit}</SizableText>
  <XStack width={60}>{pending && <Badge/>}</XStack>
</XStack>
```

There is **no responsive branching**. On a 360dp phone the row is asked to fit more than it has, and flexbox resolves that by crushing whatever can shrink — the material name and the number input. The horizontal budget:

| Consumer | Width |
|---|---|
| Viewport | 360 |
| − `Layout`'s `padding="$5"` × 2 (`Layout.tsx:31`) | −40 → **320** |
| − row `paddingHorizontal="$4"` × 2 + `borderWidth` × 2 | −34 → **286 usable** |
| Row gaps: `gap="$2"` × 3 | 24 |
| `InputNumber` intrinsic (⊖ `size="$2"` ≈28 + gap 8 + `Input width={100}` + gap 8 + ⊕ ≈28) | 172 |
| `purchaseUnit` fixed column | 60 |
| Pending-badge fixed column | 60 |
| **Fixed demand before the name gets anything** | **316** |

316 > 286, so the two `flex`-shrinkable children absorb the overflow. That is precisely what the reported screenshot shows:

- **Material name** collapses to ~60dp — `Botol …`, `Baking…`, `Extrac…`. Every name is unreadable, and the name is the *only* thing that tells staff which row they are typing into.
- **The number input** collapses to ~30dp — wide enough for roughly one glyph. A value of `12` renders as a clipped `!`/`;`. Staff cannot read back what they just entered.
- **The unit** wraps to two lines (`Dus (24` / `Pcs)`), inflating row height while its 60dp column is simultaneously too narrow.
- **The pending badge** reserves 60dp on *every* row — including the 82 rows that are not pending — purely to be empty.
- **Touch targets** are `size="$2"` circular buttons (≈28dp), below the 44dp minimum, sitting 8dp apart.

Secondary problems, all specific to the mobile surface:

5. **The sticky search header is web-only.** `StockCheckFormView.tsx:96-106` sets `position="sticky"` behind a `@ts-expect-error`. React Native has no sticky positioning, so on `apps/mobile` the search box scrolls away and never comes back — on a list of 82 materials.
6. **"Jump to the first pending row" is web-only.** `handleSubmit` (`:64-82`) calls `rowRefs.current[i].scrollIntoView()` and `.querySelector('input')` — both DOM APIs. On native, submitting an incomplete form flips the pending filter on and then does nothing visible.
7. **Submit is unreachable.** The Submit button is the last child after all 82 rows. To submit, staff scroll the entire list. There is no persistent action affordance.
8. **The wrong keyboard opens.** `InputNumber` never sets `keyboardType`/`inputMode`, so tapping a stock field raises the full alphabetic keyboard on both web and native.

The desktop layout is fine and is not the problem. The fix is a **second, compact layout for small screens** driven off the same component tree, the same form state, and the same usecases — exactly the pattern already established by `docs/prd-transaction-form-mobile.md`.

### Goals

- On a phone, the **material name is fully readable** (up to two lines, no mid-word truncation at 60dp).
- The **entered number is fully readable** at a glance, with ≥44dp `−`/`+` touch targets.
- The **unit** renders on one line.
- The search/filter header stays pinned **on React Native as well as web**.
- Submit is reachable **without scrolling to the bottom** of an 82-row list.
- **Zero visual or behavioural change at ≥801px.**
- One shared implementation for web and React Native — no `Platform.OS` branching for layout.

### Non-Goals

- No change to the stock-check API contract, the Zod schema (`StockCheckUpdateController.tsx:10-24`), the usecases, or the state machines.
- No redesign of the desktop row, the search semantics, the pending filter semantics, or the `filled / total` counter — beyond where they are *placed* on compact.
- No virtualisation / windowing of the material list (see Future Work).
- No change to `StockCheckList`, `StockCheckListItem`, or the stock-check detail/delete flows.
- No new "save draft", offline, or resume-later behaviour.
- No barcode scanning, no grouping by category/supplier (already deferred by `prd-stock-check-form-ux.md`).

---

## Context: The Existing System

### Files that matter

| File | Role |
|---|---|
| `libs/ui/src/presentation/components/stockChecks/StockCheckFormView.tsx` | The whole form: error banners, the sticky search/filter header, the `filled / total` counter, the row list (`useFieldArray` over `items`), the empty-search state, and the Submit button. **This is the only component that renders a stock-check row today.** |
| `libs/ui/src/presentation/screens/StockCheckCreateScreen.tsx` / `StockCheckUpdateScreen.tsx` | Wrap `StockCheckFormView` in `Layout` + a single `ScrollView`. Identical apart from the title. |
| `libs/ui/src/presentation/screens/StockCheckCreateHandler.tsx` / `StockCheckUpdateHandler.tsx` | Wire controller → screen props (`query`, `showOnlyPending`, `filled`, `total`, `pendingRows`, …). |
| `libs/ui/src/presentation/controllers/StockCheckCreateController.tsx` / `StockCheckUpdateController.tsx` | `react-hook-form` + Zod, `query`/`showOnlyPending` local state, and the derived `filled` / `total` / `pendingRows` from `useWatch`. |
| `libs/ui/src/presentation/components/base/Form/InputNumber.tsx` | The `⊖ [input] ⊕` stepper. `width` is forwarded onto the inner `<Input>` (which also carries `flex={1}`), **not** onto the wrapping `XStack` — this is why the input shrinks below its declared 100dp. |
| `libs/ui/src/presentation/components/base/useIsCompactLayout.ts` | `media.sm === true` → compact. Already shipped for the transaction form; `undefined` (SSR first paint, Jest mock) means desktop. |
| `libs/ui/src/presentation/components/base/FloatingCartButton.tsx` | **Precedent** for a pinned bottom action bar with a web `env(safe-area-inset-bottom)` / native fallback split. Visual reference for the compact submit bar (FR-5). |
| `libs/ui/src/presentation/components/base/Layout.tsx` | `padding="$5"` on the content well — 40dp of the 360dp viewport, on every screen. |

### What already works and must keep working

- **Filtering is visual, never structural.** Rows are hidden with `display: 'none'`; every `<Controller>` stays mounted so no entered value is lost. Both the search query and the pending filter work this way (`:155-170`). Any layout change must preserve this.
- **`currentStock` is nullable.** `null` = "not counted yet" → the row is *pending*, gets a `$yellow3` background, and the input shows a `—` placeholder. After a failed submit, pending rows go `$red3` and grow an inline error. `filled / total` and the pending count derive from this.
- **Submitting with pending rows** clears the search, force-enables the pending filter, and (on web) scrolls/focuses the first pending row.

### Responsive precedent

`useIsCompactLayout()` (`media.sm`, ≤800px) is the established JS-level layout branch; `Sidebar.state.tsx` uses `media.xs` for its own concern. Static Tamagui props (`$sm={{ … }}`) are used everywhere else. **This PRD prefers static `$sm` props for anything that is purely a style change, and uses `useIsCompactLayout()` only where the tree itself must differ** (a second line, a pinned bar, a different container).

### Constraint: the Jest Tamagui mock

`libs/ui/src/__mocks__/tamagui.tsx` returns an overridable `useMedia()`. Because `useIsCompactLayout` tests `media.sm === true`, unmocked tests render the **desktop** branch — existing stock-check tests keep passing with no edits, and compact-branch tests opt in explicitly. Note that static `$sm` props are *inert* under the mock, so any behaviour that must be asserted in a unit test has to go through the hook, not through a style prop.

### Constraint: `numberOfLines` on Tamagui `Label`

Today's row uses `numberOfLines={1}`, which maps to `-webkit-line-clamp` on web and `numberOfLines` on RN. Two-line clamping (`numberOfLines={2}`) must be verified on **both** platforms in Phase 2; if RN clamps but web does not (or vice versa), fix it in the row component, not per-platform.

---

## Target UX

### Compact (≤ 800px) — the row

```
┌──────────────────────────────────────────────────┐
│ Botol Kaca Bening 250 ml              [Pending]  │  line 1: name (≤2 lines) + badge
│ Dus (24 Pcs)              ⊖   [  12  ]   ⊕       │  line 2: unit + stepper
└──────────────────────────────────────────────────┘
```

Budget after the compact changes, at 360dp:

| | Today | Compact |
|---|---|---|
| Screen padding (`Layout`, ×2) | 40 | 24 (`$3`) |
| Row padding + border (×2) | 34 | 26 (`$3`) |
| **Usable row width** | **286** | **310** |
| Material name | ~60 (1 line) | **310** (up to 2 lines) |
| Number input | ~30 | **≥72** |
| `−` / `+` targets | ≈28 | **44** |
| Unit | 60, wraps to 2 lines | ~150, one line |
| Empty badge column on non-pending rows | 60 | 0 |

Row height grows from ≈76dp to ≈92dp (+21%) because of the second line; `paddingVertical` drops `$3 → $2` on compact to claw part of that back. This is an accepted trade — see Risks.

### Compact — the screen

```
┌────────────────────────────┐
│ ←  Edit Stock Check     ⋮  │  Navbar
├────────────────────────────┤
│ ┌──────────────────┐ ┌─┐┌─┐│  pinned header (outside the ScrollView)
│ │ Search material… │ │✕││▼││
│ └──────────────────┘ └─┘└─┘│
│ 41 / 82 materials checked  │
├────────────────────────────┤
│ ┌────────────────────────┐ │
│ │ Botol Kaca Bening…     │ │
│ │ Dus (24 Pcs)  ⊖ [12] ⊕ │ │  scrolls INSIDE this region
│ ├────────────────────────┤ │
│ │ Baking Soda   [Pending]│ │
│ │ PCS (15 Gram) ⊖ [ — ] ⊕│ │
│ └────────────────────────┘ │
├────────────────────────────┤
│ [        Submit         ]  │  pinned footer, above safe-area inset
└────────────────────────────┘
```

### Large screens (≥ 801px) — unchanged

```
XStack: [ name — flex 1 ] [ ⊖ input ⊕ ] [ unit 60 ] [ badge 60 ]
```
Pixel-identical to today, including the sticky (web) search header and the inline Submit button at the end of the list.

---

## Confirmed Product & Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Breakpoint for "compact" | **`useIsCompactLayout()` (`media.sm`, ≤800px)** | Reuses the hook shipped for the transaction form. One breakpoint definition for the whole app. |
| Behaviour when media flags are `undefined` | **Desktop** | Unchanged from the hook's existing contract; keeps every current stock-check test green without edits. |
| Compact row shape | **Two lines**: name (+ badge) on top, unit + stepper below | The only arrangement that gives the name the full row width *and* the input a readable size, without hiding either behind a tap. |
| Name truncation on compact | `numberOfLines={2}` with ellipsis | Two lines cover essentially every material name in the current data set; unbounded wrapping would make row heights jump around and hurt scanning. |
| Where the unit goes | **Line 2, left, muted, `flex: 1`** — no fixed width | The unit is context for the number, so it belongs next to the number, and its content length varies (`PCS` vs `PCS (250 Gram)`). |
| Pending badge on compact | **Line 1, right, rendered only when pending** — no reserved column | 41 of 82 rows reserving 60dp for nothing is the single cheapest width to reclaim. The row's `$yellow3`/`$red3` background already carries the state; the badge is reinforcement. |
| Number input sizing | `InputNumber` gains an explicit **`minWidth`** on the inner `Input` (compact: 72) | `width` alone loses to `flex: 1` under pressure — that is the current bug. `minWidth` is what actually holds the floor. |
| Touch targets on compact | `−`/`+` at **`size="$3"` with `minWidth`/`minHeight` 44** | WCAG 2.5.8 / platform HIG minimum. Today's 28dp buttons 8dp apart are a mis-tap generator when staff are holding a physical item in the other hand. |
| Keyboard type | `inputMode="numeric"` (web) + `keyboardType="number-pad"` (native) on `InputNumber` | Applies to *every* `InputNumber` in the app, not just stock check — a strict improvement, but it must be regression-checked against the decimal fields (`fractionDigit > 0` gets `decimal`/`decimal-pad`). |
| Search header pinning | **Move the header out of the `ScrollView`** into the screen, above it | `position: sticky` is web-only and already carries a `@ts-expect-error`. Rendering the header as a sibling above the scroll region pins it on both platforms with no platform branch. |
| Submit on compact | **Pinned bottom bar**, styled like `FloatingCartButton` | 82 rows is ~7,500dp of scrolling to reach the button. Desktop keeps the inline button. |
| Scroll-to-first-pending | Replaced with a **cross-platform** mechanism (`ScrollView` ref + `measureLayout`, or index-based scroll) | `scrollIntoView`/`querySelector` are DOM-only; on native the feature silently does nothing today. |
| Screen padding on compact | `Layout` content well drops `$5 → $3` at `$sm` | 40dp of a 360dp viewport is 11% of the screen. This is a **global** chrome change and gets its own phase with an explicit sweep of every screen. |
| List `maxWidth={640}` | Kept as-is | It is already a no-op below 640dp; removing it would change desktop. |
| React Native parity | Same components, same hook — `useMedia()` reads `Dimensions` on native | A phone is compact; a landscape tablet >800dp gets the desktop row. No `Platform.OS` layout branches. |

### Core Rules

1. **The form state is untouched by layout.** `form`, the `items` field array, and every controller handler pass through unchanged. Crossing the breakpoint (rotating a tablet) MUST NOT reset, remount-clear, or drop any entered value — including `null`s, which are semantically distinct from `0`.
2. **Filtering stays visual.** Rows are hidden with `display: 'none'`; no row is ever removed from `fields`. Neither layout may unmount a row's `<Controller>`.
3. **One row component.** Desktop and compact render the *same* `StockCheckItemRow`, which branches internally. No duplicated row JSX, no per-layout copies of the pending/error styling.
4. **Desktop rendering is byte-for-byte unchanged.** Any PR in this plan that alters output at ≥801px is a bug in that PR.
5. **No `Platform.OS` for layout.** Platform splits are allowed only for genuinely platform-specific primitives (safe-area insets, keyboard type), and only inside `base/` components.
6. **Accessibility:** the name `Label` stays programmatically associated with its input (`htmlFor` / `aria-labelledby`); the `−`/`+` buttons keep accessible names that identify the material; the pending state is conveyed by text, not colour alone.

---

## Feature Requirements

### FR-1 — Extract `StockCheckItemRow`

Move the per-row markup out of `StockCheckFormView` into its own component, with **no behavioural or visual change**.

- New file: `libs/ui/src/presentation/components/stockChecks/StockCheckItemRow.tsx`, exported from `stockChecks/index.ts`.
- Props: `materialName`, `purchaseUnit`, `fieldName` (e.g. `items.3.currentStock`), `inputId`, `isPending`, `isErrorRow`, `hidden`, and a `ref`/callback for the scroll-into-view mechanism.
- It renders exactly what the row renders today: the `Label`, the `InputNumber`, the inline "Please enter the current stock" error, the unit text, the pending badge, and the `$yellow3`/`$red3` backgrounds.
- `StockCheckFormView` maps `fields` onto it and keeps owning the header, the counter, the empty state, and Submit.

### FR-2 — Compact row layout

`StockCheckItemRow` branches on `useIsCompactLayout()`.

**Compact:**
- Outer container is a `YStack` with `gap="$1"` and `paddingVertical="$2"`, `paddingHorizontal="$3"`.
- **Line 1** — `XStack`: the `Label` with `flex={1}`, `numberOfLines={2}`, and a font size no smaller than today's; the pending badge on the right, rendered **only** when `isPending`.
- **Line 2** — `XStack alignItems="center"`: the unit `SizableText` with `flex={1}`, `numberOfLines={1}`, muted colour; then the `InputNumber` group right-aligned.
- The inline validation error renders under line 2, full width.
- `−`/`+` are ≥44×44dp; the input is ≥72dp wide and centre-aligned.

**Desktop:** the current single-line `XStack`, unchanged.

The `hidden` / `display: 'none'` behaviour, the background tints, and the a11y association are identical in both branches.

### FR-3 — `InputNumber` sizing and keyboard

Changes to the shared `base/Form/InputNumber.tsx`. These affect **every** `InputNumber` consumer, so each needs a regression sweep.

- Add an optional `minWidth` that lands on the inner `<Input>`, so a declared width is not shrunk away by `flex: 1` under pressure. (Alternatively, stop putting `flex={1}` and a fixed `width` on the same element — pick one and document it.)
- Add an optional `size` (or `buttonSize`) so callers can request larger stepper buttons; default keeps today's `$2` so no existing caller changes.
- Set `inputMode`/`keyboardType` from `fractionDigit`: `numeric` / `number-pad` when `fractionDigit === 0`, `decimal` / `decimal-pad` otherwise. Allow a caller override.
- Existing `InputNumber` stories and tests must pass unmodified; add stories for the new props.

### FR-4 — Pinned search + progress header (both platforms)

- The search input, the clear button, the pending-filter button, and the `filled / total` counter move out of the scrolled content into a header region rendered **above** the `ScrollView` by `StockCheckCreateScreen` / `StockCheckUpdateScreen` (or by a `StockCheckFormView` that owns a bounded scroll region — choose one and apply it to both screens identically).
- The `position: 'sticky'` prop and its `@ts-expect-error` are deleted.
- On compact the search input takes the full row width; the clear and filter buttons are ≥44dp.
- Desktop keeps the same visual result it has today (header pinned below the navbar, content scrolling beneath it).
- The scrolled region must have a bounded height (`flex: 1`) rather than being one long document, so the header cannot be pushed off-screen.

### FR-5 — Pinned Submit bar on compact

- On compact, Submit renders in a pinned bottom bar over the list, styled like `FloatingCartButton` (background, top border, `env(safe-area-inset-bottom)` on web / fixed padding on native), with a ≥44dp target.
- It shows the same `disabled` / `Spinner` semantics as today's button.
- The scroll region gets bottom padding so the last row is never covered by the bar.
- Consider surfacing remaining work on the button or beside it (e.g. `Submit · 41 left`) — decide visually in this phase; if it complicates the label, ship the plain `Submit`.
- Desktop keeps the inline button after the list, unchanged.

### FR-6 — Cross-platform "jump to first pending"

- Replace `scrollIntoView` + `querySelector('input')` with a mechanism that works on web and React Native: a `ScrollView` ref plus per-row `onLayout` offsets (or `measureLayout`), and a `focus()` call routed through a ref that `InputNumber` forwards.
- Behaviour is unchanged from today's web behaviour: on submit with pending rows, clear the query, enable the pending filter, scroll the first pending row into view, and focus its input.
- Because rows are hidden with `display: 'none'` rather than unmounted, the offset used for scrolling must be recomputed **after** the filter is applied, not from a stale pre-filter layout.
- Verified on a real device/simulator, not only in Jest.

### FR-7 — Compact screen chrome

- `Layout`'s content well becomes responsive: `padding="$5"` with `$sm={{ padding: '$3' }}` (or an explicit prop if a global change proves too risky).
- Every screen is swept at 360dp, 390dp and 430dp for regressions — lists, forms, dashboards, the order app's screens.
- Desktop padding is unchanged.

### FR-8 — Test, story and E2E coverage

- Storybook stories for `StockCheckItemRow` in both layouts × (filled / pending / error) states, and for `StockCheckFormView` compact with a long material name.
- Unit tests (RTL, `libs/ui`) driving the compact branch through the overridable `useMedia` mock: name renders un-truncated across two lines; unit and stepper share line 2; the badge is absent on non-pending rows; the pinned Submit is present on compact and the inline one is not.
- A value-preservation test: enter a value, switch the search query, toggle the pending filter, clear both — `form.getValues()` is byte-identical, `null`s still `null`.
- A Playwright spec at a phone viewport (390×844) mirroring `transactions.mobile.spec.ts` and `rentals.checkin.mobile.spec.ts`: open Edit → search a material → type a count → the counter increments → submit from the pinned bar.
- Existing desktop specs must pass unmodified.

---

## Non-Functional Requirements

- **No new dependencies.** Tamagui, `react-hook-form` and `react-native-safe-area-context` cover everything.
- **No API, schema, usecase or controller-state changes.** If a phase finds itself editing `libs/ui/src/domain` or the Zod schema, the design has drifted.
- **No regression in list rendering cost.** 82 rows stay mounted (required by rule 2). The compact row adds one `XStack` per row; if that measurably hurts low-end Android, the answer is virtualisation as a separate piece of work — not unmounting rows.
- **Web and native from one source.** Any native-only fix goes into `base/`, not into the stock-check feature.
- **SSR safety (web).** The Next.js server render must not crash; the first client paint may flip from desktop to compact on a phone — see Risks.

---

## Success Metrics

- At 360dp, the material name renders at **≥ 280dp** (from ~60dp) and no name is truncated mid-word within the first two lines.
- At 360dp, a three-digit count is **fully legible** in the input without horizontal scrolling.
- `−`/`+` targets are **≥44dp** on compact.
- The unit renders on **one line** for every unit string in the current material set.
- Taps to submit from anywhere in the list: **1** (from ~10 scroll gestures + 1 tap).
- The search header is visible at **every** scroll position on React Native.
- Desktop unit and E2E suites green with **zero edits**.

---

## Implementation Phases

Six self-contained PRs. Each ships with its own tests/stories and leaves `main` working on **both** layouts. Phase 1 is pure groundwork; Phase 2 is the first user-visible change and the one that closes the reported bug.

### Phase 1 — Extract `StockCheckItemRow` (FR-1)

**Files:**
- `libs/ui/src/presentation/components/stockChecks/StockCheckItemRow.tsx` (new)
- `libs/ui/src/presentation/components/stockChecks/StockCheckItemRow.stories.tsx` (new)
- `libs/ui/src/presentation/components/stockChecks/StockCheckFormView.tsx` (render the extracted row)
- `libs/ui/src/presentation/components/stockChecks/index.ts`

**Acceptance:**
- Pure refactor: the rendered tree is equivalent before and after at every viewport, verified by story snapshots and the existing stock-check tests passing untouched.
- The row owns all four visual states (normal, pending, submitted-error, hidden) and nothing else moves.
- No new props threaded through the screens or handlers.

**Out of scope:** any layout change, `useIsCompactLayout` usage.

---

### Phase 2 — Compact row layout (FR-2, FR-3)

**The core PR — this is what fixes the screenshot.** It bundles the `InputNumber` sizing work because the two-line row is not readable without it.

**Files:**
- `libs/ui/src/presentation/components/base/Form/InputNumber.tsx` (`minWidth`, button size, `inputMode`/`keyboardType`)
- `libs/ui/src/presentation/components/base/Form/InputNumber.stories.tsx`
- `libs/ui/src/presentation/components/stockChecks/StockCheckItemRow.tsx` (the branch)
- Tests + stories for both layouts

**Acceptance:**
- At 360dp, 390dp and 430dp: the name occupies the full row width across up to two lines; the unit is on one line; a three-digit value is fully visible; `−`/`+` measure ≥44dp.
- The pending badge is rendered only on pending rows; non-pending rows reserve no space for it.
- Pending/error backgrounds and the inline error message are unchanged in meaning and still present on compact.
- Tapping the input raises a numeric keypad on web and on native.
- `numberOfLines={2}` clamps identically on web and React Native (verified on a device/simulator, not only in Jest).
- Every other `InputNumber` in the app is visually unchanged — sweep transactions, expenses, purchases, rentals, products.
- Desktop stock-check rows are byte-for-byte unchanged.

**Out of scope:** the pinned header (Phase 3), the pinned Submit (Phase 4), screen padding (Phase 5).

---

### Phase 3 — Pinned search + progress header (FR-4)

**Files:**
- `libs/ui/src/presentation/components/stockChecks/StockCheckFormView.tsx` (header extracted / scroll region bounded)
- `libs/ui/src/presentation/screens/StockCheckCreateScreen.tsx`, `StockCheckUpdateScreen.tsx` (header above the `ScrollView`, `flex: 1` scroll region)
- Tests

**Acceptance:**
- On React Native, scrolling to material #82 leaves the search input and the `filled / total` counter visible.
- The `position: 'sticky'` prop and its `@ts-expect-error` are gone from the codebase.
- On compact, the search input spans the row; clear and filter buttons are ≥44dp.
- Desktop: the header still pins below the navbar and the list still scrolls under it; no visual diff.
- Both Create and Edit get the change from one shared implementation — no per-screen duplication.

---

### Phase 4 — Pinned Submit bar + cross-platform pending jump (FR-5, FR-6)

These ship together: the pinned bar changes where the "you still have N pending" feedback lands, and the jump mechanism is what makes that feedback actionable.

**Files:**
- `libs/ui/src/presentation/components/stockChecks/StockCheckFormView.tsx` (the compact footer, the scroll/focus mechanism)
- `libs/ui/src/presentation/components/stockChecks/StockCheckItemRow.tsx` (`onLayout` offset reporting, forwarded input ref)
- `libs/ui/src/presentation/components/base/Form/InputNumber.tsx` (forward a ref to the inner `Input`)
- Possibly a small shared `PinnedActionBar` in `base/`, generalised from `FloatingCartButton`
- Tests

**Acceptance:**
- Compact: Submit is reachable at any scroll position; the last row is never covered by the bar.
- Compact: submitting with pending rows clears the search, enables the pending filter, scrolls the first pending row into view and focuses its input — **on React Native as well as web**.
- The scroll offset is correct after the filter has been applied (no stale pre-filter position).
- The error banner (`N materials still need a stock count`) remains visible after the jump.
- Desktop: the inline Submit and the existing web scroll/focus behaviour are unchanged.

---

### Phase 5 — Compact screen chrome (FR-7)

Deliberately last and deliberately separate: it is a one-line change with an app-wide blast radius.

**Files:**
- `libs/ui/src/presentation/components/base/Layout.tsx`
- Screenshots / stories for the affected screens

**Acceptance:**
- At `$sm`, the content well uses `$3` padding; at ≥801px it is still `$5`.
- Every screen rendered by `Layout` is checked at 360dp, 390dp and 430dp — no clipped content, no double padding where a child already pads itself, no regression in the order app.
- Desktop is unchanged everywhere.

**Rollback plan:** if the sweep turns up regressions that are not cheap to fix, convert the change to an opt-in `Layout` prop used only by the two stock-check screens, and note the leftover screens as follow-up.

---

### Phase 6 — Mobile E2E coverage (FR-8)

**Files:**
- `apps/web-e2e/src/stock-checks.mobile.spec.ts` (new)
- `apps/web-e2e/src/utils/selectors.ts` (row, stepper, pinned-submit selectors)

**Acceptance:**
- The compact happy path passes headless in CI at 390×844: open Edit → search → enter a count via the input and via `+` → counter increments → submit from the pinned bar → redirect to `/stock-checks`.
- A pending-path case: submit with a pending row → the banner appears, the filter engages, and the first pending row is on screen.
- The spec cleans up after itself the way `transactions.mobile.spec.ts` does (the suite runs `workers: 1` against a shared DB) and does not push CI past its current budget.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Two-line rows lengthen the list ~21%** on an 82-material form. | More scrolling per pass. | `paddingVertical` drops to `$2` on compact; the search + pending filter (already shipped) are the real navigation tools, and Phase 3 makes them permanently reachable. Measure after Phase 2; if it still bites, revisit density before adding virtualisation. |
| **`InputNumber` is used app-wide**; changing sizing/keyboard could regress other forms. | Silent visual or input-mode breakage far from stock check. | New props are additive with today's values as defaults; Phase 2 acceptance includes an explicit sweep of every consumer, and the decimal-field keyboard case is called out by name. |
| **`Layout` padding is app-wide.** | Cramped or clipped screens elsewhere. | Isolated into its own last phase with a full screen sweep and a documented rollback to an opt-in prop. |
| **SSR/hydration flash on web.** `useMedia()` resolves client-side, so a phone may paint the desktop row for one frame. | Brief flicker. | Same accepted trade-off as the transaction form PRD. Do not "fix" it by defaulting to compact — that flips the flash onto desktop, the more common POS surface. |
| **`numberOfLines={2}` behaves differently on web vs RN.** | Names clipped on one platform, unbounded on the other. | Verified on a device/simulator in Phase 2 and fixed inside the row component; never with a `Platform.OS` branch in feature code. |
| **Moving the header out of the `ScrollView` changes the scroll container**, which the pending-jump code depends on. | Scroll-to-row silently breaks between Phase 3 and Phase 4. | Phase 3 acceptance re-verifies the existing web jump behaviour; Phase 4 then replaces the mechanism with the cross-platform one. |
| **Pinned bottom bar vs. the software keyboard** on native. | The bar sits on top of the keyboard, or covers the focused row. | Phase 4 verifies keyboard-avoiding behaviour on device; if the bar cannot be made to behave, hide it while the keyboard is up and fall back to the inline button. |
| **Compact tests are inert under static `$sm` props.** | Layout regressions that unit tests cannot catch. | Anything asserted in tests goes through `useIsCompactLayout()`; purely cosmetic differences are covered by stories/screenshots instead. |

---

## Open Questions

1. **Does the compact Submit bar show remaining work** (`Submit · 41 left`) or stay plain? Decide visually in Phase 4; a busy label on a narrow bar may read worse than the counter already pinned in the header.
2. **Where does the `filled / total` counter live on compact** — in the pinned header (always visible, costs a line) or on the Submit bar (free, but far from the search)? Current lean: the header, matching desktop. Settle in Phase 3.
3. **Two lines or three for very long names?** Two covers today's data. If the material catalogue grows names beyond that, consider a tap-to-expand rather than a third line.
4. **Should the compact row show the previous count** (Edit flow) as context under the name? Genuinely useful for spotting a mis-key, but it is a data addition, not a layout fix — currently out of scope.

---

## Future Work (explicitly deferred)

- **Virtualisation** of the material list (`FlatList` / windowing). Blocked by rule 2: `react-hook-form` rows must stay mounted, so this needs a different value-preservation strategy first.
- **Section grouping** by category or supplier so staff can walk the shelves in physical order — already deferred by `prd-stock-check-form-ux.md`, still blocked on the data model.
- **Swipe gestures** on a row (mark counted / skip) as a faster alternative to the stepper.
- **Barcode scan to jump to a row** — the natural endgame of "find the material on the form".
- **Persisting an in-progress count** across accidental navigation or app backgrounding, so an interrupted 82-material walk is not lost.
- **Sharing the pinned action bar** between this form, `FloatingCartButton` and the order app's `CartBar` as one `base/` primitive.
