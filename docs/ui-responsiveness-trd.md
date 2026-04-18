# Technical Requirement Document — UI Responsiveness Improvement

**Status:** Draft
**Owner:** Frontend Team
**Scope:** `libs/ui` (Tamagui/React Native Web shared UI), `apps/web`, `apps/mobile`
**Non-Scope:** API/business logic, state machine (usecase) changes, feature additions/removals

---

## 1. Background

The Gatherloop POS frontend is a cross-platform application built on Tamagui + Solito, shared between Next.js (`apps/web`) and React Native (`apps/mobile`). Most screens were implemented with a desktop-first mindset and only partially adapted for narrow viewports. This leads to several concrete problems:

- Sidebar is **permanently mounted at 200px** regardless of viewport — on narrow screens it covers/shrinks primary content (`libs/ui/src/presentation/components/base/Sidebar/Sidebar.tsx:38-45`).
- Sidebar open-state defaults to `true` on first render on every device (`libs/ui/src/presentation/components/base/Sidebar/Sidebar.state.tsx:64`), producing a covered content area on phones.
- Layouts such as `TransactionFormView` and `TransactionDetail` use side-by-side `XStack` blocks without breakpoint fallbacks, causing horizontal overflow and illegible text on small screens.
- `TransactionStatistic` renders a **fixed `width={600}` chart** (`libs/ui/src/presentation/components/transactions/TransactionStatistic.tsx:58-59`), which overflows on mobile and wastes space on large desktops.
- `ListItem` thumbnails are hidden only at `$xs` (`libs/ui/src/presentation/components/base/ListItem.tsx:96`) but the surrounding card sizing is not tuned for tablet/desktop grids.
- Product/Transaction/Material search bars stack filter + spinner + search input in a single `XStack` that wraps awkwardly on narrow widths.
- Typography (`H3`, `H4`, `H5`) and paddings are constant across breakpoints — the hierarchy feels oversized on phones and under-sized on 4K monitors.
- The Tamagui config (`libs/ui/src/config.ts`) uses only `@tamagui/config/v3` defaults — no product-specific breakpoint token, no semantic spacing tokens.

The consequences are unreadable forms on phones, excessive whitespace on large desktops, and a visually inconsistent experience across the app.

---

## 2. Goals

1. Deliver a consistent, polished UI across common viewports:
   - **Mobile:** 360 – 599 px (phone portrait)
   - **Tablet:** 600 – 1023 px
   - **Desktop:** 1024 – 1439 px
   - **Large desktop:** ≥ 1440 px
2. Make layout responsiveness **declarative** through Tamagui media-query props (`$sm`, `$md`, `$gtMd`, …) rather than ad-hoc JS measurements.
3. Preserve current user-facing features, navigation flows, and data contracts.
4. Keep all existing **handler integration tests** (`*Handler.test.tsx`) and **Playwright E2E tests** (`apps/web-e2e`) green, updating selectors only where strictly necessary.

### Non-Goals

- Adding new screens, new user actions, or new API calls.
- Theming / dark-mode overhaul (already handled by `@tamagui/next-theme`).
- Performance/bundle refactoring beyond what naturally follows from layout changes.
- Accessibility audit beyond preserving existing semantics (will be tracked separately).

---

## 3. Current State Analysis

### 3.1. Layout Shell

| Component | File | Issue |
|-----------|------|-------|
| `Layout` | `libs/ui/src/presentation/components/base/Layout.tsx` | `XStack flex={1}` with sidebar always present; content `padding="$5"` not responsive |
| `Sidebar` | `libs/ui/src/presentation/components/base/Sidebar/Sidebar.tsx` | Fixed 200px width, only `$xs` overlay style; `isShown` default is `true` everywhere |
| `Sidebar.state` | `libs/ui/src/presentation/components/base/Sidebar/Sidebar.state.tsx:64` | Initial `isShown` is not viewport-aware; uses `window.location.pathname` (SSR unsafe) |
| `Navbar` | `libs/ui/src/presentation/components/base/Navbar/Navbar.tsx` | Title + right action in single `XStack`; long titles push actions off-screen |

