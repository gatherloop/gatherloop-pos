# PRD: Stock Check Form — Require Every Material to Be Counted

## Problem Statement

When a staff member opens `/stock-checks/create`, the form is pre-seeded with one row per active material and **every row's `currentStock` defaults to `0`**. The submit button is enabled immediately because `0` is a valid value under the current Zod schema (`z.number().int().min(0)`).

The practical failure mode this enables:

> Staff member walks the shelves, fills the count for 23 of 25 materials, gets distracted, presses Submit. The two skipped materials are silently recorded as having a stock of **zero** — indistinguishable from "we ran out". Downstream reports treat those materials as out-of-stock, purchase recommendations get pushed, and the actual physical inventory is mis-stated until the next stock check (which may be a week or a month away).

The form gives the staff no way to tell, at a glance, **which rows they've actually touched** vs which rows are still at the seed value. Because the seed value (`0`) is a legal real-world value, there is no signal — visual or programmatic — that distinguishes "I counted it and there were zero" from "I forgot to count it".

This affects the **Create** flow only. The **Edit** flow loads previously-saved values, so every row already has a deliberate, staff-entered number — there is no "untouched seed value" to disambiguate.

---

## Context: Existing System

- **Shared form component**: `libs/ui/src/presentation/components/stockChecks/StockCheckFormView.tsx`. Uses `react-hook-form` + `useFieldArray` (`name: 'items'`). Each item: `{ materialId, materialName, purchaseUnit, currentStock }`.
- **Form entity**: `libs/ui/src/domain/entities/StockCheck.ts` defines `StockCheckItemForm.currentStock: number`. Both Create and Edit consume this same shape.
- **Validation schema**: Defined inline in `libs/ui/src/presentation/controllers/StockCheckCreateController.tsx` (and a duplicate in `StockCheckUpdateController.tsx`):
  ```ts
  currentStock: z.number().int().min(0)
  ```
  This treats `0` as fully valid, which is correct for Edit and wrong for Create.
- **Create seeding**: `apps/web/src/pages/stock-checks/create.tsx` maps every active material to `{ ..., currentStock: 0 }` server-side via `getServerSideProps`.
- **Edit seeding**: `apps/web/src/pages/stock-checks/[id]/edit.tsx` loads `stockCheck.items` as-is from the API. Each item already has a staff-entered value.
- **Number input component**: `libs/ui/src/presentation/components/base/Form/InputNumber.tsx` renders a `tamagui` `Input` plus `+` / `−` buttons. Critical behaviors today:
  - `onChangeText`: empty string is coerced to `min ?? 0`.
  - `value` rendering: `parseFloat(field.value).toFixed(fractionDigit)` — this produces `"NaN"` if `field.value` is `null`/`undefined`. **This component will need to handle a nullable value cleanly.**
- **Existing search filter** (already shipped, see `prd-stock-check-form-ux.md`): a sticky search input at the top of the form hides non-matching rows via `display: 'none'`. Rows stay mounted; the filter is purely visual. Any "show only pending" idea introduced here must compose with this existing filter, not replace it.
- **`FormErrorBanner`**: Already used in `StockCheckFormView` to surface `serverError`. We can re-use it for client-side blocking messages.

---

## Proposed Solution

Replace the "everyone starts at zero" seed with an **explicit pending state** that the staff must resolve before submit.

Concretely:

1. The Create seed becomes `currentStock: null` instead of `currentStock: 0`.
2. The schema rejects `null` — every item must have a number to pass validation.
3. Pending rows are **visually flagged** with an amber/warning tint and a "Pending" badge — not red. Red is reserved for actual post-submit-attempt errors, so the staff can distinguish "I haven't gotten to this yet" from "I tried to submit and this is wrong".
4. A **progress counter** at the top of the form (`"12 / 25 materials checked"`) and a **"Show only pending"** toggle let the staff see remaining work and jump straight to it.
5. **Submit is blocked** while any rows are pending. Pressing Submit with pending rows clears the search filter, switches on "Show only pending", scrolls to the first pending row, and surfaces a banner naming the count.

