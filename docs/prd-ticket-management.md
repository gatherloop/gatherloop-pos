# PRD: Ticket Management — Mapping RFID Codes to Physical Ticket Numbers

## Problem Statement

Every rental is checked in against a **physical ticket**: an RFID card (carries a unique
`code`) with a number printed on it (e.g. "Ticket 01"). At checkin, staff scan/type the RFID
`code`, and that raw code is stored directly in `rentals.code`.

The problem: **there is no mapping between the RFID code and the printed ticket number.** A
rental row stores something like `code = "0xA3F19C82"`, so when staff (or a report) look at a
rental, they cannot tell **which physical ticket** it was — "Ticket 01" or "Ticket 23". The
human-readable identity that staff actually use on the floor is lost.

### The feature, in one sentence

Introduce a **`tickets`** master entity that maps each RFID `code` → a human-readable ticket
`name` (the printed number), give it full CRUD, and **link rentals to it** so every rental
resolves to a recognizable ticket name instead of an opaque RFID string.

### What this is *not*

- It is **not** a change to rental **pricing** or the transaction model. The only checkout-side
  change is appending the ticket number to the transaction item's `note` text (FR-5).
- It does **not** conflate the ticket name with the **customer name**. Today `rentals.name`
  holds the *customer* name (it flows into `transaction.Name` at checkout —
  `apps/api/domain/rental_usecase.go:140`). That stays exactly as-is. The ticket name is a
  *separate* concept: the number printed on the physical card.

---

## Context: Existing System

- **Backend**: Go REST API, MySQL + GORM, Clean Architecture (`domain → data → presentation`).
  Migrations under `apps/api/migrations/` (next free number **000013**).
- **Frontend**: Next.js web (`apps/web/`) + React Native (`apps/mobile/`) sharing a Tamagui UI
  library (`libs/ui/`), structured as `domain → data → presentation`. React Query + Zod +
  React Hook Form.
- **API contract**: OpenAPI at `libs/api-contract/src/api.yaml`; codegen consumed by both
  frontends.

### The cleanest existing analog: **Coupon**

`Coupon` is a tiny `code`-bearing entity with complete CRUD — the *exact* shape this feature
needs. Every Ticket file below mirrors its Coupon counterpart 1:1.

| Layer | Coupon reference (mirror for Ticket) |
|---|---|
| DB schema | `apps/api/migrations/000001_initial_schema.up.sql:65-74` (`coupons`, `UNIQUE(code)`, soft delete) |
| Domain entity | `apps/api/domain/coupon_entity.go` |
| Domain repo iface | `apps/api/domain/coupon_repository.go` |
| Domain usecase | `apps/api/domain/coupon_usecase.go` (+ `_test.go`) |
| DB entity/repo/transformer | `apps/api/data/mysql/coupon_*.go` |
| Mock repo | `apps/api/data/mock/coupon_repository.go` (`go:generate mockgen`) |
| HTTP handler/route/transformer | `apps/api/presentation/restapi/coupon_{handler,route,transformer}.go` (+ `_test.go`) |
| Seeder | `apps/api/seeds/coupon_seeder.go` |
| OpenAPI | `Coupon` / `CouponRequest` schemas + `/coupons` paths in `libs/api-contract/src/api.yaml` |
| FE entity | `libs/ui/src/domain/entities/Coupon.ts` |
| FE repo iface | `libs/ui/src/domain/repositories/` |
| FE usecases | `libs/ui/src/domain/usecases/coupon*.ts` |
| FE data impl | `libs/ui/src/data/api/` + `libs/ui/src/data/mock/` |
| FE controllers | `libs/ui/src/presentation/controllers/Coupon*.tsx` |
| FE screens | `libs/ui/src/presentation/screens/Coupon{Create,Update,List}*.tsx` |
| FE components | `libs/ui/src/presentation/components/coupons/` |
| Web pages | `apps/web/src/pages/coupons/{index,create,[couponId]}.tsx` |
| Mobile screens | registered in `apps/mobile/src/app/App.tsx` |
| Sidebar entry | `libs/ui/src/presentation/components/base/Sidebar/Sidebar.state.tsx:30` |

### The rental side today

- **Schema** (`...000001_initial_schema.up.sql:258-270`):
  `rentals(id, code, name, variant_id, checkin_at, checkout_at, created_at, deleted_at)`.
  `code` = raw RFID string; `name` = customer name.