### 3.2. List Screens (15 screens)

`BudgetList`, `CalculationList`, `CategoryList`, `ChecklistSessionList`, `ChecklistTemplateList`, `CouponList`, `ExpenseList`, `MaterialList`, `ProductList`, `RentalList`, `SupplierList`, `TransactionList`, `VariantList`, `WalletList`, `WalletTransferList`.

- Search + filter + spinner header overflows on narrow widths.
- `Pagination` (`libs/ui/src/presentation/components/base/Pagination/Pagination.tsx`) always renders as a single `XStack` with ≥7 buttons and no wrapping.
- `ProductList` exposes a `numColumns` prop but callers never derive it from viewport.
- `ListItem` thumbnail: 120×120 always (only hidden at `$xs`).

### 3.3. Form Screens (16 FormView components)

`auth/LoginFormView`, `calculations/CalculationFormView`, `categories/CategoryFormView`, `checklistSessions/ChecklistSessionFormView`, `checklistTemplates/ChecklistTemplateFormView`, `coupons/CouponFormView`, `expenses/ExpenseFormView`, `materials/MaterialFormView`, `products/ProductFormView`, `rentals/RentalCheckinFormView`, `rentals/RentalCheckoutFormView`, `suppliers/SupplierFormView`, `transactions/TransactionFormView`, `variants/VariantFormView`, `wallets/WalletFormView`, `wallets/WalletTransferFormView`.

- Only `ProductFormView` uses `$sm={{ flexDirection: 'column' }}` for field grouping.
- `TransactionFormView` places item list and totals card side-by-side with no breakpoint fallback; totals card is `maxWidth={400}` which looks cramped on desktop and overflows on mobile.
- Submit buttons span full form width even on wide screens, breaking visual hierarchy.

### 3.4. Detail / Statistic Screens

- `TransactionDetail` has partial `$md` fallback; individual info cards never wrap sensibly on small screens.
- `TransactionStatistic` uses fixed `width={600}` `VictoryChart`.
- `TransactionDetail` footer grid of price/amount/subtotal always uses `XStack gap="$5"` which horizontally scrolls on mobile.

### 3.5. Design System Gaps

- No centralized breakpoint constant — each component picks between `$xs`, `$sm`, `$md`, `$lg` inconsistently.
- No "container" component that clamps content to a readable max width on very large screens.
- No shared helper for responsive typography.

---

## 4. Target Responsive Design

### 4.1. Breakpoint Tokens (Tamagui Media)

Adopt and document the Tamagui default media tokens from `@tamagui/config/v3` as the single source of truth:

| Token | Min width | Intended device |
|-------|-----------|-----------------|
| `$xs` | 0 – 659 | Phone portrait |
| `$sm` | 660 – 799 | Phone landscape / small tablet |
| `$md` | 800 – 1019 | Tablet |
| `$lg` | 1020 – 1279 | Small desktop |
| `$xl` | 1280 – 1659 | Desktop |
| `$xxl` | ≥ 1660 | Large desktop |

Convention:
- Use `$gtXs`, `$gtSm`, `$gtMd` for "desktop-up" progressive enhancement.
- Use `$xs`, `$sm`, `$md` for "mobile-down" overrides.
- Every cross-cutting component must work at **360 px** (narrowest common phone) without horizontal scroll.

### 4.2. Layout Shell

- **Sidebar:** collapses to an off-canvas drawer on `$md` and below. Default state is closed on phones, open on `$gtMd`. Drawer is dismissed on route change and on outside press.
- **Navbar:** stacks title and right action vertically on `$xs`; truncates with ellipsis on `$sm`+.
- **Layout:** content padding scales (`$3` on `$xs`, `$4` on `$sm`, `$5` on `$gtMd`). Wraps children in a `ContentContainer` with `maxWidth={1440}` centered on `$xxl`.

### 4.3. Lists

