# PRD: Product Draft Status (research products without releasing to checkout)

## Problem Statement

Baristas want to **experiment with new menu items** — try a recipe, register its
materials/variants, work out the costing — **before** the item is ready to be
sold. Today there is no in-between state: the moment a product is created it is
fully live. Every product returned by `GET /products` shows up in the
**Transaction Item Select** grid (`TransactionItemSelect`), so a half-finished
experimental product can be added to a real customer transaction by mistake.

This creates two problems:

1. **No safe place to research.** A barista cannot register a work-in-progress
   product (to capture its options, variants, and costing) without it
   immediately becoming sellable.
2. **Checkout pollution.** Experimental / unfinished products clutter the
   transaction item grid and can be sold accidentally, producing transactions
   for items that were never meant to be on the menu.

We need a way to mark a product as **not yet released** so it is hidden from the
Transaction Item Select grid, while still being fully visible and editable in the
Product Management screens.

---

## Terminology decision (the question in the request)

The request asks whether the right term is "draft", "published", or something
else. **Recommendation: a `status` field with two values — `draft` and
`published`.**

| Option | Verdict |
|---|---|
| **`status: draft \| published`** (recommended) | Reads naturally, matches the mental model baristas already have from documents/menus ("it's still a draft"). Extensible — we can add `archived` / `discontinued` later without another migration pattern change. Consistent with the codebase, which already models product attributes as **string enums** (`sale_type`, `station`). |
| `is_published: boolean` | Simplest and mirrors the `is_payment_target` prior art, but a boolean cannot grow a third state later without an awkward second flag. |
| `is_draft: boolean` | Same limitation, and the negative-default phrasing ("not draft") reads worse in filters and queries. |

So: a product is either **`draft`** (visible only in Product Management — for
research) or **`published`** (live; appears in checkout). The rest of this
document uses those terms.

---

## Context: Existing System

- **Backend**: Go REST API + MySQL, Clean Architecture (`domain → data → presentation`). Migrations under `apps/api/migrations` (numbered, sequential, `.up.sql` / `.down.sql` pairs; latest is `000015`).
- **Frontend**: Next.js web + React Native mobile, sharing `libs/ui` (Tamagui). Types come from `libs/api-contract/src/api.yaml` via generated React Query clients. UI follows a finite-state-machine usecase pattern (`domain/usecases`) consumed by controllers.
- **The closest existing pattern is `SaleType`** (`purchase` / `rental`) on `Product`. It is implemented end-to-end exactly the way this feature should be, and we will mirror it:
  - Domain enum + field: `apps/api/domain/product_entity.go` (`SaleType` type, `Product.SaleType`).
  - MySQL entity/transformer: `apps/api/data/mysql/product_entity.go`, `product_transformer.go`.
  - Repository filter: `apps/api/data/mysql/product_repo.go` — `GetProductList` / `GetProductListTotal` take a `saleType *domain.SaleType` and add a `WHERE` clause.
  - Usecase + interface threading: `apps/api/domain/product_usecase.go`, `product_repository.go`.
  - HTTP query param: `GetSaleType(r)` in `apps/api/presentation/restapi/product_transformer.go`; wired in `product_handler.go`.
  - OpenAPI: `Product` / `ProductRequest` schemas + the `SaleType` query parameter in `libs/api-contract/src/api.yaml`.
  - Frontend entity/repo/usecase: `libs/ui/src/domain/entities/Product.ts`, `domain/repositories/product.ts`, `domain/usecases/productList.ts` (`SaleType` type), `domain/usecases/transactionItemSelect.ts`.
- **Where products enter checkout**: `libs/ui/src/domain/usecases/transactionItemSelect.ts` calls `productRepository.fetchProductList(...)` / `getProductList(...)`. The grid is **paginated** (`itemPerPage` default 100), so filtering must happen **server-side** — a client-side filter would corrupt page counts and totals.
- **Boolean-flag prior art** (for reference only): `is_payment_target` on `Wallet` (`TINYINT(1) NOT NULL DEFAULT 1`) — see `docs/prd-wallet-payment-eligibility.md`.
- **Auth**: JWT, no RBAC. Any logged-in crew member can edit products.

