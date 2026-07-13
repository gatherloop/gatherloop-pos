# Coupons

## What it does

A coupon is a small, reusable discount rule: a **code**, a **type** (`fixed` rupiah amount or `percentage`), and an **amount**. Staff create and manage coupons from a simple admin list, the same way they manage products or suppliers.

The interesting part isn't the coupon itself — it's *where* staff choose to apply it. On the [transaction](/sales/transactions) screen, every coupon can be attached in either of two places: to the **whole bill**, discounting the total, or to a **single line item**, discounting just that one item's subtotal. Nothing about the coupon changes between the two — staff simply pick the placement that fits the situation.

## Why it matters

Real discounts rarely apply evenly to everyone in a group. A table with three board-game tickets might have one student who qualifies for a discount and two friends who pay full price — that's a per-item coupon. A promotion for "Rp 15,000 off any order" is a per-bill coupon. Rather than building a separate feature for every promotion the cafe invents, one coupon model with a placement choice covers both, and any future one-off deal a manager comes up with, without an engineer being involved.

## Screenshot

![Coupons screenshot](/screenshots/coupons.png)

## Key capabilities

- **Two coupon types** — `fixed` knocks a flat rupiah amount off; `percentage` takes a percentage off, rounded to the nearest Rp 500 for clean cash handling.
- **Simple admin CRUD** — create, view, and edit coupons by code, type, and amount; no special casing per promotion.
- **Whole-bill or per-line placement** — the same coupon list is offered both at the transaction level and next to each line item; staff decide which fits.
- **At most one coupon per line** — keeps the math and the screen predictable (no stacking within a single item in this version).
- **Independent per-ticket discounts** — in a checkout with several [rental](/sales/rentals) tickets, each ticket can carry its own coupon (or none), so only the tickets that qualify are discounted.
- **Safe math** — a fixed discount is clamped so it never exceeds the amount it's being applied to; a line or a bill can be discounted to zero, never below.
- **Real examples in use** — the cafe's rental promotions run entirely on this mechanism:
  - **FREE 1 HOUR** — `fixed`, Rp 15,000 off a ticket.
  - **FREE 2 HOUR** — `fixed`, Rp 30,000 off a ticket.
  - **STUDENT DISCOUNT** — `percentage`, 40% off a single ticket.

## For engineers

- Screens: `libs/ui/src/presentation/screens/CouponListScreen.tsx`, `CouponCreateScreen.tsx`, `CouponUpdateScreen.tsx`
- Entity: `libs/ui/src/domain/entities/Coupon.ts`
- Backend application math: `apps/api/domain/transaction_usecase.go`
- Design rationale for per-item placement: `docs/prd-rental-coupons.md`
