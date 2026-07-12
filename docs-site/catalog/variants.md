# Product Variants

## What it does

A variant is the thing that's actually sold: one concrete combination of a [product's](/catalog/products) option values — "Iced Latte, Large" — with its own price and, critically, its own **recipe**: a list of [materials](/catalog/materials) and the quantity of each one consumed whenever this variant is sold. Staff build the recipe right there on the variant form, picking a material and entering an amount for each ingredient, and the screen shows the resulting **food cost** and **food cost percentage** update live as the recipe is edited.

For rental products, a variant looks a little different: instead of one flat price, it carries a table of **pricing tiers** (price by duration) — the mechanism behind [board-game rental](/sales/rentals) pricing.

## Why it matters

This is the recipe-to-price link that makes the catalog's numbers trustworthy instead of guessed. Every material has a known cost; a variant's recipe says exactly how much of each material one sale consumes; multiply and sum, and the system tells staff the true cost of making that Large Iced Latte *before* it's ever sold, sitting right next to the price they're about to set. A manager can see immediately whether "Large" is priced with a healthy margin or is quietly losing money on milk, without exporting anything to a spreadsheet — and that same recipe is what [material usage](/catalog/materials) and restocking are calculated from later.

## Screenshot

> 📸 Screenshot placeholder — real UI captures land in a later documentation pass.

## Key capabilities

- **One variant per option combination** — belongs to a single product and picks exactly one value for each of that product's options.
- **Recipe = materials + amounts** — each recipe line references a material and an amount, in that material's own costing unit (e.g. grams), so no unit conversion is needed at recipe time.
- **Live food cost math** — Total Food Cost is the sum of `material price × amount` across every recipe line; Food Cost % is that total divided by the variant's price. Both recalculate as the recipe is edited, before saving.
- **Flat price for purchase items** — a `purchase`-type variant must have a price greater than zero and cannot carry pricing tiers.
- **Pricing tiers for rentals** — a `rental`-type variant instead defines one or more tiers (duration → price) with strictly increasing durations; its own flat price is always zero. See [Board-game Rentals](/sales/rentals) for how a single tier becomes a flat "All Day" rate and multiple tiers become hourly step pricing.
- **Nested management** — variants are created, edited, and deleted from inside their parent product's screen rather than a standalone catalog section.

## For engineers

- Screens/components: `libs/ui/src/presentation/components/variants/VariantFormView.tsx` (recipe UI, live cost math, pricing tier editor)
- Entity: `libs/ui/src/domain/entities/Variant.ts`
- Backend: `apps/api/domain/variant_entity.go`, `variant_usecase.go` (`validateVariantForSaleType`)
- Related: [Materials](/catalog/materials) for where recipe costs come from. This per-item Food Cost % *is* the product's cost/profit picture — it's calculated fresh here, live, rather than in a separate report.
