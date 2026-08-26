# TRD — Move `useForm` Ownership from Controllers into Form Components

**Status:** proposed
**Scope:** `libs/ui/src/presentation/{controllers,screens,components}`, `libs/ui/src/domain` (new form-schema module)
**Non-scope:** `libs/ui/src/domain/usecases` state machines, `libs/ui/src/data`, `apps/api`, `libs/api-contract`
**Date of research:** 2026-08-26 (all counts below were measured against `main` @ `013716a`)

---

## 1. Problem statement

Every form in `libs/ui` calls `useForm` inside its **controller hook**, and every controller hook is
mounted by a **handler** that mounts *before* the entity it is editing has been fetched.

`react-hook-form` clones `defaultValues` exactly once, inside `createFormControl`, on the first render
of whatever component calls `useForm`. Later changes to the `defaultValues` prop are never applied —
only the separate `values` prop has a reactive path. So on any client-rendered update screen the form
control is built from the usecase's *empty* initial state:

```ts
// libs/ui/src/domain/usecases/categoryUpdate.ts
getInitialState(): CategoryUpdateState {
  return {
    type: this.params.category !== null ? 'loaded' : 'idle',
    errorMessage: null,
    values: {
      name: this.params.category?.name ?? '',      // ← '' on mobile / order
      station: this.params.category?.station ?? 'NONE',
    },
  };
}
```

```tsx
// libs/ui/src/presentation/controllers/CategoryUpdateController.tsx
const form = useForm({
  defaultValues: state.values,   // ← read once, while state.type === 'idle'
  resolver: zodResolver(...),
});

const hasFilledFormRef = useRef(false);
useEffect(() => {
  if (state.type === 'loaded' && !hasFilledFormRef.current) {
    form.reset(state.values);    // ← the workaround
    hasFilledFormRef.current = true;
  }
}, [state.type, state.values, form]);
```

The `reset`-in-an-effect workaround is present in **17 of 36 form controllers**. It has four costs:

1. **The form is built from the wrong data.** `formState.defaultValues`, `isDirty` and `dirtyFields`
   are computed against `''`/`0`/`[]` until the effect fires. A bare `form.reset()` before that point
   wipes the record instead of restoring it.
2. **It races user input.** The `hasFilledFormRef` guard exists only to stop the reset firing twice.
   It does nothing to stop the *first* reset from discarding whatever the user typed between mount and
   fetch resolution — which is reachable on every screen listed in §3.3 that has no loading gate.
3. **Empty-form flash.** `MaterialUpdateScreen`, `StockCheckUpdateScreen`, `RentalCheckoutScreen` and
   `RentalCheckinScreen` render the form unconditionally — no `LoadingView` gate anywhere in the
   handler, screen or view. On mobile these paint a fully empty form, then snap to the fetched values.
4. **It leaks form internals upward.** Because `useForm` lives in the controller, `UseFormReturn` and
   `UseFieldArrayReturn` are prop-drilled controller → handler → screen → view. Nine controllers go
   further and call `useWatch` / `useFieldArray` / `getValues` / `setValue` directly (§3.2), so
   presentation state now lives in two places.

### 1.1 Why this only bites some surfaces

`apps/web` preloads the entity in `getServerSideProps` and passes it through `*Params`, so
`getInitialState()` returns `type: 'loaded'` with real values and `useForm` mounts correctly:

```tsx
// apps/web/src/pages/categories/[categoryId].tsx
const category = await categoryRepository.fetchCategoryById(categoryId, { ... });
return { props: { categoryUpdateParams: { category, categoryId } } };
```

`apps/mobile` passes `null` for **21** such params (`grep -c ': null,$' apps/mobile/src/app/App.tsx`),
and `apps/order` is a client-rendered SPA. Every client-fetched update form is affected.

### 1.2 Why the test suite did not catch it

The handler tests exercise the *preloaded* path almost exclusively. `CategoryUpdateHandler.test.tsx`
is representative — the only assertion about field contents is:

```tsx
it('should render pre-filled form when category is preloaded', async () => {
  render(<CategoryUpdateHandler {...createProps({ preloaded: true })} />);
  expect(screen.getByDisplayValue('Mock Category 1')).toBeTruthy();
});
```

There is no test that renders with `preloaded: false`, flushes, and then asserts the input holds the
fetched value. That assertion is the regression test this refactor must add (§9.1).

---

## 2. Goals and non-goals

### Goals

- `useForm` is called by the component that renders the fields, and only once the data it needs exists.
- Delete every `hasFilledFormRef` / `form.reset(state.values)` workaround (17 occurrences).
- `UseFormReturn` and `UseFieldArrayReturn` disappear from controller return types, handler props and
  screen props.
- Every form surface has an explicit loading / error gate, including the four that have none today.
- One zod schema per form entity, shared by the create and update paths (currently duplicated).
- Each phase is one small PR that leaves `main` green and shippable.

### Non-goals

- Changing usecase state machines, action shapes or repository calls.
- Changing validation rules or user-visible copy. Schemas move verbatim; any behaviour change is a
  separate PR.
