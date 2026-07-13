# Tickets

## What it does

This isn't an issue tracker — despite the name, a "ticket" here is a physical numbered card. Cafes that rent out [board games](/sales/rentals) hand customers a card (often an RFID card) to identify their table's rental, and each card prints a friendly number like "Ticket 01" that staff and customers can both read. The Tickets feature is a small registry that maps the two: the raw code an RFID scanner reads off the card (`RFID-0001`) to the printed number a human actually sees (`Ticket 01`). Managing tickets means keeping that list in sync with the physical cards the shop owns — add one when a new card is printed, rename or retire one if a card is replaced.

The payoff shows up entirely inside the rental workflow. When staff scan or type a card's code during check-in, the system resolves it against this registry and confirms the match live — a green "→ Ticket 01" if it's recognized, a yellow warning if the card isn't registered — but never blocks the check-in either way. Whatever ticket name was resolved at that moment is stamped onto the rental and carried through to the transaction note at checkout (e.g. "Ticket 01 – 2 hour(s)"), so the receipt says which table's rental a line item belongs to.

## Why it matters

A scanned RFID code is meaningless to a person — nobody wants to see "RFID-0001" on a receipt or a rental list. But the printed number alone isn't enough either, because a lost or damaged card eventually gets reissued with a new physical code while the shop still wants to call it "Ticket 01" on the floor. Keeping the code and the name as two separately-managed fields is what lets a card be swapped out without staff having to relabel anything or worry about mismatched receipts.

Just as importantly, resolution never blocks operations: if a card is scanned that isn't in the registry, check-in still proceeds — the rental simply carries the raw code instead of a friendly name until someone registers it. And because the resolved name is snapshotted onto the rental the moment it's checked in, renaming or retiring a ticket later never rewrites a receipt or rental record that already used it — exactly the same frozen-snapshot guarantee used everywhere else in the product, from [stock checks](/inventory/stock-checks) to [checklist sessions](/operations/checklists).

## Screenshot

> 📸 Screenshot placeholder — real UI captures land in a later documentation pass.

## Key capabilities

- **Code ↔ name registry** — each ticket is just a scanner code and a printed name, both required and globally unique, so neither one can accidentally point to two different physical cards.
- **Live resolution at rental check-in** — as staff scan or type a code, the [rental](/sales/rentals) check-in form instantly shows the matching ticket name or flags the code as unregistered, with no lookup step required.
- **Never blocks check-in** — an unrecognized code doesn't stop a rental from being created; it just falls back to showing the raw scanned code until the ticket is registered.
- **Snapshotted onto the rental** — the resolved ticket name is captured at check-in time and carried onto the checkout transaction's note, so past receipts and rental records read correctly forever, even after a ticket is renamed or retired.
- **Simple CRUD list** — create, rename, or soft-delete tickets the same way as any other lookup table in the product (comparable to [coupons](/sales/coupons)); deleting one only stops it from resolving new check-ins, it doesn't touch history.

## For engineers

- Screens: `libs/ui/src/presentation/screens/Ticket{List,Create,Update}Screen.tsx`
- Components: `libs/ui/src/presentation/components/tickets/{TicketList,TicketListItem,TicketFormView}.tsx`
- Entity: `libs/ui/src/domain/entities/Ticket.ts`
- Backend: `apps/api/domain/ticket_{entity,usecase}.go`; routes in `apps/api/presentation/restapi/ticket_route.go`; sample data in `apps/api/seeds/ticket_seeder.go`
- Web routes: `apps/web/src/pages/tickets/{index,create,[ticketId]}.tsx`
- Rental integration: `apps/api/domain/rental_usecase.go` (code → ticket resolution at checkin, name snapshot onto checkout notes), `libs/ui/src/presentation/components/rentals/RentalCheckinFormView.tsx` (live scan feedback)
- Design doc: `docs/prd-ticket-management.md` (the RFID-code-vs-printed-number rationale in full)
- Related: [Board-game Rentals](/sales/rentals) — the only place a ticket has any real effect