### Why amber-for-pending instead of red-for-pending

The user's first instinct ("red background for unfilled rows") is the right *direction* but the wrong *color*. The form has three distinct row states and they need three distinct visual treatments so the staff isn't desensitized to any of them:

| State | Meaning | Treatment |
|---|---|---|
| **Untouched / pending** | The staff hasn't entered a number yet. The seed value is `null`. | Subtle amber/warning background tint (`$yellow3` or similar). Small "Pending" badge to the right of the unit. |
| **Filled** | The staff has entered a number (including `0`, which now means "I confirmed zero stock"). | Default row appearance. No badge. |
| **Submit-blocked error** | The staff pressed Submit and this row is the reason it failed (either still pending, or fails another rule like a negative number). | Red background tint + red border on the input + error text under the input. |

If we use red for "pending", then by the time the staff gets to a row that *actually* has an error after pressing Submit, every untouched row already looks alarming and they tune the color out.

### Why null and not undefined or NaN

- `null` is JSON-serializable, survives a round-trip through `react-hook-form`'s state, and is trivially distinguishable from a real `0` in TypeScript narrowing.
- `undefined` would technically work but `useFieldArray` and `Controller` treat missing keys ambiguously; explicit `null` is less fragile.
- `NaN` would be a footgun — equality checks break, JSON serialization drops it.