- List header (search + filter + indicator) wraps to a second row via `flexWrap="wrap"` on `$xs`.
- Search input takes `flex={1}` on mobile, full 50% on tablet, up to 360 px on desktop.
- Pagination wraps with `flexWrap="wrap"` and hides edge-jump buttons (`ChevronsLeft`/`ChevronsRight`) on `$xs`.
- `ProductList` default `numColumns`: 1 on `$sm`, 2 on `$md`, 3 on `$lg`, 4 on `$xl`.
- `ListItem` thumbnail: 72 px on `$sm`, 120 px on `$gtMd`.

### 4.4. Forms

- Multi-field rows default to `flexDirection: 'row'` on `$gtSm` and `flexDirection: 'column'` on `$sm` and below.
- Primary submit button: full width on `$xs`, `minWidth={240}` and right-aligned on `$gtMd`.
- `TransactionFormView`: item list and totals card switch to stacked column on `$md` and below; totals card becomes a sticky footer on `$xs`.

### 4.5. Detail / Statistic

- `TransactionDetail` info cards render in a responsive grid: 1 column (`$xs`), 2 columns (`$sm`/`$md`), 3 columns (`$gtLg`).
- `TransactionStatistic` chart uses `width="100%"` and clamps via a `ResponsiveContainer` wrapper; `padding` scales by viewport.

### 4.6. Typography & Spacing

- Introduce helper `ResponsiveHeading` using Tamagui's size tokens per breakpoint (e.g. `H3` ≈ `$8` on `$xs`, `$10` on `$gtMd`).
- Standard gap tokens: `$2` (xs), `$3` (sm/md), `$4` (gtMd) applied via local props — no new global theme tokens required.

---

## 5. Implementation Plan (Phased)

Each phase is shippable independently. Phases are ordered from lowest risk / highest leverage to highest risk. All phases are UI-only edits inside `libs/ui/src/presentation/**` and must preserve the public props of each component where possible; new props must be **optional with safe defaults** to avoid breaking callers or snapshot tests.

### Phase 0 — Design Tokens & Foundation (Prep)

**Goal:** Establish shared primitives so later phases produce consistent output.

Deliverables:
- `libs/ui/src/presentation/components/base/ContentContainer.tsx` — max-width clamp, centered, responsive horizontal padding.
- `libs/ui/src/presentation/components/base/ResponsiveStack.tsx` — thin wrapper around `XStack` that swaps to column below a configurable breakpoint (defaults to `$md`).
- `docs/ui-responsiveness-trd.md` breakpoint section linked from `libs/ui/README.md`.
- Storybook viewport presets matching §4.1 added to `libs/ui/.storybook/preview.tsx` so reviewers verify each breakpoint.

No existing callsites change in this phase. Handler tests and E2E untouched.

**Risk:** Very low. Pure additive.

---

### Phase 1 — Layout Shell Responsiveness

**Goal:** Make `Layout`, `Sidebar`, `Navbar` work correctly from 360 px to 4K.

Changes (files):
- `libs/ui/src/presentation/components/base/Sidebar/Sidebar.tsx`
- `libs/ui/src/presentation/components/base/Sidebar/Sidebar.state.tsx`
- `libs/ui/src/presentation/components/base/Navbar/Navbar.tsx`
- `libs/ui/src/presentation/components/base/Layout.tsx`

Required behavior:
- Sidebar default-closed on `$md` and below; default-open otherwise. Derive via `useMedia()` rather than a fixed initial `useState(true)`.
- Sidebar rendered as an off-canvas `Sheet` (reusing existing `Sheet` base component) on `$md` and below; classic accordion on `$gtMd`.
- Navbar adds `$xs={{ flexDirection: 'column', alignItems: 'flex-start' }}`; title gets `numberOfLines={1}` + ellipsis.
- `Layout` wraps children in the new `ContentContainer`.

