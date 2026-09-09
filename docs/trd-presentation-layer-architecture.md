# TRD — Fold controllers into handlers, split handlers from views, run handler tests in Storybook

**Status:** proposed
**Scope:** `libs/ui/src/presentation/**`, `libs/ui/src/index*.ts`, `libs/ui/.eslintrc.json`,
`libs/ui/.storybook/**`, `libs/ui/project.json`, `libs/ui/jest.config.ts`, `package.json`
(devDependencies + one CI job), `libs/ui/src/app/**` (import paths only)
**Non-scope:** `libs/ui/src/{domain,data,utils}`, `libs/api-contract`, `libs/provider`, `apps/api`,
any runtime behaviour, any component or screen prop API, the e2e suites
**Date of research:** 2026-09-09 — every count below measured against `main` @ `02d450b`

---

## 1. Problem statement

The presentation layer today is three source folders under `libs/ui/src/presentation/`:

```
presentation/
  controllers/     87 files   (84 controllers + controller.ts + index.ts + ...)
  components/     298 files
  screens/        241 files   ← handlers, screens, handler tests and stories, together
    pos/          220 files
    order/         21 files
```

### 1.1 The controller layer is a hop, not a layer

`useController` (`presentation/controllers/controller.ts`, 21 lines) is the only real abstraction: it
binds a `Usecase` to `useReducer` and runs `usecase.onStateChange` on every state change. The 84
`*Controller.tsx` files on top of it total **1581 lines — 18.8 lines each, longest 24**. Their entire
content is:

| What the controller adds on top of `useController` | Controllers |
| --- | ---: |
| Nothing — a one-line passthrough | 11 |
| A `useEffect` (of which 53 are a toast on a success state) | 53 |
| A `useFocusEffect(() => dispatch({ type: 'FETCH' }))` | 20 |
| A `useRouter().push` on success | 1 |

Two costs follow. First, every screen's logic is split across two files for no gain — reading
`AuthLoginHandler` means also opening `AuthLoginController` to learn that a toast fires on
`submitSuccess`, while the redirect on the *same* state lives in the handler. Second, 71 of the 84
controllers have exactly **one** call site, so the indirection buys no reuse at all.

The 13 that *are* shared are the reason this cannot be a blanket inline:

| Controller | Handlers using it |
| --- | ---: |
| `useAuthLogoutController` | 55 |
| `useTransactionItemSelectController`, `useTableResolveController`, `useSupplierListController`, `useMaterialListController`, `useCouponListController` | 3 each |
| `useVariantDeleteController`, `useTransactionStatisticListController`, `useTransactionPayController`, `useTicketListController`, `useRentalListController`, `useCartController`, `useBudgetListController` | 2 each |

### 1.2 One screen is four files in a 220-file folder

`presentation/screens/pos/` holds 220 files — 58 handlers, 58 screens, 54 tests, 49 stories and one
barrel, interleaved alphabetically:

```
AuthLoginHandler.test.tsx      ← test of the stateful half
AuthLoginHandler.tsx           ← stateful half
AuthLoginScreen.stories.tsx    ← story of the pure half
AuthLoginScreen.tsx            ← pure half
BudgetCreateHandler.test.tsx
...
```

Nothing in the folder name says that half of it is stateful React (usecases, routers, toasts,
printers) and the other half is pure prop-driven rendering. A new developer's first `ls` returns 220
entries in which the layer boundary is spelled only in the filename suffix.

### 1.3 Handler tests run in one environment only

56 handler tests exist (61 handlers; 5 untested). They are genuine integration tests —
mock repository → real usecase → real handler → real screen:

```ts
const mockAuthRepo = new MockAuthRepository();
render(<AuthLoginHandler authLoginUsecase={new AuthLoginUsecase(mockAuthRepo)} />);
await user.click(screen.getByRole('button', { name: 'Submit' }));
expect(mockRouterPush).toHaveBeenCalledWith('/');
```

They only run headless under Jest. Storybook 8.6 is already installed with `@storybook/addon-interactions`
and `@storybook/test`, and three component stories (`TransactionFormView`, `RentalCheckoutFormView`,
`RentalCheckinFormView`) already use `play`. So the machinery for running these same flows visually —
step-by-step, in a browser, with a replayable timeline — exists but is not used for handlers. A
failing handler test today is debugged by reading a jsdom diff; the same failure in Storybook is
watchable.

