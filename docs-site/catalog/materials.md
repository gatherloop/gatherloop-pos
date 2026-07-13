# Materials

## What it does

A material is a raw ingredient or supply the cafe buys and uses — milk, coffee beans, cups, board-game pieces. Each material records a **cost per unit** in its own costing unit (e.g. price per gram), which is exactly the unit a [variant's recipe](/catalog/variants) uses when it says how much of that material one sale consumes.

Materials also carry the details needed to keep them stocked: a separate **purchase unit** and **purchase unit size** (buying flows in kilograms; recipes cost in grams — the material record converts between the two), minimum and normal stock levels, a computed weekly usage figure, whether the material needs to appear on stock-check forms, and a list of [suppliers](/inventory/suppliers) it can be sourced from, each with its own way of being ordered (online link, offline pickup, or phone-in delivery).

## Why it matters

A material is the single fact the rest of the catalog's money math is built on. Its cost per unit, multiplied by the amount in a variant's recipe, is the entire food-cost calculation described in [Product Variants](/catalog/variants) — there's no separate "ingredient pricing" system to keep in sync. The same record then turns around and drives the inventory side of the business: minimum/normal stock levels and weekly usage feed [Stock Checks](/inventory/stock-checks) and [Purchase Lists](/inventory/purchase-lists), and the supplier list is exactly where a purchase list sends someone to reorder. One material record, entered once, powers both "is this menu item priced correctly?" and "are we about to run out?"

## Screenshot

![Materials screenshot](/screenshots/materials.png)

## Key capabilities

- **Cost per unit** — the price of one costing unit (e.g. one gram), used directly by every variant recipe that includes this material.
- **Purchase conversion** — a separate purchase unit and purchase-unit-size (e.g. "1 Kg = 1000 g") so procurement can be planned in the units suppliers actually sell in, while recipes stay in fine-grained costing units.
- **Stock thresholds** — minimum and normal stock levels, expressed in purchase units, for reorder planning.
- **Computed weekly usage** — a read-only figure derived from actual sales: total material consumed by transactions over the trailing two weeks, averaged to a per-week number, so restocking decisions are based on real demand rather than guesswork.
- **Stock-check flag** — a material can be marked as required (or not) on stock-check forms, keeping counts focused on what actually needs regular checking.
- **Multiple suppliers per material** — each linked supplier has its own purchase type: `online` (with an order URL), `offline` (in-person, no URL needed), or `delivery` (phone-in, requires the supplier to have a phone number on file).

## For engineers

- Screens/components: `libs/ui/src/presentation/screens/Material{List,Create,Update}Screen.tsx`, `libs/ui/src/presentation/components/materials/MaterialFormView.tsx`
- Entity: `libs/ui/src/domain/entities/Material.ts`
- Backend: `apps/api/domain/material_entity.go`, `material_usecase.go`; weekly usage query in `apps/api/data/mysql/material_repo.go` (`GetMaterialsWeeklyUsage`)
- Related: `docs/prd-material-stock-check-flag.md`; [Product Variants](/catalog/variants) for the recipe side, [Suppliers](/inventory/suppliers) and [Stock Checks](/inventory/stock-checks) for the inventory side.
