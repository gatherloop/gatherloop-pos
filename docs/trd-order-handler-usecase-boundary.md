# TRD — Order app handlers accept usecases, not repositories or raw params

**Status:** proposed
**Scope:** `libs/ui/src/domain/usecases/{tableResolve,orderHistory,orderStatus,checkout}.ts`,
`libs/ui/src/presentation/handlers/order/**`, `libs/ui/src/presentation/handlers/hooks/**`,
`libs/ui/src/app/order/**`, `docs/handlers.md`
**Non-scope:** `libs/ui/src/presentation/views/**` (no screen prop changes), `libs/ui/src/app/pos/**`
and `libs/ui/src/presentation/handlers/pos/**` (POS is not audited here — see §9), any repository
interface (`domain/repositories/**`), `apps/order-web/**` (no page/route changes), any new feature
or UI behaviour
**Date of research:** 2026-09-27 — every count below measured against `claude/relaxed-hawking-ng1h7j`
@ `508f878`

---

## 1. Problem statement

`libs/ui/src/app/order/` holds five composition roots (`MenuList`, `Cart`, `OrderHistory`,
`OrderStatus`, `TableScan`) and, per `docs/trd-order-app-composition-and-ssr.md` §3.1, each is
supposed to do exactly one thing: `new Api*Repository()` → `new *Usecase(repo, params)` → return
one Handler. That TRD's own reference shape (§2.3a, `app/pos/ProductList.tsx` →
`ProductListHandler`) hands the Handler **usecases only** — no repository, no raw config value.

Four of the five order roots don't hold that line:

| Handler | Usecase props | Non-usecase props | Total |
| --- | ---: | ---: | ---: |
| `MenuListHandler` | 4 | 5 (`cartRepository`, `paymentRepository`, `sessionRepository`, `tableCode`, `preparingCount`) | 9 |
| `CartHandler` | 3 | 7 (`paymentRepository`, `sessionRepository`, `enabled`, `enabledMethods`, `cashierLocation`, `tableCode`, `preparingCount`) | 10 |
| `OrderStatusHandler` | 1 | 3 (`paymentRepository`, `sessionRepository`, `cashierLocation`) | 4 |
| `OrderHistoryHandler` | 1 | 1 (`sessionRepository`) | 2 |
| `TableScanHandler` | — | — (no handler; `TableScan.tsx` returns `TableScanScreen` directly) | — |

16 non-usecase props across 4 handlers, of which 8 are repositories. Each repository prop exists
because a handler needs to run one more side effect or read one more value that its usecases don't
expose — for example (`MenuListHandler.tsx:269-286`):

```tsx
useEffect(() => {
  if (tableResolve.state.type === 'resolved' && tableResolve.state.code) {
    sessionRepository.setTableCode(tableResolve.state.code);
  }
}, [tableResolve.state, sessionRepository]);

const boundTableCodeRef = useRef<string | null>(null);
useEffect(() => {
  if (tableResolve.state.type !== 'resolved' || !tableResolve.state.code) return;
  const code = tableResolve.state.code;
  if (boundTableCodeRef.current === code) return;
  boundTableCodeRef.current = code;
  cartRepository.updateTable(code).catch(() => { boundTableCodeRef.current = null; });
}, [tableResolve.state, cartRepository]);
```

Both effects react to `tableResolveUsecase`'s own state and call a repository directly from the
component tree — the exact shape `libs/ui/CLAUDE.md` calls out as the single most expensive
mistake in this codebase ("writing `useState`/`useEffect` in a handler instead of [the usecase]").
`CartHandler` repeats the first effect verbatim (`CartHandler.tsx:86-90`).

A second shape repeats three times almost byte-for-byte — reactively rebuilding a
`PaymentCancelUsecase` from a `pendingPayment`/`payment` that a *different* usecase's state just
produced (`MenuListHandler.tsx:210-230`, `CartHandler.tsx:106-126`,
`OrderStatusHandler.tsx:46-61`):