---

## 2. Goals and non-goals

### Goals

1. One screen's stateful logic lives in **one** file (its handler), except where a hook is genuinely
   shared by ≥2 handlers.
2. The presentation tree names the split it already has: stateful handlers apart from pure views.
3. Every handler test is a single spec that runs **both** under Jest (`nx run ui:test`) and as a
   Storybook interaction test (`play`), with no duplicated assertions.
4. Each phase is one small, reviewable PR that leaves `nx run-many --target=lint,test --all` green.
5. No behaviour change anywhere. Every diff is a move, an inline, or a test-harness change.

### Non-goals

- **No prop-API changes.** No screen, component or handler gains, loses or renames a prop.
- **No new Nx libraries.** Same reasoning as D8 in `trd-ui-presentation-split-by-app.md`.
- **`domain/`, `data/`, `utils/` are untouched.**
- **The Jest `tamagui` stub is not removed** (see D9) — it is a known fidelity gap, documented and
  bounded, not fixed here.
- **No new tests written for the 5 untested handlers** as part of the move phases; that gap is
  tracked separately in Phase 12.
- **`presentation/` stays singular.** The request sketched `presentations/`; renaming the folder
  costs a diff on every file in `libs/ui` and buys nothing. The value asked for is the
  handler/view split, which D3 delivers.

---

## 3. Current-state audit

### 3.1 Counts

| Thing | Count |
| --- | ---: |
| Controllers (`*Controller.tsx`) | 84 |
| — used by exactly 1 handler | 71 |
| — used by ≥2 handlers | 13 |
| Controller LOC (excluding `controller.ts`) | 1581 |
| Handlers | 61 (58 pos, 3 order) |
| Screens | 65 (58 pos, 7 order) |
| Handler test files | 57 (56 `*Handler.test.tsx` + `TransactionCreateHandler.printFlow.test.tsx`) |
| Handlers with no test | 5 |
| Screen stories | 56 |
| Component files | 298 |
| Component stories | 110 |

### 3.2 What already holds (and must keep holding)

- **Screens are usecase-free.** No `*Screen.tsx` imports a `Usecase` (the one grep hit,
  `TableScanScreen`, is a comment). Screens take plain props and a `variant` discriminator.
- **Composition roots import through the barrel.** `app/pos/*.tsx` imports handlers from
  `'../../presentation'`; `app/order/*.tsx` deep-imports
  `'../../presentation/screens/order/<X>Handler'` to keep the customer bundle POS-free
  (D6, `trd-order-app-nextjs-migration.md`). Both need path edits in Phase 7; nothing outside
  `libs/ui` imports a handler or screen by path.
- **Four handlers import components directly** — `BudgetListHandler`, `RentalCheckinHandler`,
  `TransactionCreateHandler`, `WalletTransferListHandler` — because they pass a composed component
  down as a render prop (e.g. `TransactionItemSelect`). This is legitimate and survives the move
  (D8).
- **ESLint already pins the app boundary** by path glob (`src/presentation/screens/pos/**` must not
  import `**/screens/order/**`, and vice versa). Those globs are path-coupled and must move with the
  files.

### 3.3 The two environments a shared spec must satisfy

This is the crux of goal 3. A handler test and a handler story render the *same* handler in
materially different worlds:

| | Jest (`ui:test`) | Storybook (`play`) |
| --- | --- | --- |
| `tamagui` | mapped to `src/__mocks__/tamagui.tsx` (416-line DOM stub) | the real thing, via `@storybook/addon-react-native-web` |
| `react-native` | mapped to `src/__mocks__/react-native.ts` | `react-native-web` |
| `solito/router` | `jest.mock(...)` per test file, spies asserted directly | aliased to `.storybook/mocks/solito-router.js` — **no-ops, records nothing** |
| `@tamagui/toast` | `jest.mock(...)` per test file | not aliased; no `ToastProvider` in `preview.tsx` |
| Async settling | `await act(async () => flushPromises())` | no `act`; needs `waitFor` / `findBy*` |
| Assertion lib | `@testing-library/react` + Jest `expect` | `@storybook/test` (`within`, `userEvent`, `expect`, `fn`) |

Three of these are blockers with concrete, already-verifiable failure modes:

1. **Module mocking does not exist in Storybook.** `jest.mock('solito/router')` is a no-op there.
   The existing alias stub returns `() => {}` for `push`, so `expect(push).toHaveBeenCalledWith('/')`
   cannot be written against it. → D6.
2. **`useToastController` has no provider in Storybook.** 53 controllers call it today, and those
   calls land in handlers after Phase 1. → D6.
3. **Queries that pass under the Jest `tamagui` stub can fail against real Tamagui.** Verified
   example: `LoginFormView` renders its password field with `secureTextEntry`. The Jest stub's
   `Input` always emits `<input>` (role `textbox`), so
   `getByRole('textbox', { name: 'Password' })` — used in `AuthLoginHandler.test.tsx` — passes.
   Real Tamagui on `react-native-web` emits `<input type="password">`, which has **no implicit ARIA
   role**, so the identical query fails. → D9, D10.

---

## 4. Target architecture

```
libs/ui/src/presentation/
  handlers/                       ← stateful: usecases, reducers, effects, router, toast, printer
    useController.ts              ← the useReducer↔Usecase bridge (was controllers/controller.ts)
    shared/                       ← the 13 hooks with ≥2 call sites
      useAuthLogout.ts
      useCouponList.ts
      ...
      index.ts
    pos/
      AuthLoginHandler.tsx
      AuthLoginHandler.interactions.ts     ← the shared spec (D11)
      AuthLoginHandler.test.tsx            ← Jest driver over the spec
      AuthLoginHandler.stories.tsx         ← Storybook driver over the same spec
      index.ts
    order/
      ...
  views/                          ← pure: props in, JSX out. No usecase, no router, no toast.
    components/                   ← unchanged content, one level deeper
      base/ auth/ transactions/ ...
    screens/
      pos/
        AuthLoginScreen.tsx
        AuthLoginScreen.stories.tsx
        index.ts
      order/
        ...
  index.ts
```

### Ownership rules (enforced by lint, D12)

| Layer | May import | May **not** import |
| --- | --- | --- |
| `handlers/**` | `domain`, `data`, `utils`, `views/**`, `handlers/shared` | another app's handlers |
| `handlers/shared/**` | `domain`, `utils`, `handlers/useController` | any `handlers/{pos,order}/**` |
| `views/screens/**` | `views/components`, `domain` **entities/forms only** | `handlers/**`, `domain/usecases`, `data/**` |
| `views/components/**` | `views/components`, `domain` entities | `handlers/**`, `data/**` |

---

## 5. Design decisions

**D1 — Inline a controller only when it has exactly one call site.** 71 of 84 qualify. The 13 shared
ones (§1.1) move to `handlers/shared/` as hooks. Inlining `useAuthLogoutController` into its 55
handlers would duplicate a router push and a toast 55 times; that is the opposite of the goal.

**D2 — `useController` survives, renamed and relocated.** It is the actual `Usecase`↔React binding
and is called by all 84 controllers today. It becomes `handlers/useController.ts`. Handlers call it
directly:

```tsx
// after
export const AuthLoginHandler = ({ authLoginUsecase }: AuthLoginHandlerProps) => {
  const { state, dispatch } = useController(authLoginUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') {
      toast.show('Login Success');
      router.push('/');
    }
  }, [state.type, toast, router]);

  return <AuthLoginScreen ... />;
};
```

Note the incidental win: the toast and the redirect that fire on the *same* state end up in the same
effect, instead of two effects in two files.

**D3 — `views/` wraps both `components/` and `screens/`.** The request's tree, adopted as-is. It
gives the tree one bit that answers "can this file have side effects?" without opening it, and it
keeps `screens` and `components` — which share the same purity rule — under one root that the lint
rule can target by a single glob.

**D4 — Merge before moving.** Track A (Phases 1–6) deletes 71 files; Track B (Phases 7–9) moves what
remains. Doing it in this order means Track B never `git mv`s a file that Track A is about to delete,
and the merge diffs stay legible because import paths do not shift underneath them.

**D5 — Every move is a pure rename.** Phases 7–9 change import specifiers, barrel lines, ESLint globs
and nothing else. Reviewers can verify with `git diff --stat -M` — the rename score should be 100%
for every moved file, and any file with content changes beyond its import block is a review flag.

**D6 — Storybook gets recording mocks, not a DI refactor.** Two candidate ways to let a handler's
router/toast be asserted in both environments:

1. *Ports + context*: define `RouterPort`/`ToastPort`, provide them from `app/`, inject spies in
   tests. Correct, and a much bigger change — it touches 61 handlers, both composition-root trees,
   and both apps' providers.
2. *Recording mocks at the module boundary*: upgrade `.storybook/mocks/solito-router.js` to record
   calls with `fn()` from `@storybook/test`, add the same for `@tamagui/toast`, and export a
   `resetMocks()` the story's `beforeEach` calls. Jest keeps its `jest.mock` factories, which record
   the same way.

**Chosen: 2.** It buys goal 3 with ~80 lines of harness and zero production-code change. Option 1
stays available later if the ports become useful for other reasons; nothing here forecloses it.

**D7 — `@storybook/test-runner`, and it does not run on every PR.** Play functions execute in the
browser when a story is opened, but CI needs them headless; the test-runner (Jest + Playwright over a
built Storybook) is the supported path for the webpack5 builder. Cost: a full Storybook build per run,
minutes not seconds. Since the *same* specs already run under Jest in `pr-test.yml` in seconds, the
test-runner adds no correctness signal on a PR — only environment coverage. So it runs on `main` and
on manual dispatch, and locally via `nx run ui:test-storybook`. If a real-Tamagui-only regression ever
escapes to `main`, revisit.

**D8 — Handler→component imports stay legal.** Four handlers compose a component and pass it down as
a render prop (§3.2). Forbidding it would force those components into the screen's prop surface for
no benefit. The lint rule constrains the reverse direction (views must not import handlers), which is
the one that matters.

**D9 — The Jest `tamagui` stub stays.** Removing it would make Jest render real Tamagui — closing the
fidelity gap in §3.3, at the cost of a much slower and flakier suite (portals, animations, measurement)
and a rewrite of an unknown fraction of the 56 tests. That is a separate decision with its own risk
budget. This TRD instead makes the gap *visible*: any spec that cannot pass in both environments is
found the moment it is ported (Phase 11), and the divergence is recorded in the spec file.

**D10 — Shared specs query by accessible name, label text, or `testID` — never by a role the stub
invents.** Concretely: `getByLabelText('Password')` and `getByTestId(...)` hold in both worlds;
`getByRole('textbox', { name: 'Password' })` does not (§3.3). Phase 10 fixes the pilot's queries;
Phase 11 fixes the rest as it ports them. Queries are the only part of a test body that the porting
phases are allowed to change — assertions must stay identical.

**D11 — The shared spec is a plain module of named steps, not a test framework.**

```ts
// AuthLoginHandler.interactions.ts
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { getRouterMock, getToastMock } from '../../../../.storybook/mocks/recorders';

export const login = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByLabelText('Username'), 'admin');
  await userEvent.type(canvas.getByLabelText('Password'), 'secret');
  await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
};

export const expectsRedirectHome = async () => {
  await waitFor(() => expect(getRouterMock().push).toHaveBeenCalledWith('/'));
};
```

The Jest file and the story file each import these and supply their own rendering:

```ts
// AuthLoginHandler.test.tsx
it('redirects home after a successful login', async () => {
  const { container } = render(<AuthLoginHandler {...createProps()} />);
  await login(container);
  await expectsRedirectHome();
});
```

```ts
// AuthLoginHandler.stories.tsx
export const SuccessfulLogin: Story = {
  play: async ({ canvasElement }) => {
    await login(canvasElement);
    await expectsRedirectHome();
  },
};
```

`@storybook/test` re-exports Testing Library plus a Jest-compatible `expect` and `fn`, so one import
serves both runners. `waitFor` replaces `act(async () => flushPromises())`, which has no meaning
outside Jest. `flushPromises` stays in `utils/testUtils.tsx` for specs not yet ported.

**D12 — Boundaries are lint rules, not conventions.** The existing per-app `no-restricted-imports`
globs in `libs/ui/.eslintrc.json` move to the new paths in Phase 7, and Phase 9 adds the
views-must-not-import-handlers rule from §4. A boundary nothing enforces is exactly the failure mode
`trd-ui-presentation-split-by-app.md` §1.1 already documented for this codebase.

---

## 6. Phased delivery