---

## Proposed Solution

Add a single new field on `Product`:

| Field | Type | Default | Meaning |
|---|---|---|---|
| `status` | enum (`draft` \| `published`) | `published` | `published` → the product is live and appears in the Transaction Item Select grid. `draft` → the product is hidden from checkout but fully visible/editable in Product Management. |

The flag is **product-scoped** and modeled as a string enum, mirroring
`sale_type`.

### Filtering: server-side, via a `status` query param

Because the product grid is paginated, the **Transaction Item Select fetches
only `published` products** by passing `status=published` to `GET /products`.
This mirrors the existing `saleType` query param exactly and keeps drafts off the
wire entirely during checkout.

The new query param accepts `draft`, `published`, or `all` (default `all` when
omitted, so existing `GET /products` callers are unaffected).

### Where `status` applies vs. where it does not

| Surface | Behaviour |
|---|---|
| Transaction Item Select grid (`TransactionItemSelect`) | **Filtered** — requests `status=published`; drafts never appear. |
| Product list / management page | **Not filtered by default** — shows all products, renders a `Draft` / `Published` badge, and offers an optional status filter. |
| Product create / update form | Editable — a `Status` selector (Draft / Published). |
| Existing transactions, reports, variants, materials | Unchanged — a product that *was* sold and is later set to `draft` keeps its historical transaction rows intact. |

### Backward-compatibility default