Test impact:
- Handler tests do not inspect layout DOM structure directly — should remain green.
- E2E selectors in `apps/web-e2e/src/*.spec.ts` that target buttons inside the navbar must continue to match. **Action:** verify selectors rely on accessible names (`getByRole('button', { name: 'Logout' })`) rather than positional DOM. Add `testID`/`aria-label` fallbacks where the refactor moves the button into the drawer.

**Risk:** Medium. Drawer change is visible to Playwright. Mitigation: add `data-testid="sidebar"` and keep the logout `Button` DOM node stable (only its parent wrapper changes).

---

### Phase 2 — List Screen Responsiveness

**Goal:** Make all 15 list screens usable on phones without horizontal scroll, and visually dense on desktop.

Changes (files):
- `libs/ui/src/presentation/components/<entity>/<Entity>List.tsx` — apply list-header wrap pattern (`flexWrap="wrap"`, `gap="$2"`, `$xs={{ width: '100%' }}` on the search input).
- `libs/ui/src/presentation/components/base/ListItem.tsx` — responsive thumbnail size; footer items wrap already, tighten spacing on `$xs`.
- `libs/ui/src/presentation/components/base/Pagination/Pagination.tsx` — add `flexWrap="wrap"`, hide edge-jump buttons on `$xs`.
- `libs/ui/src/presentation/components/products/ProductList.tsx` — derive default `numColumns` from `useMedia()` if caller does not override.

Test impact:
- `*ListHandler.test.tsx` assertions key off `testID`s and role/label — no change required. Where existing tests assert a specific layout order, no assertions target responsive DOM, so they should remain green.
- Pagination tests (if any) continue to pass because button roles/labels are unchanged.

**Risk:** Low. Changes are visual.

---

### Phase 3 — Form Screen Responsiveness

**Goal:** All 16 FormViews collapse to single-column on `$sm` and below and present comfortably on wide screens.

Changes (files):
- Each `*FormView.tsx` in `libs/ui/src/presentation/components/**` — wrap multi-field rows in `ResponsiveStack` (Phase 0 primitive) or add `$sm={{ flexDirection: 'column' }}` to existing `XStack`.
- `libs/ui/src/presentation/components/transactions/TransactionFormView.tsx` — switch the top `XStack` to `ResponsiveStack` at `$md`; totals card becomes full-width stacked below on `$md` and below.
- Submit button: add `$gtMd={{ alignSelf: 'flex-end', minWidth: 240 }}` without removing the existing `onPress`/`disabled` props.

Test impact:
- Handler tests focus on state transitions, submit button enabled/disabled, spinner presence — unaffected.
- E2E `products.spec.ts`, `transactions.spec.ts`, `expenses.spec.ts`, `wallets.spec.ts`: selectors rely on label text (e.g. `page.getByLabel('Name')`, `page.getByRole('button', { name: 'Submit' })`). These continue to match after the CSS-level reflow. **Action:** run the Playwright suite at the default desktop viewport (1280×720) to confirm no regressions, and add a smoke run at 375×812 for visual confidence (non-gating).

**Risk:** Low. No JS logic or field-wiring change.

---

### Phase 4 — Detail & Statistic Responsiveness

**Goal:** Make detail cards and charts fluid.

Changes (files):
- `libs/ui/src/presentation/components/transactions/TransactionDetail.tsx` — replace hard-coded row with responsive grid (`XStack flexWrap="wrap"` with `$xs={{ flexDirection: 'column' }}`, `flexBasis` tuned per breakpoint).
- `libs/ui/src/presentation/components/transactions/TransactionStatistic.tsx` — replace fixed `width={600}` with a measured container; chart `padding` scales.
- `TransactionPrintCustomer` and `TransactionPrintEmployee` remain fixed-width (print is desktop-only) — documented, not changed.

Test impact:
- No handler test targets chart dimensions. Visual only.

**Risk:** Low-medium. `VictoryChart` requires a width value; ensure a ref/measurement pattern (e.g. `onLayout`) is introduced rather than `width="100%"` which Victory does not accept directly.

---

### Phase 5 — Polish & Regression Sweep

**Goal:** Close remaining gaps identified during QA.

