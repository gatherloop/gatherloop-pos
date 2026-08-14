# Product & Variant Availability

> Status: **Proposed** — design only. No production code, schema, or migration has been written for this feature yet.
> Location convention: this repository keeps product requirement docs as `docs/prd-<feature>.md` (see `docs/prd-product-draft-status.md`, `docs/prd-material-stock-check-flag.md`). This file follows that convention.

---

## 1. Problem Statement

Gatherloop is a small board game cafe. During service, individual menu items run
out: the Tiramisu pancong batter is gone by 3pm, the cheese for Cireng Keju
finishes, the soft cookies sell out entirely. Right now the POS has **no way to
represent "we cannot sell this right now"**.

The only nearby concept is `products.status` (`draft` | `published`, shipped by
`docs/prd-product-draft-status.md`). That field answers *"is this item part of
the menu?"* — a slow, deliberate, admin-level decision made in the product edit
form. It does **not** answer *"can we make this right now?"*, which is a fast,
reversible, several-times-a-day decision made by whoever is on shift.

Today staff work around the gap verbally ("tell them Tiramisu is finished"),
which fails in the obvious ways: the item still appears in the transaction item
grid, a new staff member sells it, and the customer gets an apology instead of a
snack.

We need a **sold-out flag** — the smallest possible representation of temporary
unavailability — that staff can flip in one or two taps and flip back just as
fast, at both the product and the variant level.

The staff mental model must stay:

> "This item is sold out."

and must never become:

> "I need to keep the stock level of this item up to date."

---

## 2. Context

### 2.1. The menu shape

A `Product` is a menu concept (Pancong, Cireng, Americano, a board game title).
A `Variant` is the actually-sellable thing (Pancong Tiramisu, Cireng Keju).
Variants carry the price, the material recipe, and — for rentals — the pricing
tiers. Products with a single unnamed variant behave like "products without
variants" from the staff's point of view.

Real examples from the brief:

| Product | Variants |
|---|---|
| Pancong | Original, Tiramisu, Matcha |
| Cireng | Original, Rujak, Keju, Balado |
| Americano | (single / no meaningful variants) |

### 2.2. Operating constraint

Staff are not inventory clerks. They will not maintain quantities, and they will
not scroll a wall of switches. Anything that requires steady-state maintenance
will silently rot and become worse than nothing (stale "available" flags are
more harmful than no flags, because they are believed).

Therefore the design principle for the whole feature is:

> **Available is the default and costs zero interaction. Only exceptions are
> touched, and an exception costs at most 2–3 taps to create and 2–3 taps to
> undo.**

### 2.3. Scale

The cafe menu is on the order of tens of products and low hundreds of variants.
Every design decision below assumes that scale: no denormalized counters, no
caching layer, no pagination gymnastics, no indexes that only pay off at 10^5
rows.

---

## 3. Goals

1. Represent, per product, whether it is currently sellable (`available` / `sold_out`).
2. Represent, per variant, an **exception** to its product's state.
3. Define one unambiguous rule for **effective availability** of a variant, computed in exactly one place per stack (Go + TypeScript), so future consumers cannot disagree with each other.
4. Give staff a single dedicated screen that is **exception-first**: what is sold out, at a glance, and one tap to change it.
5. Make availability readable by future systems (QR ordering, checkout filtering, kitchen displays) without any of them re-implementing the rule.
6. Ship with zero behavior change for existing data and existing clients: every product is `available` on day one.

## 4. Non-Goals

Out of scope for this feature, explicitly:

- Stock quantities, units, thresholds, or any numeric inventory (that is `materials` + `stock_checks`, already a separate subsystem).
- Automatic stock deduction on sale, recipes-driven availability, purchasing, suppliers.
- Kitchen/bar management, QR ordering, cart behavior, customer-facing ordering, payment.
- **Changing checkout behavior.** `TransactionItemSelect` continues to show what it shows today. Filtering checkout by availability is the obvious next consumer, but it is a separate change with its own UX questions (grey out vs hide; what happens to an in-progress transaction). See §23 Open Question 5.
- Scheduling ("sold out until tomorrow"), auto-reset at open, audit trail of who marked what. See §23.
- Any RBAC work. The API has JWT auth and no roles (§16).

---

## 5. User Stories

| # | As a… | I want to… | So that… |
|---|---|---|---|
| US-1 | staff member on shift | mark a whole product sold out in a couple of taps | nobody sells Soft Cookies after the last one is gone |
| US-2 | staff member on shift | mark one variant sold out without touching the others | Pancong Original and Matcha keep selling when Tiramisu runs out |
| US-3 | staff member on shift | see everything currently sold out in one place | I can restore items at closing/opening without hunting through the catalog |
| US-4 | staff member on shift | restore an item as fast as I marked it | an accidental tap costs seconds, not a manager |
| US-5 | staff member opening the cafe | restore a product and have its flavors come back with it | I do not have to re-enable every variant one by one |
| US-6 | staff member who marked one flavor sold out yesterday | have that one flavor *stay* sold out when the product is restored | the exception I made deliberately is not silently erased |
| US-7 | future consumer (QR menu, checkout) | read one field per variant that already accounts for the product state | I do not re-implement the inheritance rule and get it wrong |

---

## 6. Existing Architecture

### 6.1. Backend — `apps/api` (Go, Clean Architecture)

```
domain/        entities, repository interfaces, usecases, pure calculators   (no framework deps)
data/mysql/    GORM entities + transformers + repository implementations
data/mock/     gomock-generated repository mocks (//go:generate mockgen)
presentation/restapi/  handlers, routes (gorilla/mux), transformers (HTTP <-> domain)
migrations/    numbered .up.sql / .down.sql pairs; latest is 000018
seeds/         idempotent seeders
```

Relevant conventions:

- **Layering**: `presentation → domain ← data`. Handlers never touch GORM; repositories never see `http`.
- **Errors**: `domain.Error{Type, Message}` with `BadRequest | Unauthorized | NotFound | InternalServerError`, mapped to API codes by `ToErrorCode` in the REST layer.
- **Transactions**: `repository.BeginTransaction(ctx, func(ctxWithTx) *Error)`; repositories pull the tx from ctx via `GetDbFromCtx` (`data/mysql/base_repo.go`).
- **Pure domain calculators exist and are the precedent for rule code**: `domain/pricing_calculator.go`, `domain/coupon_calculator.go`, each with a focused `_test.go`. This is exactly where the availability resolution rule belongs.
- **Narrow single-column repository writes exist**: `UpdateChecklistSessionItemCompletedAt` in `data/mysql/checklist_session_repo.go`.
- **Action endpoints exist and are the precedent for one-tap state changes**:
  `PUT /checklist-session-items/{id}/check` and `/uncheck`
  (`presentation/restapi/checklist_session_route.go`, handlers `CheckSessionItem` / `UncheckSessionItem`, usecase in `domain/checklist_session_usecase.go`). They take **no request body**, take the id from the path, and return the updated entity.

### 6.2. API contract — `libs/api-contract`

`src/api.yaml` (OpenAPI 3) is the **single source of truth**. Two generated clients:

| Target | Command (`libs/api-contract/project.json`) | Output |
|---|---|---|
| TypeScript (kubb: types + TanStack Query hooks + zod) | `nx run api-contract:generate:ts` | `src/__generated__/ts` |
| Go (openapi-generator) | `nx run api-contract:generate:go` | `src/__generated__/go`, package `apiContract` |

The Go API layer imports `apiContract` types directly (`libs/api-contract` in `go.work`). Adding a field to `api.yaml` and regenerating is a required step of any API change.

### 6.3. Frontend — `libs/ui` (shared by `apps/web` Next.js and `apps/mobile` React Native)

```
src/domain/entities/       plain TS types (Product.ts, Variant.ts, …) + pure logic w/ colocated tests
src/domain/repositories/   repository interfaces
src/domain/usecases/       finite-state-machine usecases (ts-pattern `match`), one per screen action
src/data/api/              repository impls over the generated client + `*.transformer.ts`
src/data/mock/             mock repository impls used by usecase tests and Storybook
src/data/url/              URL-backed list-query repositories (filters persisted in the querystring)
src/presentation/controllers/  `useController(usecase)` hooks; toasts live here
src/presentation/components/   Tamagui components, `*.stories.tsx`, some `*.test.tsx`
src/presentation/screens/      `XHandler.tsx` (wiring, no markup) + `XScreen.tsx` (markup, no logic)
src/app/                   composition root per screen (instantiates repos + usecases)
```

- `apps/web/src/pages/**` does SSR data fetching in `getServerSideProps`, then renders the `src/app/*` composition component.
- `apps/mobile/src/app/App.tsx` registers the same composition components as native stack screens.
- UI kit is **Tamagui**; icons are `@tamagui/lucide-icons`; toasts are `useToastController` from `@tamagui/toast`, fired from controllers (see `ProductDeleteController.tsx`).

### 6.4. Reusable UI conventions found (reuse these; do not invent a design system)

