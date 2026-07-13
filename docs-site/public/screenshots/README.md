# Recapturing screenshots

Every screenshot on the site is a real capture of the running app against seeded data — no mockups. Recapture them whenever a screen's UI changes enough to make the docs look stale.

## 1. Stand up the stack

You need MySQL (not MariaDB — a data migration in `apps/api/migrations` uses `CAST(... AS JSON)`, which MariaDB doesn't support the same way), the Go API, and the Next.js web app running locally.

```bash
# from apps/api, with a MySQL instance reachable and .env pointing at it
go run cmd/migrate/main.go
go run cmd/seed/main.go
go run main.go   # serves on :8080

# from the repo root, generate the API contract once if libs/api-contract/src/__generated__ is empty
nx run api-contract:generate:go
nx run api-contract:generate:ts

# from apps/web
# .env.local:
#   NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
#   NEXT_PUBLIC_API_PROXY_BASE_URL=http://localhost:8080
nx run web:dev   # serves on :3000
```

**Gotcha:** `NEXT_PUBLIC_API_PROXY_BASE_URL` (used by `libs/api-contract/src/client.ts` for every client-side and server-side request) must be an **absolute** URL. Setting it to a relative path like `/api` breaks every page that fetches data server-side in `getServerSideProps` — Next's Node process can't resolve a relative URL the way a browser does, and every list page 500s. Pointing it straight at the API (`http://localhost:8080`) works for both the browser and the Node server; the API's CORS middleware already reflects any origin with credentials, and its auth cookie is scoped to the bare `localhost` domain, so it's shared across ports.

Log in at `/auth/login` with the seeded admin account (`admin` / `admin123`, see `apps/api/seeds/user_seeder.go`).

## 2. Seed data worth screenshotting

The base seeders (`apps/api/seeds/`) cover most pages out of the box, but a few pages need extra setup to show their most interesting state rather than an empty or trivial one:

- **Purchase List** (`inventory/purchase-lists.md`) — link 2-3 materials to suppliers (`PUT /materials/{id}` with a `suppliers` array) and create a stock check (`POST /stock-checks`) with some counts below `minimumStock`. Leave at least one under-stocked material unlinked to a supplier to also capture the "Unassigned" section.
- **Checklists** (`operations/checklists.md`) — create a template with at least one multi-sub-item entry (`POST /checklist-templates`), start a session for it (`POST /checklist-sessions`), and check off a couple of items/sub-items (`PUT /checklist-session-items/{id}/check`, `.../checklist-session-sub-items/{id}/check`) so the screenshot shows partial, cascading progress instead of an all-or-nothing list.
- **Dashboard** (`finance/dashboard-statistics.md`) — the seeded transactions/expenses all share one timestamp, which renders as a single dot instead of a trend line. Backfill a couple of weeks of transactions and expenses with varied `created_at` values directly in the database before capturing.
- **Wallets** (`finance/wallets-transfers.md`) and **Calculations** (`finance/calculations.md`) — set a non-zero balance on at least the `Cash` wallet (`PUT /wallets/{id}`) and create a matching calculation (`POST /calculations`) whose denomination totals equal that balance, so the screenshot shows a real "Balanced" state.

## 3. Capture

Use Playwright against the running app (`playwright` is already a workspace dependency; `apps/web-e2e/src/utils/selectors.ts` has working locators for the login form and most screens if you want to drive it programmatically instead of by hand). For every screenshot on the site:

- Viewport **1440×900**, `deviceScaleFactor: 2` (crisp on retina displays without being huge).
- Log in once, then navigate directly to each page's URL rather than clicking through — it's faster and more repeatable.
- Wait for the page to settle (network idle, plus a short fixed delay for client-side chart/animation rendering) before capturing.
- Save as `docs-site/public/screenshots/<name>.png` and reference it from the page as `![... screenshot](/screenshots/<name>.png)`.

| File | Page |
|---|---|
| `transactions.png` | `/sales/transactions` |
| `coupons.png` | `/sales/coupons` |
| `rentals.png` | `/sales/rentals` |
| `categories.png` | `/catalog/categories` |
| `products.png` | `/catalog/products` |
| `variants.png` | `/catalog/variants` (Product detail → **Variants** tab) |
| `materials.png` | `/catalog/materials` |
| `stock-checks.png` | `/inventory/stock-checks` |
| `purchase-list.png` | `/inventory/purchase-lists` |
| `suppliers.png` | `/inventory/suppliers` |
| `dashboard.png` | `/finance/dashboard-statistics` (full-page capture — there's a second "Expense Statistic" chart below the fold) |
| `expenses.png` | `/finance/expenses` |
| `budgets.png` | `/finance/budgets` |
| `wallets.png` | `/finance/wallets-transfers` |
| `calculations.png` | `/finance/calculations` |
| `checklists.png` | `/operations/checklists` (a checklist session detail, with the sub-item group expanded) |
| `tickets.png` | `/operations/tickets` |

## 4. Sanity-check before committing

- `npm run build` inside `docs-site/` and spot-check a few pages with `npm run preview` — confirm images load at the deployed `base` path, not just in dev.
- Diff the new PNGs against the old ones visually; a screenshot that only changed because of different seed data (not a real UI change) is a sign the seed steps above need to be more deterministic.
