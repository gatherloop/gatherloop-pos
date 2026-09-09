# Handlers

This is the working note for the handler/controller merge described in
`docs/trd-presentation-layer-architecture.md`. Read the TRD for the full audit and the phased
plan; read this for the rule going forward.

## A new screen gets a handler, not a controller

Every screen's stateful logic — usecase state, router pushes, toasts, printers — lives in its
`<Screen>Handler.tsx`, in one file, unless a hook is genuinely called by two or more handlers.
Do not create a new `*Controller.tsx`. `presentation/controllers/` is being emptied out, not
grown.

## The promotion rule (D1)

- **One call site → inline it into the handler.** Move the controller's effect bodies into the
  handler, merging any effects that key off the same state field, then call `useController`
  (the `Usecase` ↔ `useReducer` bridge, `presentation/controllers/controller.ts`) directly and
  delete the controller file.
- **Two or more call sites → it stays a shared hook.** Leave it where reuse lives so behaviour
  isn't duplicated across every caller.
- The rule is symmetric and stays live after the TRD lands: a shared hook that drops back down
  to one caller gets inlined into that handler, and a handler-local effect that gains a second
  caller gets promoted back out to a shared hook.

## The shape (D2)

```tsx
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

Note the effects that fire on the same state end up in the same `useEffect`, instead of split
across a handler and a controller in two files.