| Need | Existing component / pattern | Where |
|---|---|---|
| List row with title, subtitle, thumbnail, footer chips, ⋮ menu | `ListItem` | `components/base/ListItem.tsx` |
| Bottom sheet / drawer | `Sheet` | `components/base/Sheet/Sheet.tsx` |
| Confirm destructive action | `ConfirmationAlert`, wrapped per entity (`ProductDeleteAlert`, `VariantDeleteAlert`) | `components/base/ConfirmationAlert`, `components/products/ProductDeleteAlert.tsx` |
| Status shown as label/value chip | `ListItem.footerItems` (e.g. `STATUS: Draft`) | `components/products/ProductListItem.tsx` |
| Coloured state pill | inline `XStack` with `$green5` / `$gray5` background | `components/checklistSessions/ChecklistSessionItemRow.tsx` |
| One-tap toggle row with per-row spinner | row `onPress` + `togglingItemId` prop + `Spinner` | `ChecklistSessionItemRow.tsx` |
| Empty / error / skeleton states | `EmptyView`, `ErrorView`, `SkeletonList` | `components/base` |
| Search + filter popover | `Input` + `Popover` + `RadioGroup` | `components/products/ProductList.tsx` |
| Segmented filter | `Tabs` | `components/base/Tabs.tsx` |
| Toast on success/error | `useToastController().show(...)` in the controller | `controllers/*Controller.tsx` |
| Keyboard/remote focus | `Focusable` | `components/base/Focusable` |
| Sidebar nav registration | `items` array | `components/base/Sidebar/Sidebar.state.tsx` |

**There is no `Badge` component.** Sold-out pills should follow the
`ChecklistSessionItemRow` inline-pill pattern (or extract a small `StatusPill`
into `components/base` — see §15).

### 6.5. Testing conventions

| Layer | Tooling | Example |
|---|---|---|
| Go usecase | table-driven + `go.uber.org/mock` (gomock) + `testify/assert` | `apps/api/domain/product_usecase_test.go` |
| Go pure calculator | table-driven, no mocks | `apps/api/domain/coupon_calculator_test.go` |
| Go handler | `httptest` + mux router + mock repo, asserting status codes | `apps/api/presentation/restapi/product_handler_test.go` |
| Go repository (selected) | integration-ish repo tests | `apps/api/data/mysql/transaction_repo_test.go` |
| FE usecase (state machine) | Jest + `UsecaseTester` + `Mock*Repository` + `flushPromises` | `libs/ui/src/domain/usecases/productList.test.ts` |
| FE pure entity logic | Jest, colocated | `libs/ui/src/domain/entities/ExpenseStatistic.test.ts` |
| FE component | Jest + Testing Library | `components/checklistSessions/ChecklistSessionItemRow.test.tsx` |
| FE visual | Storybook | `*.stories.tsx` |
| E2E | Playwright against the real API | `apps/web-e2e/src/products.spec.ts` |

---

## 7. Current Domain Model

### 7.1. Product (`apps/api/domain/product_entity.go`)

```go
type Product struct {
    Id, CategoryId int64
    Name           string
    Description    *string
    Category       Category
    ImageUrl       string
    DeletedAt      *time.Time   // soft delete
    CreatedAt      time.Time
    Options        []Option     // e.g. "Flavour" -> [Original, Tiramisu, Matcha]
    SaleType       SaleType     // purchase | rental
    Status         ProductStatus // draft | published
}
```

### 7.2. Variant (`apps/api/domain/variant_entity.go`)

```go
type Variant struct {
    Id, ProductId int64
    Product       Product
    Name          string
    Price         float32
    Description   *string
    Materials     []VariantMaterial
    DeletedAt     *time.Time   // soft delete
    CreatedAt     time.Time
    VariantValues []VariantValue  // links to the product's option values
    PricingTiers  []PricingTier   // rental only
}
```

### 7.3. Relationships

```
Category 1─* Product 1─* Option 1─* OptionValue
                │                        │
                └─* Variant *─* VariantValue ┘
                       └─* VariantMaterial ─* Material
                       └─* PricingTier (rental)
```

`variants.product_id` is a non-null FK. A variant always belongs to exactly one
product. Both tables soft-delete via `deleted_at`.

### 7.4. Schema (relevant columns only)

```sql
products (id, category_id, name, description, image_url, sale_type,
          status /* 000016, VARCHAR(20) NOT NULL DEFAULT 'published' */,
          deleted_at, created_at)

variants (id, product_id, name, price, description, deleted_at, created_at)
```

### 7.5. Existing status / active-inactive / archive concepts — and why none of them is availability

| Existing concept | What it means | Why it is **not** availability |
|---|---|---|
| `products.status` (`draft`\|`published`) | Menu lifecycle. Set by an admin in the product form. `published` products appear in the checkout grid; drafts are hidden. | Slow, deliberate, catalog-level. Reusing it would (a) mean staff editing a catalog field several times a day, (b) make "restore" ambiguous — restoring a sold-out draft would silently publish it, (c) break the existing `status=published` checkout filter semantics, (d) mix a permanent concept with a transient one in the same audit surface. **Keep orthogonal.** |
| `deleted_at` (products, variants) | Soft delete. Excluded from every list query. | Permanent removal, not "back tomorrow". |
| `materials.is_stock_check_required` | Whether a material must be counted during a restock check. | About materials and stock-check forms, unrelated to sellability of a menu item. |
| `wallets.is_payment_target` | Whether a wallet can receive payment. | Precedent for a boolean capability flag with a safe default — cited as a *pattern*, not a place to put availability. |
| `stock_checks` / `materials.minimum_stock` | Real inventory subsystem. | Explicitly out of scope; availability must not become a derived function of stock. |

**Conclusion: no existing field represents availability. A new, dedicated,
orthogonal concept is required.**

### 7.6. Existing API contract (relevant)

| Operation | Method / path |
|---|---|
| `productList` | `GET /products?query&sortBy&order&limit&skip&saleType&status` |
| `productFindById` / `productUpdateById` / `productDeleteById` | `GET|PUT|DELETE /products/{productId}` |
| `variantList` | `GET /variants?query&sortBy&order&limit&skip&productId&optionValueIds[]` |
| `variantFindById` / `variantUpdateById` / `variantDeleteById` | `GET|PUT|DELETE /variants/{variantId}` |
| `checklistSessionItemCheck` / `Uncheck` | `PUT /checklist-session-items/{id}/check` \| `/uncheck` — **no body** |

### 7.7. Existing validation

Validation lives in usecases (`VariantUsecase.validateVariantForSaleType`
returns `domain.Error{Type: BadRequest}`) and in the frontend via zod schemas in
controllers. There is no schema-level validation middleware.

---

## 8. Proposed Domain Model

### 8.1. The recommendation

> **Recommended: Option A — `Product.availability` + nullable `Variant.availabilityOverride`, resolved by a "sold-out wins" rule.**

```go
type Availability string

const (
    AvailabilityAvailable Availability = "available"
    AvailabilitySoldOut   Availability = "sold_out"
)

type Product struct {
    // …existing fields…
    Availability Availability // NOT NULL, default "available"
}

type Variant struct {
    // …existing fields…
    AvailabilityOverride *Availability // NULL = inherit from product
}
```

- **String enum, not boolean** — consistent with `sale_type` and `status` on the
  same table, and extensible (a future `scheduled` or `discontinued` value does
  not require a second column). `docs/prd-product-draft-status.md` made the same
  call for the same reason.
- **Nullable on the variant** — `NULL` means "no exception, follow the product".
  This is what makes Case 5 and Case 7 work: the product's state flows through
  automatically, and removing an override is a single `NULL` write.
- **Only `sold_out` is a meaningful override value.** Because of the resolution
  rule (§10), an `available` override is indistinguishable from no override in
  every product state. The API therefore **normalizes an `available` override to
  `NULL` on write**, so exactly one stored representation of "this variant is
  fine" exists. See §9 R-5.

### 8.2. Alternatives considered

| Option | Shape | Verdict |
|---|---|---|
| **A. `availability` + nullable `availabilityOverride`** (recommended) | 2 columns, 1 nullable | Cheapest change, mirrors existing enum columns, inheritance is free (no writes fan out), exceptions survive product-level toggles, trivially queryable, one pure function to test. |
| B. Booleans (`products.is_sold_out`, `variants.is_sold_out NULL`) | 2 columns | Works, and matches `is_payment_target` styling, but a **nullable boolean is a tri-state in disguise** (`true`/`false`/`NULL`) — the worst possible readability for the exact field whose semantics we most need to be obvious. Also not extensible. Rejected. |
| C. Denormalized: write `sold_out` onto every variant when the product is marked sold out | 1 column on each table, no inheritance | Rejected. Fan-out writes; restoring a product cannot know which variants were *individually* sold out before (breaks US-6 / Case 7 outright); N writes per tap; races between concurrent product/variant edits become real. |
| D. Sparse exception table (`availability_exceptions(entity_type, entity_id, …)`) | 1 new table | Rejected for this codebase. Polymorphic `entity_type` tables appear nowhere in this schema; every read grows a join or a second query; GORM `Preload`-based repositories would need bespoke wiring. It would buy audit history and auto-expiry — both explicitly out of scope (§4). Revisit only if §23 Q1/Q7 turn into requirements. |
| E. Reuse `products.status`, add a `sold_out` value | 0 new columns | Rejected — see §7.5. Conflates catalog lifecycle with service-time state. |
| F. Availability at the *variant* level only, product state derived | 1 column | Rejected. It makes the most common staff action ("the whole thing is finished") an N-row write and an N-row restore, and gives no place to express "the product is out" for products whose variants are incidental. |