```tsx
const [paymentCancelUsecase, setPaymentCancelUsecase] = useState(
  () => new PaymentCancelUsecase(paymentRepository, {
    reference: pendingPayment?.partnerReferenceNo ?? '',
    method: pendingPayment?.method ?? 'qris',
  })
);
if (pendingPayment && (pendingPayment.partnerReferenceNo !== paymentCancelUsecase.params.reference
  || pendingPayment.method !== paymentCancelUsecase.params.method)) {
  setPaymentCancelUsecase(new PaymentCancelUsecase(paymentRepository, {
    reference: pendingPayment.partnerReferenceNo,
    method: pendingPayment.method,
  }));
}
```

This is why `paymentRepository` reaches three handlers: it exists solely to let the handler
construct a usecase, which is composition-root work everywhere else in the codebase (55 `app/pos/*`
roots, and `app/order`'s own other four usecase constructions).

A third shape is plain misplaced navigation logic: `OrderHistoryHandler` and `OrderStatusHandler`
call `sessionRepository.getTableCode()` directly to build a router target
(`OrderHistoryHandler.tsx:38-39`, `OrderStatusHandler.tsx:40-41`), and `CartHandler`/`MenuListHandler`
receive a `tableCode` prop that duplicates a value their own `tableResolveUsecase` already carries in
`params.code`. And `enabled`/`enabledMethods`/`cashierLocation` in `CartHandler`, and
`cashierLocation` in `OrderStatusHandler`, are feature-flag/config values read from
`process.env` in the composition root (`Cart.tsx:45-56`, `OrderStatus.tsx:30-31`) and threaded past
the handler as bare props instead of through the usecase `Params` object that already carries
comparable config (`CheckoutUsecase.params.customerName`).

### Root cause

Every one of these repositories and raw params is standing in for state or a side effect that
belongs to a usecase the handler *already holds a reference to*. None of the four handlers is
missing a usecase — they're each doing one usecase's job (or one repository call a usecase should
own) inline, because nothing currently stops it.

---

## 2. Goals and non-goals

### Goals

- **G1.** No handler under `presentation/handlers/order/` receives a repository as a prop.
- **G2.** No handler under `presentation/handlers/order/` receives a raw param that duplicates a
  value already available on a usecase it holds (`tableCode` vs. `tableResolveUsecase.params.code`).
- **G3.** Feature-flag/config values that drive a usecase's own state (`enabled`, `enabledMethods`,
  `cashierLocation`) travel through that usecase's `Params`, not a separate handler prop.
- **G4.** Each phase is one small, reviewable PR, `nx run ui:test` and `npm run lint` green
  throughout, no behaviour change.
- **G5.** `docs/handlers.md` states the rule this TRD establishes, so it doesn't regress silently
  the next time an order screen is touched.

### Non-goals

- **N1. Not touching `libs/ui/src/app/pos/**` or `presentation/handlers/pos/**`.** Nothing in this
  audit claims POS handlers are clean; it is simply out of scope here, named per the user's request
  to scope this to the order app. A POS audit is a separate document if wanted.
- **N2. No repository interface changes.** `CartRepository`, `PaymentRepository`,
  `SessionRepository` keep their current shape; only *who calls them* moves.
  `libs/ui/src/domain/repositories/**` is untouched.
- **N3. `preparingCount` stays a plain prop** — see D6. Not every non-usecase value is a defect.
- **N4. No screen or component prop changes.** Every `*Screen` keeps its current prop surface;
  this is entirely a `handlers/order` + `domain/usecases` + `app/order` change.
- **N5. No SSR/routing changes.** `docs/trd-order-app-composition-and-ssr.md`'s target tree already
  holds; this TRD works inside it.

---

## 3. Current-state audit

### 3.1 Non-usecase handler props, by origin