- Upgrading `react-hook-form` (staying on the locked `7.54.2`).
- Adopting React Compiler, or any of the memoization work in `docs/trd-react-compiler-adoption.md`.
  The two are independent; this refactor removes prop-drilled unstable references as a side effect.

---

## 3. Current-state audit

### 3.1 Inventory

36 controllers call `useForm`. 17 carry the reset workaround (all update-shaped), 19 do not.

| Controller | Lines | `reset` workaround | Reads form internals | Tier |
|---|---:|:---:|---:|:---:|
| `AuthLoginController` | 30 | — | 0 | A |
| `BudgetCreateController` | 33 | — | 0 | A |
| `BudgetUpdateController` | 63 | ✓ | 0 | A |
| `CalculationCreateController` | 48 | — | 0 | A |
| `CalculationUpdateController` | 56 | ✓ | 0 | A |
| `CategoryCreateController` | 34 | — | 0 | A |
| `CategoryUpdateController` | 42 | ✓ | 0 | A |
| `ChecklistSessionCreateController` | 37 | — | 0 | A |
| `ChecklistTemplateCreateController` | 52 | — | 0 | A |
| `ChecklistTemplateUpdateController` | 40 | ✓ | 0 | A |
| `CouponCreateController` | 35 | — | 0 | A |
| `CouponUpdateController` | 43 | ✓ | 0 | A |
| `ExpenseCreateController` | 47 | — | 0 | A |
| `ExpenseUpdateController` | 55 | ✓ | 0 | A |
| `MaterialCreateController` | 71 | — | 0 | A |
| `MaterialUpdateController` | 81 | ✓ | 0 | A |
| `ProductCreateController` | 47 | — | 0 | A |
| `ProductUpdateController` | 48 | ✓ | 0 | A |
| `SupplierCreateController` | 35 | — | 0 | A |
| `SupplierUpdateController` | 43 | ✓ | 0 | A |
| `TableCreateController` | 34 | — | 0 | A |
| `TableUpdateController` | 42 | ✓ | 0 | A |
| `TicketCreateController` | 34 | — | 0 | A |
| `TicketUpdateController` | 42 | ✓ | 0 | A |
| `WalletCreateController` | 36 | — | 0 | A |
| `WalletTransferCreateController` | 36 | — | 0 | A |
| `WalletUpdateController` | 66 | ✓ | 0 | A |
| `StockCheckCreateController` | 65 | — | 2 | B |
| `StockCheckUpdateController` | 73 | ✓ | 2 | B |
| `TransactionPayController` | 52 | — | 6 | B |
| `VariantCreateController` | 93 | — | 2 | B |
| `VariantUpdateController` | 96 | ✓ | 2 | B |
| `RentalCheckoutController` | 64 | ✓ | 3 | C |
| `RentalCheckinController` | 85 | ✓ | 5 | C |
| `TransactionUpdateController` | 166 | ✓ | 10 | C |
| `TransactionCreateController` | 160 | — | 10 | C |

*"Reads form internals"* = count of `useFieldArray` / `useWatch` / `form.getValues` / `form.setValue` /
`form.control` references in the controller.

**Tier A (27 controllers)** — the controller only creates the form and hands it out. Migration is a
mechanical prop swap.

**Tier B (5 controllers)** — the controller *derives render state* from the form (progress counters,
cashless sync, field-array mutation helpers). The derivation must move into the view.

**Tier C (4 controllers)** — the *handler* or a *sibling controller* drives the form imperatively
(§3.4). These need an explicit bridge.

### 3.2 Shared form views force create+update to migrate together

Every `*FormView` is consumed by both the create and the update screen, so a PR cannot migrate one
half of a domain:

| Form view | Consumers |
|---|---|
| `BudgetFormView` | `BudgetCreateScreen`, `BudgetUpdateScreen` |
| `CalculationFormView` | `CalculationCreateScreen`, `CalculationUpdateScreen` |
| `CategoryFormView` | `CategoryCreateScreen`, `CategoryUpdateScreen` |
| `ChecklistTemplateFormView` | `ChecklistTemplateCreateScreen`, `ChecklistTemplateUpdateScreen` |
| `CouponFormView` | `CouponCreateScreen`, `CouponUpdateScreen` |
| `ExpenseFormView` | `ExpenseCreateScreen`, `ExpenseUpdateScreen` |
| `MaterialFormView` | `MaterialCreateScreen`, `MaterialUpdateScreen` |
| `ProductFormView` | `ProductCreateScreen`, `ProductUpdateScreen` |
| `StockCheckFormView` | `StockCheckCreateScreen`, `StockCheckUpdateScreen` |
| `SupplierFormView` | `SupplierCreateScreen`, `SupplierUpdateScreen` |
| `TableFormView` | `TableCreateScreen`, `TableUpdateScreen` |
| `TicketFormView` | `TicketCreateScreen`, `TicketUpdateScreen` |
| `TransactionFormView` | `TransactionCreateScreen`, `TransactionUpdateScreen` |
| `VariantFormView` | `VariantCreateScreen`, `VariantUpdateScreen`, `VariantCreateHandler` |
| `WalletFormView` | `WalletCreateScreen`, `WalletUpdateScreen` |
| `ChecklistSessionFormView` | `ChecklistSessionListScreen` (single surface) |
| `LoginFormView` | `AuthLoginScreen` (single surface) |
| `RentalCheckinFormView` | `RentalCheckinScreen` (single surface) |
| `RentalCheckoutFormView` | `RentalCheckoutScreen` (single surface) |
| `WalletTransferFormView` | `WalletTransferCreateScreen` (single surface) |