### 8.3. What is **not** stored

`effectiveAvailability` is **always derived, never persisted**, at both the
product and variant level. Persisting it would create the exact inconsistency
edge case (§17.17) the rule exists to prevent.

---

## 9. Availability Rules

- **R-1 — Default is available.** A product with no explicit state is
  `available`. A variant with no override is whatever its product is. New rows
  (new products, new variants) start available with no override.
- **R-2 — Sold-out wins (product dominance).** If a product is `sold_out`, every
  one of its variants is effectively sold out, regardless of override. A variant
  override can only *subtract* availability, never restore it.
- **R-3 — Overrides are sticky.** Marking a product sold out does **not** clear
  or rewrite variant overrides. Restoring the product re-exposes exactly the
  override set that existed before (US-6, Case 7).
- **R-4 — Restoring a variant means clearing its override**, not writing
  `available`. "Restore" and "remove override" are the same staff action and the
  same API call.
- **R-5 — One canonical "fine" state.** An `availabilityOverride` of
  `available` is normalized to `NULL` before persistence. At rest,
  `variants.availability_override ∈ {NULL, 'sold_out'}`.
- **R-6 — Availability is orthogonal to `status` and `deleted_at`.** Any
  combination is valid and nothing cascades between them. Soft-deleted and
  draft rows keep whatever availability value they have; they are simply not
  listed on the availability screen (§17.10–17.11).
- **R-7 — Actions are idempotent.** Marking an already-sold-out item sold out
  succeeds and changes nothing. This is what makes "last write wins" safe (§18).
- **R-8 — Unknown values read as available.** If a row somehow contains an
  unrecognized string, the resolver treats it as `available` and the API logs a
  warning (`pkg/logger`). Rationale: a bad value that hides the entire menu from
  a future consumer is a revenue outage; a bad value that shows one extra item
  is an apology. Fail open, log loudly. (This should be unreachable — the column
  is `NOT NULL DEFAULT 'available'` and only our own endpoints write it.)
- **R-9 — Availability never touches historical data.** Transaction items,
  rentals, and calculations are snapshots; flipping availability never rewrites
  them, and a sold-out item can still appear in yesterday's receipts.

---

## 10. Effective Availability

### 10.1. The rule (one function per stack)

```
effective(variant) =
    product.availability == SOLD_OUT
        ? SOLD_OUT
        : (variant.availabilityOverride ?? AVAILABLE)
```

Equivalently: **the most restrictive of (product state, variant override) wins.**

For a product's own headline state (display only):

```
effective(product) =
    product.availability == SOLD_OUT                     -> SOLD_OUT
    product has variants && every variant effective SOLD_OUT -> SOLD_OUT   ("everything's gone")
    otherwise                                            -> AVAILABLE
```

### 10.2. Truth table (variant)

| `product.availability` | `variant.availabilityOverride` | Effective | Case |
|---|---|---|---|
| `available` | `NULL` (inherit) | **AVAILABLE** | Case 2 |
| `available` | `sold_out` | **SOLD_OUT** | Case 4 / 6 |
| `sold_out` | `NULL` (inherit) | **SOLD_OUT** | Case 3 |
| `sold_out` | `sold_out` | **SOLD_OUT** | — |
| `sold_out` | `available` *(never stored; normalized to `NULL` by R-5)* | **SOLD_OUT** | the decision below |
| `available` | `available` *(never stored; normalized to `NULL`)* | **AVAILABLE** | Case 7 |

For a product **without variants**, effective availability is simply
`product.availability` (Case 1).

### 10.3. The decisive question: may a variant override a SOLD_OUT product back to AVAILABLE?

**No. Recommended rule: product `SOLD_OUT` always dominates.**

Reasoning:

1. **Business meaning.** A product-level sold-out at a cafe almost always means
   the *shared* input is gone — the pancong batter, the cireng dough, the
   espresso beans. If the shared base is gone, no flavor of it can be made.
   Allowing a variant to say "but I'm fine" describes a situation that does not
   occur in this kitchen.
2. **Staff intent.** The staff action "mark Pancong sold out" is uttered as
   "we're out of pancong" — a statement about all of it. If it silently left
   Matcha sellable because of a week-old override, the tool would have lied to
   the person using it.
3. **Fail direction.** Dominance fails *closed* (we sell nothing we cannot make).
   The alternative fails *open* (we sell something whose base ingredient is
   gone), which produces the exact customer-facing failure this feature exists
   to eliminate.
4. **Explainability.** "Sold out anywhere means sold out" is one sentence, and
   staff never need the word *inheritance*.
5. **It shrinks the state space.** With dominance, an `available` override is
   provably a no-op — which is why R-5 can normalize it away, which is why the
   "inconsistent state" edge case (§17.17) cannot arise.

The cost: a product marked sold out by mistake cannot be partially rescued
variant-by-variant — you restore the product, and the pre-existing exceptions
come back with it (R-3). That is one tap, and it is the correct one.

**This decision is explicit and load-bearing. If it is ever revisited, R-5 must
be revisited with it** (the `available` override value would become meaningful
and must then be stored rather than normalized away).

### 10.4. Where the rule lives

| Stack | File (new) | Signature |
|---|---|---|
| Go | `apps/api/domain/availability.go` | `func ResolveVariantAvailability(product Product, variant Variant) Availability`, `func ResolveProductAvailability(product Product, variants []Variant) Availability`, `func NormalizeAvailabilityOverride(*Availability) *Availability` |
| TypeScript | `libs/ui/src/domain/entities/Availability.ts` | `resolveVariantAvailability(product, variant)`, `resolveProductAvailability(product, variants)`, `countSoldOutVariants(variants, product)` |

Both mirror the existing pure-calculator precedent (`pricing_calculator.go`,
`ExpenseStatistic.ts`) and get colocated tests. The API additionally **returns**
the resolved value (§14.3) so that no consumer is ever *required* to run the
rule itself.

---

## 11. Staff UX

### 11.1. Principles

1. Available is invisible. Sold out is loud.
2. The screen opens on the answer to "what's off the menu right now?".
3. Marking sold out is at most 2 taps; restoring is at most 2 taps.
4. No stock numbers. No dates. No "inheritance" vocabulary.
5. Never render a wall of switches.

### 11.2. Entry point

A new screen at **`/availability`**, added to the sidebar under **Operations**
(alongside Templates and Sessions) — availability is a daily service task, not a
catalog-editing task. (`components/base/Sidebar/Sidebar.state.tsx`; see §23 Q4.)

### 11.3. Screen 1 — Availability list (`AvailabilityScreen`)

