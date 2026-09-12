# libs/ui — frontend slice rules

This loads alongside the root `CLAUDE.md` for changes under `libs/ui`. The root file has the
cross-cutting rules and the doc index; this file is the concrete shape of a frontend slice —
use case, handler, form, screen, tests — with a skeleton for each and the checklist review
actually catches here.

## The use case is a state machine, not a hook

`domain/usecases/<entity><Action>.ts` extends `Usecase<State, Action, Params>`
(`libs/ui/src/domain/usecases/IUsecase.ts`). `getInitialState` returns the first `State`;
`getNextState` is a pure reducer, written as a `ts-pattern` `match([state, action])
.returnType<State>()` over `.with([{ type: ... }, { type: ... }], ...)` cases, ending in a
terminal `.otherwise(() => state)`. `State` is a union of `{ type: '<phase>' }` tags intersected
with a shared `Context` (form values, error message). Side effects — repository calls — live
**only** in `onStateChange`, keyed off `state.type`, and complete by dispatching a `*_SUCCESS` or
`*_ERROR` action. See `domain/usecases/budgetCreate.ts` for the reference shape (create/update
follow it exactly; list/delete are the same idea with fewer states). Writing `useState` +
`useEffect` in a handler instead of this passes `tsc` and gets rejected in review — it is the
single most expensive mistake to make in this repo.

## The handler

`presentation/handlers/{pos,order}/<X>Handler.tsx` calls `useUsecase(usecase)` once per use case
it owns, then does router/toast/printer effects and maps state to screen props. Effects that key
off the same state field belong in one `useEffect`, not split across handlers. Full rule and the
promotion threshold (one call site → inline here; ≥2 → `presentation/handlers/hooks/`, never a
`*Controller`) are in `docs/handlers.md`. A handler never imports `useForm` or
`@hookform/resolvers/zod` — that's `no-restricted-imports` in `libs/ui/.eslintrc.json`.

## Forms

The innermost component that renders the fields owns `useForm`, mounted through `FormView`
(`presentation/views/components/base/Form/FormView.tsx`) once its `defaultValues` are final. The
handler only ever passes `defaultValues` / `onSubmit` / `isSubmitting` / `serverError` down as
plain values. Full contract, the module-scope `zodResolver` convention, and the four fixed
`formRef` call sites for cross-boundary writes are in `docs/forms.md` — read it before adding a
fifth.

## The screen and its components are pure

`presentation/views/screens/**` and `presentation/views/components/**` take props and render
Tamagui JSX: no usecase import, no repository, no `next` (`libs/ui` is Metro-bundled for
`pos-mobile`; `next` may only appear under `utils/`). Enforced by `no-restricted-imports` in
`libs/ui/.eslintrc.json` — that file's `message` text is the authority when a boundary looks
ambiguous. A `.stories.tsx` with `fn()` args ships in the same change as the screen, not as a
follow-up.

## Composition roots and barrels

`app/{pos,order}/<X>.tsx` is a plain function: `new Api*Repository(client)` → `new *Usecase(repo)`
→ return the Handler. `app/order/**` bans importing `react` outright, so no hooks or context in an
order composition root; POS roots follow the same shape by convention. Three public entry
points, and none may reach into another's slice: `@gatherloop-pos/ui` (`src/index.ts`, shared
domain/data), `@gatherloop-pos/ui/pos` (`src/index.pos.ts`), `@gatherloop-pos/ui/order`
(`src/index.order.ts`). Below that, every folder (`domain/entities`, `domain/usecases`,
`domain/repositories`, `data/api`, `data/mock`, each `presentation/**` folder) has its own
`index.ts`. A new file not re-exported from its folder's barrel is invisible to importers and
`tsc` will not tell you why.

## Tests

- Use case: `new UsecaseTester(usecase)` from `libs/ui/src/utils/usecase.ts`, dispatch actions,
  `await flushPromises()` (same file) past the `onStateChange` promise chain, assert on
  `tester.state`. Drive the error branch with `MockXRepository.setShouldFail(true)`
  (`data/mock/`), not by mocking the use case.
- Handler: `@testing-library/react`, rendered with **real use cases over mock repositories** —
  never a mocked use case — asserting on accessible roles (`getByRole('textbox', { name: ... })`).
  This suite imports `flushPromises` from `libs/ui/src/utils/testUtils.tsx` — a different file
  from the use-case tester's; they are not interchangeable imports.
- `libs/ui`'s Jest config stubs `api-contract` entirely (`src/__mocks__/api-contract.ts`), so
  these tests never need codegen — but a newly generated symbol referenced from `data/api/**`
  may need adding to that stub before its test compiles.
- Narrow loop: `npx nx run ui:test --testPathPattern=<Entity>`.

## What lint cannot catch here

- A use case written as `useState`/`useEffect` instead of the FSM shape above.
- A missing `.test.ts` beside a use case, or `.test.tsx` / `.stories.tsx` beside a handler/screen.
- A new file left out of its folder's `index.ts` barrel.
- Hand-written `useMemo`/`useCallback`/`React.memo` for performance — the React Compiler handles
  it (`docs/trd-react-compiler-adoption.md`). The one standing exception is `useCallback` around
  a `useFocusEffect` callback, because the Jest setup has no compiler pass.
- A sixth call site added for the `formRef` escape hatch, or one used for a read instead of a
  write — both are review-only violations of `docs/forms.md`.
