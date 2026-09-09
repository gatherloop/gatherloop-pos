# TRD — Fold controllers into handlers, and split handlers from views

**Status:** proposed
**Scope:** `libs/ui/src/presentation/**`, `libs/ui/src/index*.ts`, `libs/ui/.eslintrc.json`,
`libs/ui/src/app/**` (import paths only), `README.md` and `docs/forms.md` (the paragraphs that teach
the layer names)
**Non-scope:** `libs/ui/src/{domain,data,utils}`, `libs/api-contract`, `libs/provider`, `apps/api`,
any runtime behaviour, any component or screen prop API, the test suites' content, the e2e suites,
running handler tests in Storybook (deferred — see §9)
**Date of research:** 2026-09-09 — every count below measured against `main` @ `02d450b`

No Storybook or Jest configuration change is required by this TRD. `.storybook/main.ts` globs
`../src/**/*.stories.@(ts|tsx)`, and `jest.config.ts` maps modules by package name, not by source
path — both survive the moves untouched.

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

---

## 2. Goals and non-goals

### Goals

1. One screen's stateful logic lives in **one** file (its handler), except where a hook is genuinely
   shared by ≥2 handlers.
2. The presentation tree names the split it already has: stateful handlers apart from pure views.
3. Each phase is one small, reviewable PR that leaves `nx run-many --target=lint,test --all` green.
4. No behaviour change anywhere. Every diff is an inline, a move, or a path that names one.

### Non-goals

- **No prop-API changes.** No screen, component or handler gains, loses or renames a prop.
- **No test rewrites.** Tests move with their subject; their content changes only where an import
  path does. A phase that needs a test edited to stay green has changed behaviour — see D5.
- **No new Nx libraries.** Same reasoning as D8 in `trd-ui-presentation-split-by-app.md`.
- **`domain/`, `data/`, `utils/` are untouched.**
- **No new tests** for the 5 handlers that lack one (`ChecklistSessionDetail`,
  `ChecklistSessionList`, `ChecklistTemplateList`, `PurchaseList`, `StockCheckList`). Worth doing,
  unrelated to this refactor.
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
  (D7).
- **ESLint already pins the app boundary** by path glob (`src/presentation/screens/pos/**` must not
  import `**/screens/order/**`, and vice versa). Those globs are path-coupled and must move with the
  files.
- **Story titles are already namespaced** `Screens/…` (56) and `Components/…` (110), so no story
  needs retitling when its file moves.

---

## 4. Target architecture