- **Domain entity** (`apps/api/domain/rental_entity.go`): `Rental { Id, Code, Name, VariantId,
  Variant, CheckinAt, CheckoutAt, CreatedAt, DeletedAt, PricingTiers }`.
- **Checkin** (`apps/api/domain/rental_usecase.go:57-81`): `CheckinRentals` takes a list of
  `Rental` (each with `Code`, `Name`, `VariantId`) and persists them. The RFID `code` is taken
  verbatim from the request — **nothing resolves it to a ticket**.
- **Checkin form** (`libs/ui/src/presentation/components/rentals/RentalCheckinFormView.tsx`):
  one "Customer Name" field for the batch, and a per-item **"Code"** text input
  (`rentals.${index}.code`) where staff scan/type the RFID.
- **API**: `RentalRequest { code, name, variantId, checkinAt }` and `Rental { ..., code, name,
  ... }` in `libs/api-contract/src/api.yaml`.

---

## Proposed Solution

Three pieces, layered so each ships independently:

1. **`tickets` master table + CRUD** — a `{ id, code, name }` entity (RFID → printed number),
   managed by an admin screen modeled on Coupon. `code` and `name` both unique.
2. **Link rentals to tickets** — `rentals` gains a nullable `ticket_id` FK. At checkin, the
   backend resolves the scanned `code` to a ticket and stores `ticket_id`. The raw `code` stays
   on the rental as a **snapshot** (so history survives re-coding/deletion).
3. **Surface the ticket name** — rental reads include the resolved ticket; the rental list/detail
   show "Ticket 01" instead of the opaque RFID.

### Ticket entity shape

```
Ticket {
  id        int64
  code      string   // RFID card code, UNIQUE
  name      string   // printed number / label, e.g. "Ticket 01", UNIQUE
  createdAt time.Time
  deletedAt *time.Time   // soft delete, like coupons
}
```

### How rentals link to tickets

`rentals` gains two nullable columns — **`ticket_id BIGINT NULL`** (FK → `tickets.id`, the durable
link) and **`ticket_name VARCHAR(255) NULL`** (a **snapshot** of the printed number, frozen at
checkin). The existing `rentals.code` already holds the scanned RFID. At checkin:

```
scanned code ──▶ lookup tickets WHERE code = ? AND deleted_at IS NULL
                   │
       found ──────┼──▶ rental.ticket_id   = ticket.id
                   │    rental.ticket_name = ticket.name   (snapshot, frozen here)
                   │    rental.code         = scanned code   (existing column)
                   │
   not found ──────┴──▶ rental.ticket_id = NULL ; rental.ticket_name = NULL
                        rental.code = scanned code   (checkin NOT blocked, v1 — D3)
```

Both new columns are **nullable** so every pre-existing rental stays valid (`NULL`/`NULL`) and an
unregistered card never blocks the floor.

