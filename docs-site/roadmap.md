# Roadmap

Gatherloop POS ships in small, sequential PRs, each backed by a written PRD in the repo's `docs/` folder before code lands. This page is mined from those PRDs — what's shipped, what's in flight, and what's been deliberately deferred (and why).

## Shipped

**Sales & Checkout**
- [Board-game rental tiered pricing](/sales/rentals) — per-variant `(up to N minutes → price)` tiers, snapshotted onto the rental at check-in so a later tier change never re-prices an active rental.
- [One combined order slip, grouped by station](/sales/transactions) — Bar and Kitchen see the whole order on a single slip instead of two out-of-sync ones.
- [Per-item rental coupons](/sales/coupons) — a coupon can discount a single line as well as the whole transaction.
- [RFID ticket ↔ printed-name registry](/operations/tickets) — resolves a scanned card to a human-readable ticket number at rental check-in, without ever blocking check-in.

**Catalog**
- [Product draft status](/catalog/products) — research a new menu item without it showing up at checkout until it's published.

**Inventory**
- [Stock checks with frozen snapshots](/inventory/stock-checks) — a dated, permanent count of every material, with material price/thresholds frozen at count time.
- [Blank-vs-zero required counts](/inventory/stock-checks) — every row must be explicitly counted; a skipped row can never be silently misread as "zero stock."
- [Stock check search & pending filter](/inventory/stock-checks) — sticky search plus a "show only pending" toggle built for a real shelf-by-shelf walk-through.
- [Per-material stock-check opt-out](/catalog/materials) — a material can be excluded from stock checks entirely (e.g. tap water, ice).
- [Supplier-grouped, actionable purchase lists](/inventory/purchase-lists) — computed automatically from a stock check, grouped by supplier, with a call / map / WhatsApp action matched to how each supplier is actually reached.

**Finance**
- [Cash-flow budgeting as spending targets](/finance/budgets) — budgets are percentage targets checked against actual spend, not top-up envelopes.
- [Dashboard date-range filter](/finance/dashboard-statistics) — presets (Last 7/30 days, This Month, custom range) plus day/month grouping on the sales chart.
- [Expense statistics on the dashboard](/finance/dashboard-statistics) — expense totals charted alongside sales, broken down by budget.
- [Wallet payment-eligibility flag](/finance/wallets-transfers) — internal wallets (like a safe or savings account) can be hidden from the checkout payment picker without deleting them.
- [Cash count & reconciliation](/finance/calculations) — a physical cash count checked live against the system's recorded wallet balance.

**Operations**
- [Operational checklists — templates & sessions](/operations/checklists) — reusable templates with items and sub-items, run as dated, independently-completable sessions.
- [Markdown descriptions with progressive disclosure](/operations/checklists) — a checklist item can carry detailed instructions that stay collapsed until someone taps for them, so long checklists don't read as walls of text.

**This site**
- The public documentation site you're reading now — scaffolded, deployed to GitHub Pages, and filled in section by section, PR by PR.

## In Progress

Nothing is actively in flight right now. Gatherloop POS is built in short-lived branches that ship as soon as a PRD's phases are done, rather than long-running feature branches — so "in progress" is usually measured in hours, not weeks.

## Planned

Pulled from the "Out of Scope" and "Future Work" sections of shipped PRDs — considered, intentionally deferred, and still on the table:

- **Ticket availability tracking** — know which RFID tickets are currently out on an active rental, not just what a scanned code resolves to.
- **Budget variance alerts** — a push/email nudge when a spending category crosses its target, instead of only a pull-based report.
- **Automated savings transfers** — turn the manual twice-monthly savings sweep into a scheduled wallet transfer.
- **Product sales & material spend widgets** — two more dashboard panels alongside the existing sales and expense charts.
- **Recurring checklist sessions** — auto-create the daily opening/closing session instead of starting it by hand every morning.
- **Barcode/QR jump-to-row on stock checks** — scan a shelf label to jump straight to that material's count row.
- **Supplier reverse-view** — see every material a given supplier provides from the supplier's own detail page.
- **Role-based access control** — today every account can do everything (create templates, publish products, flip wallet flags); scoped permissions are a natural next step once the team using the product grows past one till.

Have a feature request or found a gap? The project is open on [GitHub](https://github.com/gatherloop/gatherloop-pos) — issues and PRs are welcome.
