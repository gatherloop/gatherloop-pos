# Products

## What it does

A product is a menu item as a customer would recognize it — "Iced Latte," "Butter Croissant," "Catan" — with a name, a description, a photo, and a [category](/catalog/categories) it belongs to. What a product does *not* carry is a single price or a single cost. Instead, a product declares its own **options** (like "Size" or "Temperature"), each with a set of possible **values** ("Small"/"Large", "Hot"/"Iced") — and every actual sellable combination of those values is a separate [Product Variant](/catalog/variants), each with its own price and its own recipe.

A product also has two flags that shape how it behaves downstream:

- **Sale type** — `purchase` for a normal priced item, or `rental` for a board-game rental, which switches its variants over to hourly/all-day [pricing tiers](/sales/rentals) instead of a flat price.
- **Status** — `draft` or `published`. A draft product is fully editable in the catalog (build out its variants, recipes, and pricing) but is hidden from the checkout screen until a manager flips it to published — so a new menu item can be set up completely, at leisure, before it's ever offered for sale.

## Why it matters

Splitting "the thing on the menu" from "the thing that's priced and costed" is what lets one product represent a whole family of choices without duplicating its name, description, and photo four times over. "Iced Latte" is one product with a "Size" option; Small, Medium, and Large are three variants underneath it, each free to have its own price and its own recipe (a large drink uses more milk).

The draft/published split also protects the sales floor from half-finished setup: a manager building out next month's seasonal drink doesn't have to race to enter every variant, price, and recipe in one sitting — the draft stays invisible at checkout until it's genuinely ready.

## Screenshot

> 📸 Screenshot placeholder — real UI captures land in a later documentation pass.

## Key capabilities

- **Name, description, photo, category** — the customer-facing identity of the item; description supports Markdown for richer formatting.
- **Options & values define variation** — a product declares options like "Size," each with values like "Small"/"Large"; variants pick one value per option to become a concrete, sellable item.
- **Sale type: purchase vs. rental** — a structural flag that determines whether the product's variants are priced with a flat price or with duration-based [pricing tiers](/sales/rentals).
- **Draft vs. published status** — draft products are fully editable but excluded from the checkout item picker; publishing is the one action that makes an item sellable.
- **Variants managed inline** — the product edit screen embeds its full list of variants, so staff move between product-level details and variant-level pricing/recipes in one place.

## For engineers

- Screens: `libs/ui/src/presentation/screens/ProductListScreen.tsx`, `ProductCreateScreen.tsx`, `ProductUpdateScreen.tsx`, `libs/ui/src/presentation/components/products/ProductFormView.tsx`
- Entity: `libs/ui/src/domain/entities/Product.ts`
- Backend: `apps/api/domain/product_entity.go`, `product_usecase.go`
- Draft status design: `docs/prd-product-draft-status.md`
