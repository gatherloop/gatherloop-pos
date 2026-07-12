# Wallets & Transfers

## What it does

A wallet is a real place money sits — a cash drawer, a bank account, a "Brankas" safe, a GoPay account. Its balance isn't set by hand; it's the running result of every sale paid into it, every expense paid out of it, and every transfer in or out. Each wallet carries two flags that shape how it behaves: **cashless**, which decides whether checkout asks for a paid amount and change (skipped for cashless wallets, since the payment is assumed exact) or shows them (for physical cash); and **payment target**, which decides whether a cashier can even select this wallet as a destination at checkout. A holding wallet like a safe or a savings account is marked as *not* a payment target, so a sale can never accidentally land there — only a deliberate transfer can move money into it. Wallets can also carry a payment cost percentage, for rails like card or QRIS that take a fee, which is deducted before the wallet is credited.

A **transfer** moves a set amount from one wallet to another — cash counted out of the drawer and walked to the safe, for instance. Both wallets update atomically, and the movement shows up in both wallets' histories, so nothing about it depends on a sale or an expense.

## Why it matters

Every payment a customer makes and every purchase staff record has to land somewhere specific and real, or the numbers stop meaning anything by end of day. Wallets are that "somewhere": a sale credits exactly the wallet the cashier chose, an expense debits exactly the wallet that paid for it, and a transfer is the only way money moves between wallets without either a sale or an expense being involved. The payment-target flag exists specifically to keep a cashier from crediting an internal wallet (a safe, a savings account) by mistake mid-checkout — a mistake that would inflate that wallet's balance while leaving the real till uncredited, breaking reconciliation for the whole day. Because every rupiah's movement is attributed to a specific wallet, an owner can always answer "how much cash should be in the drawer right now?" and "how much is actually in GoPay?" without guessing.

## Screenshot

> 📸 Screenshot placeholder — real UI captures land in a later documentation pass.

## Key capabilities

- **Running balance, never edited directly** — a wallet's balance is the sum of every sale, expense, and transfer that has touched it.
- **Cashless flag** — hides the paid-amount/change fields at checkout for cashless wallets (GoPay, QRIS, bank transfer), shows them for physical cash.
- **Payment-target flag** — controls whether a wallet can be chosen as a destination at checkout, keeping internal or holding wallets (a safe, a savings account) out of the sales flow entirely; see [Wallet Payment Eligibility](/finance/wallets-transfers).
- **Payment cost percentage** — a merchant-fee rate deducted before a non-cash payment credits the wallet, so the balance reflects real net proceeds.
- **Transfers between wallets** — move a specific amount from one wallet to another in one atomic step, with a full two-sided history.
- **Wired into checkout and expenses** — every transaction payment credits a chosen wallet, and every [expense](/finance/expenses) debits one, so both sides of the cash flow always point back to a real wallet.

## For engineers

- Web routes: `apps/web/src/pages/wallets/{index,create,[walletId]/index,[walletId]/transfers/index,[walletId]/transfers/create}.tsx`
- Screens: `libs/ui/src/presentation/screens/Wallet{List,Create,Update,TransferList,TransferCreate}Screen.tsx`
- Components: `libs/ui/src/presentation/components/wallets/{WalletFormView,WalletList,WalletListItem,WalletTransferFormView,WalletTransferList,WalletTransferListItem}.tsx`
- Entities: `libs/ui/src/domain/entities/{Wallet,WalletTransfer}.ts`
- Backend: `apps/api/domain/wallet_entity.go`, `wallet_usecase.go` (`CreateWalletTransfer`, checkout/expense wallet debit-credit logic also lives in `transaction_usecase.go` and `expense_usecase.go`); routes in `apps/api/presentation/restapi/wallet_route.go`; example wallets in `apps/api/seeds/wallet_seeder.go`
- Design doc: `docs/prd-wallet-payment-eligibility.md` (the `isPaymentTarget` flag)
- Related: [Expenses](/finance/expenses) for the debit side, [Dashboard & Statistics](/finance/dashboard-statistics) for how collected income is reported, [Cash Count & Reconciliation](/finance/calculations) for verifying a wallet's balance against physical cash
