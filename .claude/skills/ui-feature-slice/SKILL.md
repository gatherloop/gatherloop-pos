---
name: ui-feature-slice
description: >-
  Add or extend a frontend feature slice in libs/ui — entity, repository, finite-state-machine
  use case, handler, screen, story, composition root, page, tests. Use when adding a screen,
  list/create/update/delete flow, or use case to the POS, order, or mobile app, or when asked
  where frontend code for a feature belongs.
---

# ui-feature-slice

87 use cases and 58 handler/screen pairs in `libs/ui` are built to one template. Copying the
template is what keeps a new slice structurally correct — writing one from React instinct
(`useState`/`useEffect` in a handler, a hook-owned form) passes `tsc` and fails review. The
`Budget` slice (`create`/`update`/`list`, POS-only) is the cleanest full example; every path
below is real, not illustrative.

## The file set

| Layer | Path | Barrel |
|---|---|---|
| Entity + zod form schema | `domain/entities/<Entity>.ts` | `domain/entities/index.ts` |
| Repository interface | `domain/repositories/<entity>.ts` | `domain/repositories/index.ts` |
| Use case FSM + test | `domain/usecases/<entity><Action>.ts` `.test.ts` | `domain/usecases/index.ts` |
| API repository + transformer | `data/api/<entity>.ts` `.transformer.ts` | `data/api/index.ts` |
| Mock repository | `data/mock/<entity>.ts` | `data/mock/index.ts` |
| Handler + test | `presentation/handlers/{pos,order}/<X>Handler.tsx` `.test.tsx` | that folder's `index.ts` |
| Screen + story | `presentation/views/screens/{pos,order}/<X>Screen.tsx` `.stories.tsx` | that folder's `index.ts` |
| Form/list view components | `presentation/views/components/<entity>/` | that folder's `index.ts` |
| Composition root | `app/{pos,order}/<X>.tsx` | that folder's `index.ts` |
| Page | `apps/pos-web/src/pages/...` or `apps/order-web/...` | — |

Reference: `domain/entities/Budget.ts`, `domain/repositories/budget.ts`,
`domain/usecases/budget{Create,Update,List}.ts`, `data/api/budget.ts`, `data/mock/budget.ts`,
`presentation/handlers/pos/Budget{Create,Update,List}Handler.tsx`,
`presentation/views/screens/pos/Budget{Create,Update,List}Screen.tsx`, `app/pos/Budget*.tsx`,
`apps/pos-web/src/pages/budgets/**`.

## The use case is a state machine

`extends Usecase<State, Action, Params>` (`domain/usecases/IUsecase.ts`). `State` is a union of
`{ type: '<phase>' }` tags intersected with a shared `Context`. `getNextState` is a pure
`ts-pattern` reducer; side effects live only in `onStateChange`, dispatching a `*_SUCCESS` /
`*_ERROR` action when they settle. Skeleton, trimmed from `budgetCreate.ts`:

```ts
type Context = { errorMessage: string | null; values: BudgetForm };
export type BudgetCreateState =
  ({ type: 'loaded' } | { type: 'submitting' } | { type: 'submitSuccess' } | { type: 'submitError' }) & Context;
export type BudgetCreateAction =
  | { type: 'SUBMIT'; values: BudgetForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export class BudgetCreateUsecase extends Usecase<BudgetCreateState, BudgetCreateAction> {
  params: undefined;
  constructor(private repository: BudgetRepository) { super(); }

  getInitialState(): BudgetCreateState {
    return { type: 'loaded', errorMessage: null, values: { name: '', percentage: 0 } };
  }

  getNextState(state: BudgetCreateState, action: BudgetCreateAction): BudgetCreateState {
    return match([state, action])
      .returnType<BudgetCreateState>()
      .with([{ type: 'loaded' }, { type: 'SUBMIT' }], ([s, { values }]) => ({ ...s, values, type: 'submitting' }))
      .with([{ type: 'submitting' }, { type: 'SUBMIT_SUCCESS' }], ([s]) => ({ ...s, type: 'submitSuccess' }))
      .with([{ type: 'submitting' }, { type: 'SUBMIT_ERROR' }], ([s, { errorMessage }]) => ({ ...s, type: 'submitError', errorMessage }))
      .otherwise(() => state);
  }

  onStateChange(state: BudgetCreateState, dispatch: (action: BudgetCreateAction) => void): void {
    match(state)
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository.createBudget(values)
          .then(() => dispatch({ type: 'SUBMIT_SUCCESS' }))
          .catch(() => dispatch({ type: 'SUBMIT_ERROR', errorMessage: 'Submit failed' }));
      })
      .otherwise(() => {});
  }
}
```