The migration adds the column with `DEFAULT 'published'`, so **every existing
product stays sellable** — a "default deny" rollout would silently remove every
product from checkout. New products created through the form also default to
`published` (least-surprise, preserves today's behaviour); a barista who wants
to research explicitly switches the new product to **Draft**. (See Open
Question 1 — there is a reasonable argument for defaulting new products to
`draft`, called out for the product owner to decide.)

---

## Feature Requirements

### FR-1: Extend Product with `status`

Add the `status` field defined above to the `Product` entity, MySQL schema,
OpenAPI contract (response + request schemas), transformers, and seed data.

**Rules:**
- Type: string enum, values `draft` | `published`. **Required** on create/update
  requests (clients send it explicitly, same as `saleType`).
- Existing rows are backfilled to `published` via the column `DEFAULT` (see
  Phase 1).
- Independent of `saleType` — any combination is valid (e.g. a `rental` product
  can be `draft`).
- Soft-deleted products (`deleted_at IS NOT NULL`) remain excluded everywhere as
  today; `status` is orthogonal to deletion.

### FR-2: Filter the Transaction Item Select to published products only

The product grid used when building a transaction shall request and show only
`status = published` products.

**Rules:**
- Filtering is **server-side** via the new `status` query param — the
  `transactionItemSelect` usecase passes `status: 'published'` on both
  `fetchProductList` and `getProductList`.
- Pagination, search, and totals all continue to reflect the filtered set.
- The Product Management list is **not** affected by this requirement.

### FR-3: Manage `status` from the Product UI

Managers/baristas can set and see a product's status without engineering help.

**Rules:**
- Product create form: a `Status` selector (`Draft` / `Published`), defaulting to
  `Published`, wired into the form schema and submit payload. Mirror the existing
  `Sale Type` `<Select>` in `ProductFormView.tsx`.
- Product update form: same selector, pre-filled from the fetched product.
- Product list: a `Draft` / `Published` badge per product, and an optional list
  filter (`All` / `Draft` / `Published`) reusing the same query param.
- Inline help under the selector: *"Draft products are hidden from checkout — use
  Draft to research a new product before releasing it for sale."*

---

## Out of Scope

- **Backend hard-block** of adding a draft product to a transaction via the raw
  API. FR-2 hides drafts from the UI, which addresses the stated goal. A
  defensive guard in the transaction-create usecase is a sensible follow-up but
  is called out in Open Questions rather than scoped here, to keep the blast
  radius small.
- A third state such as `archived` / `discontinued`. The enum is chosen so this
  can be added later, but it is not built now.
- Per-user / per-role permissions on who can publish. No RBAC exists today.
- Scheduled / timed publishing ("go live on Saturday"). `status` is a static
  field.
- Audit history of who changed status and when. The product table has no audit
  log today.
- Mobile-specific UX polish beyond what the shared Tamagui screens provide.

---

## Open Questions

1. **Default status for *new* products.** Recommended `published` (preserves
   current behaviour; researchers opt into Draft). Alternative: default `draft`
   so nothing is accidentally live, and the barista explicitly publishes when
   ready. This is a product-owner call; the migration default for *existing*
   rows is `published` either way.
2. **Should the backend reject draft products at transaction creation?** Hiding
   them in the UI (FR-2) meets the request. If we want defense-in-depth, a guard
   in the transaction-create usecase that rejects items whose product is `draft`
   could be added as a small follow-up PR.
3. **Seed data.** Should the seeder mark one sample product as `draft` so fresh
   environments demonstrate the feature? Suggested **yes** — contained in
   `apps/api/seeds/product_seeder.go`, zero risk to existing deployments.

---

# Implementation Plan — Phased PRs

Each phase is sized to land as **one reviewable PR**. Phases are ordered so
`main` stays green: the API remains backward-compatible after Phase 1 (the new
query param defaults to `all`), and no UI ships before its supporting backend
field exists.

The plan is **three PRs**: backend field + filter + API contract; frontend
checkout filtering; frontend product-management UI.

---

## Phase 1 — Backend: add `status` to Product + server-side filter

**Goal:** Ship FR-1 end-to-end at the API layer, plus the `status` query-param
filter, without changing any UI behaviour yet.

**Backend**
- Migration `000016_add_product_status.up.sql` / `.down.sql`:
  - `up`: `ALTER TABLE products ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'published';`
    (the `DEFAULT` backfills all existing rows — no separate backfill statement).
  - `down`: `ALTER TABLE products DROP COLUMN status;`
- `apps/api/domain/product_entity.go`: add a `ProductStatus` string type with
  consts `ProductStatusDraft = "draft"` and `ProductStatusPublished = "published"`,
  and a `Status ProductStatus` field on `Product` (mirror the `SaleType` block).
- `apps/api/data/mysql/product_entity.go`: add `Status string`.
- `apps/api/data/mysql/product_transformer.go`: map `Status` in `ToProductDB` /
  `ToProductDomain`.
- `apps/api/domain/product_repository.go`: add a `status *ProductStatus` param to
  `GetProductList` and `GetProductListTotal` (mirror `saleType`).
- `apps/api/data/mysql/product_repo.go`: add the `status` filter `switch` in both
  `GetProductList` and `GetProductListTotal` (mirror the `saleType` switch; `nil`
  / `all` → no filter).
- `apps/api/domain/product_usecase.go`: thread the new param through
  `GetProductList`.
- `apps/api/presentation/restapi/product_transformer.go`:
  - `ToApiProduct`: include `Status`.
  - `ToProduct`: read `Status` from the request.
  - Add `GetProductStatus(r)` helper (mirror `GetSaleType`; returns `*domain.ProductStatus`).
- `apps/api/presentation/restapi/product_handler.go`: call `GetProductStatus(r)`
  and pass it into the usecase.
- `libs/api-contract/src/api.yaml`:
  - Add `status: { type: string, enum: [draft, published] }` to the `Product`
    response schema **and** `ProductRequest` (add to each `required` list).
  - Add a `ProductStatus` query parameter (`enum: [draft, published, all]`) and
    attach it to the `GET /products` operation (next to `SaleType`).
  - Regenerate Go + TS clients (`nx run api-contract:generate:go` and
    `:generate:ts`).
- `apps/api/seeds/product_seeder.go`: add `Status` to the seeded struct and
  `productDef`; set every product explicitly, with **one** product seeded as
  `draft` to demo the feature (resolves Open Question 3).
- `apps/api/data/mock/product_repository.go`: regenerate mock (`go generate`) for
  the changed interface signature.
- Tests: extend `apps/api/domain/product_usecase_test.go` and
  `apps/api/presentation/restapi/product_handler_test.go` to cover the new field
  on create/update/get/list and the `status` filter.

**Frontend**
- None. Generated TS types gain `status`; leave unused this phase.

**Acceptance**
- `GET /products` returns `status` for every product; existing products read
  back as `published`.
- `GET /products?status=draft` / `?status=published` filter correctly; omitting
  the param (or `all`) returns everything.
- `POST /products` and `PUT /products/{id}` accept and persist `status`.
- Migration applies cleanly on a populated DB; `down` reverses cleanly.
- All existing product tests pass; new field/filter covered.

**Estimated diff:** ~250–350 LoC. Self-contained.

---

## Phase 2 — Frontend: hide drafts from the Transaction Item Select

**Goal:** Ship FR-2 — checkout shows only published products.

**Frontend**
- `libs/ui/src/domain/entities/Product.ts`: add `status: ProductStatus`
  (`'draft' | 'published'`) to `Product`.
- `libs/ui/src/data/api/product.transformer.ts`: map `status` in `toProduct`.
- `libs/ui/src/domain/repositories/product.ts`: add `status: ProductStatus`
  to the `getProductList` / `fetchProductList` param shapes (or reuse a shared
  `ProductStatus` filter type incl. `'all'`).
- `libs/ui/src/data/api/product.ts`: pass `status` through to the generated
  client query params in both `getProductList` and `fetchProductList`.
- `libs/ui/src/domain/usecases/transactionItemSelect.ts`: pass
  `status: 'published'` in the `fetchProductList` / `getProductList` calls inside
  `onStateChange` (and add `status` to the usecase `Context`/params if needed,
  defaulting to `'published'`).
- Tests: update `transactionItemSelect.test.ts` and any
  `TransactionCreateHandler` tests so the product fetch asserts
  `status: 'published'`; ensure mocks/fixtures include `status`.

**Backend**
- None.

**Acceptance**
- The Transaction Item Select grid requests `status=published` and never shows a
  draft product.
- A product flipped to `draft` (via DB or the Phase 3 UI) disappears from
  checkout on the next fetch; flipping it back to `published` restores it.
- Pagination, search, and totals reflect the published-only set.

**Estimated diff:** ~120–200 LoC.

**Dependency:** Phase 1 merged + deployed (field and query param must exist).

---

## Phase 3 — Frontend: manage `status` in the Product form + list

**Goal:** Ship FR-3 — baristas can create drafts and see/toggle status.

**Frontend**
- `libs/ui/src/domain/entities/Product.ts`: add `status` to `ProductForm`.
- `libs/ui/src/data/api/product.transformer.ts`: include `status` in
  `toApiProduct`.
- `ProductFormView.tsx`: add a `Status` `<Select>` (`Draft` / `Published`),
  defaulting to `Published`, next to the existing `Sale Type` field; add the
  inline help text. Update the form schema/validation and the create/update
  controllers (`ProductCreateController` / `ProductUpdateController`) so the
  field is initialized and submitted.
- Product list:
  - `ProductListItem.tsx`: render a `Draft` / `Published` badge.
  - Product list screen + `domain/usecases/productList.ts`: add an optional
    status filter (`All` / `Draft` / `Published`) reusing the new query param
    (the usecase already carries `saleType` — mirror it with `status`).
- Tests: form validation includes `status`; `productCreate` / `productUpdate`
  usecase tests assert `status` is sent; list renders the badge / filter.

**Backend**
- None.

**Acceptance**
- Creating a product as `Draft` persists `status = draft` and the product does
  **not** appear in the Transaction Item Select grid, but **does** appear in the
  Product list with a `Draft` badge.
- Editing a product's status updates it and is reflected in the list badge and
  in checkout on the next fetch.
- The product list status filter narrows the list correctly.
- Existing product management flows are not regressed.

**Estimated diff:** ~250–400 LoC.

**Dependency:** Phase 1 (field + param). Independent of Phase 2 — either order
works, but shipping Phase 2 first means drafts are hidden from checkout the
moment Phase 3 lets baristas create them.