**Consequence: the unit of migration is a domain, not a screen.** That is also what keeps each PR at
roughly 10 files (2 controllers, 2 screens, 2 handlers, 2 handler tests, 1 view, 1 stories file).

### 3.3 Loading gates today

| Gate location | Domains |
|---|---|
| Inside the form view (`variant.type === 'loaded' ? … : <LoadingView/>`) | Budget, Calculation, Category, Coupon, Expense, Product, Table, Ticket, Variant, Wallet |
| In the screen (`match(variant)`) | ChecklistTemplate |
| **None — form renders during fetch** | **Material, StockCheck, RentalCheckin, RentalCheckout** |
| N/A — no fetch before the form | AuthLogin, ChecklistSession, Supplier, WalletTransfer, TransactionPay |

The four ungated domains are where the bug is *visible*, not merely latent. Adding the gate is part of
their phase, and is the behaviour change reviewers should look for there.

### 3.4 Tier C coupling in detail

`RentalCheckinHandler` is the worst case and sets the requirements for the bridge:

```tsx
// a sibling controller pushes rows into the form
useEffect(() => {
  if (transactionItemSelect.state.type === 'loadingVariantSuccess' &&
      transactionItemSelect.state.selectedVariant) {
    rentalCheckin.onAddItem(                       // → rentalsFieldArray.append(...)
      transactionItemSelect.state.selectedVariant,
      transactionItemSelect.state.amount,
    );
  }
}, [...]);

// the handler reads form values to build a print payload
name: rentalCheckin.form.getValues('name'),
tickets: rentalCheckin.form.getValues('rentals').map(...),
```

The second of these needs no bridge at all: the usecase reducer already stores the submitted values
on `SUBMIT`, so after `submitSuccess` the same data is available as `rentalCheckin.state.values`.
The first one does — see §5.3.

`TransactionCreateHandler` / `TransactionUpdateHandler` have the same shape (`onAddItem` driven by
`transactionItemSelect`, plus `itemsFieldArray` / `couponsFieldArray` prop-drilled into the view).

---

## 4. Target architecture

### 4.1 The rule

> `useForm` is called by the innermost component that owns the fields, and that component is mounted
> only when its `defaultValues` are final. Nothing above it holds a `UseFormReturn`.

Data flows **down as plain values** (`defaultValues`, flags, server error text) and **up as plain
values** (`onSubmit(values)`).

### 4.2 New primitive: `FormView`

New file `libs/ui/src/presentation/components/base/Form/FormView.tsx`, exported from the existing
`base/Form/index.ts` barrel. It is the single place that owns the loading/error gate, the `useForm`
call and the `FormProvider` + Tamagui `<Form>` wiring:

```tsx
export type FormVariant =
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error'; onRetryButtonPress: () => void };

export type FormViewProps<T extends FieldValues> = {
  variant: FormVariant;
  defaultValues: T;
  resolver: Resolver<T>;
  onSubmit: (values: T) => void;
  loadingTitle: string;
  errorTitle: string;
  errorSubtitle?: string;
  children: (form: UseFormReturn<T>) => ReactNode;
};

export function FormView<T extends FieldValues>(props: FormViewProps<T>) {
  return match(props.variant)
    .with({ type: 'loading' }, () => <LoadingView title={props.loadingTitle} />)
    .with({ type: 'error' }, ({ onRetryButtonPress }) => (
      <ErrorView
        title={props.errorTitle}
        subtitle={props.errorSubtitle ?? 'Please click the retry button to refetch data'}
        onRetryButtonPress={onRetryButtonPress}
      />
    ))
    .with({ type: 'loaded' }, () => (
      <LoadedForm
        defaultValues={props.defaultValues}
        resolver={props.resolver}
        onSubmit={props.onSubmit}
      >
        {props.children}
      </LoadedForm>
    ))
    .exhaustive();
}

// Mounted only inside the `loaded` branch, so `useForm` sees final defaultValues.
function LoadedForm<T extends FieldValues>({
  defaultValues, resolver, onSubmit, children,
}: Pick<FormViewProps<T>, 'defaultValues' | 'resolver' | 'onSubmit' | 'children'>) {
  const form = useForm<T>({ defaultValues: defaultValues as DefaultValues<T>, resolver });
  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        {children(form)}
      </Form>
    </FormProvider>
  );
}
```

