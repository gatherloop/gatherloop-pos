# PRD: Table Ordering — Customer Self-Ordering from the Table

**Status:** Draft for review
**Scope of this PRD:** item discovery + cart. **No transaction is created, no payment gateway is integrated.**

---

## Problem Statement

Today every order goes through a staff member on the POS (`apps/web` → `TransactionCreate`). At peak hours the counter is the bottleneck: customers queue to order, staff key items in one at a time, and a single cashier serializes the whole room.

We want customers to browse the menu and build their order **from their table**, on their own phone, by scanning a QR code — the model popularized by [pesan.app](https://pesan.app). Staff then only handle payment and fulfilment.

This PRD covers the **first half of that flow**: a mobile-first customer web app where a guest can discover menu items and assemble a cart that survives a page reload — with a visible **Checkout** action that leads to a QRIS-only payment step which is **deliberately not implemented yet**.

### Goals

1. A customer scans a table QR code and sees the live menu — no app install, no login, no account.
2. The customer can pick an item, choose its options, set quantity, add a note, and add it to a cart.
3. The cart persists across reloads and returning visits, keyed by an anonymous **session ID**.
4. A **Checkout** action is always visible when the cart is non-empty, and it explains that payment is QRIS-only.
5. Every phase ships as one small, independently reviewable PR.

### Non-Goals (explicitly out of scope for this PRD)

| Not doing | Why |
|---|---|
| Creating a `Transaction` from the cart | Confirmed with the requester — discovery + cart only. The cart is the deliverable; conversion to a transaction is the next PRD. |
| QRIS payment gateway integration (Midtrans/Xendit/direct QRIS) | Payment method is fixed as QRIS but the integration is a separate project with its own vendor, security and reconciliation concerns. |
| Order status / kitchen display / order history screen | All depend on a transaction existing. |
| Customer accounts, login, phone/OTP | The requirement is explicitly anonymous. |
| Table master data + QR code generator in the POS admin | v1 treats the table code as an opaque string from the URL (see D6). A `tables` entity is future work. |
| Rentals (board games) in the customer app | The customer menu is `saleType=purchase` only; rentals need staff to hand over physical inventory. |
| React Native customer app | Web-only. The QR flow lands in a browser; an install is a conversion killer. |

---

## Context: The Existing System

Anything the customer app touches, it touches through what is already here.

### Architecture

- **Backend** — Go REST API (`apps/api`), MySQL + GORM, Clean Architecture: `domain` (entities, repository interfaces, usecases) → `data/mysql` (repos, entities, transformers) → `presentation/restapi` (handlers, routes, transformers). Mocks generated into `data/mock` via `mockgen`. Migrations in `apps/api/migrations/` — **next free number is `000019`** (latest is `000018_drop_budget_balance`).
- **Frontend** — Next.js web (`apps/web`) and React Native (`apps/mobile`) are thin shells. Effectively all UI lives in `libs/ui`, mirroring the backend layering: `domain/{entities,repositories,usecases}` → `data/{api,mock,url,memory}` → `presentation/{components,controllers,screens}`. Screens come in a `XxxHandler.tsx` (wiring) + `XxxScreen.tsx` (presentational) + `XxxScreen.stories.tsx` pair, with handler tests alongside.
- **Contract** — OpenAPI at `libs/api-contract/src/api.yaml`, codegen (Kubb) into TS clients + React Query hooks via `nx run api-contract:generate:ts`, consumed by both frontends. The Go side reads the same YAML for its response types (`libs/api-contract` Go module).
- **UI kit** — Tamagui, shared cross-platform components in `libs/ui/src/presentation/components/base` (`Layout`, `Sheet`, `Tabs`, `ListItem`, `EmptyView`, `ErrorView`, `LoadingView`, `Pagination`, `Form`).
- **E2E** — Playwright in `apps/web-e2e`.
- **Docs** — VitePress site in `docs-site/`, deployed by `.github/workflows/deploy-docs.yaml`.

### The catalog we will serve to customers

```
Category { id, name, station: KITCHEN|BAR|NONE, createdAt }
Product  { id, categoryId, category, name, description, imageUrl,
           options: Option[], saleType: purchase|rental, status: draft|published, createdAt }
Option      { id, name, values: OptionValue[] }
OptionValue { id, name }
Variant  { id, productId, product, name, price, description,
           materials: VariantMaterial[],   ← COGS. Must never reach a customer.
           values: VariantValue[], pricingTiers: PricingTier[], createdAt }
```

A **product** is the menu item ("Es Kopi Susu"); a **variant** is the priced SKU chosen by picking one `OptionValue` per `Option` (Size=Large, Ice=Less). This is exactly how the POS already works: `TransactionItemSelect.tsx` lists products grouped by category, opens an option picker, then resolves the variant via `GET /variants?productId=&optionValueIds[]=`. **The customer app reuses this model verbatim** — same entities, same transformers, same variant-resolution query.

`GET /products` already supports `query`, `sortBy`, `order`, `limit`, `skip`, `saleType`, `status`. It has **no `categoryId` filter** — the POS groups client-side after fetching. The customer menu does the same (D4).

### The blocker: every existing endpoint requires auth

`apps/api/presentation/restapi/*_route.go` wraps **every** route in `CheckAuth`, including all catalog reads:

```go
router.HandleFunc("/products", CheckAuth(productRouter.handler.GetProductList)).Methods(http.MethodGet)
```

`CheckAuth` (`base_middlewares.go`) parses a JWT from the `Authorization` cookie or header. A customer has no credential, so **the catalog is currently unreachable by an anonymous client**. Resolving this is FR-1 and the single most important decision in this PRD (D1).

Two related facts that shape D1:

- **`Variant.materials` leaks cost data.** Each `VariantMaterial` embeds a full `Material`, which carries `price` and supplier links. Simply removing `CheckAuth` from `GET /variants` would publish the coffee shop's COGS and margins. Any public catalog path must strip it.
- **The JWT has no expiry.** `AuthUsecase.Login` signs `{id, username}` with no `exp` claim — tokens are valid forever. That makes a "service account token baked into the storefront" approach (rejected alternative in D1) a permanent credential with no rotation story.

---

## UX Reference: pesan.app, adapted

Mobile-first means designed at 375 px and never rendering the POS sidebar. The flows, in order:

**1. Land (`/t/{tableCode}`)** — QR scan opens the menu directly. Sticky header shows the outlet name and **Table {tableCode}**. Below it a search field, then a horizontal, sticky category chip row. Then the menu itself: one section per category, each item a card with image, name, description snippet, and starting price. Sold-out/unavailable state is out of scope (no stock flag on variants).

**2. Item detail (`/t/{tableCode}/products/{productId}`)** — a bottom sheet on top of the menu, but **route-addressable** so Android back and deep links behave. Large image, name, description, one option group per `Option` rendered as selectable chips, a note field ("less sugar"), a quantity stepper, and a sticky bottom **Add to cart · Rp X** button showing the resolved variant's live price × quantity.

**3. Floating cart bar** — once the cart is non-empty, a persistent bar sits above the safe-area on every screen: "N items · Rp X · **View cart**".

**4. Cart (`/t/{tableCode}/cart`)** — line items with name, chosen options, note, quantity stepper, per-line subtotal, remove; a "add more items" link back to the menu; an order summary; and a sticky **Checkout** button.

**5. Checkout (stub)** — states that payment is **QRIS only**, that the order has not been sent to the kitchen yet, and that this step is coming soon. This screen exists so the flow is complete end-to-end for review and user testing; it creates nothing.

Design constraints: single column; every tap target ≥ 44 px; prices formatted as Indonesian Rupiah; copy in Bahasa Indonesia with the same terminology the POS uses; skeletons rather than spinners on the menu; the whole first paint must be usable on a mid-range Android over café Wi-Fi.

---

## Confirmed Product & Technical Decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| **D1** | How anonymous customers read the catalog | **A new unauthenticated `/public/*` route group in the existing Go API**, reusing the existing product/category/variant **usecases** with a customer-safe transformer: `GET /public/categories`, `GET /public/products`, `GET /public/products/{productId}`, `GET /public/variants`. Forced server-side: `status=published`, `saleType=purchase`, and `materials`/`pricingTiers` emptied. | Keeps every existing POS route authenticated and unchanged. No credential to distribute, rotate, or leak. Cacheable and rate-limitable independently. Works for any future client. **Rejected:** (a) dropping `CheckAuth` from the existing routes — publishes COGS and draft products; (b) a Next.js BFF holding a service-account JWT — the JWT never expires (no `exp` claim), so a leak is permanent, and it moves catalog authorization into the frontend. |
| **D2** | Response shape of the public catalog | **Reuse the existing `Category` / `Product` / `Variant` schemas**, with `materials: []` and `pricingTiers: []`. No new DTO schemas. | Honors "use the existing API contract": the frontend reuses `Product`/`Variant` entities, `toProduct`/`toVariant` transformers and the existing repositories with zero new mapping code. **Trade-off:** an empty array is technically indistinguishable from "no materials"; a customer client has no reason to read it. A distinct `MenuVariant` schema was rejected as pure duplication for v1 — revisit if a public consumer ever needs the field to be meaningful. |
| **D3** | Customer identity | **An anonymous session ID**: a UUIDv4 minted by Next.js middleware on first visit, stored in a first-party cookie `gl_session_id` (`SameSite=Lax`, `Max-Age` 1 year, `Secure` in production, **not** `HttpOnly`), mirrored into `localStorage` as a recovery copy. Sent to the API as the `X-Session-Id` header. | No login, per the requirement. Minting it server-side in middleware means SSR already knows the session on first paint — no empty-cart flash, no hydration mismatch. Not `HttpOnly` so a future client-rendered or RN client can read it. The `localStorage` mirror survives cookie eviction (ITP/Safari) and is re-promoted to the cookie on next load. |
| **D4** | Menu grouping | Client-side grouping by `product.category.name`, exactly as `TransactionItemSelect.tsx` does today. No new `categoryId` filter on `/products`. | The menu of a single coffee shop is small (tens of items); one paged fetch is cheaper than N per-category requests, and it avoids widening a shared endpoint's contract. Revisit if the catalog outgrows ~200 published products. |
| **D5** | Where the cart lives | **Server-side**, in new `carts` / `cart_items` tables keyed by `session_id`. The client keeps only an optimistic React Query cache. | The requirement states carts and (later) transactions are marked with the session ID. Server-side also means the cart survives device storage clearing, is visible to staff for support, and gives the future transaction a server-authoritative source. **Rejected:** `localStorage`-only — loses the cart on clearing, is invisible to staff, and would have to be rewritten for the transaction phase anyway. |
| **D6** | Table identity | The QR encodes `/t/{tableCode}`. v1 stores `table_code` as an **opaque validated string** (`^[A-Za-z0-9-]{1,16}$`) on the cart. There is no `tables` table and no admin QR generator yet. Visiting without a table code prompts the customer to type their table number. | Delivers the ordering flow without a whole master-data + QR-printing feature. Adding a real `tables` entity later is additive: the string becomes a foreign key candidate, and existing carts keep working. |
| **D7** | Cart pricing authority | Cart items store **only** `variant_id`, `amount`, `note`. Prices, subtotals and total are computed **server-side at read time** from the current `variants.price`. Nothing money-shaped is ever accepted from the client. | A client-supplied price is a trivially exploitable hole. Live derivation also means a price correction by staff is reflected in every open cart immediately. **Trade-off:** a price can change under a customer between adding and checking out — acceptable while no payment exists; the transaction phase must snapshot prices at conversion (as `transaction_items` already does). |
| **D8** | Session ID as a capability | The session ID **is** the bearer of the cart. It is unguessable (122 bits of entropy) and grants access to nothing but its own cart. No endpoint may list or search carts across sessions. | Carts hold no PII, no payment data, and no ability to spend money. Treating the ID as a capability keeps the anonymous UX with no auth system. This assumption **must be re-evaluated** in the transaction phase, when a session starts owning money-shaped records. |
| **D9** | Merging identical lines | Adding an item whose `variant_id` **and** trimmed `note` match an existing line increments that line's `amount` instead of creating a second line. | Matches pesan.app and every food-ordering app. Different notes stay separate lines because the kitchen treats them differently. |
| **D10** | Checkout in this PRD | The **Checkout** button is present and enabled; it navigates to a stub screen stating "Pembayaran QRIS — segera hadir" and that the order has not been submitted. Gated by `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED` (default `false`) so a real checkout can be swapped in without touching the cart screen. | The requirement asks for a visible checkout action while explicitly excluding transaction creation. A flagged stub makes the flow reviewable and user-testable now, and makes the next PRD a drop-in. |
| **D11** | Where the customer UI code lives | A new Nx Next.js app **`apps/order`** for routing/deploy; all screens, controllers, usecases and repositories go into **`libs/ui`** under a `Menu*` / `Cart*` namespace, following the existing layering. | The customer app needs the same entities (`Product`, `Variant`, `Category`), transformers and base components the POS already has in `libs/ui`; a separate lib would duplicate them or force a third "core" lib. A separate **app** keeps deploy, domain, bundle and auth posture independent of the POS. **Watch item:** if the POS bundle regresses, split `libs/ui-order` in a follow-up — no API or contract change required. |
| **D12** | Rate limiting / abuse | Out of scope for v1. The public endpoints are read-only or scoped to one cart, and the deployment sits behind the existing VPS reverse proxy. | Adding a rate limiter to the Go API is its own change. Noted as a risk below, not silently ignored. |

---

## Feature Requirements

### FR-1 — Public catalog endpoints (API)

A new `public_route.go` registers four unauthenticated routes that call the **existing** `ProductUsecase`, `CategoryUsecase` and `VariantUsecase`:

| Method | Path | Behavior |
|---|---|---|
| `GET` | `/public/categories` | All categories. Response identical to `/categories`. |
| `GET` | `/public/products` | Params `query`, `limit`, `skip`, `sortBy`, `order`. **Forces** `status=published`, `saleType=purchase` — the client cannot override either. |
| `GET` | `/public/products/{productId}` | `404` if the product is draft, deleted, or `saleType=rental`. |
| `GET` | `/public/variants` | Params `productId`, `optionValueIds[]`, `limit`, `skip`. Only variants of published purchase products. |

A shared `toPublicVariant` transformer empties `materials` and `pricingTiers` before serialization (D2). Handler tests must assert, for each route, that (a) no `Authorization` header is required, (b) draft and rental products are absent, and (c) `materials` is empty.

`EnableCORS` gains `X-Session-Id` in `Access-Control-Allow-Headers` (needed by FR-3, added here so both route groups are consistent).

### FR-2 — Cart data model (API)

Migration `000019_create_carts`:

```sql
CREATE TABLE IF NOT EXISTS `carts` (
  `id`         BIGINT      NOT NULL AUTO_INCREMENT,
  `session_id` CHAR(36)    NOT NULL,
  `table_code` VARCHAR(16) NOT NULL DEFAULT '',
  `status`     VARCHAR(16) NOT NULL DEFAULT 'active',  -- active | converted | abandoned
  `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME    NULL,
  PRIMARY KEY (`id`),
  KEY `idx_carts_session_id_status` (`session_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cart_items` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT,
  `cart_id`    BIGINT       NOT NULL,
  `variant_id` BIGINT       NOT NULL,
  `amount`     FLOAT        NOT NULL DEFAULT 0,
  `note`       VARCHAR(255) NOT NULL DEFAULT '',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME     NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cart_items_cart_id` (`cart_id`),
  KEY `idx_cart_items_variant_id` (`variant_id`),
  CONSTRAINT `fk_cart_items_cart`    FOREIGN KEY (`cart_id`)    REFERENCES `carts`    (`id`),
  CONSTRAINT `fk_cart_items_variant` FOREIGN KEY (`variant_id`) REFERENCES `variants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Notes: single-active-cart-per-session is enforced in the usecase inside a DB transaction, not by a unique index — the future `converted` status must be able to coexist with a new `active` cart. `status` is a plain string column matching how `saleType`/`station` are already modeled. No price columns, per D7. Column naming, `deleted_at` soft deletes and the `BIGINT`/`FLOAT` choices follow the existing schema exactly.

`Cart` and `CartItem` domain entities, a `CartRepository` interface with a `//go:generate mockgen` header, the MySQL repo + transformers, and repo tests follow the `ticket`/`stock_check` pattern.

### FR-3 — Cart endpoints (API)

All routes require a valid `X-Session-Id` header (UUIDv4). Missing or malformed ⇒ `400` with the existing `Error` envelope. The active cart is created lazily on first write.

| Method | Path | Body | Behavior |
|---|---|---|---|
| `GET` | `/carts/current` | — | Returns the session's active cart with items. Empty cart (never `404`). |
| `PUT` | `/carts/current` | `{ tableCode }` | Sets/updates the table code on the active cart. |
| `POST` | `/carts/current/items` | `{ variantId, amount, note }` | Adds a line, merging on `(variantId, trimmed note)` per D9. |
| `PUT` | `/carts/current/items/{cartItemId}` | `{ amount, note }` | Updates a line. `404` if the item is not in this session's cart. |
| `DELETE` | `/carts/current/items/{cartItemId}` | — | Removes a line. |
| `DELETE` | `/carts/current` | — | Empties the cart. |

Every response returns the **whole cart**, so the client never reconstructs state from a partial reply. The `Cart` response schema carries, per item, the resolved `variant` (public-shaped, `materials: []`), the derived `price` and `subtotal`, and, at the cart level, `itemCount` and `total` — all computed server-side (D7).

Validation: `amount` must be an integer ≥ 1 (fractional quantities are a POS-only concern); `note` ≤ 255 chars; `variantId` must resolve to a variant of a **published, purchase** product, else `403` validation error; `tableCode` must match `^[A-Za-z0-9-]{1,16}$`.

Cross-session access is impossible by construction: every query is scoped by `session_id` before the item ID is considered.

### FR-4 — Session establishment (frontend)

Next.js middleware in `apps/order` reads `gl_session_id`; if absent or not a valid UUIDv4, it mints one and sets the cookie (D3). A `SessionProvider` exposes the ID to the React tree and to the axios client, which attaches `X-Session-Id` to every `/carts/*` request. On mount, the client reconciles cookie vs. `localStorage`, preferring the cookie and re-writing whichever is missing.

The table code comes from the `/t/{tableCode}` route segment and is pushed to `PUT /carts/current` whenever it changes. Landing without a table code (`/`) renders a table-number prompt that redirects to `/t/{code}`.

### FR-5 — Menu discovery (frontend)

`MenuListHandler` / `MenuListScreen` + stories + handler tests, wired through `MenuListUsecase` → `MenuRepository` (`ApiMenuRepository`, `MockMenuRepository`). Renders sticky search, sticky category chips that scroll to their section, and per-category product cards showing the **lowest variant price** as "mulai Rp X". Search filters via the existing `query` param, debounced. Loading uses skeletons; empty and error states reuse `EmptyView` / `ErrorView` with a retry.

### FR-6 — Item detail and add-to-cart (frontend)

`MenuItemDetailHandler` / `MenuItemDetailScreen`, route-addressable and presented as a Tamagui bottom sheet over the menu. One chip group per `Option`; selecting one value per option resolves the variant via `GET /public/variants?productId=&optionValueIds[]=` (same call the POS makes). The sticky CTA shows live `price × quantity` and is disabled until every option is chosen. Submitting calls `CartItemAddUsecase` and closes the sheet with a confirmation toast (existing `libs/provider` toast).

### FR-7 — Cart review and checkout CTA (frontend)

A floating cart bar renders on menu and detail screens whenever `itemCount > 0`. `CartHandler` / `CartScreen` lists lines with name, chosen option values, note, stepper, subtotal and remove; supports clearing the cart; and shows a summary with the server-computed total. The sticky **Checkout** button routes to the FR-8 stub.

Quantity changes are optimistic against the React Query cache and reconciled with the full cart returned by the API; a failed mutation rolls back and surfaces an error toast.

### FR-8 — QRIS checkout stub (frontend)

A screen stating that payment is **QRIS only**, that the order is **not yet submitted**, and that the feature is coming soon, with a back-to-cart action. Behind `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED` (D10). No API call, no transaction.

---

## Non-Functional Requirements

- **Performance** — menu Largest Contentful Paint < 2.5 s on a 4× CPU-throttled mid-range Android over Fast 3G. Menu data is server-rendered (`getServerSideProps`, matching `apps/web`); product images are lazy-loaded below the fold.
- **Accessibility** — tap targets ≥ 44 px, visible focus states, labelled controls, AA contrast, screen-reader-announced cart count.
- **Resilience** — every network failure has a retry affordance; a stale/deleted cart (e.g. purged server-side) recovers to an empty cart rather than an error screen.
- **Observability** — the public and cart routes go through the existing `logger.RequestLogger`; cart mutations log `session_id` and `table_code` for support. Session IDs are anonymous by construction, so no PII enters logs.
- **Security** — public routes never expose `materials`, `pricingTiers`, draft products, or rental products. Cart routes are session-scoped in the query, not post-filtered. The session ID is a capability (D8), and is never placed in a URL, so it cannot leak through `Referer` or access logs.
- **Compatibility** — every API and contract change is additive; no existing endpoint, schema, or POS screen changes behavior.

---

## Success Metrics

| Metric | Target |
|---|---|
| Cart creation rate (sessions that add ≥ 1 item ÷ sessions that open the menu) | ≥ 40% in the first month of internal testing |
| Median time from QR scan to first add-to-cart | < 60 s |
| Cart survival across reload (carts read back non-empty after a fresh page load) | > 99% |
| Menu p95 server response time | < 300 ms |
| Regression in existing POS flows | Zero (existing E2E suite stays green) |

Metrics are read from API logs in v1; no analytics vendor is introduced.

---

## Implementation Phases

Thirteen PRs. Each is independently mergeable, keeps `main` green, and is small enough to review in one sitting. Backend phases (1–3) and the frontend scaffold (4–5) can proceed in parallel; 6 onward depend on 3.

| # | PR | Scope | Depends on | Size |
|---|---|---|---|---|
| **0** | `docs: add PRD for table ordering` | This document. | — | XS |
| **1** | `feat(api): public catalog endpoints` | `public_route.go`, `public_handler.go`, `toPublicVariant` transformer, `api.yaml` `/public/*` paths, regenerate TS, handler tests, `X-Session-Id` added to `EnableCORS`. No DB change. | 0 | M |
| **2** | `feat(api): cart data model` | Migration `000019`, `cart_entity.go`, `cart_repository.go` (+ mockgen), `data/mysql/cart_{entity,repo,transformer}.go`, repo tests. No routes — nothing user-visible yet. | 1 | M |
| **3** | `feat(api): cart endpoints` | `cart_usecase.go` (+ usecase tests), session-ID middleware, handlers/routes/transformers, `api.yaml` `/carts/current*` paths + `Cart`/`CartItem` schemas, regenerate TS, handler tests, `main.go` wiring. | 2 | L |
| **4** | `feat(order): scaffold customer web app` | `apps/order` Nx Next.js app: Tamagui config, `RootProvider`, `_app`/`_document`, health route, `project.json`, Dockerfile if the POS pattern requires it. Renders a placeholder page. | 1 | M |
| **5** | `feat(order): anonymous session and table code` | Session middleware, `SessionProvider`, axios `X-Session-Id` interceptor, `localStorage` reconciliation, `/t/[tableCode]` route shell, table-number prompt at `/`. Unit tests for mint/reconcile. | 4 | M |
| **6** | `feat(ui): menu domain and data layer` | `MenuRepository` interface, `MenuListUsecase` / `MenuItemDetailUsecase` / `VariantResolveUsecase`, `ApiMenuRepository`, `MockMenuRepository`, usecase tests. Reuses existing `Product`/`Variant`/`Category` entities and transformers. No UI. | 3 | M |
| **7** | `feat(ui): menu discovery screen` | `MenuListScreen` + stories, `MenuListHandler` + handler tests, `MenuListController`, category chips, search, skeleton/empty/error states. Wired into `apps/order` at `/t/[tableCode]`. | 6 | L |
| **8** | `feat(ui): item detail and option selection` | `MenuItemDetailScreen` + stories + handler, option chip groups, quantity stepper, note field, variant resolution, live price. Add-to-cart CTA present but stubbed to a no-op callback. | 7 | L |
| **9** | `feat(ui): cart domain and data layer` | `CartRepository`, `CartGetUsecase` / `CartItemAdd` / `CartItemUpdate` / `CartItemDelete` / `CartClear`, `ApiCartRepository`, `MockCartRepository`, optimistic-update helpers, usecase tests. Phase 8's CTA is connected here. | 8 | M |
| **10** | `feat(ui): floating cart bar and cart screen` | Floating bar, `CartScreen` + stories, `CartHandler` + tests, steppers, remove, clear, summary, sticky Checkout button. Wired at `/t/[tableCode]/cart`. | 9 | L |
| **11** | `feat(order): QRIS checkout stub` | Stub checkout screen behind `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED`, routed from the cart CTA. | 10 | S |
| **12** | `test(order-e2e): table ordering happy path` | `apps/order-e2e` Playwright project mirroring `apps/web-e2e`: scan → browse → filter → open item → choose options → add → cart persists across reload → edit quantity → remove → checkout CTA. | 11 | M |
| **13** | `docs: document table ordering` | `docs-site/sales/table-ordering.md`, VitePress nav entry, `README.md` project list, `docs-site/roadmap.md` update. | 12 | S |

**Sequencing note:** phases 6–10 deliberately alternate *data layer* and *screen* PRs. That is the split the codebase already uses (repository/usecase/mocks land separately from screens/stories/handlers), and it keeps every PR reviewable — the data PRs are pure logic with tests, the screen PRs are pure presentation with stories.

**Deployment note:** `apps/order` is a second Next.js app and needs its own build/host target. The API deploy pipeline (`.github/workflows/deploy-api.yml`, `apps/api/docs/DEPLOY_NATIVE.md`) is unchanged by phases 1–3 apart from running the new migration. Hosting for `apps/order` is an infrastructure decision to confirm before phase 4 lands (see open questions).

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Public endpoints get scraped or abused (D12) | Read-only, published-only, cost data stripped. Rate limiting is a fast follow if traffic warrants it; the reverse proxy can shoulder it without an API change. |
| Abandoned carts accumulate indefinitely | Rows are tiny and unindexed growth is slow. A cleanup job marking carts `abandoned` after N days is deferred; flagged for the transaction phase, when volume becomes real. |
| A customer's price changes between add and checkout (D7) | Harmless while nothing is charged. The transaction phase **must** snapshot prices at conversion — `transaction_items` already stores `price`/`subtotal`, so the mechanism exists. |
| Session ID lost (private browsing, cookie eviction) | `localStorage` mirror + re-mint. Worst case the customer starts a fresh cart — acceptable for anonymous ordering. |
| `libs/ui` grows and the POS bundle regresses (D11) | Measured after phase 10; mitigation is a `libs/ui-order` split, which is internal and needs no API or contract change. |
| Two customers at the same table build separate carts | Expected in v1 — each phone is a session. Merging carts by table is a product decision for the transaction phase, noted as future work. |

---

## Open Questions

1. **Hosting for `apps/order`** — same VPS behind the existing reverse proxy, or a separate host/subdomain? Needed before phase 4.
2. **Domain / QR URL format** — confirm the customer-facing origin so QR codes can be printed against a stable URL.
3. **Table codes** — are tables already numbered, and is a plain number (`12`) the code, or is a non-guessable code preferred to stop off-premise ordering?
4. **Menu language** — Bahasa Indonesia only, or bilingual? Assumed Indonesian-only for v1.
5. **Product descriptions and images** — are all published purchase products currently populated with `description` and `imageUrl`? The customer card design assumes both; missing values need a fallback (assumed: image placeholder, description omitted).

---

## Future Work (post-PRD)

In rough dependency order:

1. **Transaction creation from cart** — `POST /carts/current/checkout` → `Transaction` with a `session_id` column, price snapshotting, and order-number assignment.
2. **QRIS payment integration** — gateway selection, callback handling, reconciliation against `wallets`.
3. **Order history and status** — the session's past transactions, plus a live status screen fed by kitchen/bar progress (the `Category.station` field already exists for the kitchen/bar order-slip split).
4. **Table master data + QR generation** in the POS admin, promoting `table_code` from an opaque string to a real entity.
5. **Cart merging by table**, so a table of four builds one bill.
6. **Coupons in the customer app**, reusing the existing coupon engine and the per-item coupon work.
