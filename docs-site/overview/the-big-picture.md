# The Big Picture

Every feature in Gatherloop POS sits on one loop. Catalog defines what's sellable and what it costs to make; Sales turns that into revenue; Finance turns revenue into a clear financial picture; Inventory keeps the catalog stocked; and Operations keeps the daily routine running underneath all of it.

```
 Catalog & Materials
 (products, variants, recipe costs)
        │
        ▼
 Sales & Checkout
 (cart, checkout, payment, coupons, rentals)
        │
        ▼
 Finance
 (dashboard, budgets, wallets, cost & profit)
        │
        ▼
 Inventory
 (stock checks → purchase lists → suppliers)
        │
        └──────────────▶ restocks Catalog & Materials

 Operations (checklists & tickets) runs alongside every stage,
 keeping the daily routine on track and issues visible.
```

## Walking the loop

1. **Catalog & Materials** — a product is only as accurate as the recipe behind it. Materials carry real costs, products and variants are built from materials, and that cost feeds directly into pricing.
2. **Sales & Checkout** — a sale consumes the catalog: it builds a cart, applies coupons or rental check-outs, takes payment, and prints a receipt. Nothing about pricing or cost is re-entered here — it flows from the catalog.
3. **Finance** — every transaction and expense lands on the dashboard automatically. Budgets track cash flow against spending categories, wallets track where money actually sits, and cost/profit calculations happen per item, not just per month.
4. **Inventory** — stock checks reveal what's running low, which turns into purchase lists, which go to suppliers. Once restocked, the loop feeds back into the catalog.
5. **Operations** — checklists (opening, closing, and other recurring routines) and tickets (one-off issues) run in parallel to the whole loop, making sure the shop itself — not just its numbers — stays on track.

The result: one system, one source of truth, and a financial picture that's always current instead of reconstructed after the fact.

Next: [Who It's For](./who-its-for).
