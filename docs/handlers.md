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

## Browser-lifecycle guards live in `utils/`, not `handlers/hooks/`

`beforeunload` and Next's `router.events` are browser/Next-only APIs, and `.eslintrc.json` bans
`next`/`next/router` from every presentation folder except `libs/ui/src/utils/`. A hook that needs
them — `utils/queryParam.ts`, with a `.native.ts` sibling for the Metro build — belongs there and
returns plain state/callbacks; the handler that calls it maps the result onto screen props exactly
as it would for any other hook. (`useLeaveConfirmation` was this rule's worked example until
`docs/prd-order-history.md` removed it — D9/D10.)