**Why snapshot the name, not just resolve it live (your comment #1):** the same convention the
codebase already uses for `transaction_coupons` (snapshots coupon `type`/`amount`) and
`rentals.pricing_tiers` (JSON snapshot). The rental list must show "Ticket 01" forever — renaming
the master ticket to "Ticket A" later must **not** rewrite history. Storing `ticket_name` on the
rental row freezes the historical label **and** lets the rental list render **join-free**. The
`ticket_id` FK is kept alongside (it's free — checkin already looked the ticket up by code) for the
durable link: "rentals per physical ticket" analytics and rental→ticket navigation that survive
renames/re-codes.

### Surfacing the name

`GET /rentals` and `GET /rentals/{id}` expose flat `ticketId` (nullable) and `ticketName`
(nullable snapshot) fields — no join required. The rental list/detail render `ticketName` when
present, falling back to the raw `code` when null (legacy rows / unmapped cards).

---

## Confirmed / Proposed Product Decisions

| # | Decision | Choice (recommendation) | Rationale |
|---|---|---|---|
| D1 | Ticket fields | `{ code (RFID, unique), name (printed number, unique) }`, soft-deleted. | Mirrors `Coupon`; both fields uniquely identify the physical card, so both are unique. |
| D2 | How rentals link | New **nullable `rentals.ticket_id` FK** (durable link) **+ nullable `rentals.ticket_name` snapshot** (display label frozen at checkin); existing `rentals.code` keeps the scanned RFID. | Nullable = zero migration risk for existing rentals and unregistered cards. **Snapshotting the name** (not resolving it live) keeps history stable across rename/re-code/delete and lets the rental list render join-free — same convention as `transaction_coupons` and `rentals.pricing_tiers`. The FK is kept for analytics + navigation. (Your comment #1.) |
| D3 | Unregistered RFID at checkin | **Do not block checkin** in v1: store the raw `code`, leave `ticket_id`/`ticket_name` NULL, surface "unmapped" in the UI. | The floor must never be blocked by a card that isn't registered yet. Staff register it later; a follow-up can warn at scan time (Phase 5). *(Alternative considered: reject checkin, or auto-create a ticket — both rejected for v1; see Open Questions.)* |
| D4 | Re-coding a lost/replaced card | Edit the ticket's `code`; `ticket_id` is stable, so the printed number stays consistent. Past rentals keep their snapshot `ticket_name`/`code` unchanged. | A new RFID card for "Ticket 01" shouldn't fork its identity or rewrite history. |
| D5 | Deleting a ticket | **Soft delete.** Existing rentals keep their `ticket_id` + `ticket_name` snapshot, so history still reads "Ticket 01" with no dependence on the live row; a deleted ticket's `code` no longer resolves for *new* checkins. | Consistent with `deleted_at` everywhere; the snapshot makes history fully self-contained. |
| D6 | Ticket name vs customer name | **Separate.** `rentals.name` stays the customer name; `rentals.ticket_name` is the physical number. No conflation. | They are different concepts; conflating them would break checkout (`transaction.Name`). |
| D7 | Backward compatibility | `tickets` is new; `rentals.ticket_id`/`ticket_name` are nullable; all OpenAPI changes are additive. No existing row, endpoint, or consumer changes. | Safe, incremental rollout. |
| D8 | Code/name normalization | Free text, trimmed; uniqueness enforced by DB (`UNIQUE`). No casing/slug rule in v1. | Matches `coupons.code` (free text + unique). |
| D9 | Ticket number in checkout note | **Yes — prepend the ticket name to the transaction item's note**, e.g. `"Ticket 01 - 2 hour(s)"`; fall back to just `"2 hour(s)"` when no ticket is mapped. | The note already carries the duration (`rental_usecase.go:118-137`); the ticket number is the other thing staff want on the receipt/transaction line. Free to add — `CheckoutRentals` already has `rental.ticket_name` (the D2 snapshot) in hand. (Your comment #2.) |

---

## Feature Requirements

### FR-1: Ticket CRUD (backend)
`tickets` table + domain/data/presentation layers exposing:
`GET /tickets`, `GET /tickets/{ticketId}`, `POST /tickets`, `PUT /tickets/{ticketId}`,
`DELETE /tickets/{ticketId}` — all behind `CheckAuth`, mirroring the wallet/coupon routers.
Create/Update validate non-empty `code` & `name` and surface a clean error on the
`UNIQUE(code)` / `UNIQUE(name)` conflict.

### FR-2: Ticket admin UI
A "Tickets" admin section (list + create + edit + delete) mirroring the Coupon screens, reachable
from the sidebar (under **Sales** or a small **Master Data** group — see Open Questions),
available on both web and mobile.

### FR-3: Rental → ticket link
`rentals` gains nullable `ticket_id` (FK) and `ticket_name` (snapshot). `CheckinRentals` resolves
each scanned `code` to a ticket and, on a match, sets `ticket_id = match.Id` **and**
`ticket_name = match.Name` (frozen snapshot — D2); on no match both stay `NULL` (D3). The existing
`code` column keeps the scanned RFID.

### FR-4: Surface ticket name on rentals
`Rental` reads expose flat `ticketId` (nullable) and `ticketName` (nullable snapshot) fields — no
join. The rental list and detail display `ticketName`, falling back to `code` when null. Renaming
or deleting the master ticket later does **not** change what an existing rental shows (D4/D5).

### FR-5: Ticket number in checkout note
`CheckoutRentals` prepends the rental's `ticket_name` to the transaction item's note:
`"<ticket_name> - <durationNote>"`, e.g. `"Ticket 01 - 2 hour(s)"`. When `ticket_name` is null
(legacy / unmapped), the note is just the duration (`"2 hour(s)"`) — i.e. **unchanged from today**.
Touches only the note-building block at `apps/api/domain/rental_usecase.go:118-137`; pricing and
every other field are untouched. (Your comment #2.)

### FR-6: Checkin UX (optional, Phase 6)
Inline resolution on the checkin form: as staff scan/type a code, show the matched "→ Ticket 01"
(or an "unregistered card" hint), optionally via a ticket picker. No behavior change to checkin
submission — purely assistive.

### FR-7: Mobile parity
Every screen above exists on React Native too, reusing shared `libs/ui` primitives, mirroring how
Coupon/Wallet do it.

---

## Data Model Changes

### New: `tickets` (migration `000013_create_tickets`)
```sql
CREATE TABLE IF NOT EXISTS `tickets` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT,
    `code`       VARCHAR(255) NOT NULL,
    `name`       VARCHAR(255) NOT NULL,
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` DATETIME     NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_tickets_code` (`code`),
    UNIQUE KEY `uq_tickets_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Altered: `rentals` (migration `000014_add_rental_ticket`)
```sql
ALTER TABLE `rentals`
  ADD COLUMN `ticket_id`   BIGINT       NULL,
  ADD COLUMN `ticket_name` VARCHAR(255) NULL,   -- snapshot of the printed number at checkin
  ADD KEY `idx_rentals_ticket_id` (`ticket_id`),
  ADD CONSTRAINT `fk_rentals_ticket`
      FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`);
```
`ticket_id`/`ticket_name` `NULL` ⇒ legacy rental or unmapped card (display falls back to `code`).
`ticket_name` is a frozen snapshot, so renaming/deleting the master ticket never rewrites a
rental's history (D2/D4/D5). Each migration has a matching `.down.sql`.

---

## API Changes (all additive)

| Method | Path | Change |
|---|---|---|
| `GET/POST/PUT/DELETE` | `/tickets`, `/tickets/{ticketId}` | New `Ticket` / `TicketRequest` schemas + paths. |
| `GET` | `/rentals`, `/rentals/{rentalId}` | `Rental` gains optional `ticketId` + `ticketName` (snapshot). |
| `POST` | `/rentals/checkin` | Unchanged request shape (`RentalRequest.code` reused); server resolves `ticket_id` + snapshots `ticket_name`. |
| `POST` | `/rentals/checkout` | Unchanged shape; the resulting transaction item's `note` now includes the ticket number (FR-5). |

OpenAPI edits in `libs/api-contract/src/api.yaml`; codegen regenerates TS clients. No breaking
changes.

---

## Implementation Phases

Each phase is a **small, self-contained, independently-mergeable PR** with its own tests. Phases
1–3 deliver the standalone Ticket entity + admin UI; phases 4–5 wire it into rentals. **Earlier
phases ship value without later ones**, and nothing in 1–3 touches the rental flow, so they carry
near-zero regression risk.

### Phase 1 — Ticket backend domain + data layer *(backend-only, no HTTP)*
**Goal:** the `tickets` table and a fully unit-tested CRUD repository/usecase — nothing exposed yet.
- `apps/api/migrations/000013_create_tickets.{up,down}.sql`
- `apps/api/domain/ticket_entity.go`, `ticket_repository.go`, `ticket_usecase.go` (+ `_test.go`)
- `apps/api/data/mysql/ticket_{entity,repo,transformer}.go`
- `apps/api/data/mock/ticket_repository.go` (`go:generate mockgen`)
- `apps/api/seeds/ticket_seeder.go` (+ register in `seeds/seeder.go`)

**Acceptance:** migration up/down clean; usecase unit tests cover create/list/get/update/delete
incl. duplicate-code/name error. **Reviewable in isolation** — pure backend logic, no wiring.
**Why first:** establishes the data contract everything else builds on.

### Phase 2 — Ticket REST API + OpenAPI + codegen
**Goal:** expose the CRUD endpoints.
- `apps/api/presentation/restapi/ticket_{handler,route,transformer}.go` (+ `handler_test.go`)
- Register `TicketRouter` where routers are wired (mirror `NewWalletRouter` registration).
- `libs/api-contract/src/api.yaml`: `Ticket`, `TicketRequest`, `/tickets` paths → regenerate clients.

**Acceptance:** handler tests green; `/tickets` CRUD works end-to-end via the API; generated client
compiles. **Reviewable in isolation** — additive endpoints, no consumer yet.

### Phase 3 — Ticket admin frontend (mirror Coupon CRUD)
**Goal:** staff can manage tickets on web + mobile. *(Split into 3a/3b if the diff is large.)*
- **3a (domain/data):** `libs/ui/src/domain/entities/Ticket.ts`; repo interface; `ticketList`,
  `ticketCreate`, `ticketDetail`/`ticketUpdate`, `ticketDelete` usecases (+ tests);
  `libs/ui/src/data/api/ticket*.ts` + mock.
- **3b (presentation):** `Ticket{List,Create,Update}` controllers + screens (+ handlers/stories);
  `components/tickets/` (list item, form view, delete alert); web pages
  `apps/web/src/pages/tickets/{index,create,[ticketId]}.tsx`; mobile screens in `App.tsx`;
  add `{ title: 'Tickets', path: '/tickets' }` to `Sidebar.state.tsx`.

**Acceptance:** full CRUD from the UI against Phase 2; stories render; usecase tests green.
**Why standalone:** depends only on Phase 2; rentals untouched. Delivers a usable ticket registry
on its own.

### Phase 4 — Link rentals to tickets (snapshot + display)
**Goal:** every rental resolves to a stable ticket name.
- `apps/api/migrations/000014_add_rental_ticket.{up,down}.sql` (adds `ticket_id` + `ticket_name`).
- `Rental` domain entity gains `TicketId *int64` + `TicketName *string`; `CheckinRentals` resolves
  `code → ticket` and snapshots `ticket_id` + `ticket_name` (D3 fallback to null/null). No join
  needed on read — the snapshot is on the row.
- `libs/api-contract/src/api.yaml`: `Rental` gains optional `ticketId` + `ticketName`; regenerate.
- `libs/ui` `Rental` entity + `RentalListItem` show `ticketName` (fallback to `code`).

**Acceptance:** checking in a registered card stores `ticket_id` + `ticket_name`; an unknown card
stores null/null and doesn't block; rental list shows "Ticket 01"; **renaming the master ticket
afterward leaves existing rentals showing the old name** (snapshot test); legacy rentals still
render via `code`. Regression test: checkin/checkout pricing unchanged.

### Phase 5 — Ticket number in checkout note *(your comment #2)*
**Goal:** the transaction line records which ticket it was.
- In `CheckoutRentals` (`apps/api/domain/rental_usecase.go:118-137`), prepend the rental's
  `ticket_name` to `durationNote`: `"Ticket 01 - 2 hour(s)"`; emit the duration alone when
  `ticket_name` is null.

**Acceptance:** unit test asserts a checked-out item with a mapped ticket has note
`"Ticket 01 - 2 hour(s)"`, and an unmapped one keeps `"2 hour(s)"`. Tiny, isolated diff — one
function, no schema/API change (depends on Phase 4's snapshot).

### Phase 6 *(optional)* — Checkin scan-resolution UX
**Goal:** assistive inline feedback while scanning.
- On `RentalCheckinFormView`, resolve the typed/scanned code to a ticket name live (query
  `/tickets` or a lookup endpoint); show "→ Ticket 01" or an "unregistered card" hint; optional
  ticket picker. No change to submission semantics.

**Acceptance:** staff see the resolved ticket as they scan; unmapped codes are clearly flagged.
**Why last:** pure UX polish on top of Phase 4; safely deferrable.

---

## Out of Scope

- Changes to rental **pricing** or the **transaction** model. (The only checkout change is
  appending the ticket number to the item's `note` string — FR-5; pricing/fields are untouched.)
- Blocking checkin on unregistered cards / auto-creating tickets at checkin (D3 — possible
  follow-up).
- Ticket **availability/状态** tracking (which tickets are currently out on rental) — a natural
  future feature once the link exists, but not part of this PRD.
- Bulk import of tickets / RFID hardware integration.
- Code/name normalization or formatting rules beyond DB uniqueness (D8).

---

## Open Questions

1. **Sidebar placement.** Tickets is master data used during Sales. Put it under **Sales** (next to
   Rentals/Coupons) or start a small **Master Data** group? *Recommendation: under Sales, beside
   Rentals.*
2. **Unregistered card at checkin (D3).** Confirmed approach is non-blocking + null `ticket_id`.
   Is that acceptable for v1, or should checkin warn/soft-block? *Recommendation: non-blocking in
   v1, add a Phase 5 warning.*
3. **Backfilling existing rentals.** Existing `rentals.code` values may match codes we register
   later. Do we want a one-off backfill (`UPDATE rentals SET ticket_id = ... WHERE code = ...`)
   after the ticket registry is populated, or leave history resolving via `code`? *Recommendation:
   optional backfill migration once tickets are seeded; not required for correctness.*