### Confirmed Product Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Seed value (Create) | `null`, **not** `0` and **not** `undefined`. | Distinguishes "I confirmed zero stock" from "I haven't checked this yet". JSON-safe; survives RHF state. |
| Seed value (Edit) | Unchanged — uses the saved values from the API. | The Edit flow has no notion of "untouched"; every row already has a deliberate value. |
| Validation rule | `currentStock` must be a non-negative integer. `null` is **not** valid. The error message must read "Please enter the current stock". | The staff needs explicit feedback that this row is the blocker, not a generic "form is invalid". |
| Pending row indicator | Amber/yellow row background tint + "Pending" badge after the unit. **Not** red. | Distinguishes "not yet filled" (low urgency) from "this is wrong" (high urgency, post-submit). |
| Filled row indicator | No special treatment — looks like today's row. | Filled is the steady state; we want pending to stand out, not filled. |
| Error row indicator (post-submit) | Red background tint + red input border + inline error text under the input. | Strong, scannable signal. Restricted to the rows that actually failed, so it stays meaningful. |
| Progress counter | `"<filled> / <total> materials checked"` displayed near the sticky search header. Always visible (not only when nonzero). | Tells the staff at any moment what fraction is done. Coexists with the existing search filter's `<n>/<total>` counter — they answer different questions (filled-vs-total, matches-vs-total). |
| "Show only pending" filter | A small toggle button (or pill) next to the search input. When on, hides all rows whose `currentStock != null`. Composes with the search filter (AND-ed). | The staff's most common question once they're 80% done is "what's left?". A toggle is faster than scrolling. |
| Submit behavior with pending rows | Submit is **not disabled**, but pressing it short-circuits: clear search query, enable "Show only pending", scroll to the first pending row, and show a `FormErrorBanner` reading `"<n> materials still need a stock count"`. | A disabled button with no explanation is worse UX than a button that explains why it can't proceed. The `FormErrorBanner` pattern is already in the codebase. |
| Submit behavior with all rows filled | Behaves exactly as today — submits all items. | No regression for the happy path. |
| `InputNumber` behavior with `null` | Renders an **empty** input (no `"0"`, no `"NaN"`). The `+` button on a `null` value sets it to `0` (the staff's first interaction is treated as a fill). The `−` button is a no-op on `null`. | Empty input is the universal signal for "you haven't typed here yet". Tapping `+` is an explicit user action and is correctly treated as a fill. |
| Edit flow indicator behavior | No pending state — Edit rows are always filled. The progress counter and "Show only pending" toggle do not render on the Edit screen, or they render but always show `100%` / no pending rows. | Avoids visual noise on a flow that doesn't need it. |
| `currentStock` data type at the API boundary | Unchanged — the API still receives a `number`. Conversion happens at the form-submit boundary, after validation has guaranteed no `null` remains. | No API contract change. |

### Core Rules

1. **`null` never reaches the API.** The Zod schema rejects `null`, so a successful submit is guaranteed to have `number` everywhere. The `StockCheckCreateUsecase` and the repository signatures stay as they are today.
2. **Pending state is per-row and derived from `currentStock === null`** — not a separate field, not a separate state shape. One source of truth.
3. **The amber pending tint never appears after a successful row fill.** Typing a number (even `0`), pressing `+`, or any other change that sets `currentStock` to a real number must remove the tint immediately.
4. **The red error tint only appears after a submit attempt** — never on first render. We use `form.formState.isSubmitted` (or equivalent) to gate it.
5. **The existing search filter and the new "show only pending" toggle compose with AND**, not OR. A row is visible iff (matches search query) AND (passes pending toggle).
6. **No row is ever unmounted by either filter** — same constraint as the existing PRD. All rows stay registered with `react-hook-form`; visibility is `display: 'none'`.
7. **Edit flow is not regressed.** The progress counter and pending toggle either don't render on Edit, or render harmlessly (always 100%, no rows hidden). Either is acceptable; the implementation PR picks one.

---

## Feature Requirements

### FR-1: Nullable `currentStock` + schema enforcement

Make the absence-of-a-count an expressible state in the data model and reject it at validation time.

**Requirements:**

- Change `StockCheckItemForm.currentStock` in `libs/ui/src/domain/entities/StockCheck.ts` from `number` to `number | null`.
- Change the Create page seeding (`apps/web/src/pages/stock-checks/create.tsx`) to emit `currentStock: null` for every material.
- Edit page seeding is **unchanged** — it continues to load saved `number` values.
- Update the Zod schema in **both** `StockCheckCreateController.tsx` and `StockCheckUpdateController.tsx` so that `currentStock` is required to be a non-negative integer (i.e. `null` is rejected with a clear message). The Edit controller's behavior in practice is unchanged because Edit never has `null` values, but the schema is shared in spirit and kept consistent.
  - Suggested message: `"Please enter the current stock"`.
- The downstream `StockCheckCreateUsecase` / `StockCheckUpdateUsecase` and the API repository signatures stay at `number` — Zod guarantees no `null` slips through.

**Out of scope:**

- No visual changes in this phase. The form will function correctly (submit will fail with "Please enter the current stock" on pending rows) but won't look any different. The visuals come in FR-2.

### FR-2: `InputNumber` accepts a nullable value cleanly

`InputNumber` is shared by multiple forms (purchases, transactions, etc.). The nullable behavior must be **opt-in** so other call sites are unaffected.

**Requirements:**

- Add an `allowNull?: boolean` (default `false`) prop, or accept that `field.value` can be `null` and key behavior off the value itself. Either path is acceptable — the implementation PR picks one and documents it.
- When `field.value === null`:
  - The `<Input>` renders with empty text (no `"0"`, no `"NaN"`). A placeholder of `"—"` or similar is acceptable.
  - The `−` button is a no-op (or visibly disabled).
  - The `+` button sets the value to `0` (or `min` if `min` is defined and `> 0`). This is the first explicit fill — the row immediately transitions out of pending state.
- When the staff types into a `null` input and then **clears** the input (deletes all characters), the value goes back to `null` **only** when `allowNull` is on. For existing call sites (`allowNull` off / default), today's behavior is preserved: empty input → `min ?? 0`.
- All existing call sites of `InputNumber` keep their current behavior. Verified by manually testing the purchase create form, the transaction form, etc.

### FR-3: Pending row visual indicator + progress counter + "show only pending" toggle

The visible UX that lets the staff see what they've done and what's left.

**Requirements:**

- A row whose `currentStock === null` renders with:
  - A subtle amber background tint on the row's outer container (e.g. `backgroundColor: '$yellow3'`).
  - A small `"Pending"` badge (Tamagui `SizableText` with a yellow theme, or a `XStack` chip) placed after the unit text on the right side of the row.
- A row whose `currentStock` is a number (including `0`) renders exactly as it does today — no tint, no badge.
- Above the rows (just under the existing sticky search input), add a single line:
  `"<filled> / <total> materials checked"`.
  - `filled` = count of rows where `currentStock !== null`.
  - `total` = total row count (not the filtered count — the staff wants to know the *whole* job size).
  - Displayed on both Create and Edit, but on Edit it will always read `total / total`.
- Add a **"Show only pending"** toggle next to the search input. When on, all rows where `currentStock !== null` are hidden via `display: 'none'`. Composes with the search filter via AND.
  - On Edit, the toggle either doesn't render, or renders and is always a no-op (zero pending rows). Implementation PR's choice; document the choice.
- The toggle's on/off state is **local component state**, not persisted (consistent with the existing search filter).

### FR-4: Submit gating + error visibility for pending rows

When the staff presses Submit with pending rows present, fail loudly and helpfully — don't silently submit zeros, but also don't leave them staring at "Submit failed" with no next step.

**Requirements:**

- Pressing Submit with one or more pending rows must:
  1. Trigger Zod validation (which fails on the pending rows with the message from FR-1).
  2. Display a `FormErrorBanner` at the top reading `"<n> materials still need a stock count"`.
  3. Clear the search query (so a hidden pending row isn't trapped behind a filter).
  4. Switch the "Show only pending" toggle on.
  5. Scroll to / focus the first pending row's input.
- After a submit attempt, pending rows additionally get the **red error treatment**:
  - Red background tint (`$red3` or similar) replacing the amber.
  - Red border on the `InputNumber` (the component may need an `error?: boolean` prop, or this can be applied externally).
  - Inline error text under the input: `"Please enter the current stock"`.
- The moment the staff fills a previously-pending row after a submit attempt:
  - That row immediately drops the red treatment.
  - The `FormErrorBanner` count decrements live (or, simpler, re-runs validation on the next submit press — implementation PR picks one).
- A successful submit (all rows filled) behaves exactly as today — no banner, no scroll, no toggle change.

---

## Non-Functional Requirements

- **No new dependencies.** Tamagui + react-hook-form + zod already provide everything needed.
- **No API or schema changes at the boundary.** The API still receives `currentStock: number`. The `null` state exists only between form-mount and form-submit.
- **No regression to the Edit flow.** Verified by manually editing an existing stock check, changing one value, and submitting.
- **No regression to other forms that use `InputNumber`.** Verified by manually using the purchase create, transaction create, and any other form referencing `InputNumber`.
- **No measurable performance regression** on a 200-material list. Pending-state derivation is O(n) per render and is fine at this scale — do **not** memoize prematurely.
- **Shared component remains shared.** All changes live in `StockCheckFormView.tsx` (plus the entity type, the two controller schemas, the create page seeder, and the `InputNumber` enhancement). Both Create and Edit flows pick up the changes without per-screen duplication.
- **Accessibility:** The "Pending" badge must be announced by screen readers (it's just text, so this is free if we use `SizableText`). The red error state must include programmatically-associated error text, not just color (use Tamagui's form field error pattern or `aria-describedby`).

---

## Implementation Phases

Each phase is a self-contained, independently shippable PR. The recommended merge order is **Phase 1 → Phase 2 → Phase 3 → Phase 4**, because each phase builds on the previous one's foundation. Specifically:

- Phase 1 changes the data model and validation but leaves the UI alone. Shipping Phase 1 alone produces a working (if visually crude) "must fill every row" form — the staff would see a generic Zod error on submit. This is acceptable as an intermediate state.
- Phase 2 makes `InputNumber` correctly render the new `null` state. Without this, Phase 1 alone would show `"NaN"` in unfilled inputs.
- Phase 3 adds the pending visual indicators and progress counter — the polish layer.
- Phase 4 adds the submit-gating UX (banner, scroll, auto-toggle) and the post-submit red error treatment.

Phases 1 + 2 should ideally land together if reviewer bandwidth allows, since Phase 1 alone produces the `"NaN"` rendering bug. They are kept as separate phases here because they touch different files and have different review surfaces (`InputNumber` is a shared component; the schema change isn't).

### Phase 1 — Nullable `currentStock` + schema enforcement (FR-1)

**Files touched:**

- `libs/ui/src/domain/entities/StockCheck.ts` — change `currentStock: number` to `currentStock: number | null` on `StockCheckItemForm`.
- `libs/ui/src/presentation/controllers/StockCheckCreateController.tsx` — update Zod schema to reject `null` with the explicit message.
- `libs/ui/src/presentation/controllers/StockCheckUpdateController.tsx` — same schema change for parity (no behavioral difference on Edit since values are never `null` there).
- `apps/web/src/pages/stock-checks/create.tsx` — change the seed from `currentStock: 0` to `currentStock: null`.
- Anywhere else that constructs a `StockCheckItemForm` literal (search for `currentStock: 0` and `currentStock:` to be safe — mock files in `libs/ui/src/data/mock/` may need updates too).

**Acceptance:**

- Pressing Submit on a freshly-loaded Create form (no rows filled) results in a Zod error `"Please enter the current stock"` on every row. The form does **not** submit.
- Filling every row with any non-negative integer (including `0`) and pressing Submit produces a successful submit with the correct payload (verified by network tab or `form.getValues()`).
- The Edit flow continues to work end-to-end: loading an existing stock check, changing one value, pressing Submit — payload is correct.
- `currentStock: 0` no longer appears in the Create payload by default (only if the staff explicitly typed `0`).
- TypeScript builds clean.

**Known intermediate state:**

- Without Phase 2, the freshly-loaded Create form will render `"NaN"` in every input because `InputNumber` does `parseFloat(null).toFixed(0)`. This is acceptable as an intermediate state but Phase 2 must follow promptly.

**Out of scope for this phase:**

- No UI/visual changes. No pending indicator. No progress counter. No toggle. No submit-gating banner.

### Phase 2 — `InputNumber` handles `null` cleanly (FR-2)

**Files touched:**

- `libs/ui/src/presentation/components/base/Form/InputNumber.tsx` — handle `field.value === null` in the `value` rendering and in the `+` / `−` button handlers.

**Acceptance:**

- A freshly-loaded Create form renders empty inputs (no `"NaN"`, no `"0"`) for every row.
- Typing `3` into an input sets the value to `3` and re-rendering shows `"3"`. Subsequently clearing the input sends the value back to `null` (and the input shows empty again) — but **only** for this form. Other forms using `InputNumber` retain their old "empty → `min ?? 0`" behavior.
- Pressing `+` on a `null` input sets the value to `0` and the input shows `"0"`. Pressing `−` on `null` is a no-op.
- All other forms in the app that use `InputNumber` (purchase create, transaction create, etc.) continue to behave exactly as before. Verified by manual smoke test on each.
- TypeScript builds clean.

**Out of scope for this phase:**

- No row tinting. No badges. No progress counter. No submit banner. The form is functional but visually unchanged from Phase 1.

### Phase 3 — Pending row indicator + progress counter + "show only pending" toggle (FR-3)

**Files touched:**

- `libs/ui/src/presentation/components/stockChecks/StockCheckFormView.tsx` — add amber row tint when `currentStock === null`, add `"Pending"` badge, add progress counter line above the rows, add the "Show only pending" toggle next to the search input, compose the toggle with the existing search filter via AND.

**Acceptance:**

- On Create, all rows initially render with the amber tint and a `"Pending"` badge.
- Typing a number into a row removes that row's amber tint and badge immediately (within one render).
- The progress counter reads `"0 / 25 materials checked"` on initial load (25 being the example total), and increments live as rows are filled.
- Toggling "Show only pending" hides all filled rows. Toggling it off restores them.
- Combining "Show only pending" with a search query AND-composes correctly: only rows that are both pending AND match the query are visible.
- On Edit, no rows are tinted, the counter reads `"<total> / <total>"`, and the "Show only pending" toggle is either not rendered or is a visible no-op (PR's choice — document it).
- Visual inspection at 1024px, 1440px, and on a mobile viewport shows the amber tint, badge, and counter all look intentional and don't break the row layout from `prd-stock-check-form-ux.md`.

**Out of scope for this phase:**

- No submit-gating banner. No red error treatment. No scroll-to-first-pending. (Submit still fails the Zod check from Phase 1, just with the bare error message.)

### Phase 4 — Submit gating + red error treatment for pending rows (FR-4)

**Files touched:**

- `libs/ui/src/presentation/components/stockChecks/StockCheckFormView.tsx` — wire up a custom submit handler that:
  - Counts pending rows before invoking `form.handleSubmit`.
  - If `>0`, shows a `FormErrorBanner` with the count, clears the search, switches "Show only pending" on, and scrolls/focuses the first pending row.
  - Otherwise, calls `form.handleSubmit(onSubmit)` as normal.
- Same file — gate the **red** error tint on `form.formState.isSubmitted` (or equivalent). Before any submit attempt, pending rows are amber. After a submit attempt that failed on pending rows, those rows become red.
- Possibly `libs/ui/src/presentation/components/base/Form/InputNumber.tsx` — add an optional `error?: boolean` prop that applies a red border, if there isn't a cleaner Tamagui idiom. (Skip if a wrapper-level border is sufficient.)

**Acceptance:**

- Submit on a freshly-loaded Create form (all rows pending) produces:
  - A `FormErrorBanner` reading `"<n> materials still need a stock count"`.
  - The search input cleared (if it had a query).
  - "Show only pending" turned on.
  - The first pending row scrolled into view / focused.
  - All pending rows now tinted **red** (not amber). Inputs have red borders. Inline `"Please enter the current stock"` text shows under each pending input.
- Filling a pending row after the submit attempt removes that row's red treatment immediately.
- Pressing Submit again after all rows are filled produces a successful submit with no banner.
- Edit flow: pressing Submit with all rows filled (the normal Edit case) produces a successful submit with no banner, no toggle change, no scroll.
- Edit flow with a row manually cleared by the staff (sending it to `null`): pressing Submit triggers the same banner/toggle/scroll/red treatment as Create. Verified manually.
- Accessibility: focused state on the first pending row after a failed submit is announced; the inline error text is associated with the input via `aria-describedby` or Tamagui's field-error idiom.

**Out of scope for this phase:**

- No persistence of toggle state across navigation.
- No batch action ("Mark all remaining as 0") — see Future Work.
- No haptic / sound feedback on submit failure.

---

## Future Work (explicitly deferred, not in this PRD)

These have been considered and intentionally pushed out so the four phases above stay focused.

- **"Mark all remaining as 0" bulk action.** A button that fills every pending row with `0`, useful when a staff member is doing a quick end-of-day spot-check and most materials are genuinely depleted. Risky because it can be misused as a "skip the work" shortcut; not adding it until staff explicitly request it.
- **Per-row "Not applicable" / "Skip" state** — distinct from both `null` (pending) and `0` (counted zero). Would let the staff explicitly mark a material as unavailable for today's count (e.g. the shelf is being restocked and they can't access it). Requires a new field on the entity and a backend change. Out of scope.
- **Auto-save / draft persistence** — if the staff navigates away mid-count, today's values are lost. A draft saved to `localStorage` or the backend would solve this. Bigger architectural change; revisit when the pending-state UX has been in production for a release cycle.
- **Optimistic suggestions from last stock check** — pre-fill each row with the *previous* stock check's value as a starting point. Tempting but defeats the entire point of this PRD: if the seed is anything other than "nothing", staff will rubber-stamp it.
- **Photo / barcode attachment per row** — proof that the count was actually performed. Hardware + UX work; tracked separately.
- **Submit confirmation modal showing pending count = 0** — a "are you sure you counted everything?" gate before the network call. Probably unnecessary once the pending-state UX is live, but cheap to add if staff still ask for it.
