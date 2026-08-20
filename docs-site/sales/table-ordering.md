# Table Ordering

## What it does

A customer sits down, scans the QR code printed on their table, and lands on a header confirming which table they're at — the table label plus its floor number (e.g. "Meja 3 · Lantai 2"), so a guest can check they're where the app thinks they are even in a multi-floor venue. From there they browse categories, tap an item to pick its options (size, ice level, whatever the product defines), add a note, set a quantity, and add it to a cart. A floating bar keeps the running item count and total visible on every screen, genuinely pinned to the bottom of the viewport rather than the bottom of the page. The cart survives closing the browser tab or reloading the page, so a customer who steps away and comes back later finds it exactly as they left it.

Each menu item shows only its short, customer-facing **description** — never the staff-only preparation recipe, which the public API never returns (see [Products](/catalog/products) for that split). Once something is in the cart, a customer can edit a line's **quantity and note** at any time before checkout, without deleting and re-adding the item; the variant itself (the size or option combination already chosen) can't be changed from that edit screen — picking a different one still means removing the line and adding the item again.

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
- **Edit a cart line's quantity and note** — every cart line has an edit button that opens a modal with the amount and note editable and the chosen variant shown read-only; saving updates the line without leaving the cart. Changing the variant itself still means deleting the line and re-adding the item.
- **Table floor shown in the header** — the resolved table's header shows its floor number alongside the label (e.g. "Lantai 2"), so a guest in a multi-floor venue can confirm they scanned the right table's QR.
- **Checkout stub, not a live checkout** — a clearly-labeled "coming soon" screen closes the loop for review and user testing without creating a transaction or touching payment.
- **A menu that never looks broken** — items without a photo or a description get a real placeholder (a category-appropriate icon), not a missing image or a collapsed layout.
- **Bahasa Indonesia, mobile-first** — the customer app is copy-in-Indonesian, single-column, designed for a phone screen, independent of the English, desktop-oriented POS.

## For engineers

- Customer app: `apps/order` — a standalone static Vite SPA (not the Next.js `apps/web` POS), deployed to GitHub Pages alongside this docs site
- Route entry: `/order/t/{code}` (menu), `/order/t/{code}/products/{productId}` (item detail sheet), `/order/t/{code}/cart` (cart), `/order/t/{code}/cart/items/{cartItemId}` (edit a cart line's amount/note, rendered alongside the cart), gated by `VITE_ORDER_CHECKOUT_ENABLED` for the checkout stub
- Frontend logic, reached through the `@gatherloop-pos/ui/order` entry point so the customer bundle never pulls in POS/Next code: `libs/ui/src/domain/usecases/{menuList,menuItemDetail,cart}.ts`, repositories in `libs/ui/src/data/{api,mock,browser}`
- Anonymous session: `libs/ui/src/data/browser/session.ts` (`gl_session_id` cookie + `localStorage`, sent as the `X-Session-Id` header)
- Backend public catalog: `apps/api/presentation/restapi/public_route.go` — unauthenticated `GET /public/{categories,products,variants,tables/{code}}`, stripping cost data (`materials`, `pricingTiers`, `recipe`) and restricting to published, purchasable items
- Backend cart: `apps/api/domain/cart_usecase.go`, routes under `/carts/current*`, migrations `000019_create_tables` and `000020_create_carts`; `PUT /carts/items/{cartItemId}` (amount + note only — the variant is immutable once added)
- Table admin (staff-facing): `libs/ui/src/presentation/screens/Table{List,Create}Screen.tsx`, `apps/api/domain/table_usecase.go` (random Crockford-base32 code generation, `regenerate-code` to invalidate a leaked QR); `floor_number` (migration `000021_add_table_floor_number`) is exposed on `PublicTable` and rendered in `TableResolveScreen.tsx`
- Design doc: `docs/prd-table-ordering.md` — the full set of decisions, including why the catalog needed a new unauthenticated route group (D1), why table codes are random rather than sequential (D6), and what's explicitly deferred to the next project (turning a cart into a transaction, QRIS payment integration, order status)
- Follow-up design doc: `docs/prd-order-app-ux-improvements.md` — the floating cart bar fix, the description/recipe split, the floor-number header, and the cart-line edit modal covered above