`budgetUpdate.ts` adds the SSR-seeding idiom: `getInitialState` starts `'loaded'` when
`params.budget` was already fetched server-side, `'idle'` otherwise to trigger a client fetch.
`budgetList.ts` adds a `revalidating` phase that refetches without clearing the current list on
screen, and keeps the *stale* data on a failed revalidation rather than surfacing an error.

The reference's own `onStateChange` has `.otherwise(() => { // TODO: IMPLEMENT SOMETHING })` in
all three files — copy the shape, not that line; write an honest no-op (`.otherwise(() => {})`).

## The handler

One `useUsecase(usecase)` per use case it owns; effects that key off the same state field belong
in one `useEffect`; state maps to screen props as plain values. Promotion rule (1 call site →
inline here, ≥2 → `presentation/handlers/hooks/`) and full contract are in `docs/handlers.md`.
`useBudgetList` is the promoted-hook example — it wraps a `useFocusEffect` refetch:

```ts
export const useBudgetList = (usecase: BudgetListUsecase) => {
  const { state, dispatch } = useUsecase(usecase);
  useFocusEffect(useCallback(() => { dispatch({ type: 'FETCH' }); }, [dispatch]));
  return { state, dispatch };
};
```

## Forms

The handler passes `defaultValues` / `onSubmit` / `isSubmitting` / `serverError` down as plain
values and never imports `useForm` (`no-restricted-imports` on every handler folder). The
form component owns `useForm` through `FormView`, with a module-scope `zodResolver`. Full
contract in `docs/forms.md`. The `formRef` escape hatch currently has exactly its four sanctioned
call sites (Transaction Create/Update, Rental Checkin/Checkout) — a new one needs a real
cross-boundary write, not a convenience.

## The screen is pure

Props in, Tamagui JSX out — no usecase, repository, or `next` import
(`no-restricted-imports` in `libs/ui/.eslintrc.json`). A `.stories.tsx` with `fn()` args for
every prop callback ships in the same change as the screen, not as a follow-up.

## Composition root

A plain function, no hooks:

```tsx
export function BudgetCreate() {
  const client = new QueryClient();
  const budgetRepository = new ApiBudgetRepository(client);
  const budgetCreateUsecase = new BudgetCreateUsecase(budgetRepository);
  const authLogoutUsecase = new AuthLogoutUsecase(new ApiAuthRepository());
  return <BudgetCreateHandler budgetCreateUsecase={budgetCreateUsecase} authLogoutUsecase={authLogoutUsecase} />;
}
```

`app/order/**` bans importing `react` outright; POS roots follow the same shape by convention.
A page (`apps/pos-web/src/pages/...`) is `getServerSideProps` (auth-cookie check, plus a
repository prefetch when the composition root takes seeded `params`) and `export default
<CompositionRoot>` — no JSX of its own. Import the repository/entity from `@gatherloop-pos/ui`
and the composition root from `@gatherloop-pos/ui/pos` or `/order`, never from a relative
`libs/ui/src/**` path.

## Tests

- Use case: `new UsecaseTester(usecase)` (`utils/usecase.ts`), dispatch actions, `await
  flushPromises()` from that **same file**, assert on `tester.state`. Drive the error branch
  with `MockXRepository.setShouldFail(true)` — mock repositories are hand-written per file
  (`shouldFail`/`setShouldFail`/`reset`), not a shared base class; copy the shape from a sibling.
- Handler: `@testing-library/react`, real use cases over mock repositories — never a mocked use
  case — asserting on accessible roles. Its `flushPromises` comes from `utils/testUtils.tsx`, a
  different file from the use-case tester's; the two are not interchangeable imports.

## Gotchas

- A file not exported from its folder's `index.ts` is invisible to importers; `tsc` will not
  say why.
- POS and order are separate ESLint-enforced import graphs. The order-handler rules name POS
  hooks explicitly as forbidden imports (e.g. `**/hooks/useBudgetList`) — crossing is a lint
  error, not a review nit.
- No hand-written `useMemo`/`useCallback`/`React.memo`. The one standing exception —
  `useCallback` wrapping a `useFocusEffect` callback — recurs at every promoted list hook, not
  literally once; nothing else in `libs/ui` uses either.
- `data/api/<entity>.ts` imports generated code from `../../../../api-contract/src`, which
  needs an explicit `// eslint-disable-next-line @nx/enforce-module-boundaries` — expected here,
  not a lint failure to silence elsewhere.
- `src/__mocks__/api-contract.ts` is an empty stub (`export {};`), mapped over the real package
  in Jest. `data/api/**` has no tests of its own — the stub exists for files that transitively
  import `api-contract` under test, not for testing the repository itself. A newly generated
  symbol only needs adding there if a UI test ends up importing it.
- `next` / `next/router` are banned everywhere in `libs/ui` except `utils/` (`libs/ui` is
  Metro-bundled for `pos-mobile`).

## Verify

`npx nx run ui:test --testPathPattern=<Entity>`, then `npx nx run ui:storybook` to check the new
story renders.