Thirteen PRs in three tracks. Tracks A and B are strictly sequential (D4). **Phase 10 (Storybook
harness) has no dependency on either and can be built in parallel from day one** — only Phase 11's
porting sweep needs Track B to have landed.

Every PR: `npx nx run-many --target=lint,test --all` green, plus the phase-specific check listed.

### Track A — fold controllers into handlers (Phases 1–6)

| Phase | Content | Handlers touched | Controllers deleted |
| --- | --- | ---: | ---: |
| **1** | Pilot: Auth + Budget | 3 | 3 |
| **2** | Category, Coupon, Supplier, Ticket | 12 | 13 |
| **3** | Product, Variant, Material, StockCheck | 12 | 14 |
| **4** | Wallet, WalletTransfer, Expense | 9 | 11 |
| **5** | Transaction, Calculation, Rental, Table | 13 | 19 |
| **6** | ChecklistTemplate, ChecklistSession, Purchase, order app (Menu) | 7 | 11 |
| | **Total** | **56** | **71** |

Five handlers — `BudgetListHandler`, `CartHandler`, `CheckoutHandler`, `DashboardHandler`,
`TransactionStatisticHandler` — consume only shared controllers and are therefore untouched by
Track A; they change once, in Phase 8, when those hooks are renamed.

**Phase 1 — Pilot merge (Auth + Budget).**
- Inline `useAuthLoginController`, `useBudgetCreateController`, `useBudgetUpdateController` into
  their handlers; delete those three files and their barrel lines.
- `useBudgetListController` has 2 call sites (§1.1) → leave it in `controllers/` untouched; it
  becomes a `handlers/shared/` hook in Phase 8.
- Add `docs/handlers.md`: the rule from D1, the shape from D2, and "a new screen gets a handler, not
  a controller".
- **Check:** `AuthLoginHandler.test.tsx` and the three Budget handler tests pass unmodified. If a
  handler test needed editing, the inline was not behaviour-preserving.

**Phases 2–6 — the sweep.** Same mechanical recipe per handler:
1. Move the controller's `useEffect`/`useFocusEffect` bodies into the handler, merging effects that
   key off the same state.
2. Replace `useXController(usecase)` with `useController(usecase)`.
3. Delete the controller file and its `controllers/index.ts` line.
4. Leave any controller listed in §1.1 alone.
- **Check per PR:** the touched handlers' existing tests pass **unmodified**, and
  `git diff --stat` shows no change under `views/`, `domain/` or `data/`.

After Phase 6, `presentation/controllers/` contains `controller.ts`, `index.ts` and the 13 shared
controllers — 15 files, down from 87.

### Track B — split handlers from views (Phases 7–9)

**Phase 7 — Create `handlers/{pos,order}`.**
- `git mv` 61 handlers + 57 handler test files out of `screens/{pos,order}` into
  `presentation/handlers/{pos,order}`.
- Split `screens/pos/index.ts` (116 lines) into `handlers/pos/index.ts` and a screens-only barrel;
  same for `order`.
- Update `presentation/index.ts`, and the four `app/order/*.tsx` deep imports (§3.2).
- Move the two app-boundary ESLint overrides to the new globs.
- **Check:** `git diff --stat -M` reports 100% rename for all 118 files; `nx run ui:test` runs the
  same 57 test files.

**Phase 8 — `useController` and the shared hooks.**
- `controllers/controller.ts` → `handlers/useController.ts`.
- The 13 shared controllers → `handlers/shared/use<Name>.ts`, dropping the `Controller` suffix
  (`useAuthLogoutController` → `useAuthLogout`). This renames one symbol across 55 handler files —
  mechanical, and the last PR in which that symbol moves.
- Delete `presentation/controllers/` and the controllers ESLint override; port its
  `react-hook-form` / `next` restrictions onto `handlers/**` so the form-ownership rule from
  `trd-form-ownership-refactor.md` keeps its teeth.
- **Check:** `rg "presentation/controllers" libs apps` returns nothing but this TRD.

**Phase 9 — Create `views/`.**
- `git mv presentation/screens presentation/views/screens` (123 remaining files: 65 screens,
  56 stories, 2 barrels).
- `git mv presentation/components presentation/views/components` (298 files).
- Story `title`s are already `Screens/…` and `Components/…` (§3.2) and stay valid — no Storybook
  reorganisation in this PR.
