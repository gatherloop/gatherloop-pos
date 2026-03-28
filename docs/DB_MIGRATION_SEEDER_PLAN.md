# DB Migration & Seeder Plan

## Overview

Currently, the `gatherloop-pos` API uses GORM with MySQL but has **no migration or seeder system**. The database schema is implicitly defined by GORM entity structs in `apps/api/data/mysql/*_entity.go`, and there is no way for a new engineer to set up the database from scratch. This plan introduces a versioned migration system and seeders so that any developer can spin up a fully working API with initial data in minutes.

## Current State

| Aspect | Status |
|---|---|
| ORM | GORM v1.25 |
| Database | MySQL |
| Schema definition | Implicit via Go structs (no DDL files) |
| Migrations | None |
| Seeders | None |
| Dev setup | Manual DB creation + unknown schema setup |

### Existing Entities (from `apps/api/data/mysql/`)

| Entity | Key Fields | Relationships |
|---|---|---|
| `User` | id, username, password | — |
| `Category` | id, name | — |
| `Product` | id, category_id, name, description, image_url, sale_type | belongs to Category, has many Options |
| `Option` | id, product_id, name | belongs to Product, has many OptionValues |
| `OptionValue` | id, option_id, name | belongs to Option |
| `Variant` | id, product_id, name, price, description | belongs to Product, has many VariantMaterials & VariantValues |
| `VariantMaterial` | id, variant_id, material_id, amount | belongs to Variant & Material |
| `VariantValue` | id, variant_id, option_value_id | belongs to Variant & OptionValue |
| `Material` | id, name, price, unit, description | — |
| `Supplier` | id, name, phone, address, maps_link | — |
| `Wallet` | id, name, balance, payment_cost_percentage, is_cashless | — |
| `WalletTransfer` | id, from_wallet_id, to_wallet_id, amount | belongs to 2x Wallet |
| `Budget` | id, name, percentage, balance | — |
| `Coupon` | id, code, type, amount | — |
| `Transaction` | id, name, order_number, wallet_id, total, total_income, paid_amount, paid_at | belongs to Wallet, has many TransactionItems & TransactionCoupons |
| `TransactionItem` | id, transaction_id, variant_id, amount, price, discount_amount, subtotal, rental_id, note | belongs to Transaction & Variant |
| `TransactionCoupon` | id, transaction_id, coupon_id, type, amount | belongs to Transaction & Coupon |
| `Expense` | id, wallet_id, budget_id, total | belongs to Wallet & Budget, has many ExpenseItems |
| `ExpenseItem` | id, expense_id, name, unit, price, amount, subtotal | belongs to Expense |
| `Calculation` | id, wallet_id, total_wallet, total_calculation, completed_at | belongs to Wallet, has many CalculationItems |
| `CalculationItem` | id, calculation_id, price, amount, subtotal | belongs to Calculation |
| `Rental` | id, code, name, variant_id, checkin_at, checkout_at | belongs to Variant |

---

## Tool Selection: `golang-migrate`