```
┌────────────────────────────────────────────────────────┐
│ Availability                                            │
│                                                         │
│  🔴 3 items sold out                                    │
│  [ All ]  [ Sold out ]            🔍 Search products…   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Pancong               Snack        1 sold out  › │   │  <- sold-out variants pill (red)
│  ├──────────────────────────────────────────────────┤   │
│  │ Cireng                Snack        2 sold out  › │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ Soft Cookies          Snack        SOLD OUT    › │   │  <- whole product (red, solid)
│  ├──────────────────────────────────────────────────┤   │
│  │ Ricebowl              Food                     › │   │  <- available: no pill at all
│  ├──────────────────────────────────────────────────┤   │
│  │ Americano             Coffee                   › │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

- The **`Sold out` tab is the default landing filter when anything is sold out**,
  and `All` when nothing is (so the screen always opens on something useful and
  never on an empty list). Filter state persists in the URL, following the
  existing `data/url/*ListQuery.ts` pattern.
- Available rows carry **no badge** — the absence of a pill *is* the "available"
  signal. This is the whole point of an exception-focused UI.
- Products with no variants show `SOLD OUT` or nothing; products with variants
  show `N sold out` or nothing.
- Sorted: sold-out products first, then products with sold-out variants, then
  the rest alphabetically — the exceptions float to the top.

### 11.4. Screen 2 — Product availability sheet (`AvailabilitySheet`)

Tapping a row opens the existing base `Sheet` (no navigation, no page load — the
data is already on the client):

```
┌────────────────────────────────────────────────────────┐
│  Cireng                                            ✕   │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Whole product sold out                    ( ● )  │ │  <- ONE switch, product level
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Variants                                               │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Original                             Available   │ │  <- tap row to toggle
│  │  Rujak                                SOLD OUT 🔴 │ │
│  │  Keju                                 SOLD OUT 🔴 │ │
│  │  Balado                               Available   │ │
│  └───────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

- **Tap a variant row = toggle it.** Per-row `Spinner` while the request is in
  flight, exactly like `ChecklistSessionItemRow`. No confirmation — it is one
  tap to undo.
- **When the product switch is on** (product sold out), every variant row is
  dimmed, shows `Unavailable` with the caption *"Product is sold out"*, and is
  not tappable. This teaches R-2 by showing it, without ever saying
  "inheritance". Overrides are preserved underneath (R-3) and reappear the
  moment the product is restored.
- A product with no variants (Americano) shows only the product switch and the
  caption *"This product has no variants."*.
- Total taps: open sheet (1) + toggle (1) = **2 taps** for the common case,
  matching the brief's 2–3 tap budget in both directions.

### 11.5. Confirmations, feedback, errors

| Situation | Behaviour |
|---|---|
| Toggle a variant | No confirmation. Optimistic-feeling per-row spinner, then toast `"Rujak marked as sold out"` / `"Rujak is available again"`. |
| Mark a product **with variants** sold out | `ConfirmationAlert` (new `AvailabilitySoldOutAlert` wrapper): *"Mark Cireng as sold out? All 4 variants will be unavailable until you restore it."* — this is the one action that removes several sellable items at once (edge case §17.12). |
| Mark a product **without variants** sold out | No confirmation — it affects exactly one sellable thing, same weight as a variant toggle. |
| Restore anything | Never confirmed. Restoring is the safe direction. |
| Request fails | Row reverts to its server state, `ErrorView`-consistent toast: `"Failed to update availability"`. State is refetched so the screen never shows a value the server does not have. |
| Screen fails to load | `ErrorView` with retry, per convention. |
| Nothing sold out (on the `Sold out` tab) | `EmptyView`: *"Nothing is sold out"* / *"Everything on the menu is available right now."* |

### 11.6. Where availability is *not* surfaced (v1)

The product list, product form, variant form, and transaction item select are
**unchanged**. Availability is deliberately not editable from the catalog
screens: one screen owns the action, so staff learn one place. (A read-only
sold-out pill on `ProductListItem` is a cheap, optional follow-up — §23 Q6.)

---

## 12. Business Rules

### 12.1. Recommended minimum action set

Four actions. Everything else in the brief's candidate list collapses into these:

| # | Action | API | Taps |
|---|---|---|---|
| A-1 | Mark product sold out | `PUT /products/{id}/sold-out` | 2 (+1 confirm if it has variants) |
| A-2 | Restore product | `PUT /products/{id}/available` | 2 |
| A-3 | Mark variant sold out | `PUT /variants/{id}/sold-out` | 2 |
| A-4 | Restore variant (= remove override) | `PUT /variants/{id}/available` | 2 |

Deliberately **not** implemented:

- *"Mark all variants sold out"* — that is exactly A-1. Adding a second way to
  express it would create two different stored states with the same meaning.
- *"Restore all variants"* — ambiguous by construction: does it clear deliberate
  exceptions or not? If staff want everything back, they restore the product
  (A-2) and then clear any remaining exceptions they actually disagree with.
- *"Remove override"* as a distinct concept — it **is** A-4. Staff see
  "Available", the system stores `NULL`.

### 12.2. Rules the implementation must enforce

1. All four actions are idempotent (R-7) and return the updated entity, so the
   client can reconcile without a second round trip.
2. A-3/A-4 target a variant by id; the product is never modified as a side
   effect. A-1/A-2 modify only the product row; variants are never touched.
3. The availability screen lists **published, non-deleted** products of every
   `saleType` (§17.10–17.11).
4. Availability is not part of `ProductRequest` / `VariantRequest`. The catalog
   edit forms neither read nor write it, and a full product/variant update must
   provably leave availability untouched (§20.4).
5. Effective availability is computed by the shared function only — no ad-hoc
   `if` in a component or handler.

---

## 13. Database Changes

### 13.1. Migration `000019_add_product_variant_availability`

```sql
-- 000019_add_product_variant_availability.up.sql
ALTER TABLE products ADD COLUMN availability VARCHAR(20) NOT NULL DEFAULT 'available';
ALTER TABLE variants ADD COLUMN availability_override VARCHAR(20) NULL DEFAULT NULL;
```

```sql
-- 000019_add_product_variant_availability.down.sql
ALTER TABLE variants DROP COLUMN availability_override;
ALTER TABLE products DROP COLUMN availability;
```

### 13.2. Decisions

| Question | Decision | Why |
|---|---|---|
| Column type | `VARCHAR(20)` | Exactly matches `products.status` (000016) and `categories.station` (000015). MySQL `ENUM` is not used anywhere in this schema. |
| Product nullability | `NOT NULL DEFAULT 'available'` | Every product always has a definite state; no null-handling in any consumer. |
| Variant nullability | `NULL DEFAULT NULL` | `NULL` is the load-bearing "inherit" value. It must be the default so new variants inherit (§17.7). |
| Existing rows | Backfilled implicitly by the `DEFAULT` | Every existing product becomes `available` and every existing variant inherits — i.e. the entire menu stays sellable. A "default sold out" rollout would take the cafe offline. |
| Data backfill script | **None needed** | The defaults are the backfill. Unlike migration 000007, there is nothing to derive. |
| Indexes | **None** | Tens of products, low hundreds of variants; the availability screen reads the whole set. An index on `availability` would never be chosen by the planner at this cardinality (2 distinct values) and costs write time. Add one only if a future consumer runs a hot `WHERE availability = 'sold_out'` filter over a much larger catalog. |
| CHECK constraints | **None** | This schema uses no CHECK constraints anywhere; the invariant (`∈ {NULL,'sold_out'}` for overrides) is enforced in the usecase (R-5) and covered by tests. |
| Foreign keys | Unchanged | Availability adds no relationships. |
| Timestamps (`sold_out_at`) | **Not in v1** | Only needed for "sold out since 14:30", audit, or auto-reset — all out of scope (§23 Q1/Q7). One nullable column can be added later without touching anything else. |

### 13.3. Backward compatibility

- Old API clients that never send availability are unaffected: the columns have
  defaults and the fields are absent from all existing request schemas.
- `UpdateProductById` and `UpdateVariantById` use GORM `Updates(&struct)`, which
  **skips zero-valued struct fields**. With `Availability` mapped as a `string`
  and `AvailabilityOverride` as `*string`, a product/variant edit that does not
  carry availability writes nothing to those columns. This is relied upon by
  rule 12.2.4 and must be locked down by an explicit regression test (§19.2) —
  it is the single most likely place for this feature to silently break.
- Rolling back the migration drops two columns and loses only sold-out flags;
  no other data depends on them.
- `apps/api/seeds/product_seeder.go` and `variant_seeder.go` declare their own
  local structs and can stay untouched — seeded rows pick up the defaults.

---

## 14. Backend / API Changes

The project uses a **REST API defined by OpenAPI in `libs/api-contract/src/api.yaml`**
with generated Go and TypeScript clients. Everything below follows that; no new
API style is introduced.

### 14.1. Ownership

Availability is an attribute **of the catalog**, so the state lives on the
`Product` and `Variant` entities and is written through the existing
`ProductRepository` / `VariantRepository`. The *read model* for the staff screen
(products + their variants + resolved states) is a distinct concern and gets its
own thin usecase, `AvailabilityUsecase`, which orchestrates the two existing
repositories. **No new repository interface and no new table.**

```
domain/availability.go            (new)  pure resolution rules + tests
domain/availability_usecase.go    (new)  GetMenuAvailability(ctx, query, filter)
domain/product_repository.go      (edit) + UpdateProductAvailability(ctx, id, Availability) (Product, *Error)
domain/variant_repository.go      (edit) + UpdateVariantAvailabilityOverride(ctx, id, *Availability) (Variant, *Error)
domain/product_usecase.go         (edit) + MarkProductSoldOut / MarkProductAvailable
domain/variant_usecase.go         (edit) + MarkVariantSoldOut / MarkVariantAvailable
```

Mocks are regenerated via the existing `//go:generate mockgen -source=…`
directives at the top of each repository interface file.

### 14.2. Endpoints

Modelled directly on the checklist check/uncheck precedent: **`PUT`, id in the
path, no request body, returns the updated entity.**

| Operation id | Method / path | Body | Response |
|---|---|---|---|
| `productMarkSoldOut` | `PUT /products/{productId}/sold-out` | none | `ProductUpdateByIdResponse` (the updated `Product`) |
| `productMarkAvailable` | `PUT /products/{productId}/available` | none | `ProductUpdateByIdResponse` |
| `variantMarkSoldOut` | `PUT /variants/{variantId}/sold-out` | none | `VariantUpdateByIdResponse` (the updated `Variant`) |
| `variantMarkAvailable` | `PUT /variants/{variantId}/available` | none | `VariantUpdateByIdResponse` |
| `availabilityList` | `GET /availability?query&filter` | — | `AvailabilityListResponse` (new, §14.4) |

Registered in `product_route.go` / `variant_route.go` plus a new
`availability_route.go`, all wrapped in `CheckAuth`, all declaring
`http.MethodPut, http.MethodOptions` (CORS preflight) as the existing action
routes do.

**Why not `PUT /products/{id}` with an availability field?** Three reasons, each
sufficient: (a) the full update payload rewrites `options` and deletes any
option/option-value absent from the body — catastrophic for a one-tap staff
action; (b) it would require the client to hold and resend the entire product,
turning a 1-field change into a lost-update hazard; (c) the repository already
has a precedent for narrow, single-column writes for exactly this reason.

### 14.3. Contract additions (`libs/api-contract/src/api.yaml`)

```yaml
    Availability:                     # shared enum
      type: string
      enum: [available, sold_out]

    Product:
      # …existing…
      required: [ …, availability ]
      properties:
        availability:
          $ref: '#/components/schemas/Availability'

    Variant:
      # …existing…
      required: [ …, effectiveAvailability ]
      properties:
        availabilityOverride:                       # absent/null = inherit
          $ref: '#/components/schemas/Availability'
        effectiveAvailability:                      # server-computed, read-only
          $ref: '#/components/schemas/Availability'
```

- `ProductRequest` and `VariantRequest` are **not** changed (rule 12.2.4).
- `Variant.effectiveAvailability` is **required** in responses: this is the field
  every future consumer should read, so nobody re-implements §10.
- New path parameters are not needed (`ProductId` / `VariantId` already exist).
- Regenerate both clients: `nx run api-contract:generate:ts` and
  `nx run api-contract:generate:go`.

### 14.4. The availability read model

```yaml
    AvailabilityProduct:
      required: [productId, name, categoryName, saleType, availability,
                 effectiveAvailability, variantCount, soldOutVariantCount, variants]
      properties:
        productId:     { type: integer, format: int64 }
        name:          { type: string }
        categoryName:  { type: string }
        imageUrl:      { type: string }
        saleType:      { type: string, enum: [purchase, rental] }
        availability:            { $ref: '#/components/schemas/Availability' }  # the product's own state
        effectiveAvailability:   { $ref: '#/components/schemas/Availability' }  # §10.1 product rule
        variantCount:        { type: integer }
        soldOutVariantCount: { type: integer }   # counted by EFFECTIVE availability
        variants:
          type: array
          items: { $ref: '#/components/schemas/AvailabilityVariant' }

    AvailabilityVariant:
      required: [variantId, name, effectiveAvailability]
      properties:
        variantId: { type: integer, format: int64 }
        name:      { type: string }
        availabilityOverride:  { $ref: '#/components/schemas/Availability' }   # null = inherit
        effectiveAvailability: { $ref: '#/components/schemas/Availability' }

    AvailabilityListResponse:
      required: [data, meta]
      properties:
        data: { type: array, items: { $ref: '#/components/schemas/AvailabilityProduct' } }
        meta:
          required: [soldOutProductCount, soldOutVariantCount]
          properties:
            soldOutProductCount: { type: integer }   # products whose EFFECTIVE state is sold_out
            soldOutVariantCount: { type: integer }   # variants of AVAILABLE products that are sold out
```

Query parameters: `query` (reuses the existing `Query` parameter; product-name
search) and a new `AvailabilityFilter` (`all` | `sold_out`, absent = `all`,
mirroring the `ProductStatus` / `MaterialStockCheckStatus` enum-with-escape-hatch
convention).

`GetMenuAvailability` implementation sketch:

```go
func (u AvailabilityUsecase) GetMenuAvailability(ctx context.Context, query string, filter AvailabilityFilter) ([]ProductAvailability, AvailabilityMeta, *Error) {
    published := ProductStatusPublished
    products, err := u.productRepository.GetProductList(ctx, query, CreatedAt, Ascending, 0, 0, nil, &published)
    // limit 0 == no LIMIT clause in GetProductList; the catalog is tens of rows
    variants, err := u.variantRepository.GetVariantList(ctx, "", CreatedAt, Ascending, 0, 0, nil, nil)
    // group variants by ProductId, resolve with domain.ResolveVariantAvailability, count, filter, sort
}
```

Two queries, no N+1, no new SQL. If the variant preloads (materials, pricing
tiers, option values) ever become a measurable cost, add a lean
`GetVariantAvailabilityList` projection to `VariantRepository` — noted, not
needed at this scale.

### 14.5. Validation, errors, authorization, transactions

| Concern | Decision |
|---|---|
| Validation | Path id must parse (`400 BAD_REQUEST`, existing `GetProductId` / `GetVariantId` helpers). No body means no body validation. The four write endpoints cannot express an invalid state by construction — the endpoint *is* the value. |
| `available` override normalization (R-5) | Enforced in `VariantUsecase.MarkVariantAvailable`, which writes `nil`. There is no endpoint that can write `available` into the column. |
| Not found | Repository `First` returns `gorm.ErrRecordNotFound` → `domain.Error{Type: NotFound}` → `404`, same as every other by-id endpoint. Marking a soft-deleted or draft product sold out returns the same as today's behaviour for those rows (they are still fetchable by id; the action succeeds and is simply invisible on the availability screen). |
| Authorization | `CheckAuth` (JWT) on all five routes — identical to every other route. There is no role system (§16). |
| Transactions | **None.** Each write is a single-row, single-column `UPDATE`. Wrapping it in `BeginTransaction` would add a round trip and protect nothing. (Contrast `UpdateProductById`, which writes options across three tables and legitimately needs one.) |
| Logging | Reuse `ToErrorCtx(ctx, err, "MarkProductSoldOut")`; the R-8 unknown-value warning uses `logger.FromCtx`. |

---

## 15. Frontend Changes

All new code follows the existing entity → repository → usecase → controller →
handler/screen chain. Files marked *(new)*.

### 15.1. Domain

```
domain/entities/Availability.ts          (new)  Availability type + resolveVariantAvailability +
                                                resolveProductAvailability + countSoldOutVariants
domain/entities/Availability.test.ts     (new)
domain/entities/Product.ts               (edit) + availability: Availability
domain/entities/Variant.ts               (edit) + availabilityOverride?: Availability
                                                + effectiveAvailability: Availability
domain/entities/MenuAvailability.ts      (new)  AvailabilityProduct / AvailabilityVariant view types
domain/repositories/availability.ts      (new)  fetchMenuAvailability / getMenuAvailability
                                                markProductSoldOut / markProductAvailable
                                                markVariantSoldOut / markVariantAvailable
domain/repositories/availabilityListQuery.ts (new) filter + search persisted in the URL
domain/usecases/availabilityList.ts      (new)  the screen's state machine
domain/usecases/availabilityList.test.ts (new)
```

`ProductForm` / `VariantForm` are **not** extended — availability is not part of
the catalog forms.

### 15.2. State machine (`AvailabilityListUsecase`)

Modelled on `checklistSessionDetail.ts`, which already solves "list with
per-row toggles that must show a spinner and refetch":

```ts
type State = ({ type: 'idle' } | { type: 'loading' } | { type: 'loaded' }
  | { type: 'revalidating' } | { type: 'error' }
  | { type: 'togglingProduct'; productId: number }
  | { type: 'togglingVariant'; variantId: number }) & Context;

type Action =
  | { type: 'FETCH' } | { type: 'FETCH_SUCCESS'; … } | { type: 'FETCH_ERROR'; … }
  | { type: 'MARK_PRODUCT_SOLD_OUT'; productId } | { type: 'MARK_PRODUCT_AVAILABLE'; productId }
  | { type: 'MARK_VARIANT_SOLD_OUT'; variantId } | { type: 'MARK_VARIANT_AVAILABLE'; variantId }
  | { type: 'TOGGLE_SUCCESS' } | { type: 'TOGGLE_ERROR'; errorMessage }
  | { type: 'CHANGE_PARAMS'; query?; filter? };
```

`TOGGLE_SUCCESS` triggers a silent revalidation of the list, so the screen always
converges on server truth (this is what makes §18's "last write wins" safe in
practice).

### 15.3. Data

```
data/api/availability.ts             (new)  ApiAvailabilityRepository over the generated hooks
data/api/availability.transformer.ts (new)
data/api/product.transformer.ts      (edit) map availability
data/api/variant.transformer.ts      (edit) map availabilityOverride + effectiveAvailability
data/mock/availability.ts            (new)  MockAvailabilityRepository for usecase tests + Storybook
data/mock/availabilityListQuery.ts   (new)
data/url/availabilityListQuery.ts    (new)
```

### 15.4. Presentation

```
presentation/components/availability/AvailabilityList.tsx        (new)  search + Tabs filter + FlatList + Empty/Error/Skeleton
presentation/components/availability/AvailabilityListItem.tsx    (new)  built on base ListItem
presentation/components/availability/AvailabilityProductSheet.tsx(new)  built on base Sheet
presentation/components/availability/AvailabilityVariantRow.tsx  (new)  tap-to-toggle row w/ Spinner (mirrors ChecklistSessionItemRow)
presentation/components/availability/AvailabilitySoldOutAlert.tsx(new)  wraps base ConfirmationAlert
presentation/components/base/StatusPill.tsx                      (new, optional) extracts the inline pill used by ChecklistSessionItemRow
presentation/controllers/AvailabilityListController.tsx          (new)  useController + toasts
presentation/screens/AvailabilityListScreen.tsx                  (new)  markup only
presentation/screens/AvailabilityListHandler.tsx                 (new)  wiring only
presentation/components/base/Sidebar/Sidebar.state.tsx           (edit) Operations → { title: 'Availability', path: '/availability' }
app/AvailabilityList.tsx                                         (new)  composition root
```

Plus `*.stories.tsx` for each new component (repo convention), and index
re-exports in `components/index.ts`, `controllers/index.ts`, `screens/index.ts`,
`domain/{entities,repositories,usecases}/index.ts`, `data/api/index.ts`.

### 15.5. App wiring

- `apps/web/src/pages/availability/index.tsx` *(new)* — `getServerSideProps`
  with the auth-cookie redirect + SSR prefetch, exactly like
  `pages/products/index.tsx`.
- `apps/mobile/src/app/App.tsx` *(edit)* — register `AvailabilityList` as a
  native stack screen alongside the other list screens.

### 15.6. Visual language

| State | Rendering |
|---|---|
| Available | No pill. Plain text `Available` inside the sheet only. |
| Sold out (product) | Solid red pill `SOLD OUT` (`$red5` background / `$red11` text, mirroring the `$green5` usage in `ChecklistSessionItemRow`). |
| Product has sold-out variants | Red-tinted count pill `2 sold out`. |
| Variant unavailable because the product is sold out | Row dimmed (`opacity 0.5`), caption `Product is sold out`, not tappable. |
| In flight | Per-row `Spinner`, row not tappable. |

---

## 16. Authorization

The API has **JWT authentication and no role system**: `CheckAuth`
(`presentation/restapi/base_middlewares.go`) parses the token and rejects
invalid ones with `UNAUTHORIZED`; there is no user-role claim, no permission
table, and no per-endpoint authorization anywhere in the codebase. Every
authenticated user can already create, edit, and delete products.

**Recommendation: no authorization work in this feature.** All five endpoints
are wrapped in `CheckAuth`, matching every existing route. Building RBAC to
protect an action that is strictly *less* destructive than the `DELETE /products/{id}`
any logged-in user can already call would be incoherent scope creep.

Web pages gate on the `Authorization` cookie in `getServerSideProps` like every
other page.

If roles are ever introduced, availability is a natural "any staff" permission
while product editing becomes "manager" — noted for that future work, not
designed here.

---

## 17. Edge Cases

| # | Case | Recommended behaviour |
|---|---|---|
| 1 | Product has no variants | `effective(product) = product.availability`. The sheet shows only the product switch and the caption "This product has no variants." No confirmation on marking it sold out. |
| 2 | Product has variants, none overridden | All variants resolve to the product's state. Nothing is stored per variant. |
| 3 | Product is `sold_out` | Every variant resolves `SOLD_OUT` (R-2). Variant rows are dimmed and non-tappable; overrides are preserved untouched (R-3). |
| 4 | Product available, one variant sold out | Only that variant resolves `SOLD_OUT`. The list row shows `1 sold out`; the product itself stays available. |
| 5 | Product restored to available | Nothing fans out. Variants with `NULL` override immediately resolve available again; variants with a `sold_out` override stay sold out (US-6). |
| 6 | Variant override removed | `availability_override := NULL`. The variant immediately follows the product. If the product is available → available; if sold out → sold out. |
| 7 | New variant added to an existing product | `availability_override` defaults to `NULL` → it inherits. A variant added to a sold-out product is correctly unavailable from birth. |
| 8 | Variant deleted (soft delete) | Excluded from the availability screen, counts, and meta totals — the screen filters `deleted_at IS NULL` like every other list. The stale override on the row is inert. |
| 9 | Product duplicated | **No duplicate feature exists** in the API or UI today. If one is built: copy `availability` as `available` and all overrides as `NULL`. A duplicate is a new menu item; inheriting someone's "we ran out at 3pm" is never intended. |
| 10 | Product/variant archived | There is no archive concept; `deleted_at` (soft delete) is the closest. Soft-deleted rows never appear on the availability screen and are never counted. Availability values are left as-is (harmless). |
| 11 | Product "disabled" (`status = draft`) | Drafts are already unsellable, so they are **excluded from the availability screen** — including them would pad the list with items that cannot be sold anyway. Their stored `availability` is preserved: a product that was sold out, drafted, and later re-published comes back sold out and is immediately visible/fixable on the availability screen. |
| 12 | Staff accidentally mark a whole product sold out | Mitigated three ways: a `ConfirmationAlert` naming the variant count before the action; a toast right after; and a one-tap restore that brings back the exact prior override set (R-3). No undo stack, no audit trail. |
| 13 | Two staff change the same thing at once | Last write wins — see §18. |
| 14 | Product has many variants | The sheet scrolls; rows are lightweight. If a product ever exceeds ~20 variants, the sheet gains a search field — not needed at current menu size. |
| 15 | Product has no sold-out variants | No pill, no count, sorted to the bottom, hidden entirely on the `Sold out` tab. Zero visual noise for the normal case. |
| 16 | All variants of a product are individually sold out | `effective(product)` resolves `SOLD_OUT` (§10.1) so the list row reads `SOLD OUT` and future consumers can drop the product entirely — while `product.availability` stays `available`, so restoring any one variant brings the product straight back. The sheet shows the truth: the product switch is off, all four variant rows are red. |
| 17 | Product-level and variant-level values "become inconsistent" | **Not representable.** Dominance (R-2) plus normalization (R-5) mean every stored combination has exactly one defined resolution, and the only stored override value is `sold_out`. There is no reconciliation job, because there is nothing to reconcile. |
| 18 | Existing data with null/unknown availability | Products: impossible — the column is `NOT NULL DEFAULT 'available'`. Variants: `NULL` is the normal "inherit" value. Any unrecognized string resolves to `AVAILABLE` with a logged warning (R-8). |

---

## 18. Concurrency

**Recommendation: last write wins. No optimistic concurrency, no version
column, no transactions, no locking.**

Rationale:

1. Every write is a single-row, single-column `UPDATE` of an idempotent value.
   There is no read-modify-write cycle to lose (contrast wallet balances, which
   genuinely need transactions).
2. The realistic collision is two staff marking the *same* item sold out
   within seconds of each other — both intend the same outcome, and both get it.
3. The only true conflict (A marks sold out while B restores) has no correct
   automatic resolution: whichever tap landed last is, in practice, the freshest
   information from the floor.
4. The screen revalidates after every toggle, so a client that lost a race
   converges to server truth within one request cycle rather than showing a
   phantom state.
5. Two people, one tablet-sized team, tens of items: an `ETag`/`If-Match` layer
   would be more code than the feature itself.

What we do **not** do: WebSocket push, polling, or cross-device invalidation.
Staff who need certainty pull to refresh, which the existing list pattern
already supports.

---

## 19. Testing Strategy

Everything below uses tooling already in the repo (§6.5). No new test framework.

### 19.1. Domain (Go) — `apps/api/domain/availability_test.go` *(new)*

Table-driven, no mocks, mirroring `coupon_calculator_test.go`:

- The full §10.2 truth table for `ResolveVariantAvailability`, including the
  never-stored `available`-override rows.
- `ResolveProductAvailability`: no variants; some sold out; all sold out
  (Case 16); product itself sold out.
- `NormalizeAvailabilityOverride`: `available → nil`, `sold_out → sold_out`,
  `nil → nil`.
- R-8: unknown string resolves to `available`.

### 19.2. Backend usecases (Go) — `product_usecase_test.go`, `variant_usecase_test.go`, `availability_usecase_test.go` *(new)*

- `MarkProductSoldOut` / `MarkProductAvailable` call the repository with the
  right value; repository errors propagate with the right `ErrorType`.
- `MarkVariantAvailable` persists `nil` (R-4/R-5), **not** `"available"`.
- `MarkVariantSoldOut` is idempotent when already sold out.
- `GetMenuAvailability`: grouping by product; counts computed from *effective*
  values; `filter=sold_out` excludes fully-available products; drafts and
  soft-deleted rows excluded; a product with zero variants is included.
- **Regression (§13.3, highest value in this list):** an ordinary
  `UpdateProductById` / `UpdateVariantById` call leaves availability untouched.

### 19.3. Backend handlers (Go) — `product_handler_test.go`, `variant_handler_test.go`, `availability_handler_test.go` *(new)*

`httptest` + mux + mock repo, asserting status codes exactly like
`TestProductHandler_GetProductList`:

- `PUT /products/{id}/sold-out` → 200 and the updated entity; unparseable id → 400;
  repo `NotFound` → 404; repo error → 500.
- Same four cases for the other three write endpoints.
- `GET /availability` → 200 with grouped payload; `filter=sold_out` narrows it;
  repository error → 500.
- Auth: routes are registered under `CheckAuth` (covered by the existing
  middleware tests; no per-route duplication).

### 19.4. Frontend domain

- `Availability.test.ts` *(new)* — the same truth table as §19.1, so the two
  stacks are provably in agreement (identical case names on both sides makes
  drift obvious in review).
- `availabilityList.test.ts` *(new)* — `UsecaseTester` + `MockAvailabilityRepository`:
  `idle → loading → loaded`; toggle product → `togglingProduct` → revalidate →
  `loaded` with the new state; toggle failure → error message + state reverted;
  `CHANGE_PARAMS` filter/search behaviour; error → retry → loaded.

### 19.5. Frontend components

Jest + Testing Library (`ChecklistSessionItemRow.test.tsx` is the model):

- `AvailabilityListItem`: renders no pill when available; `SOLD OUT` when the
  product is sold out; `N sold out` when only variants are.
- `AvailabilityVariantRow`: tap fires the correct callback; shows a spinner and
  ignores taps while toggling; is dimmed, captioned, and non-interactive when the
  product is sold out.
- `AvailabilityProductSheet`: renders the product switch, the variant list, and
  the "no variants" caption for variant-less products.
- `AvailabilitySoldOutAlert`: appears only for products with variants; confirm
  and cancel wire through correctly.
- `AvailabilityList`: empty / error / loading states.
- Storybook stories for every new component, including the all-available and
  all-sold-out extremes.

### 19.6. E2E — `apps/web-e2e/src/availability.spec.ts` *(new)*

Serial Playwright spec following `products.spec.ts` (create fixtures via the API
in `beforeAll`, clean up in `afterAll`):

1. Seed a category, a product with three variants, and a variant-less product.
2. Mark a variant sold out from the sheet → the list row shows `1 sold out`.
3. Mark the product sold out (confirm the dialog) → the row shows `SOLD OUT` and
   the variant rows are disabled.
4. Restore the product → the previously overridden variant is **still** sold out
   (the Case 7 / US-6 regression that matters most).
5. Restore that variant → nothing sold out; the `Sold out` tab shows `EmptyView`.
6. Assert via the API that a subsequent product edit (rename) preserves
   availability.

---

## 20. Migration Strategy

### 20.1. Rollout order

1. **Migration 000019** applied first (additive, defaulted, no locks of
   consequence at this table size).
2. **API deploy** — the new fields appear in responses; the write endpoints
   exist. Nothing calls them yet.
3. **Web/mobile deploy** — the availability screen appears in the sidebar.

Each step is independently safe: an old client ignores the new response fields,
and a new API with an old client simply never receives a write.

### 20.2. Data migration

None. The column defaults are the migration: every existing product becomes
`available`, every existing variant inherits. Post-deploy, the availability
screen shows the entire menu as available with `0 items sold out` — the correct
starting state.

### 20.3. Rollback

`000019.down.sql` drops both columns. The only data lost is which items were
sold out at that moment — recreatable in seconds by staff. Deploy order
reverses cleanly (frontend → API → migration).

### 20.4. Compatibility guardrails

- Availability stays out of `ProductRequest` / `VariantRequest`, so no existing
  client can accidentally write it.
- The §19.2 regression test locks in that catalog edits do not clobber
  availability (GORM `Updates` zero-value semantics — see §13.3).
- Mock repositories, Storybook fixtures, and the frontend transformers all get
  the field with an `available` fallback, so any path that forgets it degrades
  to "sellable", never to "hidden".

---

## 21. Implementation Phases

Four phases. Each is independently reviewable, independently deployable, and
leaves the app in a working state.

---

### Phase 0 — Repository & architecture investigation ✅ (this document)

**Objective.** Establish the actual architecture, existing status concepts, UI
conventions, and testing patterns, and make the load-bearing model decisions
before any code exists.

**Why this phase exists.** The initial proposal
(`variant.availabilityOverride ?? product.availability`) had to be checked
against a real domain that already contains `status`, `deleted_at`,
`is_stock_check_required`, and a stock-check subsystem. It survived, with two
refinements that only inspection could produce: product dominance (§10.3) and
normalization of the redundant `available` override (R-5).

**Deliverable.** This PRD. **Acceptance:** decisions in §8, §10.3, §12.1, §14.2
are accepted or amended by the product owner; §23 open questions answered.

---

### Phase 1 — Domain, database, and contract passthrough

**Objective.** Availability exists end-to-end and is visible in every API
response, but nothing can change it yet.

**Why this phase exists.** It is the entire schema+contract+codegen risk in one
reviewable, behaviour-neutral change. If something is wrong with the GORM
mapping or the generated clients, it surfaces here rather than tangled up with
new endpoints and a new screen.

**Database.**
- `migrations/000019_add_product_variant_availability.up.sql` / `.down.sql` (§13.1).

**Backend.**
- `domain/product_entity.go`: `Availability` type + constants + `Product.Availability`.
- `domain/variant_entity.go`: `Variant.AvailabilityOverride *Availability`.
- `domain/availability.go` *(new)*: `ResolveVariantAvailability`,
  `ResolveProductAvailability`, `NormalizeAvailabilityOverride`.
- `data/mysql/product_entity.go` / `variant_entity.go` + transformers: map both
  columns (`Availability string`, `AvailabilityOverride *string`).
- `presentation/restapi/product_transformer.go`: emit `availability`.
- `presentation/restapi/variant_transformer.go`: emit `availabilityOverride` and
  the resolved `effectiveAvailability`.
- `libs/api-contract/src/api.yaml`: `Availability` schema + the three fields
  (§14.3); regenerate TS and Go clients.

**Frontend.**
- `entities/Product.ts`, `entities/Variant.ts`: new fields.
- `entities/Availability.ts` *(new)*: the mirrored pure functions.
- `data/api/product.transformer.ts`, `variant.transformer.ts`: map the fields
  with an `available` fallback.
- `data/mock/product.ts`, `variant.ts`: fixtures updated so the required
  generated types compile.

**Tests.** `availability_test.go`; `Availability.test.ts`; the §19.2 regression
test that a normal product/variant update does not clobber availability;
existing suites stay green.

**Dependencies.** None.

**Acceptance criteria.**
- Migration applies and rolls back cleanly on a copy of production data.
- Every existing product reads `availability: "available"`; every variant reads
  `effectiveAvailability: "available"` and no `availabilityOverride`.
- Editing a product/variant through the existing forms changes no availability
  value.
- Go and TS truth-table tests pass with matching case names.
- No user-visible change anywhere.

---

### Phase 2 — Backend write actions and the availability read model

**Objective.** The four state-change endpoints and `GET /availability` exist,
are tested, and are usable by any client.

**Why this phase exists.** The API is the contract the UI is built against, and
it is also the deliverable other systems (QR ordering, checkout) will consume —
it deserves to land and be reviewable on its own.

**Backend.**
- `domain/product_repository.go` + `variant_repository.go`: the two narrow
  update methods; regenerate gomock mocks.
- `data/mysql/product_repo.go` + `variant_repo.go`: single-column updates
  following `UpdateChecklistSessionItemCompletedAt`.
- `domain/product_usecase.go` / `variant_usecase.go`: `MarkProductSoldOut`,
  `MarkProductAvailable`, `MarkVariantSoldOut`, `MarkVariantAvailable`
  (the last writes `nil`, per R-5).
- `domain/availability_usecase.go` *(new)*: `GetMenuAvailability` (§14.4).
- `presentation/restapi/`: handlers on the product/variant handlers, new
  `availability_handler.go` + `availability_route.go` + `availability_transformer.go`;
  register the router in `main.go` next to the others.
- `api.yaml`: five operations + `AvailabilityFilter` parameter + the three
  response schemas; regenerate both clients.

**Database.** None.

**Frontend.** None (generated clients change, but nothing consumes them yet).

**Tests.** §19.2 usecase tests and §19.3 handler tests, including idempotency,
404s, and the "restore writes NULL" assertion.

**Dependencies.** Phase 1.

**Acceptance criteria.**
- `curl -X PUT /products/1/sold-out` flips the column and returns the product;
  repeating it is a no-op success.
- `PUT /variants/9/available` sets `availability_override` to `NULL`.
- `GET /availability` returns products grouped with their variants, correct
  effective values, correct counts, drafts and soft-deleted rows excluded.
- `GET /availability?filter=sold_out` returns only products with something
  effectively sold out.
- Existing endpoints and tests are unaffected.

---

### Phase 3 — Staff availability UI

**Objective.** The `/availability` screen ships on web and mobile: list, sheet,
toggles, confirmation, toasts, empty/error states.

**Why this phase exists.** It is the feature as far as staff are concerned, and
it is the only phase with meaningful UX judgement in it. Keeping it separate
means UI review is about the UI.

**Frontend.** Everything in §15.1–15.5: entities, repository interface + API
impl + mock + URL query repo, `availabilityList` usecase, controller with
toasts, five components + stories, screen + handler, sidebar entry, web page
with SSR, mobile stack registration, index re-exports.

**Backend / database.** None.

**Tests.** §19.4 usecase tests, §19.5 component tests, Storybook stories for
each new component, and screen-level render coverage matching the existing
`*Handler.test.tsx` convention.

**Dependencies.** Phase 2.

**Acceptance criteria.**
- Sidebar → Operations → Availability opens the screen; it defaults to the
  `Sold out` tab when anything is sold out and `All` otherwise.
- Marking any single item sold out or available takes ≤ 2 taps from the list
  (≤ 3 with the product confirmation).
- Available items render no badge anywhere.
- With the product sold out, variant rows are dimmed, captioned "Product is sold
  out", and non-tappable.
- Restoring a product restores exactly the prior override set.
- Every action toasts; every failure reverts the row and refetches.
- Filter and search survive a page refresh (URL-persisted).
- The screen works on a tablet viewport and on React Native.

---

### Phase 4 — Integration and hardening

**Objective.** Prove the feature end-to-end against the real API and close the
documentation loop.

**Why this phase exists.** The highest-risk regressions (a catalog edit wiping
availability; a product restore erasing deliberate variant exceptions) are
cross-layer and only an end-to-end test really pins them down. Docs matter
because the next feature will consume this one.

**Deliverables.**
- `apps/web-e2e/src/availability.spec.ts` (§19.6).
- Seed data: a couple of sold-out fixtures in `apps/api/seeds` so a fresh
  environment demonstrates the feature.
- `docs-site/catalog/availability.md` — staff-facing "how to mark something sold
  out", plus a short consumer note ("read `effectiveAvailability`, never
  recompute it") wired into the docs-site nav next to `products.md` / `variants.md`.
- README feature-list bullet.
- R-8 warning logging verified in a manual smoke test.

**Backend / database / frontend.** None beyond seeds and docs.

**Dependencies.** Phase 3.

**Acceptance criteria.**
- The E2E spec passes in CI, including the restore-preserves-overrides step and
  the product-edit-preserves-availability assertion.
- A fresh seeded environment shows a realistic mix of available and sold-out
  items.
- Docs-site page published; README updated.

---

## 22. Acceptance Criteria

Feature-level, verifiable statements. Case numbers refer to the brief.

1. **Case 1** — A product without variants can be marked sold out and restored, and reports `effectiveAvailability` accordingly.
2. **Case 2** — With a product available and no overrides, every variant reports `available`.
3. **Case 3** — With a product `sold_out`, every variant reports `sold_out` regardless of override.
4. **Case 4** — With a product available and one variant overridden `sold_out`, exactly that variant reports `sold_out`.
5. **Case 5** — Restoring a product makes all non-overridden variants report `available` with no per-variant writes.
6. **Case 6** — A variant override survives while the product is available and is the only thing making that variant unavailable.
7. **Case 7** — Restoring a variant clears the override (`NULL`), after which the variant follows the product in both directions.
8. Marking a variant available never writes the string `available` into `variants.availability_override`.
9. All four write actions are idempotent and return the updated entity.
10. `GET /availability` returns, in one request, every published non-deleted product with its variants, effective states, per-product counts, and global sold-out totals.
11. `effectiveAvailability` is present on every variant in every variant-returning response, and no consumer needs to compute it.
12. The staff screen requires ≤ 2 taps to mark or restore any item (≤ 3 for a product with variants, due to the confirmation), and shows no toggle for anything that is simply available.
13. A product/variant edit through the existing catalog forms leaves availability unchanged (regression-tested).
14. After the migration, every pre-existing product and variant is available; no menu item becomes unsellable.
15. The migration rolls back cleanly, losing only current sold-out flags.
16. Availability is fully orthogonal to `status` and `deleted_at`: no cascade in either direction.
17. Go and TypeScript resolution functions agree on the full truth table, proven by mirrored tests.
18. No stock quantity, threshold, or deduction concept is introduced anywhere in the diff.

---

## 23. Open Questions

Answers change the implementation; defaults are what will be built if no answer is given.

| # | Question | Recommendation / default |
|---|---|---|
| Q1 | Should sold-out flags **auto-reset** (e.g. every morning at open)? | **Default: no.** Manual restore keeps the model honest and the code trivial. If yes, this needs a `sold_out_at DATETIME NULL` column plus a scheduled job — a Phase 5, not a tweak. |
| Q2 | Should **rental products** (board games) appear on the availability screen? | **Default: yes**, all sale types. A game out on loan or with lost pieces is exactly a sold-out item. Say so if rentals should be excluded. |
| Q3 | Should **draft** products appear on the availability screen? | **Default: no** — drafts are already unsellable, and listing them would dilute the exception-first list. |
| Q4 | Sidebar placement: **Operations** (recommended), Inventory, or a top-level entry for one-tap access during service? | **Default: Operations.** If staff will use this several times per shift on a tablet, a top-level entry is defensible. |
| Q5 | Should **checkout** (`TransactionItemSelect`) start hiding or greying out sold-out items? | Out of scope here by the brief, and the obvious next consumer. **Recommendation: a follow-up PRD** — it needs its own decisions (hide vs disable; what happens to an in-progress transaction; whether a manager can override at the till). |
| Q6 | Should a read-only sold-out pill appear on the **product list** (`/products`)? | **Default: no** in v1 (one screen owns availability). Cheap to add later if staff ask. |
| Q7 | Do we need to record **who** marked something sold out and **when**? | **Default: no.** Two-person team, transient state. This is the one requirement that would justify revisiting the exception-table model (Option D). |
| Q8 | Keep the **confirmation dialog** when marking a product with variants sold out? | **Default: keep.** It is the only action that removes several sellable items at once. Drop it if staff find it slows the common case. |

---

## 24. Recommended Approach

In one page:

1. **Model.** Add `products.availability` (`VARCHAR(20) NOT NULL DEFAULT 'available'`,
   values `available` | `sold_out`) and `variants.availability_override`
   (`VARCHAR(20) NULL`, `NULL` = inherit, only `sold_out` ever stored). Two
   columns, one migration, no new tables, no counters, no quantities. This is
   Option A from the brief, refined by inspection — string enums because
   `sale_type` and `status` on the same table already are, nullable on the
   variant because "inherit" must be a real, cheap, default state.

2. **Rule.** `effective(variant) = product.availability == SOLD_OUT ? SOLD_OUT :
   (override ?? AVAILABLE)`. **A variant may never override a sold-out product
   back to available** — sold-out wins, because a product-level sold-out means
   the shared base is gone, and because failing closed is the correct direction
   for a POS. Because an `available` override is then provably a no-op, it is
   normalized to `NULL` on write, which removes the whole class of
   "inconsistent state" problems. The rule lives in exactly one pure function
   per stack (`domain/availability.go`, `entities/Availability.ts`) with mirrored
   truth-table tests, and the API returns the resolved value so future consumers
   never re-implement it.

3. **API.** Four bodyless `PUT` action endpoints — `/products/{id}/sold-out`,
   `/products/{id}/available`, `/variants/{id}/sold-out`, `/variants/{id}/available`
   — copying the existing checklist `check`/`uncheck` precedent, plus one read
   model, `GET /availability`, that returns the whole menu grouped with resolved
   states and counts. Availability stays out of `ProductRequest`/`VariantRequest`
   so catalog edits can never touch it. No transactions (single-column writes),
   no optimistic concurrency (idempotent, last write wins), `CheckAuth` like
   every other route.

4. **Staff UX.** One screen, `/availability`, exception-first: a sold-out count,
   an `All` / `Sold out` filter, and a list where **available items have no badge
   at all**. Tap a product → a `Sheet` with one product-level switch and a
   tap-to-toggle row per variant. Two taps to mark, two taps to restore. When the
   product is sold out, variant rows are dimmed and disabled, which teaches the
   dominance rule without ever saying "inheritance". Confirmation only on the one
   action that takes several items off the menu at once; toasts everywhere;
   built entirely from `ListItem`, `Sheet`, `ConfirmationAlert`, `Tabs`,
   `EmptyView`, `ErrorView`, `SkeletonList`, and the `ChecklistSessionItemRow`
   toggle pattern that already exists.

5. **Actions.** Exactly four: mark product sold out, restore product, mark
   variant sold out, restore variant. "Mark all variants sold out" *is* marking
   the product sold out; "remove override" *is* restoring the variant. No fifth
   action earns its place.

6. **Phasing.** Phase 1 lands schema + contract + the pure rule with zero
   behaviour change; Phase 2 lands the endpoints; Phase 3 lands the screen;
   Phase 4 lands E2E, seeds, and docs. Each phase is deployable on its own, and
   the riskiest thing in the whole feature — that a routine product edit could
   silently wipe availability, given GORM's zero-value `Updates` semantics — is
   pinned down by a regression test in Phase 1 and again end-to-end in Phase 4.