- Add the D12 rule: `views/**` may not import `handlers/**` or `domain/usecases`.
- **Check:** `nx run ui:build-storybook` succeeds and the sidebar is byte-identical to `main`'s.

Optionally split Phase 9 into 9a (screens) and 9b (components) if a 298-file rename is unwelcome in
one PR; they are independent.

### Track C — handler tests in Storybook (Phases 10–13)

**Phase 10 — Harness (parallelisable from day one).**
- `.storybook/mocks/recorders.ts`: `fn()`-backed `push/replace/back` and `toast.show`, plus
  `resetRecorders()`.
- Point `solito/router$` at the recording version; add a `@tamagui/toast$` alias to the same
  registry; wire `ToastProvider`/`PortalProvider` into `preview.tsx` for any story that renders a
  real toast.
- Add `@storybook/test-runner` + a `test-storybook` target in `libs/ui/project.json`; add the
  `main`-only workflow job (D7).
- Prove it with a throwaway story that asserts on a recorded `push`.
- **Check:** `nx run ui:test-storybook` passes locally against the three existing `play` stories.

**Phase 11 — Pilot the shared spec (`AuthLoginHandler`).**
- Extract `AuthLoginHandler.interactions.ts` (D11); rewrite `AuthLoginHandler.test.tsx` as a driver
  over it; add `AuthLoginHandler.stories.tsx` under `Handlers/POS/…` with one story per flow.
- Fix the password query per D10 and record the divergence in a comment.
- **Check:** the same spec passes under `nx run ui:test` **and** `nx run ui:test-storybook`; both
  assert the same recorded `push('/')`.

**Phase 12 — Port the remaining 55 handler specs.** In the Track A batches (§Track A table) so each
PR is one domain group, ~6–12 specs. Per spec: extract steps, add the story, keep assertions
byte-identical, change only queries (D10). A spec that cannot be made to pass in Storybook is
**not** forced: leave the Jest test as-is, add a `// storybook: <reason>` comment, and list it in
the phase's PR body. Expect a handful — the printer (`usePrinter`, WebSocket) and QR-scanner screens
are the likely candidates.

**Phase 13 — Close the gap.** Write specs for the 5 untested handlers — `ChecklistSessionDetail`,
`ChecklistSessionList`, `ChecklistTemplateList`, `PurchaseList`, `StockCheckList` — in the new
shared-spec shape, so they land in both runners at once. Optional; schedule it independently.

---

## 7. Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| An inline changes effect ordering or dependency arrays and alters behaviour | Medium | Existing handler tests must pass **unmodified** in every Track A PR — that is the phase gate, not a suggestion. Merge two effects only when they key off the same state field. |
| A 298-file rename is unreviewable | Medium | D5: rename-detection means the reviewer reads the barrel and config diff, not 298 files. Phase 9 splits in two if desired. |
| Real Tamagui breaks ported queries (§3.3) | **High — already demonstrated** | D10; and Phase 12 explicitly permits Jest-only specs with a recorded reason rather than forcing a bad port. |
| `@storybook/test`'s `expect` misbehaves under Jest | Low | Proven or disproven in Phase 11 on one file. Fallback: the spec module takes the assertion helpers as a parameter, and each runner passes its own. |
| Storybook build time makes CI unpleasant | Medium | D7 keeps it off the PR path entirely. |
| Order app's bundle regains POS code via a careless barrel | Low | Phase 7 preserves the deep-import discipline in `app/order/*` and moves the app-boundary lint rules with the files. |

## 8. Rollback

Every phase is one PR and one `git revert`. Tracks A and B revert cleanly in reverse order. Track C
adds files and a CI job — reverting Phase 10 disables the Storybook runner and leaves the Jest suite
untouched, since the specs (D11) run under Jest regardless of whether Storybook consumes them.

## 9. Open questions

1. **`handlers/shared/` vs `handlers/hooks/`** — the 13 shared hooks need a home; `shared/` is
   assumed here. Cosmetic; decide in Phase 8.
2. **Story namespace for handlers** — `Handlers/POS/AuthLoginHandler` is assumed, alongside the
   existing `Screens/POS/AuthLoginScreen`. The alternative is nesting the interaction story under
   the screen's own namespace so both appear together in the sidebar.
3. **Should Phase 13 block the TRD's completion?** It is the only phase that writes new test
   coverage rather than relocating existing behaviour.