```
libs/ui/src/presentation/
  handlers/                       ← stateful: usecases, reducers, effects, router, toast, printer
    hooks/                        ← everything in handlers/ that is not a component (D2b)
      useUsecase.ts               ← the useReducer↔Usecase bridge (was controllers/controller.ts)
      useAuthLogout.ts            ← + the 12 other hooks with ≥2 call sites
      useCouponList.ts
      ...
      index.ts
    pos/
      AuthLoginHandler.tsx
      AuthLoginHandler.test.tsx
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

### Ownership rules (enforced by lint, D9)

| Layer | May import | May **not** import |
| --- | --- | --- |
| `handlers/**` | `domain`, `data`, `utils`, `views/**`, `handlers/hooks` | another app's handlers |
| `handlers/hooks/**` | `domain`, `utils`, `handlers/hooks` | any `handlers/{pos,order}/**` |
| `views/screens/**` | `views/components`, `domain` **entities/forms only** | `handlers/**`, `domain/usecases`, `data/**` |
| `views/components/**` | `views/components`, `domain` entities | `handlers/**`, `data/**` |

---

## 5. Design decisions

**D1 — Inline a controller only when it has exactly one call site.** 71 of 84 qualify. The 13 shared
ones (§1.1) move to `handlers/hooks/`. Inlining `useAuthLogoutController` into its 55 handlers would
duplicate a router push and a toast 55 times; that is the opposite of the goal.

The rule is symmetric and stays live after this TRD: a hook in `handlers/hooks/` that falls back to
a single call site gets inlined into that handler, and a handler's local hook that gains a second
caller moves up into `handlers/hooks/`. `docs/handlers.md` (Phase 1) is where that rule is written
down, because the folder name no longer states it — see D2b.

**D2 — the base hook survives, relocated and renamed `useUsecase`.** It is the actual
`Usecase`↔React binding and is called by all 84 controllers today; it becomes
`handlers/useUsecase.ts`, and the `Controller<State, Action>` type it returns becomes
`UsecaseBinding<State, Action>` (nothing outside `controller.ts` references that type, so the rename
is free). Handlers call it directly:

```tsx
// after
export const AuthLoginHandler = ({ authLoginUsecase }: AuthLoginHandlerProps) => {
  const { state, dispatch } = useUsecase(authLoginUsecase);
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

**D2a — the word "controller" leaves the codebase entirely, and "handler" does not replace it.**
Once `controllers/` is deleted, a surviving `useController` would name a layer that no longer
exists. Two candidate replacements were considered:

- **`useHandler`** — rejected. `Handler` already names a *component* (`AuthLoginHandler`), so
  `useHandler(usecase)` inside `AuthLoginHandler` reads as a handler using a handler, and the
  returned type (`{ state, dispatch }`) would collide with that meaning. Hook convention is that
  `useX` returns an `X`; this hook does not return a handler.
- **`useUsecase`** — chosen. It returns the React binding of a `Usecase`, which is vocabulary
  `domain/` already owns (`IUsecase.ts`, `Usecase<State, Action, Params>`), and it reads correctly
  at every call site: `useUsecase(authLoginUsecase)`. Runner-up was `useStateMachine`, which the
  README's own description of usecases would also support.

There is a second reason not to keep the old name: `Controller` is **already taken** in this
codebase by `react-hook-form`'s `Controller`, imported by six form components
(`base/Form/{InputText,InputNumber,Select,Switch,Textarea}.tsx`, `materials/MaterialFormView.tsx`).
After Phase 9 those files sit under `views/`, one folder away from a hook that would otherwise mean
something entirely different by the same word.

The 13 shared hooks follow the same rule and take no suffix at all: `useAuthLogout`, not
`useAuthLogoutController` and not `useAuthLogoutHandler`. They are plain hooks that happen to be
used by more than one handler.

**D2b — one folder, `handlers/hooks/`, holds `useUsecase` and the 13 shared hooks alike.** An
earlier draft kept `useUsecase` at the root of `handlers/` and put only the 13 in a folder called
`shared/`, on the reasoning that `useUsecase` is the layer's primitive while the other 13 are
feature hooks that outgrew one handler. That distinction is real but thin, and it fights the folder
name: `useUsecase` is used by all 61 handlers, so under any literal reading of "shared" it is the
most shared thing in the layer. Naming the folder for *what it holds* rather than *why* removes the
argument entirely — everything in `handlers/` is either a `*Handler` component or a hook in
`hooks/`.

What this costs: the folder name no longer encodes the promotion rule ("here because ≥2 callers"),
which `shared/` did state. D1 carries that rule instead, and `docs/handlers.md` writes it down.
That is the right trade — a rule that only holds for 13 of 14 files was never safe to infer from a
folder name anyway.

**D3 — `views/` wraps both `components/` and `screens/`.** The request's tree, adopted as-is. It
gives the tree one bit that answers "can this file have side effects?" without opening it, and it
keeps `screens` and `components` — which share the same purity rule — under one root that the lint
rule can target by a single glob.

**D4 — Merge before moving.** Track A (Phases 1–6) deletes 71 files; Track B (Phases 7–9) moves what
remains. In this order Track B never `git mv`s a file that Track A is about to delete, and the merge
diffs stay legible because import paths do not shift underneath them.

**D5 — Existing tests are the behaviour gate for Track A.** Each merge PR must leave the touched
handlers' tests passing **unmodified**. A test that needs editing is evidence the inline changed
behaviour — the fix is the handler, not the test. This is the whole safety net for 71 inlines, so it
is a hard gate, not a preference. 5 handlers have no test (§3.1); their inlines get an extra pass of
manual review naming the state transitions that moved.

**D6 — Every move is a pure rename.** Phases 7–9 change import specifiers, barrel lines, ESLint globs
and nothing else. Reviewers verify with `git diff --stat -M`: the rename score should be 100% for
every moved file, and any file with content changes beyond its import block is a review flag.

**D7 — Handler→component imports stay legal.** Four handlers compose a component and pass it down as
a render prop (§3.2). Forbidding it would force those components into the screen's prop surface for
no benefit. The lint rule constrains the reverse direction (views must not import handlers), which is
the one that matters.

**D8 — Handler tests move with their handlers, into `handlers/{pos,order}`.** A handler test renders
the handler, news up mock repositories and real usecases, and asserts on navigation and toasts — it
tests the stateful half, so it belongs beside it. `views/` then contains no test file at all, only
screens, components and their stories, which is what makes the purity rule in §4 easy to state and
easy to check.

**D9 — Boundaries are lint rules, not conventions.** The existing per-app `no-restricted-imports`
globs in `libs/ui/.eslintrc.json` move to the new paths in Phase 7, and Phase 9 adds the
views-must-not-import-handlers rule from §4. A boundary nothing enforces is exactly the failure mode
`trd-ui-presentation-split-by-app.md` §1.1 already documented for this codebase.

---

## 6. Phased delivery

Nine PRs in two tracks, strictly sequential (D4). Every PR:
`npx nx run-many --target=lint,test --all` green, plus the phase-specific check listed.

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
  becomes a `handlers/hooks/` hook in Phase 8.
- Add `docs/handlers.md`: the rule from D1, the shape from D2, and "a new screen gets a handler, not
  a controller".
- **Check:** `AuthLoginHandler.test.tsx` and the two Budget handler tests pass unmodified (D5).

**Phases 2–6 — the sweep.** Same mechanical recipe per handler:
1. Move the controller's `useEffect`/`useFocusEffect` bodies into the handler, merging effects that
   key off the same state.
2. Replace `useXController(usecase)` with `useController(usecase)` — still under its old name; the
   rename to `useUsecase` happens once, in Phase 8, rather than drifting across six PRs.
3. Delete the controller file and its `controllers/index.ts` line.
4. Leave any controller listed in §1.1 alone.
- **Check per PR:** the touched handlers' existing tests pass **unmodified** (D5), and
  `git diff --stat` shows no change under `screens/*Screen.tsx`, `components/`, `domain/` or `data/`.

After Phase 6, `presentation/controllers/` contains `controller.ts`, `index.ts` and the 13 shared
controllers — 15 files, down from 87.

### Track B — split handlers from views (Phases 7–9)

**Phase 7 — Create `handlers/{pos,order}`.**
- `git mv` 61 handlers + 57 handler test files out of `screens/{pos,order}` into
  `presentation/handlers/{pos,order}` (D8).
- Split `screens/pos/index.ts` (116 lines) into `handlers/pos/index.ts` and a screens-only barrel;
  same for `order`.
- Update `presentation/index.ts`, and the four `app/order/*.tsx` deep imports (§3.2).
- Move the two app-boundary ESLint overrides to the new globs.
- **Check:** `git diff --stat -M` reports 100% rename for all 118 files; `nx run ui:test` runs the
  same 57 test files with the same results.

**Phase 8 — the base hook, the shared hooks, and the vocabulary (D2a, D2b).**
- `controllers/controller.ts` → `handlers/hooks/useUsecase.ts`; `useController` → `useUsecase`,
  `Controller<State, Action>` → `UsecaseBinding<State, Action>`. Touches every handler, all
  mechanically.
- The 13 shared controllers → `handlers/hooks/use<Name>.ts`, dropping the `Controller` suffix
  (`useAuthLogoutController` → `useAuthLogout`). This renames one symbol across 55 handler files —
  mechanical, and the last PR in which that symbol moves.
- Delete `presentation/controllers/` and the controllers ESLint override; port its
  `react-hook-form` / `next` restrictions onto `handlers/**` so the form-ownership rule from
  `trd-form-ownership-refactor.md` keeps its teeth.
- Update the two living docs that teach the old vocabulary — `README.md` (the tree at line 29, the
  layer diagram at 122, and the "a **controller** hook binds a use case's state machine to React"
  paragraph at 131) and `docs/forms.md` (the controller/handler split at lines 13, 38 and 46, plus
  the `no-restricted-imports` path at line 16). Historical PRDs and superseded TRDs keep their
  original wording; they describe what was true when they were written.
- **Check:** `rg -i "controller" libs apps` returns only `react-hook-form`'s `Controller` in the six
  form components and `useToastController` from Tamagui.

**Phase 9 — Create `views/`.**
- `git mv presentation/screens presentation/views/screens` (123 remaining files: 65 screens,
  56 stories, 2 barrels).
- `git mv presentation/components presentation/views/components` (298 files).
- Story `title`s are already `Screens/…` and `Components/…` (§3.2) and stay valid — no Storybook
  reorganisation in this PR.
- Add the D9 rule: `views/**` may not import `handlers/**` or `domain/usecases`.
- **Check:** `nx run ui:build-storybook` succeeds and the sidebar is byte-identical to `main`'s.

Optionally split Phase 9 into 9a (screens) and 9b (components) if a 298-file rename is unwelcome in
one PR; they are independent.

---

## 7. Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| An inline changes effect ordering or dependency arrays and alters behaviour | Medium | D5: existing tests must pass unmodified in every Track A PR. Merge two effects only when they key off the same state field. |
| One of the 5 untested handlers regresses silently | Low–Medium | Four land in Phase 6 (`ChecklistSessionDetail`, `ChecklistSessionList`, `ChecklistTemplateList`, `PurchaseList`) and `StockCheckList` in Phase 3. Both PRs get a manual walkthrough of each moved state transition, named in the PR description, since D5's gate does not cover them. |
| A 298-file rename is unreviewable | Medium | D6: rename-detection means the reviewer reads the barrel and config diff, not 298 files. Phase 9 splits in two if desired. |
| Order app's bundle regains POS code via a careless barrel | Low | Phase 7 preserves the deep-import discipline in `app/order/*` and moves the app-boundary lint rules with the files. |
| Track A and Track B collide if worked in parallel | Medium | They are sequential by D4. If Track B must start early, it can begin at Phase 7 only after Phase 6 merges — there is no safe interleaving. |

## 8. Rollback

Every phase is one PR and one `git revert`, and the tracks revert cleanly in reverse order. No phase
depends on a data migration, a build change or a dependency bump, so a revert restores the previous
tree exactly.

## 9. Deferred — running handler tests in Storybook

The original request had a third item: run each handler test as a Storybook interaction test so it
can be watched in a browser as well as run headless under Jest. It is **out of scope here** — it is a
harness change of a different kind from these two, and bundling it would make every phase larger and
the whole TRD slower to land. Recorded so the groundwork isn't re-done if it comes back:

- **Storybook 8.6 already has what it needs** — `@storybook/addon-interactions` and `@storybook/test`
  are installed, and three component stories (`TransactionFormView`, `RentalCheckoutFormView`,
  `RentalCheckinFormView`) already use `play`. Running them in CI would additionally need
  `@storybook/test-runner`, which is not installed.
- **Module mocking is the blocker.** Handler tests use `jest.mock('solito/router')` and
  `jest.mock('@tamagui/toast')`; neither exists in Storybook. `.storybook/mocks/solito-router.js`
  stubs the router with silent no-ops that record nothing, and `preview.tsx` has no `ToastProvider`.
  Both would need recording mocks shared by the two runners.
- **The two environments render differently.** Jest maps `tamagui` to a 416-line DOM stub
  (`src/__mocks__/tamagui.tsx`); Storybook renders real Tamagui via `@storybook/addon-react-native-web`.
  Verified consequence: `LoginFormView`'s password field uses `secureTextEntry`, so the stub emits
  `<input>` (role `textbox`) while real Tamagui emits `<input type="password">`, which has no implicit
  ARIA role — `getByRole('textbox', { name: 'Password' })` in `AuthLoginHandler.test.tsx` passes
  under Jest and would fail in Storybook. Any shared spec must query by label text or `testID`.
- **The file shape that works** (agreed in review, not built): a `<Handler>.interactions.ts` holding
  one exported object per test case — `{ name, props: () => Props, play: (canvasElement) => … }` —
  with `.test.tsx` and `.stories.tsx` as pure drivers over it. A case must declare its props rather
  than mount itself, because Storybook builds the component tree before `play` runs; `toStory` feeds
  them through CSF `loaders` so a story replay gets a fresh mock repository. `loaders`, `beforeEach`
  and the `loaded` story context all exist in `@storybook/csf` at the locked 8.6 — verified against
  the package, not assumed.

**This work gets easier after the phases above land**, not harder: handler tests will already sit
beside their handlers in `handlers/{pos,order}`, which is where the interaction files would go.

## 10. Open questions

1. **Does `handlers/hooks/` want per-app subfolders?** 11 of the 14 are POS-only; `useCart` and
   `useTableResolve` are order-only, and `useUsecase` belongs to neither. A flat `hooks/` cannot be
   lint-fenced by app the way `handlers/{pos,order}` can, so those two order hooks would sit outside
   the boundary the ESLint globs enforce today. Flat is assumed; revisit in Phase 8 if that looks
   too loose — the shape would be `hooks/{pos,order}/` with `useUsecase` staying at `hooks/`.