**Chosen tool:** [`golang-migrate/migrate`](https://github.com/golang-migrate/migrate)

**Why not GORM AutoMigrate?**
- `AutoMigrate` is not suitable for production — it only adds columns/tables, never removes or renames them
- No version tracking, no rollback capability
- Impossible to review or audit schema changes

**Why `golang-migrate`?**
- Industry standard for Go projects
- Plain SQL migration files (`.up.sql` / `.down.sql`) — no Go code coupling
- Version-tracked with sequential numbering
- CLI tool for running migrations independently of the app
- Supports MySQL natively
- Can be embedded into the Go binary for programmatic execution

**Seeder approach:** Custom Go CLI command (no external tool needed). Seeders will be plain Go code using GORM, organized per entity, idempotent by design.

---

## Database Schema Dependency Order

Based on foreign key relationships, tables must be created in this order:

```
1. users              (no dependencies)
2. categories          (no dependencies)
3. materials           (no dependencies)
4. suppliers           (no dependencies)
5. wallets             (no dependencies)
6. budgets             (no dependencies)
7. coupons             (no dependencies)
8. products            (depends on: categories)
9. options             (depends on: products)
10. option_values      (depends on: options)
11. variants           (depends on: products)
12. variant_materials  (depends on: variants, materials)
13. variant_values     (depends on: variants, option_values)
14. wallet_transfers   (depends on: wallets)
15. transactions       (depends on: wallets)
16. transaction_items  (depends on: transactions, variants)
17. transaction_coupons(depends on: transactions, coupons)
18. expenses           (depends on: wallets, budgets)
19. expense_items      (depends on: expenses)
20. calculations       (depends on: wallets)
21. calculation_items  (depends on: calculations)
22. rentals            (depends on: variants)
```

---

## Implementation Phases

### Phase 1: Migration Infrastructure

**Goal:** Set up the migration framework and generate the initial schema migration.

**Tasks:**

1. **Add `golang-migrate` dependency**
   ```bash
   cd apps/api
   go get -u github.com/golang-migrate/migrate/v4
   go get -u github.com/golang-migrate/migrate/v4/database/mysql
   go get -u github.com/golang-migrate/migrate/v4/source/file
   ```

2. **Create migration directory structure**
   ```
   apps/api/
   ├── migrations/
   │   └── 000001_initial_schema.up.sql
   │   └── 000001_initial_schema.down.sql
   ```

3. **Write `000001_initial_schema.up.sql`** — Full DDL for all tables in dependency order (see schema order above). Each table should include:
   - Primary keys, foreign keys with proper `ON DELETE` behavior
   - Indexes on foreign key columns and frequently queried fields
   - `created_at`, `deleted_at` timestamps where applicable
   - Column types matching GORM entity structs exactly

4. **Write `000001_initial_schema.down.sql`** — `DROP TABLE IF EXISTS` in reverse dependency order

5. **Add migration runner to `main.go`**
   - Run migrations automatically on startup (before GORM connects with business logic)
   - Add `--migrate-only` flag to run migrations and exit (useful for CI/CD)
   - Log migration version after completion

6. **Add a `Makefile` target or `project.json` script**
   ```makefile
   migrate-up:
       migrate -path apps/api/migrations -database "mysql://..." up
   migrate-down:
       migrate -path apps/api/migrations -database "mysql://..." down 1
   migrate-create:
       migrate create -ext sql -dir apps/api/migrations -seq $(name)
   ```

**Deliverables:**
- [ ] `golang-migrate` added to `go.mod`
- [ ] `migrations/000001_initial_schema.up.sql` with all 22 tables
- [ ] `migrations/000001_initial_schema.down.sql` with all drops
- [ ] Migration runner integrated into app startup
- [ ] Makefile or script targets for migration commands

---

### Phase 2: Seeder Framework & Core Seeders

**Goal:** Build the seeder infrastructure and seed the foundational/independent tables.

**Tasks:**

1. **Create seeder directory structure**
   ```
   apps/api/
   ├── seeds/
   │   ├── seeder.go          # Seeder runner & registry
   │   ├── user_seeder.go
   │   ├── category_seeder.go
   │   ├── material_seeder.go
   │   ├── supplier_seeder.go
   │   ├── wallet_seeder.go
   │   ├── budget_seeder.go
   │   └── coupon_seeder.go
   ```

2. **Implement seeder runner (`seeder.go`)**
   ```go
   type Seeder interface {
       Name() string
       Seed(db *gorm.DB) error
   }

   func RunAll(db *gorm.DB, seeders []Seeder) error
   ```
   - Run seeders in registration order (respects FK dependencies)
   - Wrap each seeder in a transaction
   - Log progress per seeder
   - Make seeders idempotent (check before insert, or use `INSERT IGNORE` / `ON DUPLICATE KEY`)

3. **Implement core seeders with sample data:**

   | Seeder | Sample Data |
   |---|---|
   | `UserSeeder` | 1 admin user (hashed password) |
   | `CategorySeeder` | 3-5 categories (e.g., "Beverages", "Food", "Snacks") |
   | `MaterialSeeder` | 5-8 materials (e.g., "Coffee Beans", "Milk", "Sugar", "Cup") |
   | `SupplierSeeder` | 2-3 suppliers |
   | `WalletSeeder` | 2 wallets (1 cash, 1 cashless) |
   | `BudgetSeeder` | 2-3 budgets (e.g., "Operational", "Marketing") |
   | `CouponSeeder` | 2 coupons (1 percentage, 1 fixed amount) |

4. **Add CLI entry point for seeding**
   - Add `--seed` flag to `main.go`, or create a separate `cmd/seed/main.go`
   - When invoked: connect to DB → run migrations → run seeders → exit

**Deliverables:**
- [ ] Seeder framework (`seeds/seeder.go`)
- [ ] 7 core seeders for independent tables
- [ ] CLI command to run seeders
- [ ] All seeders are idempotent

---

### Phase 3: Relational Seeders

**Goal:** Seed tables with foreign key dependencies, providing a realistic dataset.

**Tasks:**

1. **Implement dependent seeders:**
   ```
   apps/api/seeds/
   ├── product_seeder.go        # Products + Options + OptionValues
   ├── variant_seeder.go        # Variants + VariantMaterials + VariantValues
   ├── transaction_seeder.go    # Transactions + TransactionItems + TransactionCoupons
   ├── expense_seeder.go        # Expenses + ExpenseItems
   └── rental_seeder.go         # Rentals
   ```

2. **Sample relational data:**

   | Seeder | Sample Data |
   |---|---|
   | `ProductSeeder` | 5-8 products across categories, each with 1-2 options and option values |
   | `VariantSeeder` | 2-3 variants per product, linked to materials with amounts, linked to option values |
   | `TransactionSeeder` | 3-5 sample transactions (mix of paid/unpaid), with items and coupons |
   | `ExpenseSeeder` | 2-3 expenses linked to wallets and budgets, with expense items |
   | `RentalSeeder` | 1-2 rentals (1 active, 1 checked out) |

3. **Update seeder runner** to include new seeders in correct dependency order

4. **Verify referential integrity** — all FK references must point to seeded parent records

**Deliverables:**
- [ ] 5 relational seeders
- [ ] Realistic sample dataset covering all tables
- [ ] All foreign keys satisfied
- [ ] Full `--seed` run creates a usable demo database

---

### Phase 4: Developer Experience & Documentation

**Goal:** Make it trivial for a new engineer to go from `git clone` to running API.

**Tasks:**

1. **Add `docker-compose.yml`** (if not already present) for local MySQL:
   ```yaml
   services:
     mysql:
       image: mysql:8.0
       environment:
         MYSQL_ROOT_PASSWORD: root
         MYSQL_DATABASE: gatherloop_pos
       ports:
         - "3306:3306"
       volumes:
         - mysql_data:/var/lib/mysql
   ```

2. **Create `.env.example` update** — ensure it has sensible defaults for local dev:
   ```
   DB_USERNAME=root
   DB_PASSWORD=root
   DB_NAME=gatherloop_pos
   DB_HOST=localhost
   DB_PORT=3306
   PORT=8080
   JWT_SECRET=dev-secret-change-in-production
   ```

3. **Add a `Makefile`** at `apps/api/Makefile` with developer commands:
   ```makefile
   setup:         ## Full local setup: start DB, migrate, seed
   dev:           ## Run API in development mode
   migrate-up:    ## Run all pending migrations
   migrate-down:  ## Rollback last migration
   migrate-create:## Create a new migration (usage: make migrate-create name=add_foo_table)
   seed:          ## Run all seeders
   reset:         ## Drop DB, recreate, migrate, seed
   ```

4. **Update `README.md`** (or create `apps/api/README.md`) with:
   - Prerequisites (Go 1.23+, Docker)
   - Quick start guide (3-5 commands from clone to running)
   - How to create new migrations
   - How to create new seeders
   - Common troubleshooting

5. **Add migration/seed step to `Dockerfile`** — run migrations on container startup

**Deliverables:**
- [ ] `docker-compose.yml` for local MySQL
- [ ] Updated `.env.example` with defaults
- [ ] `Makefile` with developer commands
- [ ] Developer documentation
- [ ] Updated Dockerfile

---

### Phase 5: CI/CD Integration & Testing

**Goal:** Ensure migrations and seeders are validated in CI and safe for production.

**Tasks:**

1. **Add migration test in CI pipeline**
   - Spin up a MySQL container in CI
   - Run `migrate up` → verify success
   - Run `migrate down` → verify full rollback
   - Run `migrate up` again → verify idempotent re-application

2. **Add seeder validation test**
   - After migration, run seeders
   - Query each table to verify expected row counts
   - Verify no orphaned foreign keys

3. **Add migration linting rules:**
   - Every `.up.sql` must have a corresponding `.down.sql`
   - Migrations must be sequential (no gaps)
   - No `DROP` statements in up migrations (except `DROP INDEX`)

4. **Production deployment strategy:**
   - Migrations run automatically on deploy (before new binary starts serving)
   - Seeders are **never** run in production automatically
   - Add `APP_ENV` guard: seeders only run when `APP_ENV=development`

**Deliverables:**
- [ ] CI job for migration up/down testing
- [ ] Seeder validation tests
- [ ] Production migration strategy documented
- [ ] Environment-guarded seeder execution

---

## Summary Timeline

| Phase | Description | Dependencies |
|---|---|---|
| **Phase 1** | Migration infrastructure + initial schema | None |
| **Phase 2** | Seeder framework + core (independent) seeders | Phase 1 |
| **Phase 3** | Relational seeders (dependent tables) | Phase 2 |
| **Phase 4** | Developer experience (Docker, Makefile, docs) | Phase 1 |
| **Phase 5** | CI/CD integration & testing | Phase 1-3 |

> **Note:** Phases 2-3 and Phase 4 can be worked on in parallel since Phase 4 only depends on Phase 1.

## File Structure (Final)

```
apps/api/
├── main.go                          # Updated with migration + seed flags
├── Makefile                         # Developer commands
├── Dockerfile                       # Updated with migration step
├── .env.example                     # Updated with sensible defaults
├── docker-compose.yml               # Local MySQL
├── migrations/
│   ├── 000001_initial_schema.up.sql
│   └── 000001_initial_schema.down.sql
├── seeds/
│   ├── seeder.go                    # Framework: interface, runner, registry
│   ├── user_seeder.go
│   ├── category_seeder.go
│   ├── material_seeder.go
│   ├── supplier_seeder.go
│   ├── wallet_seeder.go
│   ├── budget_seeder.go
│   ├── coupon_seeder.go
│   ├── product_seeder.go
│   ├── variant_seeder.go
│   ├── transaction_seeder.go
│   ├── expense_seeder.go
│   └── rental_seeder.go
├── cmd/
│   └── seed/
│       └── main.go                  # Standalone seed CLI (optional)
├── data/
├── domain/
├── presentation/
├── pkg/
└── utils/
```
