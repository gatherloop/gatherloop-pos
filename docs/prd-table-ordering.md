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
| QRIS payment gateway integration (Midtrans/Xendit/direct QRIS) | Payment method is fixed as QRIS but the integration is a separate project with its own vendor, security and reconciliation concerns. When it lands, **the Go API owns it** — gateway secrets and payment callbacks terminate at `apps/api`, never in the customer bundle. That is what lets the customer app be a purely static site (D18). |
| Order status / kitchen display / order history screen | All depend on a transaction existing. |
| Customer accounts, login, phone/OTP | The requirement is explicitly anonymous. |
| Rich table management (zones, capacity, floor plan, occupancy) | A minimal `tables` master — code + label — **is** in scope (D6), because non-guessable QR codes are unreadable to staff without it. Everything beyond code+label is future work. |
| Rentals (board games) in the customer app | The customer menu is `saleType=purchase` only; rentals need staff to hand over physical inventory. |
| React Native customer app | Web-only. The QR flow lands in a browser; an install is a conversion killer. |

---

## Context: The Existing System

Anything the customer app touches, it touches through what is already here.

### Architecture

- **Backend** — Go REST API (`apps/api`), MySQL + GORM, Clean Architecture: `domain` (entities, repository interfaces, usecases) → `data/mysql` (repos, entities, transformers) → `presentation/restapi` (handlers, routes, transformers). Mocks generated into `data/mock` via `mockgen`. Migrations in `apps/api/migrations/` — **next free number is `000019`** (latest is `000018_drop_budget_balance`).
- **Frontend** — Next.js web (`apps/web`) and React Native (`apps/mobile`) are thin shells. Effectively all UI lives in `libs/ui`, in the same Clean Architecture the backend uses: `domain/{entities,repositories,usecases}` → `data/{api,mock,url,memory}` → `presentation/{components,controllers,screens}`. **This layering is normative for every screen in this PRD — see [Frontend Architecture](#frontend-architecture--the-libsui-contract) below.** The customer app departs from the POS in exactly one respect: it is a **static, client-rendered Vite SPA**, not a Next.js app (D18). The layering is unchanged.
- **Vite toolchain, already present** — `vite`, `@vitejs/plugin-react`, `@tamagui/vite-plugin`, `@nx/vite` and `@storybook/react-vite` are all existing devDependencies, and Storybook already builds these Tamagui components through Vite. The customer app introduces no new build tooling.
- **Contract** — OpenAPI at `libs/api-contract/src/api.yaml`, codegen (Kubb) into TS clients + React Query hooks via `nx run api-contract:generate:ts`, consumed by both frontends. The Go side reads the same YAML for its response types (`libs/api-contract` Go module).
- **UI kit** — Tamagui, shared cross-platform components in `libs/ui/src/presentation/components/base` (`Layout`, `Sheet`, `Tabs`, `ListItem`, `EmptyView`, `ErrorView`, `LoadingView`, `Pagination`, `Form`).
- **E2E** — Playwright in `apps/web-e2e`.
- **Docs** — VitePress site in `docs-site/`, deployed by `.github/workflows/deploy-docs.yaml`.

### Frontend Architecture — the `libs/ui` contract

The customer app is **not** a greenfield frontend. Every screen in this PRD is built with the same Clean Architecture the POS already uses, with the same directories, the same base classes, and the same tests. This section is **normative**: a PR that deviates from it should be sent back.

#### The three layers and the dependency rule

| Layer | Directory | Responsibility | May import |
|---|---|---|---|
| **Domain** | `libs/ui/src/domain/{entities,repositories,usecases}` | **Logic and state machines.** Entities are plain types; repositories are **interfaces (ports) only**; usecases are state machines. | Other domain code, `ts-pattern`, `libs/ui/src/utils`. **Never** React, axios, Tamagui, or `libs/api-contract`. |
| **Data** | `libs/ui/src/data/{api,mock,url,memory,browser}` | **Data fetching and persistence** — the concrete implementations of the domain ports, plus transformers mapping API-contract types to domain entities. | Domain (to implement its interfaces), `libs/api-contract`, `@tanstack/react-query`. **Never** presentation. |
| **Presentation** | `libs/ui/src/presentation/{components,controllers,screens}` | **UI.** Renders state, dispatches actions. | Domain (entity types + usecase classes), Tamagui, React. **Never** `data/api` directly — repositories arrive already constructed. |

Composition happens in exactly one place per screen: `libs/ui/src/app/Xxx.tsx` constructs the concrete repositories and usecases and passes them to the Handler. In the POS a thin Next page mounts it (`apps/web/src/pages/products/index.tsx`); in the customer app a thin client route does (D18). The composition root itself is identical either way.

#### Domain = logic + state machine

Every usecase extends `Usecase<State, Action, Params>` (`domain/usecases/IUsecase.ts`):

```ts
abstract class Usecase<State, Action, Params = undefined> {
  abstract params: Params;
  abstract getInitialState(): State;
  abstract getNextState(state: State, action: Action): State;  // pure reducer
  abstract onStateChange(state: State, dispatch: (a: Action) => void): void;  // side effects
}
```

Rules, as followed by `ProductListUsecase` and its siblings:

- `State` is a discriminated union intersected with a shared context — `({ type: 'idle' } | { type: 'loading' } | …) & Context` — so data survives transitions.
- `getNextState` is **pure**: a `match([state, action])` over `ts-pattern` ending in `.otherwise(() => state)`, so an action invalid for the current state is a silent no-op. No I/O, ever.
- `onStateChange` is the **only** place a usecase touches a repository. It matches on the state, calls the repository, and dispatches the result back as an action.
- Debouncing uses the existing `createDebounce` helper inside `onStateChange` (as `ProductListUsecase` does for search).

#### Presentation = UI

`useController` (`presentation/controllers/controller.ts`) is the sole bridge between a state machine and React:

```ts
const [state, dispatch] = useReducer(usecase.getNextState, usecase.getInitialState());
useEffect(() => { usecase.onStateChange(state, dispatch); }, [state, usecase]);
```

Each screen gets a thin `useXxxController(usecase)` wrapper adding screen-specific effects (e.g. `useFocusEffect(() => dispatch({ type: 'FETCH' }))`). Above it:

- **`XxxHandler.tsx`** — calls the controllers, coordinates cross-usecase effects, routes via `solito/router`, and maps machine state into screen props. The mapping uses `match(state).returnType<XxxScreenProps['variant']>()…​.exhaustive()`, so the compiler proves every state renders something.
- **`XxxScreen.tsx`** — pure props-in / callbacks-out. No hooks, no usecases, no data access. That purity is what makes `XxxScreen.stories.tsx` possible.
- **`components/xxx/*`** — dumb presentational pieces, each with stories.

#### React Query's role

`@tanstack/react-query` is a **data-layer** detail, not UI state. `ApiXxxRepository` receives a `QueryClient` and uses `fetchQuery` / `getQueryState` for request de-duplication and cache reads. UI state belongs to the usecase state machine. **No screen or handler in this feature may call `useQuery` / `useMutation` directly**, and optimistic updates are modeled as states, not as cache surgery (D14).

#### No SSR — `params` seeding stays, the server does not

In the POS, `getServerSideProps` calls `repository.fetchXxx(...)` server-side and passes the result as the usecase's `params`, so `getInitialState()` starts in `loaded` instead of `idle`. **The customer app has no server** (D18), so nothing seeds `params` at runtime: every customer usecase starts in `idle`, transitions to `loading`, and renders skeletons until the first response arrives.

The `Params` type is kept anyway — it is how tests and stories seed a machine into a specific state without mocking the network, and it is what would let a future prerender step seed the menu without touching a single usecase.

#### Composition and navigation without Next

Two Next-specific things the POS relies on are unavailable here, and each has a defined replacement:

| POS mechanism | Customer app replacement |
|---|---|
| `apps/web/src/pages/**` thin pages + `getServerSideProps` | Client routes in `apps/order`, composition roots still in `libs/ui/src/app/*` — unchanged in shape, just mounted by a client router instead of a file-system router |
| `solito/router` + `solito/link` in handlers | A thin `useNavigation()` adapter exported from `libs/ui`, wrapping the app's client router. Handlers depend on the adapter, never on a router package — the same indirection that lets today's handler tests mock `solito/router` (D19) |

#### Testing follows the layers

| Layer | Test | Tool |
|---|---|---|
| Domain | `domain/usecases/xxx.test.ts` — asserts explicit transitions (`loading → loaded → revalidating → loaded`) against a `MockXxxRepository` | `UsecaseTester` + `flushPromises` (`utils/usecase.ts`), headless, no React |
| Presentation | `presentation/screens/XxxHandler.test.tsx` — renders with mock repositories, asserts rendered states and user interactions | Testing Library + `userEvent` |
| Presentation | `XxxScreen.stories.tsx`, `components/**/*.stories.tsx` — one story per `variant` | Storybook |

#### File inventory per feature slice

Every slice in this PRD lands as this set — the same shape as the existing `product` slice:

```
domain/entities/Xxx.ts                          types only
domain/repositories/xxx.ts                      interface (port)
domain/usecases/xxxYyy.ts                       Usecase<State, Action, Params>
domain/usecases/xxxYyy.test.ts                  UsecaseTester transitions
data/api/xxx.ts                                 ApiXxxRepository implements XxxRepository
data/api/xxx.transformer.ts                     toXxx / toApiXxx
data/mock/xxx.ts                                MockXxxRepository (+ setShouldFail, reset)
presentation/controllers/XxxYyyController.tsx   useController binding
presentation/components/xxx/*.tsx (+ stories)   dumb components
presentation/screens/XxxYyyScreen.tsx           pure, props-driven
presentation/screens/XxxYyyScreen.stories.tsx   one story per variant
presentation/screens/XxxYyyHandler.tsx          wiring: controllers → screen props
presentation/screens/XxxYyyHandler.test.tsx     handler test
app/XxxYyy.tsx                                  composition root
apps/order/src/routes/**                        thin client route
```

Plus the relevant `index.ts` barrel exports at each level (`domain/index.ts`, `data/index.ts`, `presentation/screens/index.ts`, `app/index.ts`), which is how `@gatherloop-pos/ui` exposes them to the app.

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

**1. Land (`/order/t/{code}`)** — QR scan opens the menu directly. Sticky header shows the outlet name and the table's **label** ("Meja 1") resolved from the code — never the code itself, which is meaningless to a guest. Below it a search field, then a horizontal, sticky category chip row. Then the menu itself: one section per category, each item a card with image (or D16 placeholder), name, description snippet where one exists, and starting price. Sold-out/unavailable state is out of scope (no stock flag on variants).

**2. Item detail (`/order/t/{tableCode}/products/{productId}`)** — a bottom sheet on top of the menu, but **route-addressable** so Android back and deep links behave. Large image, name, description, one option group per `Option` rendered as selectable chips, a note field ("less sugar"), a quantity stepper, and a sticky bottom **Add to cart · Rp X** button showing the resolved variant's live price × quantity.

**3. Floating cart bar** — once the cart is non-empty, a persistent bar sits above the safe-area on every screen: "N items · Rp X · **View cart**".

**4. Cart (`/order/t/{tableCode}/cart`)** — line items with name, chosen options, note, quantity stepper, per-line subtotal, remove; a "add more items" link back to the menu; an order summary; and a sticky **Checkout** button.

**5. Checkout (stub)** — states that payment is **QRIS only**, that the order has not been sent to the kitchen yet, and that this step is coming soon. This screen exists so the flow is complete end-to-end for review and user testing; it creates nothing.

Design constraints: single column; every tap target ≥ 44 px; prices formatted as Indonesian Rupiah; copy in Bahasa Indonesia with the same terminology the POS uses; skeletons rather than spinners on the menu; the whole first paint must be usable on a mid-range Android over café Wi-Fi.

---

## Confirmed Product & Technical Decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| **D1** | How anonymous customers read the catalog | **A new unauthenticated `/public/*` route group in the existing Go API**, reusing the existing product/category/variant **usecases** with a customer-safe transformer: `GET /public/categories`, `GET /public/products`, `GET /public/products/{productId}`, `GET /public/variants`. Forced server-side: `status=published`, `saleType=purchase`, and `materials`/`pricingTiers` emptied. | Keeps every existing POS route authenticated and unchanged. No credential to distribute, rotate, or leak. Cacheable and rate-limitable independently. Works for any future client. **Rejected:** (a) dropping `CheckAuth` from the existing routes — publishes COGS and draft products; (b) a Next.js BFF holding a service-account JWT — the JWT never expires (no `exp` claim), so a leak is permanent, and it moves catalog authorization into the frontend. |
| **D2** | Response shape of the public catalog | **Reuse the existing `Category` / `Product` / `Variant` schemas**, with `materials: []` and `pricingTiers: []`. No new DTO schemas. | Honors "use the existing API contract": the frontend reuses `Product`/`Variant` entities, `toProduct`/`toVariant` transformers and the existing repositories with zero new mapping code. **Trade-off:** an empty array is technically indistinguishable from "no materials"; a customer client has no reason to read it. A distinct `MenuVariant` schema was rejected as pure duplication for v1 — revisit if a public consumer ever needs the field to be meaningful. |
| **D3** | Customer identity | **An anonymous session ID**: a UUIDv4 minted **client-side** on first visit via `crypto.randomUUID()`, stored in a first-party cookie `gl_session_id` (`SameSite=Lax`, `Max-Age` 1 year, `Secure`, **not** `HttpOnly`) and mirrored into `localStorage`. Sent to the API as the `X-Session-Id` header. | No login, per the requirement. There is no server to mint it (D18), so `BrowserSessionRepository` mints on construction, before any cart request is issued — the ID is always available by the time the cart machine leaves `idle`. `crypto.randomUUID()` is available in every browser that can run this app. The `localStorage` mirror survives cookie eviction (ITP/Safari) and is re-promoted to the cookie on next load. **Trade-off vs. the earlier middleware design:** the cart can only be fetched after hydration, so a returning customer sees an empty cart bar for one round trip. Acceptable; the bar animates in rather than flashing a wrong total. |
| **D4** | Menu grouping | Client-side grouping by `product.category.name`, exactly as `TransactionItemSelect.tsx` does today. No new `categoryId` filter on `/products`. | The menu of a single coffee shop is small (tens of items); one paged fetch is cheaper than N per-category requests, and it avoids widening a shared endpoint's contract. Revisit if the catalog outgrows ~200 published products. |
| **D5** | Where the cart lives | **Server-side**, in new `carts` / `cart_items` tables keyed by `session_id`. The client holds the cart only as `CartUsecase` state (D14). | The requirement states carts and (later) transactions are marked with the session ID. Server-side also means the cart survives device storage clearing, is visible to staff for support, and gives the future transaction a server-authoritative source. **Rejected:** `localStorage`-only — loses the cart on clearing, is invisible to staff, and would have to be rewritten for the transaction phase anyway. |
| **D6** | Table identity | **Non-guessable codes, backed by a minimal `tables` master.** Each table row is `{ id, code, label }`: `code` is a 10-character random string from the Crockford base32 alphabet (`0-9A-Z` minus `I`,`L`,`O`,`U`), ~50 bits of entropy, generated server-side with `crypto/rand`; `label` is the human name staff read ("Meja 1"). The QR encodes `/order/t/{code}`. The cart references `table_id`, not free text. | Requested: a guessable table number lets anyone order from off-premise, and once real orders and QRIS payments exist that becomes a fraud and prep-waste channel. **Consequence, accepted:** a random code is meaningless to staff, so a `tables` master becomes mandatory — a barista must be able to turn a cart into "Meja 1". The Crockford alphabet drops the four glyphs people misread, so a code stays transcribable if a QR is smudged. |
| **D15** | Language and formatting | The customer app is **Bahasa Indonesia only**. No i18n framework is introduced — copy is plain strings in the screen components. Money renders through one new shared helper, `formatRupiah()` in `libs/ui/src/utils/currency.ts`. | The POS UI is in English (staff-facing); guests get Indonesian. That divergence is deliberate, and a single-locale app does not justify pulling in i18next. The helper exists because money is currently formatted ad-hoc and inconsistently (`` `Rp. ${total.toLocaleString('id')}` `` in `TransactionListItem`); the customer app must not inherit that. Retrofitting the POS to the helper is a trivial follow-up, deliberately excluded here to keep diffs reviewable. |
| **D16** | Missing images and descriptions | **A real placeholder, not a collapsed layout.** A `MenuItemThumbnail` component renders the image only when `imageUrl` is non-empty **and** loads successfully; otherwise it renders a branded placeholder — neutral tinted panel with a `@tamagui/lucide-icons` glyph chosen from `category.station` (`KITCHEN` → utensils, `BAR` → cup, `NONE` → tag). `onError` falls back to the same placeholder. An empty `description` renders nothing and reserves no space. | Confirmed that catalog content is currently sparse. The existing `ListItem` simply omits the thumbnail when `thumbnailSrc` is missing — fine for a staff list, but it would make a customer menu of image-less cards look broken. Icon glyphs avoid a new asset pipeline. **Product note:** this makes a sparse catalog look intentional, not finished — the menu still reads better once staff fill in the top sellers' photos. |
| **D17** | URL format | `/order/t/{code}` — the app is served under a `/order` base path, with the table code as a path segment. Landing on `/order` without a code shows a "scan the QR at your table" screen. | Requested. The `/order` prefix keeps the customer app on a predictable path alongside the docs site already published from this repo. Clean paths are preserved on a static host by the `404.html` fallback in D19. |
| **D18** | Hosting and runtime | **GitHub Pages, fully static, client-rendered.** `apps/order` is a **React + Vite SPA** — no Next.js, no SSR, no middleware, no Node at runtime. Built to static assets and published to Pages. | The VPS is lightweight and cannot host a Node runtime, so a server-rendered app was never really on the table. The one argument that previously favoured a JS server — a BFF for QRIS — is void: **the Go API owns payment**, including gateway secrets and callbacks, so the customer bundle never needs a server of its own. Vite is the natural choice because the entire toolchain (`vite`, `@vitejs/plugin-react`, `@tamagui/vite-plugin`, `@nx/vite`) is **already installed**, and Storybook already compiles these Tamagui components through Vite. Keeping Next in `output: 'export'` mode was considered and rejected: it still cannot pre-render `/order/t/{code}`, it ships a client runtime the app does not use, and it leaves SSR APIs in the codebase that must never be called. **Costs, accepted:** no SSR (first paint is skeletons, D3/FR-5), and no `solito` (D19). |
| **D19** | Routing on a static host | A client-side router with History API paths. `dist/404.html` is a byte-copy of `index.html`, so GitHub Pages serves the app for any unmatched path and the router reads `location.pathname` — this is what preserves `/order/t/{code}` (D17) for codes that do not exist at build time. Handlers navigate through a `useNavigation()` adapter in `libs/ui`, never a router package directly. | Table codes are minted after deploy, so no static host can pre-render their routes; the `404.html` copy is the standard SPA-on-Pages answer. **Trade-off:** the first response for a deep link carries HTTP 404 while rendering the correct page — irrelevant for a QR-scanned app with no SEO or crawler requirements. If that is ever unacceptable, hash routing (`/order/#/t/{code}`) is the zero-risk fallback and needs only an adapter change. The adapter exists so handlers stay router-agnostic and testable, exactly as `solito/router` is mocked in the POS handler tests today. |
| **D21** | API origin | `https://<vps-ip>.sslip.io`, TLS terminated by Caddy on the VPS. HTTPS is confirmed live, so FR-9's mixed-content blocker is cleared. | Caddy issues and renews the certificate automatically for the IP-derived hostname; guests never see this URL, so an IP-shaped hostname costs nothing in trust. **Coupling to accept:** `VITE_API_BASE_URL` is baked into the static bundle, and an sslip.io hostname is derived from the VPS IP — so **changing the VPS IP requires rebuilding and redeploying the SPA**, not just restarting the API. The printed QR codes are unaffected: they point at the Pages origin, never at the API. If the IP starts moving, put a stable CNAME in front and rebuild once. |
| **D22** | Credentials on customer requests | The order app's axios instance sets `withCredentials: false`, unlike the POS. | The session travels as the `X-Session-Id` header and the API sets no cookie for this app, so credentials buy nothing — and sending them widens the CORS surface for no reason. The POS keeps `withCredentials: true` because its auth cookie rides through the Next same-origin proxy. |
| **D20** | Module boundary into `libs/ui` | A second entry point, `@gatherloop-pos/ui/order` → `libs/ui/src/index.order.ts`, exporting only the customer slices and the Next-free base components. The order app never imports the root `@gatherloop-pos/ui` barrel, and never uses `Layout`, `Navbar` or `Sidebar`. | **Verified constraint, not a precaution:** the root barrel re-exports `./app`, which pulls every POS composition → every POS handler → `solito` → `next/router` into the graph. `Layout` composes `Sidebar` + `Navbar`, both of which import `solito` directly. A Vite build has no business resolving Next. The order app has no sidebar anyway — it gets its own mobile-first `OrderLayout`. One extra `tsconfig.base.json` path entry buys a clean boundary. `libs/provider` is Next-free but imports the root barrel for `tamaguiConfig` / `ConfirmationAlertProvider`; it is repointed at those deep modules, which the root barrel already re-exports — a two-line change benefiting both apps. |
| **D7** | Cart pricing authority | Cart items store **only** `variant_id`, `amount`, `note`. Prices, subtotals and total are computed **server-side at read time** from the current `variants.price`. Nothing money-shaped is ever accepted from the client. | A client-supplied price is a trivially exploitable hole. Live derivation also means a price correction by staff is reflected in every open cart immediately. **Trade-off:** a price can change under a customer between adding and checking out — acceptable while no payment exists; the transaction phase must snapshot prices at conversion (as `transaction_items` already does). |
| **D8** | Session ID as a capability | The session ID **is** the bearer of the cart. It is unguessable (122 bits of entropy) and grants access to nothing but its own cart. No endpoint may list or search carts across sessions. | Carts hold no PII, no payment data, and no ability to spend money. Treating the ID as a capability keeps the anonymous UX with no auth system. This assumption **must be re-evaluated** in the transaction phase, when a session starts owning money-shaped records. |
| **D9** | Merging identical lines | Adding an item whose `variant_id` **and** trimmed `note` match an existing line increments that line's `amount` instead of creating a second line. | Matches pesan.app and every food-ordering app. Different notes stay separate lines because the kitchen treats them differently. |
| **D10** | Checkout in this PRD | The **Checkout** button is present and enabled; it navigates to a stub screen stating "Pembayaran QRIS — segera hadir" and that the order has not been submitted. Gated by `VITE_ORDER_CHECKOUT_ENABLED` (default `false`) so a real checkout can be swapped in without touching the cart screen. | The requirement asks for a visible checkout action while explicitly excluding transaction creation. A flagged stub makes the flow reviewable and user-testable now, and makes the next PRD a drop-in. |
| **D11** | Where the customer UI code lives | A new Nx **React + Vite** app `apps/order` for routing and deploy; all entities, repositories, usecases, controllers, screens and components go into **`libs/ui`** under a `Menu*` / `Cart*` namespace, in the existing `domain` → `data` → `presentation` layering — reached through a dedicated entry point (D20). | The customer app needs the same entities (`Product`, `Variant`, `Category`), transformers and base components the POS already has in `libs/ui`; a separate lib would duplicate them or force a third "core" lib. A separate **app** keeps deploy, bundle and runtime posture independent of the POS. |
| **D12** | Rate limiting / abuse | Out of scope for v1. The public endpoints are read-only or scoped to one cart, and the deployment sits behind the existing VPS reverse proxy. | Adding a rate limiter to the Go API is its own change. Noted as a risk below, not silently ignored. |
| **D13** | Architecture conformance | The customer screens follow the `libs/ui` Clean Architecture **exactly**: domain holds logic and state machines (`Usecase<State, Action, Params>`), data holds fetching and persistence behind domain-defined ports, presentation holds UI only. No shortcuts for "it's just a storefront" — no `useQuery` in screens, no `fetch` in components, no business rules in handlers. | Consistency is the point of the pattern: any engineer who has touched the POS can review or extend the customer app without learning a second architecture, and the layers are what make usecases testable headlessly with `UsecaseTester` and screens renderable in Storybook. |
| **D14** | Optimistic cart updates | Modeled **in the state machine**, not in the React Query cache. The reducer purely computes the optimistic cart into `cart` while stashing the server-known one in `previousCart`; `onStateChange` performs the call; `MUTATE_SUCCESS` replaces the cart with the server's authoritative copy, `MUTATE_ERROR` restores `previousCart`. | Keeps the reducer pure and the rollback explicit, testable via `UsecaseTester` with no React and no cache mocking. Since every cart endpoint returns the whole cart (FR-3), success is a straight replace — and the server stays the price authority (D7). |

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
| `GET` | `/public/tables/{code}` | Resolves a QR code to `{ id, label }`. `404` for unknown or deleted codes, so a fabricated code lands on an "invalid QR" screen instead of silently opening an orderable menu (D6). Returns **only** `id` and `label` — never the full table list, which would defeat non-guessable codes. |

A shared `toPublicVariant` transformer empties `materials` and `pricingTiers` before serialization (D2). Handler tests must assert, for each route, that (a) no `Authorization` header is required, (b) draft and rental products are absent, and (c) `materials` is empty.

`EnableCORS` gains `X-Session-Id` in `Access-Control-Allow-Headers` (needed by FR-3, added here so both route groups are consistent).

### FR-2 — Table and cart data model (API)

Migration `000019_create_tables` — the table master required by D6:

```sql
CREATE TABLE IF NOT EXISTS `tables` (
  `id`         BIGINT      NOT NULL AUTO_INCREMENT,
  `code`       VARCHAR(16) NOT NULL,
  `label`      VARCHAR(64) NOT NULL,
  `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` DATETIME    NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tables_code` (`code`),
  UNIQUE KEY `uq_tables_label` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

`code` is generated in the domain layer with `crypto/rand` over the Crockford base32 alphabet (D6), retried on the (vanishingly unlikely) unique-key collision. It is never derived from the label — deriving it would make it guessable. Regenerating a code invalidates any printed QR for that table, which is the intended "rotate a leaked code" mechanism.

Migration `000020_create_carts`:

```sql
CREATE TABLE IF NOT EXISTS `carts` (
  `id`         BIGINT      NOT NULL AUTO_INCREMENT,
  `session_id` CHAR(36)    NOT NULL,
  `table_id`   BIGINT      NULL,
  `status`     VARCHAR(16) NOT NULL DEFAULT 'active',  -- active | converted | abandoned
  `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME    NULL,
  PRIMARY KEY (`id`),
  KEY `idx_carts_session_id_status` (`session_id`, `status`),
  KEY `idx_carts_table_id` (`table_id`),
  CONSTRAINT `fk_carts_table` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`)
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

Notes: single-active-cart-per-session is enforced in the usecase inside a DB transaction, not by a unique index — the future `converted` status must be able to coexist with a new `active` cart. `table_id` is nullable so a cart can exist for the moment between session creation and the table resolving. `status` is a plain string column matching how `saleType`/`station` are already modeled. No price columns, per D7. Column naming, `deleted_at` soft deletes and the `BIGINT`/`FLOAT` choices follow the existing schema exactly.

`Table`, `Cart` and `CartItem` domain entities, `TableRepository` / `CartRepository` interfaces with `//go:generate mockgen` headers, the MySQL repos + transformers, and repo tests follow the `ticket`/`stock_check` pattern.

**`tables` is a POS resource too.** Staff need to create tables and print their QR codes, so the master gets the standard authenticated CRUD (`GET|POST /tables`, `GET|PUT|DELETE /tables/{tableId}`, plus `PUT /tables/{tableId}/regenerate-code`) and a POS admin screen, built exactly like the existing `tickets` slice. Without it the feature is undeliverable — a random code nobody can mint or read is useless.

### FR-3 — Cart endpoints (API)

All routes require a valid `X-Session-Id` header (UUIDv4). Missing or malformed ⇒ `400` with the existing `Error` envelope. The active cart is created lazily on first write.

| Method | Path | Body | Behavior |
|---|---|---|---|
| `GET` | `/carts/current` | — | Returns the session's active cart with items. Empty cart (never `404`). |
| `PUT` | `/carts/current` | `{ tableCode }` | Resolves the code against `tables` and sets `table_id` on the active cart. Unknown code ⇒ `404`; the client never sends a table **id**, only the code from the QR. |
| `POST` | `/carts/current/items` | `{ variantId, amount, note }` | Adds a line, merging on `(variantId, trimmed note)` per D9. |
| `PUT` | `/carts/current/items/{cartItemId}` | `{ amount, note }` | Updates a line. `404` if the item is not in this session's cart. |
| `DELETE` | `/carts/current/items/{cartItemId}` | — | Removes a line. |
| `DELETE` | `/carts/current` | — | Empties the cart. |

Every response returns the **whole cart**, so the client never reconstructs state from a partial reply. The `Cart` response schema carries, per item, the resolved `variant` (public-shaped, `materials: []`), the derived `price` and `subtotal`, and, at the cart level, `itemCount` and `total` — all computed server-side (D7).

Validation: `amount` must be an integer ≥ 1 (fractional quantities are a POS-only concern); `note` ≤ 255 chars; `variantId` must resolve to a variant of a **published, purchase** product, else `403` validation error; `tableCode` must match `^[0-9A-HJKMNP-TV-Z]{10}$` (Crockford base32, D6) **and** exist in `tables`.

The cart response embeds `table: { id, label } | null` so the customer app can show "Meja 1" without a second request, and so a future order slip can print the label directly.

Cross-session access is impossible by construction: every query is scoped by `session_id` before the item ID is considered.

### FR-4 — Session establishment (frontend)

`BrowserSessionRepository` reads `gl_session_id` on construction; if absent or not a valid UUIDv4 it mints one with `crypto.randomUUID()` and writes the cookie (D3). Construction happens in the composition root before any usecase runs, so the ID is always present by the time a cart request is issued.

Per D13, the browser storage does **not** leak into domain or presentation. It sits behind a port:

- `domain/repositories/session.ts` — `SessionRepository { getSessionId(): string; getTableCode(): string | null; setTableCode(code: string): void }`
- `data/browser/session.ts` — `BrowserSessionRepository`, the cookie + `localStorage` implementation, which reconciles the two on construction (cookie wins; whichever is missing is rewritten) and is the only code in the repo that knows a cookie exists. `data/browser/` is a new sibling of `api|mock|url|memory`, in the same spirit as `data/url` treating the URL as a storage port.
- `data/mock/session.ts` — `MockSessionRepository`, an in-memory implementation so every cart usecase test runs without a DOM.

`ApiCartRepository` takes a `SessionRepository` and attaches `X-Session-Id` to every `/carts/*` request.

The table code comes from the `/order/t/{code}` route segment (D17). On entry the app resolves it via `GET /public/tables/{code}` and pushes it to `PUT /carts/current`. Three outcomes:

| Case | Screen |
|---|---|
| Code resolves | Menu, header shows the returned `label` ("Meja 1") |
| Code unknown / deleted (`404`) | "QR tidak valid — silakan pindai ulang kode di meja Anda" |
| No code at all (`/order`) | "Pindai QR di meja Anda untuk mulai memesan" |

The manual "type your table number" prompt from the earlier draft is **gone**, and deliberately so: with non-guessable codes (D6) there is nothing a guest could usefully type. Losing that fallback is the accepted cost of closing off-premise ordering — a guest whose QR is damaged asks staff, who can re-print or read the code from the POS tables screen.

### FR-5 — Menu discovery (frontend)

Full slice per the file inventory: `MenuRepository` port, `ApiMenuRepository` + `MockMenuRepository`, `MenuListUsecase` (+ test), `useMenuListController`, `MenuListScreen` (+ stories), `MenuListHandler` (+ test), `app/MenuList.tsx`, client route at `/order/t/{code}`.

The machine starts in `idle` and fetches after mount — there is no SSR seeding (D18), so the first paint is the shell plus skeletons.

The state machine mirrors `ProductListUsecase` minus pagination (the menu is one fetch, D4):

```ts
type Context = {
  products: Product[]; categories: Category[];
  query: string; selectedCategoryId: number | null;
  errorMessage: string | null; fetchDebounceDelay: number;
};
type MenuListState =
  ({ type: 'idle' } | { type: 'loading' } | { type: 'loaded' }
   | { type: 'error' } | { type: 'changingParams' } | { type: 'revalidating' }) & Context;

type MenuListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; products: Product[]; categories: Category[] }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'CHANGE_PARAMS'; query?: string; selectedCategoryId?: number | null;
      fetchDebounceDelay?: number }
  | { type: 'REVALIDATE_FINISH'; products: Product[]; categories: Category[] };
```

Search debounces through `createDebounce` inside `onStateChange`, as `ProductListUsecase` does. The screen renders sticky search, sticky category chips that scroll to their section, and per-category cards showing the **lowest variant price** as "mulai Rp X" via `formatRupiah()` (D15). Each card's image goes through `MenuItemThumbnail`, which falls back to a station-keyed icon placeholder when `imageUrl` is empty or fails to load, and omits the description entirely when it is empty (D16). Loading renders skeletons; empty and error states reuse `EmptyView` / `ErrorView` with retry — all driven by the `variant` prop mapped exhaustively in the handler. All copy is Bahasa Indonesia (D15).

Menu search/category state stays in the machine and is **not** mirrored into the URL, so no `data/url` query repository is needed here. (The POS mirrors list state into the URL because staff share and bookmark filtered lists; a customer scanning a QR code does not.)

### FR-6 — Item detail and add-to-cart (frontend)

Slice: `MenuItemDetailUsecase` (+ test), `useMenuItemDetailController`, `MenuItemDetailScreen` (+ stories), `MenuItemDetailHandler` (+ test), `app/MenuItemDetail.tsx`, page at `/order/t/[tableCode]/products/[productId]`. Route-addressable, presented as a Tamagui bottom sheet over the menu.

```ts
type Context = {
  product: Product | null; selectedOptionValueIds: number[];
  variant: Variant | null; amount: number; note: string; errorMessage: string | null;
};
type MenuItemDetailState =
  ({ type: 'idle' } | { type: 'loadingProduct' } | { type: 'selectingOptions' }
   | { type: 'resolvingVariant' } | { type: 'ready' } | { type: 'error' }) & Context;

type MenuItemDetailAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; product: Product }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'SELECT_OPTION_VALUE'; optionId: number; optionValueId: number }
  | { type: 'RESOLVE_VARIANT_SUCCESS'; variant: Variant }
  | { type: 'RESOLVE_VARIANT_ERROR'; message: string }
  | { type: 'CHANGE_AMOUNT'; amount: number }
  | { type: 'CHANGE_NOTE'; note: string };
```

Selecting a value for every `Option` moves the machine to `resolvingVariant`, whose `onStateChange` calls `GET /public/variants?productId=&optionValueIds[]=` — the same resolution the POS performs in `TransactionItemSelect`. `ready` is reached only once a variant resolves, and the Add-to-cart CTA is enabled **exactly** in `ready`; the enabling rule is a state, not an `if` in the screen. The CTA shows live `variant.price × amount`; submitting dispatches into the cart machine (FR-7) and closes the sheet with the existing `libs/provider` toast.

### FR-7 — Cart review and checkout CTA (frontend)

Slice: `CartRepository` port, `ApiCartRepository` + `MockCartRepository`, `Cart`/`CartItem` entities, `CartUsecase` (+ test), `useCartController`, floating cart bar component (+ stories), `CartScreen` (+ stories), `CartHandler` (+ test), `app/Cart.tsx`, page at `/order/t/[tableCode]/cart`.

One machine owns the whole cart — fetch and every mutation — because the floating bar, the cart screen and add-to-cart all read the same cart:

```ts
type Context = { cart: Cart | null; previousCart: Cart | null; errorMessage: string | null };
type CartState =
  ({ type: 'idle' } | { type: 'loading' } | { type: 'loaded' } | { type: 'error' }
   | { type: 'adding' } | { type: 'updating' } | { type: 'removing' } | { type: 'clearing' }) & Context;

type CartAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; cart: Cart }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'ADD_ITEM'; variantId: number; amount: number; note: string }
  | { type: 'UPDATE_ITEM'; cartItemId: number; amount: number; note: string }
  | { type: 'REMOVE_ITEM'; cartItemId: number }
  | { type: 'CLEAR' }
  | { type: 'MUTATE_SUCCESS'; cart: Cart }
  | { type: 'MUTATE_ERROR'; message: string };
```

Optimism follows D14: `UPDATE_ITEM` / `REMOVE_ITEM` compute the optimistic cart purely in the reducer and stash the server-known cart in `previousCart`; `onStateChange` issues the call; `MUTATE_SUCCESS` replaces with the server's authoritative cart (totals per D7); `MUTATE_ERROR` restores `previousCart` and surfaces an error toast. The transitions — including rollback — are asserted headlessly with `UsecaseTester`.

The floating bar renders on menu and detail screens whenever `itemCount > 0`. `CartScreen` lists lines with name, chosen option values, note, stepper, subtotal and remove; supports clearing; and shows a summary with the server-computed total. The sticky **Checkout** button routes to the FR-8 stub.

### FR-8 — QRIS checkout stub (frontend)

A screen stating that payment is **QRIS only**, that the order is **not yet submitted**, and that the feature is coming soon, with a back-to-cart action. Behind `VITE_ORDER_CHECKOUT_ENABLED` (D10), read at build time. No API call, no transaction.

### FR-9 — Static build and GitHub Pages deployment

`apps/order` builds to static assets with Vite and publishes to this repo's GitHub Pages site, which **already hosts `docs-site`**. A repository gets one Pages site, so the two builds merge into a single artifact:

```
dist/                 ← docs-site (VitePress), unchanged, at the site root
dist/order/           ← customer SPA
dist/order/404.html   ← byte-copy of dist/order/index.html (D19)
```

`.github/workflows/deploy-docs.yaml` is replaced by a combined `deploy-pages.yml` that builds both, assembles the tree above, and uploads once. Its `paths` filter widens to `docs-site/**`, `apps/order/**`, `libs/ui/**`, `libs/api-contract/**`. **Consequence to accept:** the two sites redeploy together — a docs typo republishes the order app and vice versa. Both builds are deterministic, so this is churn, not risk.

Vite is configured with `base: '/gatherloop-pos/order/'` to match the Pages path, and the router is mounted with the same base so `/order/t/{code}` resolves correctly under it. Pointing a custom domain at Pages later changes only `base` and the QR URLs.

Three build-time requirements:

1. **`VITE_API_BASE_URL`** is baked into the bundle. It is a public URL, so this is not a secret-handling problem — but it does mean an API move requires a rebuild.
2. **The API is served over HTTPS** at `https://<vps-ip>.sslip.io`, TLS terminated by Caddy on the VPS (D21). This was a hard blocker — Pages is HTTPS-only, so a plaintext origin would be blocked as mixed content — and it is cleared.
3. **`libs/api-contract/src/client.ts` needs a Vite-compatible base URL.** It currently resolves `process.env['NEXT_PUBLIC_API_PROXY_BASE_URL'] ?? Config['API_BASE_URL']` and imports `react-native-config` — neither exists in a Vite browser build. The resolution order gains `import.meta.env.VITE_API_BASE_URL`, guarded so the Next and React Native paths keep working untouched.

Since the browser now calls the API cross-origin with no proxy, CORS carries real weight: `EnableCORS` already reflects the request origin and must also allow `X-Session-Id` (FR-1). The session travels as a header rather than a cookie, so no third-party-cookie restriction applies, and the order app's axios instance sets `withCredentials: false` (D22).

The build is otherwise origin-agnostic: `base` and `VITE_API_BASE_URL` are the only two values tied to where the app and API live, which is what keeps a future custom domain a one-line change plus a QR reprint.

---

## Non-Functional Requirements

- **Performance** — with no SSR (D18), the budget splits in two on a 4× CPU-throttled mid-range Android over Fast 3G: the static shell (skeleton menu, header, cart bar) paints in **< 1.5 s**, and the menu is interactive in **< 3 s**. The shell is served from the Pages CDN and cached, so repeat scans are near-instant; the cost is one API round trip for the menu. Initial JS budget **≤ 250 KB gzipped** — enforceable precisely because the order bundle excludes the POS screens (D20). Product images lazy-load below the fold.
- **Accessibility** — tap targets ≥ 44 px, visible focus states, labelled controls, AA contrast, screen-reader-announced cart count.
- **Resilience** — every network failure has a retry affordance; a stale/deleted cart (e.g. purged server-side) recovers to an empty cart rather than an error screen.
- **Observability** — the public and cart routes go through the existing `logger.RequestLogger`; cart mutations log `session_id` and `table_id` for support. Session IDs are anonymous by construction, so no PII enters logs — and table **codes** are deliberately kept out of logs, since a logged code is a reusable off-premise ordering key (D6).
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
| **1** | `feat(api): public catalog endpoints` | `public_route.go`, `public_handler.go`, `toPublicVariant` transformer, `api.yaml` `/public/*` catalog paths, regenerate TS, handler tests, `X-Session-Id` added to `EnableCORS`. No DB change. | 0 | M |
| **1a** | `chore(api): restrict CORS to an origin allowlist` | Replace `EnableCORS`'s reflect-any-origin with an allowlist (Pages origin + POS origin) driven by an env var, keeping `Allow-Credentials` only for allowed origins. Pre-existing hardening, not caused by this PRD, but this is the moment the API becomes deliberately cross-origin. Independent of everything else — mergeable any time after phase 1. | 1 | S |
| **1b** | `feat(api): table master` | Migration `000019_create_tables`, `table_entity.go` with the `crypto/rand` Crockford code generator (+ unit test for alphabet and collision retry), `table_repository.go` (+ mockgen), MySQL repo/transformers, `table_usecase.go`, authenticated CRUD + `regenerate-code` routes, public `GET /public/tables/{code}`, contract, handler tests. | 1 | L |
| **1c** | `feat(ui): tables admin screen` | POS-side slice built like the `tickets` one: `Table` entity, `TableRepository` port, `ApiTableRepository` + mock, `TableList`/`TableCreate` usecases + tests, controllers, screens + stories, handlers + tests, `app/TableList.tsx`, pages under `apps/web/src/pages/tables/`, plus per-table QR rendering for printing. | 1b | L |
| **2** | `feat(api): cart data model` | Migration `000020_create_carts`, `cart_entity.go`, `cart_repository.go` (+ mockgen), `data/mysql/cart_{entity,repo,transformer}.go`, repo tests. No routes — nothing user-visible yet. | 1b | M |
| **3** | `feat(api): cart endpoints` | `cart_usecase.go` (+ usecase tests), session-ID middleware, table-code resolution, handlers/routes/transformers, `api.yaml` `/carts/current*` paths + `Cart`/`CartItem` schemas, regenerate TS, handler tests, `main.go` wiring. | 2 | L |
| **3b** | `chore(ui): order entry point and Vite-safe client` | The boundary work of D20, ahead of any app code: `libs/ui/src/index.order.ts` + `tsconfig.base.json` path for `@gatherloop-pos/ui/order`; repoint `libs/provider` at `libs/ui/src/config` and the `ConfirmationAlert` module instead of the root barrel; add `import.meta.env.VITE_API_BASE_URL` to the base-URL resolution in `libs/api-contract/src/client.ts`, guarded so Next and React Native are unaffected. Pure refactor — POS behavior unchanged, existing tests prove it. | 1 | S |
| **4** | `feat(order): scaffold customer SPA` | `apps/order` Nx React + Vite app: `vite.config.ts` with `@vitejs/plugin-react` + `@tamagui/vite-plugin` and `base: '/gatherloop-pos/order/'`, `index.html`, client router, `useNavigation()` adapter in `libs/ui` (+ test), `RootProvider` mount, mobile-first `OrderLayout`, `project.json`. Renders a placeholder route. | 3b | M |
| **4b** | `feat(ui): rupiah and thumbnail primitives` | `utils/currency.ts` `formatRupiah()` (+ test) and the `MenuItemThumbnail` component with station-keyed icon fallback and `onError` handling (+ stories covering has-image / empty / broken-URL), per D15 and D16. Tiny, self-contained, unblocks every later screen. | 4 | S |
| **5** | `feat(order): anonymous session and table resolution` | **domain:** `repositories/session.ts` port. **data:** `data/browser/session.ts` (cookie + `localStorage` reconcile), `data/mock/session.ts`. **app:** `SessionProvider` wiring `BrowserSessionRepository` (client-side mint, D3), axios `X-Session-Id` interceptor, `/order/t/{code}` route shell, table-code resolution against `GET /public/tables/{code}`, and the invalid-QR / no-QR screens. Unit tests for mint/reconcile. | 4b | M |
| **6** | `feat(ui): menu domain and data layer` | **domain:** `repositories/menu.ts` port, `usecases/menuList.ts` + `usecases/menuItemDetail.ts` state machines, both with `UsecaseTester` tests. **data:** `data/api/menu.ts` (`ApiMenuRepository`), `data/mock/menu.ts`. Reuses the existing `Product`/`Variant`/`Category` entities and `toProduct`/`toVariant` transformers. **No presentation code.** | 3 | M |
| **7** | `feat(ui): menu discovery screen` | **presentation:** `MenuListController`, `MenuListScreen` + stories, `MenuListHandler` + handler test, category-chip and product-card components + stories. **app:** `app/MenuList.tsx` composition root, client route at `/order/t/{code}`. No SSR seeding — starts `idle`, renders skeletons (D18). | 6 | L |
| **8** | `feat(ui): item detail and option selection` | **presentation:** `MenuItemDetailController`, `MenuItemDetailScreen` + stories, `MenuItemDetailHandler` + test, option chip groups, stepper, note field. **app:** `app/MenuItemDetail.tsx`, route at `/order/t/{code}/products/{productId}`. Add-to-cart CTA present, wired to a no-op callback until phase 9. | 7 | L |
| **9** | `feat(ui): cart domain and data layer` | **domain:** `entities/Cart.ts`, `repositories/cart.ts` port, `usecases/cart.ts` state machine incl. optimistic transitions and rollback (D14), with `UsecaseTester` tests covering success **and** `MUTATE_ERROR` restore. **data:** `data/api/cart.ts` + `cart.transformer.ts`, `data/mock/cart.ts`. Phase 8's CTA is connected here. | 8 | M |
| **10** | `feat(ui): floating cart bar and cart screen` | **presentation:** `CartController`, floating cart bar component + stories, `CartScreen` + stories, `CartHandler` + test. **app:** `app/Cart.tsx`, route at `/order/t/{code}/cart`. Steppers, remove, clear, summary, sticky Checkout button. | 9 | L |
| **11** | `feat(order): QRIS checkout stub` | Stub checkout screen behind `VITE_ORDER_CHECKOUT_ENABLED`, routed from the cart CTA. | 10 | S |
| **12** | `test(order-e2e): table ordering happy path` | `apps/order-e2e` Playwright project mirroring `apps/web-e2e`, run against `vite preview`: scan → browse → filter → open item → choose options → add → cart persists across reload → edit quantity → remove → checkout CTA. Includes a deep-link test proving the `404.html` fallback serves `/order/t/{code}` (D19). | 11 | M |
| **12b** | `ci: publish docs and order app to Pages together` | Replace `deploy-docs.yaml` with a combined `deploy-pages.yml` assembling `dist/` (docs) + `dist/order/` (SPA) + the `404.html` copy into one Pages artifact, with the widened `paths` filter (FR-9). Verified by a real deploy to the Pages URL. | 11 | M |
| **13** | `docs: document table ordering` | `docs-site/sales/table-ordering.md`, VitePress nav entry, `README.md` project list, `docs-site/roadmap.md` update. | 12b | S |

**Sequencing note:** phases 6–10 deliberately alternate **domain+data** PRs with **presentation** PRs. That split falls straight out of the architecture (D13): a domain+data PR is pure logic plus ports and mocks, reviewable through its `UsecaseTester` transition tests with no UI to read; the following presentation PR is props-driven screens plus stories, reviewable without re-reading the logic. The dependency rule guarantees the first can land and be tested without the second existing.

**Deployment note:** `apps/order` is a static bundle published to GitHub Pages alongside the docs site (FR-9, phase 12b) — it needs no host of its own. The API deploy pipeline (`.github/workflows/deploy-api.yml`, `apps/api/docs/DEPLOY_NATIVE.md`) is unchanged by phases 1–3 apart from running the two new migrations. The one infrastructure prerequisite is that the API is reachable over **HTTPS** before phase 4 merges (FR-9).

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Public endpoints get scraped or abused (D12) | Read-only, published-only, cost data stripped. Rate limiting is a fast follow if traffic warrants it; the reverse proxy can shoulder it without an API change. |
| Abandoned carts accumulate indefinitely | Rows are tiny and unindexed growth is slow. A cleanup job marking carts `abandoned` after N days is deferred; flagged for the transaction phase, when volume becomes real. |
| A customer's price changes between add and checkout (D7) | Harmless while nothing is charged. The transaction phase **must** snapshot prices at conversion — `transaction_items` already stores `price`/`subtotal`, so the mechanism exists. |
| Session ID lost (private browsing, cookie eviction) | `localStorage` mirror + re-mint. Worst case the customer starts a fresh cart — acceptable for anonymous ordering. |
| The order bundle accidentally pulls in POS screens, `solito` or `next` | Prevented structurally by the `@gatherloop-pos/ui/order` entry point (D20), not by discipline. Worth a CI bundle-size check against the 250 KB budget once phase 10 lands, so a stray root-barrel import fails the build rather than shipping. |
| A deep link's first response is HTTP 404 under the `404.html` fallback (D19) | The page renders correctly; only the status line is wrong. No SEO or crawler requirement exists for a QR-scanned app. Hash routing is the fallback if it ever matters, and costs only an adapter change. |
| The API is not reachable over HTTPS | **Hard blocker, not a degradation** — Pages is HTTPS-only, so mixed content blocks every request and the app is dead on arrival. Verified against the live host before phase 4 merges (FR-9). |
| Docs and order app redeploy together from one Pages artifact | Accepted churn (FR-9). Both builds are deterministic, so a docs typo republishing the SPA changes no bytes that matter. |
| Two customers at the same table build separate carts | Expected in v1 — each phone is a session. Merging carts by table is a product decision for the transaction phase, noted as future work. |
| A table's QR code leaks (photographed, shared online) and is used off-premise | `PUT /tables/{tableId}/regenerate-code` mints a new code and invalidates the printed QR (D6). Staff reprint one sticker. This is why the code is stored rather than derived from the label. |
| The menu looks unfinished because most products have no photo | D16's placeholders keep the layout intact and deliberate-looking, but they are a floor, not a fix. Flagged as a content task (Future Work 7), not a code task. |

---

## Resolved Questions and Remaining Prerequisites

**All product and architecture questions are resolved.**

| Question | Decision |
|---|---|
| QR URL format | `/order/t/{code}`, under an `/order` base path (D17) |
| Table codes | Non-guessable Crockford base32 — which pulls a minimal `tables` master into scope (D6) |
| Menu language | Bahasa Indonesia only, no i18n framework (D15) |
| Images and descriptions | Real placeholders, since catalog content is currently sparse (D16) |
| Hosting | GitHub Pages, static, client-rendered Vite SPA — no Next.js, no Node runtime (D18) |
| API origin | `https://<vps-ip>.sslip.io`, Caddy-terminated TLS — HTTPS confirmed, mixed-content blocker cleared (D21) |
| Public origin | `https://gatherloop.github.io/gatherloop-pos/order/...`, so Vite builds with `base: '/gatherloop-pos/order/'` |

The VPS cannot run a Node runtime, and the one argument that favoured a JS server — a BFF for QRIS — does not survive contact with the plan: **the Go API owns payment**, so gateway secrets and callbacks never touch the customer bundle. That makes a static SPA the right shape, not a compromise.

A QR encodes `https://gatherloop.github.io/gatherloop-pos/order/t/{code}` — 62 characters, a low-density code that scans reliably at table-tent size.

**Nothing blocks phase 1.** Two items are carried as follow-ups rather than prerequisites:

1. **CORS is currently reflect-any-origin with `Access-Control-Allow-Credentials: true`** (`EnableCORS`). This predates the PRD and is not exploitable in practice today — the POS reaches the API through the Next same-origin proxy, and the `Authorization` cookie sets no explicit `SameSite`, so current browser defaults treat it as `Lax` and withhold it from cross-site requests. But this PRD deliberately turns the API into a cross-origin, publicly-reachable service, which makes it the right moment to replace reflection with an allowlist (the Pages origin plus the POS origin). Small, self-contained, and worth doing alongside phase 1 — flagged, not silently inherited.
2. **An sslip.io hostname is IP-derived**, so a VPS IP change invalidates both the certificate hostname and the baked `VITE_API_BASE_URL` (D21). Worth a line in the runbook next to the redeploy steps.

---

## Future Work (post-PRD)

In rough dependency order:

1. **Transaction creation from cart** — `POST /carts/current/checkout` → `Transaction` with a `session_id` column, price snapshotting, and order-number assignment.
2. **QRIS payment integration** — gateway selection, callback handling, reconciliation against `wallets`.
3. **Order history and status** — the session's past transactions, plus a live status screen fed by kitchen/bar progress (the `Category.station` field already exists for the kitchen/bar order-slip split).
4. **Richer table management** — zones, capacity, occupancy, a floor plan, and bulk QR sheet printing, building on the minimal `tables` master delivered here.
5. **Cart merging by table**, so a table of four builds one bill (the `table_id` FK on `carts` is what makes this queryable).
6. **Coupons in the customer app**, reusing the existing coupon engine and the per-item coupon work.
7. **Catalog content pass** — photos and descriptions for the top sellers, so the menu stops leaning on D16's placeholders.
8. **Retrofit `formatRupiah()` across the POS**, replacing the ad-hoc money formatting the customer app deliberately avoided inheriting (D15).
