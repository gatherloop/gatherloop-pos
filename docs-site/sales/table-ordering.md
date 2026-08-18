# Table Ordering

## What it does

A customer sits down, scans the QR code printed on their table, and lands straight on the menu on their own phone — no app install, no login, no account. They browse categories, tap an item to pick its options (size, ice level, whatever the product defines), add a note, set a quantity, and add it to a cart. A floating bar keeps the running item count and total visible on every screen. The cart survives closing the browser tab or reloading the page, so a customer who steps away and comes back later finds it exactly as they left it.

This ships the **discovery-and-cart half** of the flow only. A visible **Checkout** button explains that payment is QRIS-only and that the order hasn't been sent to the kitchen yet — turning that cart into an actual paid transaction is deliberately left for a follow-up project.

## Why it matters

At peak hours the counter is the bottleneck: customers queue to order, staff key items in one at a time, and a single cashier serializes the whole room. Letting customers browse and build their own order from the table — the model popularized by apps like [pesan.app](https://pesan.app) — moves that work off the counter entirely, so staff can focus on payment and fulfilment instead of order-taking.

It also had to be built without inventing a second product. The customer-facing app reuses the same [Categories](/catalog/categories), [Products](/catalog/products) and [Variants](/catalog/variants) the counter staff already manage — a menu item published for the till is automatically orderable from the table, with no separate customer-menu data entry.

## Key capabilities

- **QR-per-table, not a typed number** — each table gets a non-guessable, random 10-character code (not a sequential "Table 3"), so a customer can't order from off-premise by guessing a neighboring number. Staff manage the table list and print its QR from a dedicated admin screen.
- **No login, no install** — identity is a random ID minted in the browser on first visit and stored locally; that's the entire "account."
- **Cart that survives a reload** — the cart lives server-side, keyed to that anonymous session, so refreshing the page, closing the tab, or coming back later never loses it.
- **Same variant/option model as the counter** — picking a size or an ice level resolves to a specific priced variant exactly the way staff resolve one on the POS checkout screen.
- **Prices are never trusted from the phone** — every price, subtotal and total is computed server-side from the catalog at read time, never accepted from the client.
- **Smart line merging** — adding the same variant with the same note again increases its quantity instead of creating a duplicate line; a different note stays its own line, since the kitchen treats it differently.
- **Checkout stub, not a live checkout** — a clearly-labeled "coming soon" screen closes the loop for review and user testing without creating a transaction or touching payment.
- **A menu that never looks broken** — items without a photo or a description get a real placeholder (a category-appropriate icon), not a missing image or a collapsed layout.
- **Bahasa Indonesia, mobile-first** — the customer app is copy-in-Indonesian, single-column, designed for a phone screen, independent of the English, desktop-oriented POS.

## For engineers

- Customer app: `apps/order` — a standalone static Vite SPA (not the Next.js `apps/web` POS), deployed to GitHub Pages alongside this docs site
- Route entry: `/order/t/{code}` (menu), `/order/t/{code}/products/{productId}` (item detail sheet), `/order/t/{code}/cart` (cart), gated by `VITE_ORDER_CHECKOUT_ENABLED` for the checkout stub
- Frontend logic, reached through the `@gatherloop-pos/ui/order` entry point so the customer bundle never pulls in POS/Next code: `libs/ui/src/domain/usecases/{menuList,menuItemDetail,cart}.ts`, repositories in `libs/ui/src/data/{api,mock,browser}`
- Anonymous session: `libs/ui/src/data/browser/session.ts` (`gl_session_id` cookie + `localStorage`, sent as the `X-Session-Id` header)
- Backend public catalog: `apps/api/presentation/restapi/public_route.go` — unauthenticated `GET /public/{categories,products,variants,tables/{code}}`, stripping cost data (`materials`, `pricingTiers`) and restricting to published, purchasable items
- Backend cart: `apps/api/domain/cart_usecase.go`, routes under `/carts/current*`, migrations `000019_create_tables` and `000020_create_carts`
- Table admin (staff-facing): `libs/ui/src/presentation/screens/Table{List,Create}Screen.tsx`, `apps/api/domain/table_usecase.go` (random Crockford-base32 code generation, `regenerate-code` to invalidate a leaked QR)
- Design doc: `docs/prd-table-ordering.md` — the full set of decisions, including why the catalog needed a new unauthenticated route group (D1), why table codes are random rather than sequential (D6), and what's explicitly deferred to the next project (turning a cart into a transaction, QRIS payment integration, order status)
