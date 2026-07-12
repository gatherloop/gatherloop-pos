# Transactions

## What it does

Transactions are the cart-to-receipt checkout flow — the screen staff use for every sale at the counter.

Staff search the catalog and add items to a cart, each as a specific **product variant** (size, flavor, or whichever options the product defines) with a quantity and an optional note or per-line discount. Coupons can be applied either to the whole cart or to a single line item. Once the cart is right, checkout opens a payment step: pick a wallet (cash or a cashless method), enter the amount paid, and the system works out the total and any change. On successful payment, staff are offered a printed **invoice** for the customer and, separately, a **station order slip** routed to the bar and/or kitchen.

Past transactions stay editable — a manager can reopen one later to attach a coupon or fix a line, without re-keying the whole sale.

## Why it matters

This is where the rest of the product earns its keep. A sale here isn't just a till entry — it draws its price and cost straight from the [Catalog](/catalog/categories), and the moment it's paid it feeds the [Finance dashboard](/finance/dashboard-statistics) automatically. Nobody re-enters a sales total into a spreadsheet at the end of the day.

Splitting the receipt into a **customer invoice** and a **station order slip** also solves a real floor problem: the person on espresso doesn't need to see line-item pricing, and the kitchen and the bar each need to know what the other one still owes the customer, not just their own half of the order.

## Screenshot

> 📸 Screenshot placeholder — real UI captures land in a later documentation pass.

## Key capabilities

- **Search-driven cart** — find a product, choose its variant (e.g. size/option), set a quantity, and add it to the cart; each line can carry its own note and discount.
- **Two coupon placements** — apply a coupon to the whole transaction total, or to a single line item, side by side in the same screen. See [Coupons](/sales/coupons) for how the math works.
- **Wallet-based payment** — choose from any wallet marked as a payment target (cash or cashless), enter the paid amount, and the system computes change.
- **Printed invoice** — an itemized receipt for the customer, generated on successful payment.
- **Station-routed order slip** — a single combined slip whose items are grouped into **Bar** and **Kitchen** sections (by the product's category), so each station sees the full order and can tell whether the other side still owes the customer something. Items that belong to neither station (like a board-game ticket) are left off the slip entirely.
- **Editable history** — reopen a past transaction to adjust items or attach a coupon after the fact, from the transaction list and detail screens.
- **Rental-aware editing** — transactions created from a [board-game rental checkout](/sales/rentals) keep their calculated ticket price protected: editing the transaction later never silently re-prices a rental line from a catalog price.

## For engineers

- Screens: `libs/ui/src/presentation/screens/TransactionCreateScreen.tsx`, `TransactionUpdateScreen.tsx`, `TransactionListScreen.tsx`, `TransactionDetailScreen.tsx`
- Checkout & payment logic: `TransactionCreateHandler.tsx`, the `useTransactionPayController` controller
- Printing: `libs/ui/src/utils/print.ts` (`buildOrderSlipPayload`, invoice/order-slip/checkin-slip payloads)
- Backend: `apps/api/domain/transaction_usecase.go`