Why `LoadedForm` is a separate component and not an early return: React must be able to *unmount* the
subtree that calls `useForm` while loading, so that the eventual mount reads the fetched values. An
early `return <LoadingView/>` in the same component that calls `useForm` would break the rules of
hooks; a `key` remount hack (§6.3) would be blunter and harder to reason about.

**Mount stability.** Handlers already collapse `loaded | submitting | submitError | submitSuccess`
into `variant: { type: 'loaded' }` (see `CategoryUpdateHandler`'s `match`). So a submit round-trip
does not remount the form and does not lose in-flight edits. The only remount is
`loading → loaded`, which is exactly the transition we want, and `error → loading → loaded` on retry,
which correctly rebuilds from the refetched entity.

`defaultValues` and `resolver` may be fresh references on every render; both are only consumed at
`LoadedForm` mount, so no memoization is required. Resolvers are still declared at module scope
(§4.4) so this stays obvious.

### 4.3 Per-domain form view, before and after

**Before** (`CategoryFormView`, today):

```tsx
export type CategoryFormViewProps = {
  variant: { type: 'loaded' } | { type: 'loading' } | { type: 'error'; onRetryButtonPress: () => void };
  form: UseFormReturn<CategoryForm>;          // ← removed
  onSubmit: (values: CategoryForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const CategoryFormView = ({ variant, form, onSubmit, ... }) =>
  variant.type === 'loaded' ? (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        …
      </Form>
    </FormProvider>
  ) : variant.type === 'loading' ? <LoadingView title="Fetching Category..." />
    : variant.type === 'error' ? <ErrorView … /> : null;
```

**After:**

```tsx
export type CategoryFormViewProps = {
  variant: FormVariant;
  defaultValues: CategoryForm;                // ← replaces `form`
  onSubmit: (values: CategoryForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const CategoryFormView = (props: CategoryFormViewProps) => (
  <FormView
    variant={props.variant}
    defaultValues={props.defaultValues}
    resolver={categoryFormResolver}
    onSubmit={props.onSubmit}
    loadingTitle="Fetching Category..."
    errorTitle="Failed to Fetch Category"
  >
    {(form) => (
      <>
        <FormErrorBanner message={props.serverError} />
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Field name="station" label="Station">
          <Select items={[
            { label: 'Kitchen', value: 'KITCHEN' },
            { label: 'Bar', value: 'BAR' },
            { label: 'None', value: 'NONE' },
          ]} />
        </Field>
        <Button
          disabled={props.isSubmitDisabled}
          onPress={form.handleSubmit(props.onSubmit)}
          theme="blue"
          icon={props.isSubmitting ? <Spinner /> : undefined}
        >
          Submit
        </Button>
      </>
    )}
  </FormView>
);
```

**Controller after** — the whole form block and the reset effect are gone:

```tsx
export const useCategoryUpdateController = (usecase: CategoryUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);
  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Category Success');
    else if (state.type === 'submitError') toast.show('Update Category Error');
  }, [toast, state.type]);

  return { state, dispatch };
};
```

**Handler after** — `form={…}` becomes `defaultValues={categoryUpdate.state.values}`. The `variant`
mapping is unchanged. Screen props change identically.

### 4.4 Schemas move to `libs/ui/src/domain/forms/`

The zod schemas live in the controllers today, and the create/update pairs are byte-identical
(verified for Category and Wallet; the same holds across Tier A). With `useForm` in the view, the
schema has to move anyway — so move it once, to a place both sides import:

```
libs/ui/src/domain/forms/
  categoryForm.ts     → export const categoryFormSchema = z.object({ … })
  materialForm.ts
  …
  index.ts
```

and next to each form view:

```ts
const categoryFormResolver = zodResolver(categoryFormSchema);
```

Schemas move **verbatim**. A schema that differs between create and update stays as two named exports
in the same file rather than being unified — unifying validation rules is a product decision and is
out of scope here.

### 4.5 Tier B: derived state moves into the view

`StockCheckUpdateController` today:

```tsx
const watchedItems = useWatch({ control: form.control, name: 'items' });
const total = watchedItems.length;
const filled = watchedItems.filter((item) => item.currentStock !== null).length;
const pendingRows = watchedItems.map((item) => item.currentStock === null);
```

These are **render values derived from form state**, not usecase state, so they belong in the view.
The base primitives for this already exist and need no changes:

- `FieldWatch` (`base/Form/FieldWatch.tsx`) — render-prop over `useWatch`.
- `FieldArray` (`base/Form/FieldArray.tsx`) — render-prop over `useFieldArray`.
- `useFormContext` — already used inside `MaterialFormView`'s `PurchaseTypeFields`.

So `total` / `filled` / `pendingRows` become a `<FieldWatch name={['items']}>` inside
`StockCheckFormView`, and `query` / `showOnlyPending` become `useState` in that same component (they
are pure view state that never leaves the view). `TransactionPay`'s cashless→`paidAmount` sync becomes
an effect inside the alert component, with `transactionTotal` passed in as a plain prop.
`Variant`'s `onAddMaterial` / `onRemoveMaterial` already take the field array as an argument, so they
move into the view essentially unchanged.

### 4.6 Tier C: the `formRef` bridge

Four surfaces have a genuine cross-boundary need: a *sibling* controller's state change must append
rows to the form (item/variant selection in Rental Checkin/Checkout and Transaction Create/Update).
Those sibling controllers are owned by the handler and cannot be moved into the form view.

Add an **explicit, opt-in, documented** escape hatch to `FormView`:

```tsx
export type FormViewProps<T extends FieldValues> = {
  …
  /**
   * Escape hatch for surfaces where a sibling controller must drive the form
   * imperatively. `current` is null until the loaded branch mounts — always
   * null-check. Do not use this to read values for rendering; use FieldWatch.
   */
  formRef?: MutableRefObject<UseFormReturn<T> | null>;
};
```

`LoadedForm` assigns `formRef.current = form` during layout effect and clears it on unmount.

Rules, enforced in review:

- Allowed only for **writes** driven by an event outside the form subtree (`append`, `update`, `setValue`).
- Never for reads that feed rendering — use `FieldWatch` / `useFormContext`.
- Never for reading submitted values — read `state.values` from the usecase, which the reducer already
  populates on `SUBMIT` (this is how `RentalCheckinHandler`'s print payload stops using `getValues`).
- The list of allowed call sites is fixed at four and recorded in §7 Phase 20; adding a fifth requires
  justifying why the interaction cannot be expressed declaratively.

A `formRef` is preferred over an `onFormReady(form)` callback because it cannot trigger a render loop
and does not require the handler to hold form state.

---

## 5. Design decisions and rejected alternatives

### 5.1 Chosen: mount the form only when values are final

Pros: the fix is structural, not a patch; `defaultValues`, `isDirty` and `dirtyFields` become correct
for free; the reset workaround and its ref guard disappear; form internals stop being prop-drilled.
Cons: 20 domains must be touched; four Tier-C surfaces need the bridge in §4.6.

### 5.2 Rejected: `useForm({ values })`

`react-hook-form` 7.54 supports a reactive `values` prop. Keeping `useForm` in the controller and
passing `values: state.values` would sync the fetched data in.

Rejected because: it keeps form ownership in the controller (which is what this refactor is about);
it re-applies on **every new reference** of `state.values`, so it silently clobbers user edits unless
paired with `resetOptions: { keepDirtyValues: true }` — a subtlety a reviewer will not catch on the
20th copy; and it does nothing about the empty-form flash on the four ungated screens, nor about the
prop-drilled `UseFormReturn`.

Kept as a **documented fallback** for any single form where remount-on-load turns out to be
unacceptable (none identified).

### 5.3 Rejected: `key`-based remount

`<CategoryFormView key={state.type === 'loaded' ? 'loaded' : 'loading'} … />` would force a remount
after load with `useForm` left in place. Rejected: it remounts the entire view (losing local UI state
such as open sheets), it is invisible at the definition site, and it leaves every other problem
in place.

### 5.4 Rejected: a `useEntityForm` shared hook in `controllers/`

A hook that wraps `useForm` + `reset` + the ref guard would delete duplication but keeps the form
mounted before its data exists — the actual defect — and keeps the prop drilling. It is the workaround,
generalized.

### 5.5 Accepted consequence: `isDirty` semantics change

Today `isDirty` is true for any loaded update form the moment `reset` lands with different values than
the mount-time blanks — because it is measured against blanks. After this change it is measured
against the fetched entity, i.e. it means what it says. Nothing in the codebase reads `isDirty` today
(`grep isDirty libs/ui/src` → no hits outside `node_modules`), so this is a latent-correctness win with
no call sites to update.

---

## 6. Cross-cutting mechanics each phase must follow

1. **Move the schema** to `libs/ui/src/domain/forms/<entity>Form.ts`, verbatim, exported from the
   barrel. Delete both controller copies. Declare `const <entity>FormResolver = zodResolver(schema)`
   at module scope next to the form view.
2. **Rewrite the form view** onto `FormView` (§4.2/4.3). `variant` prop type becomes the shared
   `FormVariant`.
3. **Add the gate** if the domain has none (Material, StockCheck, RentalCheckin, RentalCheckout): the
   handler maps usecase state to `variant` using the same `match` shape as `CategoryUpdateHandler`.
4. **Strip the controller**: delete `useForm`, the resolver, `hasFilledFormRef` and its effect;
   remove `form` from the returned object. Tier B additionally moves derivations into the view.
5. **Strip screen and handler props**: `form: UseFormReturn<T>` → `defaultValues: T`, sourced from
   `<controller>.state.values`. Remove now-unused `react-hook-form` imports.
6. **Update stories**: story files currently build a throwaway `useForm` in a decorator; replace with
   a `defaultValues` object. 23 story files are affected in total.
7. **Update component tests**: 7 test files build a form and pass it in; they switch to `defaultValues`.
8. **Add the async-default regression test** (§9.1) to that domain's update handler test.
9. Run `npx nx test ui`, `npx nx lint ui`, `npx nx build-storybook ui` before pushing.

---

## 7. Phase plan

Every phase is one PR. Every phase leaves `main` green: `FormView` is additive, and domains are
migrated whole, so no phase leaves a half-converted domain. Phases 3–11 touch disjoint files and can
be worked in parallel or reordered freely.

| # | Phase | Tier | Files | Depends on |
|---|---|:---:|---:|---|
| 1 | `FormView` primitive + `domain/forms` module skeleton | — | ~6 | — |
| 2 | Category (reference migration) | A | ~10 | 1 |
| 3 | Table + Ticket | A | ~20 | 2 |
| 4 | Coupon + Budget | A | ~20 | 2 |
| 5 | Wallet + WalletTransfer | A | ~15 | 2 |
| 6 | Supplier + AuthLogin | A | ~15 | 2 |
| 7 | ChecklistSession | A | ~6 | 2 |
| 8 | Expense | A | ~10 | 2 |
| 9 | Calculation | A | ~10 | 2 |
| 10 | Product | A | ~10 | 2 |
| 11 | Material (+ add loading gate) | A | ~10 | 2 |
| 12 | ChecklistTemplate | A | ~10 | 2 |
| 13 | StockCheck (+ add loading gate) | B | ~12 | 2 |
| 14 | TransactionPay | B | ~6 | 2 |
| 15 | Variant | B | ~12 | 2 |
| 16 | Rental Checkout (+ gate, introduces `formRef`) | C | ~10 | 2 |
| 17 | Rental Checkin (+ gate) | C | ~10 | 16 |
| 18 | Transaction Update | C | ~10 | 16 |
| 19 | Transaction Create | C | ~12 | 18 |
| 20 | Cleanup + guardrail | — | ~8 | 19 |

### Phase 1 — `FormView` primitive + `domain/forms` module skeleton

**Adds**
- `libs/ui/src/presentation/components/base/Form/FormView.tsx` (`FormView`, `FormVariant`, `LoadedForm`).
- `libs/ui/src/presentation/components/base/Form/FormView.stories.tsx` — loading, error, loaded.
- `libs/ui/src/presentation/components/base/Form/FormView.test.tsx` — see acceptance below.
- `libs/ui/src/domain/forms/index.ts` (empty barrel) + export from `libs/ui/src/domain/index.ts`.
- Export `FormView` / `FormVariant` from `base/Form/index.ts`.

**Does not change any existing component.** No `formRef` yet — that lands in Phase 16 with its first
real consumer, so an unused API never sits in `main`.

**Acceptance**
- A test mounts `FormView` with `variant: 'loading'` and `defaultValues: { name: '' }`, rerenders with
  `variant: 'loaded'` and `defaultValues: { name: 'Fetched' }`, and asserts the input shows `Fetched`.
  This test fails against the old pattern and is the executable statement of the bug.
- Submitting invalid values surfaces the resolver's message; `onSubmit` receives parsed values.
- `loaded → loaded` rerenders with a different `defaultValues` reference do **not** reset the field
  (no remount, edits preserved).

### Phase 2 — Category (reference migration)

The template every later phase copies. Small, fully gated, two flat fields.

**Changes**: `domain/forms/categoryForm.ts` (new, schema moved from both controllers);
`CategoryFormView.tsx` + `.stories.tsx`; `CategoryCreateController.tsx`, `CategoryUpdateController.tsx`;
`CategoryCreateScreen.tsx`, `CategoryUpdateScreen.tsx`; `CategoryCreateHandler.tsx`,
`CategoryUpdateHandler.tsx`; `CategoryCreateHandler.test.tsx`, `CategoryUpdateHandler.test.tsx`.

**Acceptance**
- New test in `CategoryUpdateHandler.test.tsx`: render with `preloaded: false`, flush, assert
  `getByDisplayValue('Mock Category 1')` and that the station select shows the fetched value.
- All existing Category handler tests pass unmodified except for prop renames.
- `grep -r "useForm" libs/ui/src/presentation/controllers/Category*` → no hits.
- The PR description links this TRD and says "reference migration — reviewers, this is the shape".

### Phases 3–12 — Tier A domains

Mechanical repetition of Phase 2 per §6. Domains are grouped so each PR stays near ~10–20 files.

Phase-specific notes:

- **Phase 5 (Wallet + WalletTransfer)** — `WalletTransferFormView` has no fetch; its `variant` is
  always `{ type: 'loaded' }`. Keep the prop for uniformity rather than special-casing.
- **Phase 6 (Supplier + AuthLogin)** — `LoginFormView` likewise. Include it here so no form view is
  left on the old pattern.
- **Phase 10 (Product)** and **Phase 12 (ChecklistTemplate)** — larger views (305 / 235 lines) but
  Tier A; the diff is prop plumbing plus one indentation level for the render prop. Reviewers should
  read these with whitespace changes hidden.
- **Phase 11 (Material)** — **behaviour change**: adds the missing loading gate.
  `MaterialUpdateScreen` currently renders the form during fetch. `MaterialUpdateHandler` gains the
  same `match(state) → variant` mapping as `CategoryUpdateHandler`, and `MaterialFormView` gets
  `loadingTitle="Fetching Material..."` / `errorTitle="Failed to Fetch Material"`.
  `PurchaseTypeFields` already uses `useFormContext` and is unaffected. Call this out in the PR body.
- **Phase 12 (ChecklistTemplate)** — the gate currently lives in `ChecklistTemplateUpdateScreen`'s
  `match`; move it into the view's `FormView` so the pattern is uniform.

**Acceptance (all Tier A phases)**
- Async-default regression test added to each update handler test in the phase.
- No `UseFormReturn` in the phase's controller, screen or handler files.
- Storybook renders all three variants for each migrated view.

### Phase 13 — StockCheck (Tier B)

**Also adds the missing loading gate.**

- `query`, `showOnlyPending`, `toggleShowOnlyPending` → `useState` inside `StockCheckFormView`.
- `total` / `filled` / `pendingRows` → `<FieldWatch name={['items']}>` inside the view.
- Controllers return `{ state, dispatch }` only.
- `StockCheckFormView.test.tsx` and `StockCheckItemRow.test.tsx`/`.stories.tsx` switch to `defaultValues`.

**Acceptance**: with `preloaded: false`, after flush the progress counter reads the fetched item count
(today it reads `0 / 0` until the reset lands), and each row shows its fetched `currentStock`.

### Phase 14 — TransactionPay (Tier B)

- `isCashless` / `paidAmount` `useWatch` pair and the `setValue` sync effect move into
  `TransactionPaymentAlert`.
- `transactionTotal` is passed to the view as a plain number and used to build the resolver there.
  Note `useForm`'s `resolver` is re-read from props on rerender (unlike `defaultValues`), so a
  `transactionTotal` that changes after mount is honoured.
- `TransactionPaymentAlert.test.tsx` / `.stories.tsx` updated.

**Acceptance**: selecting a cashless wallet still forces `paidAmount` to the transaction total;
selecting a cash wallet leaves the user's entry alone.

### Phase 15 — Variant (Tier B)

- `onAddMaterial` / `onRemoveMaterial` (which already receive the field array as a parameter) move
  into `VariantFormView`.
- `isMaterialSheetOpen` / `onMaterialSheetOpenChange` are pure view state → `useState` in the view.
- `VariantCreateHandler` also renders `VariantFormView` directly; update that call site too.

**Acceptance**: adding a material already in the list still increments its amount rather than
appending a duplicate; the material sheet still closes on add.

### Phase 16 — Rental Checkout (Tier C, introduces `formRef`)

**Adds the missing loading gate** and the `formRef` prop on `FormView` (§4.6) plus its test.

- `rentalsFieldArray` moves into `RentalCheckoutFormView` via the existing `FieldArray` primitive.
- `RentalCheckoutHandler` keeps its `transactionItemSelect` effect but writes through
  `formRef.current?.setValue` / the field array exposed on it, null-checked.

**Acceptance**: `FormView.test.tsx` gains a case asserting `formRef.current` is null while loading and
populated once loaded; selecting a variant still appends a rental row.

### Phase 17 — Rental Checkin (Tier C)

Same as Phase 16, plus:

- The print payload in `RentalCheckinHandler` stops calling `form.getValues('name' | 'rentals')` and
  reads `rentalCheckin.state.values` instead — the reducer already stores the submitted values on
  `SUBMIT` (`rentalCheckin.ts`, the `[{type:'loaded'},{type:'SUBMIT'}]` branch).
- `onToggleCustomizeCheckinDateTime` (a `setValue` on `checkinAt`) moves into the view; it is driven
  by a switch rendered inside the form.
- `RentalCheckinCartView` and its stories/tests move to `defaultValues`.

**Acceptance**: the checkin slip still prints the entered name and every rental code; the
print-confirmation dialog still shows exactly once (the `hasShownPrintDialogRef` guard is untouched).

### Phase 18 — Transaction Update (Tier C)

- `itemsFieldArray` / `couponsFieldArray` move into `TransactionFormView` (they are already consumed
  only there and in `TransactionCartView`).
- `onAddCoupon` / `onRemoveItemCoupon` move into the view; they only read/write form state and
  `applyCouponToBase`.
- `isCouponSheetOpen` / `couponSheetItemIndex` are view state → `useState` in the view.
- `onAddItem` stays in the handler and writes through `formRef`.

Because `TransactionFormView` is shared, this phase must keep `TransactionCreateScreen` compiling
against the new props while `TransactionCreateController` still owns its own form. Bridge that for one
PR by having `TransactionCreateHandler` pass `defaultValues={transactionCreate.state.values}` and drop
its now-unused `form` plumbing in Phase 19 — or, if that proves awkward in review, merge Phases 18 and
19 into one PR. **Decide this when Phase 18 is opened, not before**; the fallback (one combined PR of
~20 files) is acceptable.

### Phase 19 — Transaction Create (Tier C)

- `TransactionCreateController` reduced to `{ state, dispatch }` plus its non-form concerns.
- `TransactionPaymentAlert` interaction after `submitSuccess` unchanged — `TransactionFormView`
  already handles the "close cart sheet before the payment dialog opens" ordering during render, and
  that logic does not move.

**Acceptance**: the full create flow (add item → apply coupon → submit → payment alert) passes its
existing handler tests plus the async-default test.

### Phase 20 — Cleanup and guardrail

- Add to `libs/ui/.eslintrc.json` an override for
  `libs/ui/src/presentation/controllers/**` with
  `no-restricted-imports: ['react-hook-form', '@hookform/resolvers/zod']`, so the pattern cannot
  regress.
- Delete any remaining `react-hook-form` imports from `screens/*Screen.tsx`.
- Add a short "Forms" section to `docs/` (or a `CLAUDE.md`, if one is introduced) stating the rule in
  §4.1, the `FormView` contract, and the four sanctioned `formRef` call sites.
- Final verification sweep (§10).

---

## 8. What each PR should look like

- **Title:** `refactor(ui): move useForm into <Domain> form view (phase N)`
- **Body:** link to this TRD and the phase; state Tier; list any behaviour change (added loading gate,
  moved derivation) explicitly under a "Behaviour changes" heading; state "none" when there are none.
- **Diff hygiene:** the render-prop conversion re-indents the whole field block. Do the indentation
  and the logic change in the *same* commit but call out in the body that the view diff is mostly
  whitespace, so reviewers use "hide whitespace".
- **Never** mix a validation-rule change into a migration PR.

---

## 9. Testing strategy

### 9.1 The regression test every update domain gets

Added to each `<Domain>UpdateHandler.test.tsx`, using the existing `createProps` helper with
`preloaded: false`:

```tsx
it('should fill the form with fetched values when data loads after mount', async () => {
  render(<CategoryUpdateHandler {...createProps()} />);   // preloaded: false

  await act(async () => { await flushPromises(); });

  expect(screen.getByDisplayValue('Mock Category 1')).toBeTruthy();
});
```

This fails on `main` for the four ungated domains and passes-by-accident (via `reset`) for the gated
ones; after the refactor it passes structurally for all of them. Where a domain's `createProps` does
not yet support a non-preloaded path, extend it in that phase.

### 9.2 Existing coverage to keep green

- 55 handler tests in `libs/ui/src/presentation/screens/*.test.tsx`.
- 7 component tests that construct a form (`RentalCheckin*`, `RentalCheckout*`, `StockCheck*`,
  `TransactionFormView`, `TransactionPaymentAlert`) — these switch from `form={...}` to
  `defaultValues={...}` and thereby get *simpler*.
- 23 story files that build a throwaway form in a decorator — same simplification.
- Usecase tests (`libs/ui/src/domain/usecases/*.test.ts`) are untouched; no state machine changes.

### 9.3 Manual verification per phase

On `apps/order` (pure client fetch, worst case): open the domain's update screen cold, confirm a
loading view is shown, then the form appears already populated with no flash of empty fields, and that
typing during the fetch window is impossible (the form is not mounted yet).

---

## 10. Risks

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | A `variant` mapping accidentally treats `submitting`/`submitError` as not-loaded, remounting the form mid-submit and losing edits | Medium | Copy `CategoryUpdateHandler`'s `match` verbatim; Phase 1's test asserts no reset on `loaded → loaded`; each phase's "does not disable submit / shows spinner" test would fail loudly |
| R2 | Field arrays behave differently when built from real data at mount instead of `reset` | Low | `useFieldArray` reads `_defaultValues` at mount — this is the *supported* path, the current one is the workaround. Covered by Rental/Transaction/Variant/StockCheck tests |
| R3 | Tier C `formRef` is null when a sibling controller fires early | Medium | Null-check at every call site; the sibling effects only fire after a user selection, which is only reachable once loaded. Phase 16 adds an explicit test |
| R4 | Story/test churn (30 files) hides a real behaviour change | Medium | One domain per PR; behaviour changes stated explicitly in the PR body; whitespace-hidden review |
| R5 | `apps/web` SSR path regresses | Low | SSR preloads the entity, so `variant` is `loaded` on first render and the form mounts immediately — the same as today. Web e2e (`apps/web-e2e`) run per phase |
| R6 | The four newly-gated domains change perceived UX (a loading view where a blank form used to be) | Certain — intended | Called out per phase; this is the fix, not a side effect |
| R7 | Phase 18/19 split leaves `TransactionFormView` half-migrated | Medium | Explicit fallback: merge 18 and 19 into one PR (§7 Phase 18) |

---

## 11. Definition of done

- `grep -rl "useForm" libs/ui/src/presentation/controllers/` returns nothing.
- `grep -rn "hasFilledFormRef" libs/ui/src/` returns nothing.
- `grep -rn "UseFormReturn\|UseFieldArrayReturn" libs/ui/src/presentation/screens/` returns nothing.
- Every `*FormView` renders a loading and an error state.
- Every update domain has the §9.1 async-default test.
- `npm run lint` and `npm test` green; `nx build-storybook ui` green; `apps/web-e2e` green.
- The ESLint guard from Phase 20 is in place.
