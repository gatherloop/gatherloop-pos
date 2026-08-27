# Forms

This is the short version of `docs/trd-form-ownership-refactor.md`, kept up to date as the
permanent reference once that refactor is done. Read the TRD for the history and the
per-domain migration log; read this for the rule going forward.

## The rule

> `useForm` is called by the innermost component that owns the fields, and that component is
> mounted only when its `defaultValues` are final. Nothing above it holds a `UseFormReturn`.

Data flows **down as plain values** (`defaultValues`, flags, server error text) and **up as
plain values** (`onSubmit(values)`). Controllers own usecase state and dispatch; they do not
call `useForm`, hold a form resolver, or read `form.getValues` / `useWatch` / `useFieldArray`.
An ESLint rule enforces this: `react-hook-form` and `@hookform/resolvers/zod` are
`no-restricted-imports` inside `libs/ui/src/presentation/controllers/**`.

## The `FormView` contract

`FormView` (`libs/ui/src/presentation/components/base/Form/FormView.tsx`) is the single place
that owns the loading/error gate, the `useForm` call, and the `FormProvider` + Tamagui `<Form>`
wiring:

```tsx
<FormView
  variant={variant}              // { type: 'loading' | 'loaded' } | { type: 'error'; onRetryButtonPress }
  defaultValues={defaultValues}  // read once, at mount of the 'loaded' branch — always final
  resolver={entityFormResolver}  // zodResolver(entityFormSchema), declared at module scope
  onSubmit={onSubmit}
  loadingTitle="Fetching Entity..."
  errorTitle="Failed to Fetch Entity"
>
  {(form) => /* fields, using `form` or useFormContext() */}
</FormView>
```

`useForm` only mounts once `variant.type === 'loaded'`, so `defaultValues` are the fetched
values, not the empty ones a controller would have had at first render. Each form schema lives
in its entity file (`libs/ui/src/domain/entities/<Entity>.ts`), next to the `<Entity>` and
`<Entity>Form` types, with `satisfies z.ZodType<XForm>` unless the schema is a partial
validator (called with `{ raw: true }`), in which case a comment names the fields it
intentionally does not describe instead.

## The `formRef` escape hatch

A handful of surfaces have a genuine cross-boundary need: a sibling controller (e.g. an item or
variant picker) must append rows to a form it does not own. `FormView` exposes an explicit,
opt-in `formRef` for exactly this:

```tsx
formRef?: MutableRefObject<UseFormReturn<T> | null>;
```

`formRef.current` is null until the `loaded` branch mounts — every call site must null-check.

Rules, enforced in review:

- Allowed only for **writes** driven by an event outside the form subtree (`append`, `update`,
  `setValue`).
- Never for reads that feed rendering — use `FieldWatch` / `useFormContext` instead.
- Never for reading submitted values — read `state.values` off the usecase, which the reducer
  already populates on `SUBMIT`.

The sanctioned call sites are fixed at four; adding a fifth requires justifying why the
interaction cannot be expressed declaratively:

- `RentalCheckoutHandler` / `RentalCheckoutScreen`
- `RentalCheckinHandler` / `RentalCheckinScreen`
- `TransactionCreateHandler` / `TransactionCreateScreen`
- `TransactionUpdateHandler` / `TransactionUpdateScreen`