Activities:
- Manual pass at 360 / 768 / 1024 / 1440 / 1920 px using Storybook viewports.
- Run full `nx run-many --target=test --all` (Jest handler tests).
- Run `nx run web-e2e:e2e` (Playwright) at desktop viewport.
- Capture before/after screenshots for the PR description.
- Update any Storybook `*.stories.tsx` that hard-coded wide frames so the Storybook UI reflects the new responsive behavior.

Test impact:
- No production code changes beyond cosmetic fixes found during review.

**Risk:** Low.

---

## 6. Testing Strategy

The work is UI-only. Existing verification layers stay authoritative.

### 6.1. Handler Integration Tests (Jest)

Location: `libs/ui/src/presentation/screens/*Handler.test.tsx`.
These tests mount screens with mock repositories and assert on **state transitions** and **accessible roles**. Because we add optional responsive props and do not change component names, test IDs, labels, or call ordering, existing specs must continue to pass. Any test that relies on a specific `XStack` hierarchy (grep shows none) would be refactored with the same PR that introduces the layout change.

Acceptance criterion per phase: `nx run-many --target=test --all --passWithNoTests` exits 0.

### 6.2. E2E (Playwright)

Location: `apps/web-e2e/src/*.spec.ts` covers `auth`, `products`, `transactions`, `expenses`, `wallets`.
These tests use Playwright's role/label locators. Guidelines:
- Do not remove or rename the accessible name of any button, link, input, or heading.
- Keep the default Playwright viewport (1280×720) as the primary target — the suite's baseline behavior must remain identical.
- Where a control moves into a drawer on mobile, preserve its accessible name so the locator keeps resolving when the drawer is opened.

Acceptance criterion per phase: `nx run web-e2e:e2e` exits 0 at the configured viewport.

### 6.3. Visual QA (manual)

- Storybook viewports added in Phase 0 (360, 768, 1024, 1440).
- Per-phase screenshot matrix attached to the PR.

### 6.4. Mobile (React Native) Smoke

- `apps/mobile` consumes the same `libs/ui` components. Changes that use Tamagui media props translate to RN via `react-native-web`/native `useMedia`. After each phase, run `nx run mobile:start` and open the affected screen on an emulator to confirm nothing crashes. No new automated mobile tests are in scope.

---

## 7. Rollout & Risk

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Playwright selectors break due to drawer refactor | Medium | Preserve accessible names; add `data-testid` fallbacks; run suite after Phase 1 |
| React Native layout regressions from web-centric media tokens | Medium | Tamagui media tokens work on both platforms; verify via manual RN smoke run per phase |
| Storybook stories hard-coded to desktop width | Low | Update viewports in Phase 0; fix story-by-story as we touch components |
| Victory chart does not honor `width="100%"` | Low | Use an `onLayout` measurement wrapper; documented in Phase 4 |
| Snapshot tests drift | Low | Repo does not rely on snapshot tests for screens (verified); any incidental snapshots regenerated per PR |

Ship order: Phase 0 → 1 → 2 → 3 → 4 → 5. Phases 2/3/4 can be parallelized across engineers once Phase 0 and 1 land, because they touch disjoint component directories.

---

## 8. Success Criteria

After all phases:

1. No horizontal scroll on any primary screen at 360 px wide.
2. Sidebar is dismissible on phones/tablets and auto-open on desktops.
3. All 15 list screens, 16 forms, and the detail/statistic screens pass manual QA at the four reference viewports.
4. `nx run-many --target=test --all` is green.
5. `nx run web-e2e:e2e` is green at the default desktop viewport.
6. No change in feature set, domain logic, or API calls versus the current `main`.

---

## 9. Out of Scope / Follow-up

- Accessibility audit (contrast, focus ring, keyboard order) — separate TRD.
- Print layout refactor for `TransactionPrintCustomer`/`TransactionPrintEmployee`.
- React Native-specific navigation (bottom tabs) — current mobile app uses the shared sidebar.
- Dark theme tuning per breakpoint.
