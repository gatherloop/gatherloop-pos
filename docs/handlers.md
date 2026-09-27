# Handlers

This is the working note for the handler/controller merge described in
`docs/trd-presentation-layer-architecture.md`. Read the TRD for the full audit and the phased
plan; read this for the rule going forward.

## A new screen gets a handler, not a controller

Every screen's stateful logic — usecase state, router pushes, toasts, printers — lives in its
`<Screen>Handler.tsx`, in one file, unless a hook is genuinely called by two or more handlers.
Do not create a new `*Controller.tsx` — that word, and the `presentation/controllers/` folder
it named, no longer exist in this codebase (see D2a in the TRD). A hook shared by ≥2 handlers
lives in `presentation/handlers/hooks/` instead, named for what it does (`useAuthLogout`, not
`useAuthLogoutController`).

## The promotion rule (D1)

- **One call site → inline it into the handler.** Move the shared hook's effect bodies into the
  handler, merging any effects that key off the same state field, then call `useUsecase` (the
  `Usecase` ↔ `useReducer` bridge, `presentation/handlers/hooks/useUsecase.ts`) directly and
  delete the shared hook file.
- **Two or more call sites → it stays a shared hook in `handlers/hooks/`.** Leave it where reuse
  lives so behaviour isn't duplicated across every caller.
- The rule is symmetric and stays live after the TRD lands: a shared hook that drops back down
  to one caller gets inlined into that handler, and a handler-local effect that gains a second
  caller gets promoted back out to a shared hook.

## The shape (D2)

```tsx
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

Note the effects that fire on the same state end up in the same `useEffect`, instead of split
across a handler and a controller in two files.

## A handler's props are usecases, not repositories (D-order-boundary)

Per `docs/trd-order-handler-usecase-boundary.md`: a handler's props are usecases, plus rarely a
single documented pure display value (e.g. `MenuListHandler`'s SSR-seeded `preparingCount` — a
read-only integer with no repository call or state transition behind it, see that TRD's D6). A
repository never appears in a Handler's prop list. If a handler needs one more side effect or
value than its usecases already expose, that's a usecase missing the responsibility, not a reason
to hand the handler a repository:

- Build the usecase that needs the repository in the composition root (`app/{pos,order}/<X>.tsx`),
  the same place every other usecase in the codebase is constructed, and pass the *usecase* down.
- If a usecase must be reconstructed later once a value becomes known (e.g. a payment reference
  discovered only after another usecase's fetch resolves), don't rebuild it inline in the handler.
  Construct it once in the composition root and re-sync it via a dispatched action instead — see
  `usePaymentCancelSyncedTo` (`presentation/handlers/hooks/usePaymentCancelSyncedTo.ts`) and
  `PaymentCancelUsecase`'s `SYNC_PARAMS` action for the reference shape.

## Browser-lifecycle guards live in `utils/`, not `handlers/hooks/`

`beforeunload` and Next's `router.events` are browser/Next-only APIs, and `.eslintrc.json` bans
`next`/`next/router` from every presentation folder except `libs/ui/src/utils/`. A hook that needs
them — `utils/queryParam.ts`, with a `.native.ts` sibling for the Metro build — belongs there and
returns plain state/callbacks; the handler that calls it maps the result onto screen props exactly
as it would for any other hook. (`useLeaveConfirmation` was this rule's worked example until
`docs/prd-order-history.md` removed it — D9/D10.)