| Value | Handlers it reaches | What it's for today | Root cause |
| --- | --- | --- | --- |
| `sessionRepository` | MenuList, Cart | `setTableCode(code)` on table resolve | Side effect belongs to `tableResolveUsecase.onStateChange` |
| `cartRepository` | MenuList | `updateTable(code)` on table resolve | Same — a second side effect of the same state transition |
| `sessionRepository` | OrderHistory, OrderStatus | `getTableCode()` to build a nav path | A synchronous repo read that belongs in `getInitialState()`, same pattern `CartUsecase` already uses for `cartQueryRepository.getSelectedItemId()` (`cart.ts:104`) |
| `paymentRepository` | MenuList, Cart, OrderStatus | Construct `PaymentCancelUsecase` reactively from another usecase's derived payment | Usecase construction is composition-root work everywhere else in the codebase |
| `tableCode` | MenuList, Cart | Nav paths + display | Duplicates `tableResolveUsecase.params.code` |
| `enabled`, `enabledMethods`, `cashierLocation` | Cart | Checkout feature flags/config | Belongs in `CheckoutUsecase.params`, not a bare prop, same as `customerName`/`customerWhatsappNumber` already do |
| `cashierLocation` | OrderStatus | Cash-payment instructions | Belongs in `OrderStatusUsecase.params` |
| `preparingCount` | MenuList, Cart | SSR-computed badge count, no client fetch, no repository | Kept — see D6 |

### 3.2 The repeated `PaymentCancelUsecase` reconstruction

The `useState` + conditional `setState` block quoted in §1 is **19–21 lines, duplicated three
times** (`MenuListHandler.tsx:210-236`, `CartHandler.tsx:106-128`,
`OrderStatusHandler.tsx:46-63`), each keyed off a different source usecase's derived payment
(`cart.state.cart?.pendingPayment`, `cart.state.cart?.pendingPayment`,
`orderStatus.state.payment`). `usePaymentCancel` (`handlers/hooks/usePaymentCancel.ts`) already
exists precisely to re-sync a **stable** `PaymentCancelUsecase` instance via a `SYNC_PARAMS` action
(`domain/usecases/paymentCancel.ts:33`, `:98-101`) — every call site bypasses that mechanism by
building a brand-new instance instead, which is the only reason `paymentRepository` needs to reach
the handler at all.

### 3.3 What already holds and is the reference shape

- `menuItemDetailUsecase` and `cartUsecase` are constructed once in the composition root and handed
  to the Handler as plain usecases — no repository follows them in.
- `CartUsecase.getInitialState()` reads `this.cartQueryRepository.getSelectedItemId()` synchronously
  at construction time (`cart.ts:104`) — the exact pattern §4 proposes for `tableCode` in
  `OrderHistoryUsecase`/`OrderStatusUsecase`.
- `usePaymentCancel`'s `SYNC_PARAMS` re-sync mechanism (`usePaymentCancel.ts:9-26`) is unused by any
  of its three call sites today; this TRD is the first thing that exercises it as designed.
- `TableScan.tsx` → `TableScanScreen` is already the target shape with no handler at all; nothing to
  do there.

---

## 4. Target architecture

```
app/order/MenuList.tsx
  new Api*Repository() × 5, new CookieSessionRepository()
  new TableResolveUsecase(publicTableRepository, { code, table }, {
    sessionRepository, cartRepository,   // optional deps, D1
  })
  new MenuListUsecase(...)
  new MenuItemDetailUsecase(...)
  new CartUsecase(...)
  new PaymentCancelUsecase(paymentRepository, { reference: '', method: 'qris' })  // D4 — pendingPayment is never SSR-known here
  → <MenuListHandler
       tableResolveUsecase menuListUsecase menuItemDetailUsecase
       cartUsecase paymentCancelUsecase
       preparingCount                      // D6, the one non-usecase prop left
     />

presentation/handlers/order/MenuListHandler.tsx
  reads tableResolve.state.code instead of a `tableCode` prop            (D3)
  no `useEffect` calling a repository — tableResolveUsecase owns both    (D1)
  usePaymentCancelSyncedTo(paymentCancelUsecase, pendingPayment)         (D4, new shared hook)
  no repository import at all
```

Same shape for `Cart.tsx`/`CartHandler`, `OrderHistory.tsx`/`OrderHistoryHandler`,
`OrderStatus.tsx`/`OrderStatusHandler`. End state, by handler:

| Handler | Props after this TRD |
| --- | --- |
| `MenuListHandler` | `tableResolveUsecase`, `menuListUsecase`, `menuItemDetailUsecase`, `cartUsecase`, `paymentCancelUsecase`, `preparingCount?` |
| `CartHandler` | `tableResolveUsecase`, `cartUsecase`, `checkoutUsecase`, `paymentCancelUsecase`, `preparingCount?` |
| `OrderStatusHandler` | `orderStatusUsecase`, `paymentCancelUsecase` |
| `OrderHistoryHandler` | `orderHistoryUsecase` |

Zero repositories in any handler's prop list. `preparingCount` is the one documented, deliberate
exception (D6).

---

## 5. Design decisions

**D1 — `TableResolveUsecase` takes two optional repository dependencies and owns both table-binding
side effects.**

```ts
constructor(
  repository: PublicTableRepository,
  params: TableResolveParams,
  dependencies: { sessionRepository?: SessionRepository; cartRepository?: CartRepository } = {}
)
```

`onStateChange`, on `{ type: 'resolved', code }`, calls `sessionRepository?.setTableCode(code)`
unconditionally (matches today's every-render-that-changes behaviour) and `cartRepository
?.updateTable(code)` once per resolved code (the existing `boundTableCodeRef` de-dupe moves into the
usecase as an instance field, since the usecase — not the handler — is what must not repeat the
call). `Cart.tsx`'s root passes only `sessionRepository`; `MenuList.tsx`'s passes both, preserving
today's asymmetry (§3.1 in `trd-order-app-composition-and-ssr.md` never bound the cart from the Cart
route either — this TRD does not change that, only where the call lives).

**Alternative rejected: two usecases** (`TableResolveUsecase` + a `TableBindUsecase` wrapping it).
Rejected — it would need its own state machine for what is, today, an unconditional fire-and-forget
call with no visible state, and it would still need to be constructed and wired by every root that
uses `TableResolveUsecase`, buying no clarity over an optional constructor field.

**Alternative rejected: required (non-optional) dependencies.** Would force `OrderHistory.tsx`,
which never constructs a `TableResolveUsecase`, and other hypothetical future callers to pass a
repository they don't use. Optional dependencies default to `{}` and no-op, which is what the four
existing single-purpose repository fields on other usecases (`CartUsecase`'s two, `CheckoutUsecase`'s
one) don't need to model since none of them are conditionally used — this is the first usecase with
a genuinely optional side effect, so it is the first with an optional dependency. If a second
usecase needs the same shape, promote the `{ sessionRepository?, cartRepository? }` object to a
named type instead of inlining it twice.

**D2 — `OrderHistoryUsecase` and `OrderStatusUsecase` take an optional `SessionRepository` and read
`tableCode` once, synchronously, in `getInitialState()`.**

```ts
constructor(
  repository: PaymentRepository,
  params: OrderStatusParams,
  dependencies: { sessionRepository?: SessionRepository } = {}
) { ... }

getInitialState(): OrderStatusState {
  return { ..., tableCode: this.sessionRepository?.getTableCode() ?? null };
}
```

`tableCode` joins `Context` on both usecases. The handler replaces
`sessionRepository.getTableCode()` with `orderStatus.state.tableCode` /
`orderHistory.state.tableCode` when building `menuPath`/`cartPath` — the `/t/${tableCode}` template
literal itself stays exactly where it is (in the handler; it's navigation-target composition, not a
repository read, and screens must not import `next`/`solito`).

This is the same idiom `CartUsecase.getInitialState()` already uses for
`cartQueryRepository.getSelectedItemId()` (`cart.ts:104`) — a synchronous repository read at
construction, not an async fetch — so it introduces no new pattern to the codebase, only extends an
existing one to a second repository interface.

**D3 — `tableCode` stops being a separate `MenuListHandler`/`CartHandler` prop; the handler reads
`tableResolveUsecase.params.code` instead.** The composition root already passes the same `code`
value to both the handler and `tableResolveUsecase`; the second copy is redundant. `params.code` is
readonly and set once at construction, so reading it directly (rather than `tableResolve.state.code`,
which is `null` before resolution) is exactly the intended use of a usecase's `params` field
(`OrderStatusHandler` already reads `orderStatusUsecase.params.reference` this way,
`OrderStatusHandler.tsx:49`).

**D4 — the composition root constructs `paymentCancelUsecase` once, seeded from whatever it already
knows, and a new shared hook re-syncs it — the handler never sees `paymentRepository`.**

The two order-affected roots are not in the same position. `OrderStatus.tsx` is handed an
already-known `payment` on the common path — its loader (`apps/order-web/src/pages/orders/[reference]
.tsx:23-27`) fetches it server-side before the composition root ever runs — so it can seed the real
`reference`/`method` immediately and never dispatch a startup `SYNC_PARAMS` at all:

```ts
// app/order/OrderStatus.tsx
const paymentCancelUsecase = new PaymentCancelUsecase(paymentRepository, {
  reference: payment?.reference ?? '',
  method: payment?.method ?? 'qris',
});
```

`MenuList.tsx`/`Cart.tsx` cannot do the same for `pendingPayment`, and not because anyone forgot to
wire it through: `pendingPayment` lives on the cart, and `docs/trd-order-app-composition-and-ssr.md`
D5 deliberately keeps the cart **out** of server rendering (a session-specific cart in the response
would make it private and uncacheable). There is no server-side moment on those two routes where a
pending payment could be known, so they fall back to the placeholder:

```ts
// app/order/MenuList.tsx, Cart.tsx
const paymentCancelUsecase = new PaymentCancelUsecase(paymentRepository, {
  reference: '', method: 'qris',
});
```

Either way, the sync hook is still required, for three reasons that don't go away just because
`OrderStatus.tsx` starts with the right values in the common case: (a) `OrderStatus.tsx`'s loader can
still hand back `payment: undefined` (a non-"not found" fetch error, same file, line 26), in which
case the real value is only known after the client-side fetch that follows; (b) `MenuList.tsx`/
`Cart.tsx` need it on every load, unconditionally, per D5 above; and (c) even a correctly-seeded
`OrderStatus.tsx` can see a *second*, different pending payment appear later in the same page
session — cancel one QRIS payment, check out again, and the new payment has a new `reference` that
no server-side seed could have anticipated. New hook,
`presentation/handlers/hooks/usePaymentCancelSyncedTo.ts`:

```ts
export function usePaymentCancelSyncedTo(
  usecase: PaymentCancelUsecase,
  target: { reference: string; method: PaymentMethod } | null
) {
  const binding = usePaymentCancel(usecase);
  useEffect(() => {
    if (!target) return;
    if (
      target.reference === binding.state.reference &&
      target.method === binding.state.method
    ) return;
    binding.dispatch({ type: 'SYNC_PARAMS', ...target });
  }, [target?.reference, target?.method, binding.state.reference, binding.state.method, binding.dispatch]);
  return binding;
}
```

Each of the three handlers replaces its ~20-line `useState`/conditional-`setState` block with:

```ts
const paymentCancel = usePaymentCancelSyncedTo(
  paymentCancelUsecase,
  pendingPayment && { reference: pendingPayment.partnerReferenceNo, method: pendingPayment.method }
);
```

`PaymentCancelUsecase.getNextState`'s existing `SYNC_PARAMS` handler only fires `[{ type: 'idle' },
{ type: 'SYNC_PARAMS' }]` (`paymentCancel.ts:98-101`) — unchanged by this TRD, since the object being
synced was always constructed at `idle` in every existing call site too (a re-sync while
`confirming`/`cancelling` never happened before and isn't asked for now).

**Alternative rejected: let the handler keep constructing `PaymentCancelUsecase`, just import it
from a helper function instead of inlining it.** This still needs `paymentRepository` in the
handler's props to call the helper — it launders the repository through a function instead of
removing it. D4 removes it because the *construction* moves to the composition root, where every
other usecase in this codebase is already built.

**D5 — `CheckoutUsecase` and `OrderStatusUsecase` take their feature-flag/config values as
`Params`, not as separate handler props.**

`CheckoutParams` gains `enabled: boolean`, `enabledMethods: PaymentMethod[]`, `cashierLocation:
string`; `CheckoutState`'s `Context` carries them through unchanged (same shape `customerName`
already has — a static value seeded once from params, read by the handler off `state`, never
mutated by `getNextState`). `OrderStatusParams` gains `cashierLocation: string` the same way.
`Cart.tsx`/`OrderStatus.tsx` build these from `process.env` exactly as today and pass them as part
of the usecase's `params` object instead of a sibling handler prop. `CartHandler` computes
`isCheckoutEnabled={checkout.state.enabled && !hasUnavailableItems(cart.state.cart)}` — the
`hasUnavailableItems` half is genuinely a `cartUsecase`-derived value the handler is right to combine
here (§docs/handlers.md: a handler maps *multiple* usecases' states into one screen's props; that's
its job, not a violation).

**D6 — `preparingCount` stays a plain `MenuListHandler`/`CartHandler` prop.** It is computed
server-side in `apps/order-web/src/pages/t/[code]/{index,cart/index}.tsx` by filtering an
already-fetched payments list (`preparingCount: payments.filter(...)`) — there is no client
repository call, no state machine, nothing that changes after mount. Wrapping a single read-only
SSR-seeded integer in a usecase to satisfy G1 literally would add a class, a state type, an action
type and a barrel entry for a value that never transitions — the kind of abstraction
`libs/ui/CLAUDE.md`'s parent file warns against adding "beyond what the task requires." G1/G2 are
about repositories and duplicated usecase state; a prop that is neither is not the problem this TRD
is scoped to fix. If `preparingCount` ever needs a client-side refresh (e.g., live polling), it
becomes a real usecase at that point, on its own merits.

**Alternative considered: fold it into `MenuListUsecase`/`CartUsecase`'s `Params`.** Rejected —
those usecases would carry a field their own state machine never reads or transitions on, purely to
satisfy a "handler = usecases only" rule for a value with no behaviour. D6 accepts one named,
justified exception over a cosmetic one.

---

## 6. Phased delivery

Four PRs, independently revertable, in the order below (each is easiest to review once the previous
one has landed, but none blocks on the others' *code* — only the running total in §4's table assumes
this order). Every phase: `npx nx run ui:test`, `npm run lint` green; no handler test's assertions
change, only its setup (constructing usecases/dependencies differently) — a behaviour change is a
review flag per this TRD's non-goals.

| Phase | Content | Handlers touched |
| --- | --- | --- |
| **P1** | `TableResolveUsecase` absorbs the session/cart table-binding side effects (D1, D3) | MenuList, Cart |
| **P2** | `OrderHistoryUsecase`/`OrderStatusUsecase` absorb `sessionRepository` for `tableCode`; `OrderStatusUsecase` absorbs `cashierLocation` (D2, half of D5) | OrderHistory, OrderStatus |
| **P3** | `CheckoutUsecase` absorbs `enabled`/`enabledMethods`/`cashierLocation` (rest of D5) | Cart |
| **P4** | Shared `usePaymentCancelSyncedTo` hook; composition roots construct `paymentCancelUsecase` up front (D4) | MenuList, Cart, OrderStatus |

### P1 — `TableResolveUsecase` owns table binding

**Touches:** `domain/usecases/tableResolve.ts` (+ `.test.ts`, new dependency-injection tests: a
resolve calls `sessionRepository.setTableCode` and `cartRepository.updateTable` once per code, and
neither when the dependency is omitted); `app/order/{MenuList,Cart}.tsx` (pass the dependencies
object; drop the `tableCode` prop, since D3 reads `tableResolveUsecase.params.code`);
`presentation/handlers/order/{MenuList,Cart}Handler.tsx` (delete both `useEffect`s and the
`sessionRepository`/`cartRepository`/`tableCode` props; read `tableResolveUsecase.params.code`
wherever `tableCode` was used) + their `.test.tsx` (constructor call sites change, no assertion
changes).

**Check:** `MenuListHandler.test.tsx` and `CartHandler.test.tsx` pass unmodified in their
assertions; a new `tableResolve.test.ts` case asserts `MockSessionRepository.setTableCode` and
`MockCartRepository.updateTable` are each called exactly once across two consecutive `resolved`
states with the same code (the de-dupe moving from `boundTableCodeRef` to the usecase must not
regress it).

### P2 — `OrderHistoryUsecase`/`OrderStatusUsecase` own `tableCode` and `cashierLocation`

**Touches:** `domain/usecases/{orderHistory,orderStatus}.ts` (+ tests: `getInitialState().tableCode`
reflects the injected repository; omitted dependency yields `null`); `app/order/{OrderHistory,
OrderStatus}.tsx` (pass `sessionRepository` as a dependency; `OrderStatus.tsx` also moves
`cashierLocation` into `orderStatusUsecase`'s params instead of a sibling prop);
`presentation/handlers/order/{OrderHistory,OrderStatus}Handler.tsx` (drop `sessionRepository` prop
from both, drop `cashierLocation` prop from `OrderStatusHandler`; read `orderHistory.state.tableCode`
/ `orderStatus.state.tableCode` / `orderStatus.state.cashierLocation`) + their `.test.tsx`.

**Check:** existing handler test assertions unchanged; `menuPath`/`cartPath` in both handlers resolve
identically to a table code seeded via the usecase's dependency instead of a direct repository prop.

### P3 — `CheckoutUsecase` owns its feature flags

**Touches:** `domain/usecases/checkout.ts` (`CheckoutParams` gains `enabled`, `enabledMethods`,
`cashierLocation`; `Context`/`getInitialState` carry them through) + `.test.ts`; `app/order/Cart.tsx`
(the three `process.env` reads move from being separate handler-bound locals to fields on
`checkoutUsecase`'s params); `presentation/handlers/order/CartHandler.tsx` (drop the three props,
read `checkout.state.enabled`/`enabledMethods`/`cashierLocation`) + `CartHandler.test.tsx`.

**Check:** `CartHandler.test.tsx`'s existing checkout-flow assertions (payment method selection,
COD cashier-location copy, checkout-button enablement) pass unmodified.

### P4 — Shared `usePaymentCancelSyncedTo`, `paymentRepository` leaves every handler

**Touches:** new `presentation/handlers/hooks/usePaymentCancelSyncedTo.ts` + `.test.ts` (unit-tests
the hook in isolation: dispatches `SYNC_PARAMS` exactly once per distinct `{reference, method}`, not
on every render); `presentation/handlers/hooks/index.ts` (barrel);
`app/order/{MenuList,Cart,OrderStatus}.tsx` (construct `paymentCancelUsecase` alongside every other
usecase, pass it as a handler prop instead of `paymentRepository`; `OrderStatus.tsx` seeds it from
`payment?.reference`/`payment?.method` where known, per D4, instead of the empty placeholder
`MenuList.tsx`/`Cart.tsx` use);
`presentation/handlers/order/{MenuList,Cart,OrderStatus}Handler.tsx` (delete the three duplicated
`useState`/conditional-`setState` blocks, call `usePaymentCancelSyncedTo` instead, drop the
`paymentRepository` prop) + their `.test.tsx` (mock/real `PaymentCancelUsecase` is now constructed
by the test's composition helper, same as the other four usecases already are).

**Check:** the payment-cancel flows in all three handler tests (request → confirm → cancelled/paid,
dismiss) pass unmodified; `rg -n "paymentRepository" libs/ui/src/presentation/handlers/order`
returns nothing; `rg -n "Repository" libs/ui/src/presentation/handlers/order/*.tsx` (excluding
`.test.tsx`) returns nothing at all — the acceptance check for G1. A new `OrderStatusHandler.test.tsx`
case seeds `payment` with a `pending`/cancellable status and asserts no `SYNC_PARAMS`-driven state
change is observable before the cancel button is even pressed — i.e. the seeded value, not the
placeholder, is what's live from first render.

**Also in this phase:** update `docs/handlers.md` — add the rule this TRD establishes ("a handler's
props are usecases, plus rarely a single documented pure display value (D6); a repository never
appears in a Handler's prop list — build any usecase that needs one in the composition root, and
resync it via a dispatched action, not by reconstructing it in the handler").

---

## 7. Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Moving `cartRepository.updateTable`'s de-dupe (`boundTableCodeRef`) into `TableResolveUsecase` changes when it fires, since a class field survives across renders differently than a `useRef` | Low | P1's new test asserts the call count directly across two `resolved` dispatches with the same code; a handler test route through `MenuListHandler.test.tsx` also exercises it end to end |
| `usePaymentCancelSyncedTo`'s dependency array (`binding.state.reference`/`method`) causes an extra dispatch on the render where `PaymentCancelUsecase` first mounts at `idle` with empty `reference` | Medium | The hook's guard compares against `binding.state`, not `usecase.params` — on mount, `target` (from `pendingPayment`) is usually `null` until the cart/order-status usecase resolves, so no `SYNC_PARAMS` fires before a real payment exists; P4's hook unit test covers the "no target yet" and "target arrives" transitions explicitly |
| `OrderStatusUsecase`/`OrderHistoryUsecase` now read a repository synchronously inside `getInitialState()`, which SSR-seeded instances didn't do before | Low | `CartUsecase` already does this for `cartQueryRepository` (D2); `SessionRepository.getTableCode()` reads a cookie/localStorage value, not the network, so it's safe both server- and client-side exactly as `CartUsecase`'s existing call is |
| A reviewer reads `enabled`/`enabledMethods`/`cashierLocation` moving into `CheckoutParams` as scope creep on `CheckoutState.Context`, which so far only held customer-input fields | Low | D5 states the precedent (`customerName`/`customerWhatsappNumber` are already static seed values threaded the same way); the PR description for P3 should point at that existing field, not just at this TRD |

---

## 8. Rollback

Every phase is one PR and one `git revert`; phases are independent enough that reverting P3 (say)
does not require reverting P4, since P4 only touches `paymentCancelUsecase`/`paymentRepository`, a
disjoint prop set from P3's `enabled`/`enabledMethods`/`cashierLocation`. No phase touches a
repository interface, a migration, or a build config, so a revert restores the previous tree exactly.

---

## 9. Deferred

- **A POS-side audit of the same rule.** This TRD is scoped to `app/order` per the request that
  produced it; `app/pos`'s 55 composition roots and their handlers were not audited for the same
  repository-leak pattern. If the same shape exists there, it's the same fix, in a separate document
  — POS's usecases (`ProductListUsecase` and friends) already skew toward more single-repository
  constructors than order's do, so the blast radius may differ enough to warrant its own audit.
- **Whether `PaymentCancelUsecase`'s cancel flow should instead be absorbed as actions on
  `CartUsecase`/`OrderStatusUsecase` directly**, removing the extra usecase (and this TRD's D4
  entirely) in favour of one state machine per screen. Considered and set aside: `PaymentCancelUsecase`
  is already shared source-of-truth for a UI-independent confirm/cancel flow reused by three
  different parent usecases, and folding it into each of them would triplicate its
  `confirming`/`cancelling`/`settled` states instead of the ~20 lines of handler glue this TRD
  removes. Worth a second look only if a fourth caller ever appears.
- **`preparingCount` becoming a real usecase** if it ever needs a client-side refresh — see D6's
  closing note.

## 10. Settled in review

| Question | Outcome |
| --- | --- |
| Why not seed `paymentCancelUsecase.params.reference`/`method` from the server instead of a `SYNC_PARAMS` dispatch after mount? | Do both — `OrderStatus.tsx` seeds from its already-known `payment` where the loader has it (D4, updated), which was a real gap in the first draft. The hook stays regardless: `MenuList.tsx`/`Cart.tsx` never have a server-known `pendingPayment` at all (cart is deliberately not SSR'd, per D5 of `trd-order-app-composition-and-ssr.md`), `OrderStatus.tsx`'s loader can itself return `payment: undefined` on a non-"not found" error, and even a correctly-seeded value can be superseded by a second pending payment later in the same page session. |
