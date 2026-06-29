# Gatherloop POS

> A full-stack, cross-platform **Point of Sale** system for a real coffee shop & board‑game café — built as a production application and engineered as a showcase of **Clean Architecture**, **end‑to‑end type safety**, and **web/mobile code sharing** from a single codebase.

![screenshot of gatherloop POS](https://i.ibb.co.com/5KQJmMz/Screenshot-2024-11-28-at-14-39-36.png)

<p align="left">
  <img alt="Go" src="https://img.shields.io/badge/Go-1.24-00ADD8?logo=go&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white">
  <img alt="React Native" src="https://img.shields.io/badge/React%20Native-0.74-61DAFB?logo=react&logoColor=black">
  <img alt="Tamagui" src="https://img.shields.io/badge/Tamagui-UI-8A2BE2">
  <img alt="MySQL" src="https://img.shields.io/badge/MySQL-DB-4479A1?logo=mysql&logoColor=white">
  <img alt="Nx" src="https://img.shields.io/badge/Nx-Monorepo-143055?logo=nx&logoColor=white">
  <img alt="OpenAPI" src="https://img.shields.io/badge/OpenAPI-Contract%20First-6BA539?logo=openapiinitiative&logoColor=white">
</p>

---

## Table of Contents

1. [Overview](#1-overview)
2. [Why This Project Is Interesting](#2-why-this-project-is-interesting)
3. [Features](#3-features)
4. [Tech Stack](#4-tech-stack)
5. [Monorepo Structure](#5-monorepo-structure)
6. [Architecture](#6-architecture)
7. [Getting Started](#7-getting-started)
8. [Running the Apps](#8-running-the-apps)
9. [Database Migrations & Seeding](#9-database-migrations--seeding)
10. [The API Contract Workflow](#10-the-api-contract-workflow)
11. [Testing](#11-testing)

---

## 1. Overview

**Gatherloop POS** is a custom-built Point of Sale system that powers the day‑to‑day operations of a coffee shop and board‑game café — covering both **web** (for back‑office/admin) and **mobile** (for on‑the‑floor use). It is not a tutorial project: it runs a real business and has grown to manage menus, transactions, inventory, board‑game rentals, suppliers, operational checklists, budgeting, and financial reporting.

What makes the codebase worth a closer look is how it is engineered. The same business problem is solved twice — once in **Go** on the backend and once in **TypeScript** on the frontend — both following **Clean Architecture**, both decoupled from their frameworks, and both wired together through a **single OpenAPI contract** that generates type‑safe clients for every consumer. The web and mobile apps share **one UI library**, so a feature is built once and ships everywhere.

In short, the system aims to:

- Reduce manual work in running the shop (menus, sales, stock, rentals).
- Automate cost & profit calculations and budget allocation for full financial transparency.
- Provide a consistent experience across web and mobile from a shared codebase.

---

## 2. Why This Project Is Interesting

If you are evaluating this as a portfolio piece, these are the engineering decisions worth highlighting:

| Theme | What was done | Why it matters |
|---|---|---|
| **Contract‑first, end‑to‑end type safety** | A single `api.yaml` OpenAPI spec is the source of truth. Go types, TypeScript types, **and** TanStack Query hooks are all *generated* from it. | The compiler catches frontend/backend drift. Changing an endpoint surfaces as a type error, not a runtime bug. |
| **Clean Architecture, both ends** | Backend (Go) and frontend (TS) are both split into **Domain → Data → Presentation** layers. Business logic never depends on the database, the HTTP framework, or React. | Logic is testable in isolation and survives framework churn. |
| **Write once, run on web & mobile** | A shared UI library built with **Tamagui** + **Solito** renders to both React (Next.js) and React Native. | One component system, one design language, two platforms — no duplicated screens. |
| **Frontend as a finite state machine** | Use cases are modeled as explicit state machines (state → action → next state) using `ts-pattern`, fully framework‑agnostic. The React layer only adapts the machine via `useReducer`/`useEffect`. | Predictable, debuggable UI logic that can be unit‑tested without rendering. |
| **Repository pattern with swappable data sources** | Both ends define repository *interfaces* with real (MySQL / OpenAPI) **and** mock implementations. | Domain logic can be tested against mocks; data sources can be swapped without touching business rules. |
| **Tested domain layer** | Go use cases and HTTP handlers ship with table‑driven unit & integration tests; the UI library has handler tests and Storybook stories. | Confidence to refactor a live, revenue‑generating system. |
| **Production‑grade backend plumbing** | Versioned SQL migrations (golang‑migrate), embedded migration files, seeders, JWT auth middleware, structured logging (`slog`), and a multi‑stage Docker build. | Operable and deployable, not just a demo. |

---

## 3. Features

The system has grown well beyond a basic till. Current domains include:

#### Sales & Catalog
- **Category Management** — group products (beverage, food, etc.) and route them to kitchen/bar **stations**.
- **Product Management** — products with **variants & options**, draft/published **status**, and material‑driven costing.
- **Material Management** — track raw materials, inventory levels, and material cost to derive pricing.
- **Transactions** — record customer purchases with line items, variant values, discounts, and **coupons**; sales feed straight into financial records.
- **Coupons** — transaction‑ and item‑level discount calculation.

#### Inventory & Suppliers
- **Suppliers** — manage suppliers and the materials they provide.
- **Stock Checks** — perform inventory stock‑takes against expected levels.
- **Purchase Lists** — restocking workflows tied to materials and suppliers.

#### Board‑Game Café
- **Rentals** — board‑game rental with tiered/duration‑based pricing and rental‑aware transaction items.
- **Tickets** — operational ticketing/management.

#### Operations & Finance
- **Operational Checklists** — reusable checklist **templates** and per‑shift checklist **sessions**.
- **Wallets** — multiple payment targets / cash accounts with payment eligibility rules.
- **Expense Tracking** — categorized expenses (operational, material stock, salaries) with budget allocation.
- **Budget Tracking** — real‑time spending limits per category.
- **Calculations & Statistics** — automated cost/profit calculations and sales statistics dashboards.

---

## 4. Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Backend** | [Go 1.24](https://go.dev) + [gorilla/mux](https://github.com/gorilla/mux) | High‑performance REST API, business logic, JWT auth |
| **Database** | MySQL | Persistent storage, versioned via [golang‑migrate](https://github.com/golang-migrate/migrate) |
| **Web** | [Next.js 14](https://nextjs.org) + [React 18](https://react.dev) | Server‑rendered web client |
| **Mobile** | [React Native 0.74](https://reactnative.dev) | iOS & Android client |
| **Cross‑platform UI** | [Tamagui](https://tamagui.dev) + [Solito](https://solito.dev) | One component library + shared navigation for web & mobile |
| **Data fetching** | [TanStack Query](https://tanstack.com/query) + [Axios](https://axios-http.com) | Caching, mutations, generated query hooks |
| **Forms & validation** | [react-hook-form](https://react-hook-form.com) + [Zod](https://zod.dev) | Type‑safe forms and runtime validation |
| **State logic** | [ts-pattern](https://github.com/gvergnaud/ts-pattern) | Finite‑state‑machine use cases |
| **Charts** | [Victory](https://commerce.nearform.com/open-source/victory/) | Dashboards & statistics |
| **API contract** | [OpenAPI](https://www.openapis.org) + [Kubb](https://kubb.dev) + [openapi-generator](https://openapi-generator.tech) | Single spec → Go types, TS types, and React Query hooks |
| **Monorepo / tooling** | [Nx](https://nx.dev), [Storybook](https://storybook.js.org), Jest, ESLint, Prettier, Husky, Docker | Build orchestration, testing, DX |

---

## 5. Monorepo Structure

This is an **Nx** monorepo. The Go backend is wired in through a `go.work` workspace, while the JS/TS projects are managed by Nx.

```
gatherloop-pos/
├── apps/
│   ├── api/            # Go backend (Clean Architecture: domain / data / presentation)
│   │   ├── domain/     #   entities, use cases, repository interfaces, business rules
│   │   ├── data/       #   repository implementations (mysql/ and mock/)
│   │   ├── presentation/restapi/  # HTTP handlers, routes, transformers, middleware
│   │   ├── migrations/ #   versioned SQL migrations (golang-migrate, embedded)
│   │   ├── seeds/      #   database seeders
│   │   └── cmd/        #   migrate & seed entrypoints
│   ├── web/            # Next.js web app (thin pages → shared UI screens)
│   ├── mobile/         # React Native app (iOS & Android)
│   ├── web-e2e/        # Web end-to-end tests
│   └── mobile-e2e/     # Mobile end-to-end tests
├── libs/
│   ├── ui/             # Cross-platform UI library + frontend Clean Architecture
│   │   └── src/
│   │       ├── domain/        # entities, FSM use cases, repository interfaces
│   │       ├── data/          # repository impls (openApi / mock), query keys
│   │       └── presentation/  # controllers, presenters, views, screens, components
│   ├── api-contract/   # OpenAPI spec + generated Go/TS types & React Query hooks
│   └── provider/       # Shared providers (Tamagui config, toasts)
└── docs/               # Architecture diagrams, PRDs & technical design docs
```

---

## 6. Architecture

The system applies **Clean Architecture** on both the backend and the frontend. By splitting each application into independent layers, business logic stays decoupled from frameworks, databases, and UI — which makes it testable, maintainable, and scalable.

### 6.1. Backend (Go)

![clean architecture backend](/docs/clean%20architecture%20be.png)

#### A. Domain Layer
The core of the backend. It defines **what** the system does, independent of any framework or database:
1. **Entity** — the [data structures](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/apps/api/domain/transactions/entity.go#L19-L30) used by the use cases.
2. **Use Case** — the [business logic](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/apps/api/domain/transactions/usecase.go#L28-L40).
3. **Repository Interface** — [interfaces](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/apps/api/domain/transactions/repository.go) that keep business logic independent of the data layer (databases, external APIs, or mocks).

This separation lets use cases and entities be validated in isolation, without spinning up external systems.

#### B. Data Layer
[Implements the repository interfaces](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/apps/api/data/mysql/transactions/repository.go) required by the use cases. Because it depends on the domain's interfaces (not the other way around), data sources — MySQL, mocks, or external APIs — can be swapped without touching business rules.

#### C. Presentation Layer
HTTP [handlers](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/apps/api/presentation/http/transactions/handler.go) that [consume the use cases](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/apps/api/presentation/http/transactions/handler.go#L38), [map the incoming request](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/apps/api/presentation/http/transactions/handler.go#L22-L36) into internal structures, and [map entities](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/apps/api/presentation/http/transactions/handler.go#L44-L47) back into transport formats (e.g. JSON).

### 6.2. Frontend (TypeScript)

![clean architecture frontend](/docs/clean%20architecture%20fe.png)

#### A. Domain Layer
Mirrors the backend and contains **no framework‑specific code**:
1. **Entity** — the [internal data structures](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/libs/ui/src/domain/entities/Transaction.ts) used by the business logic.
2. **Use Case** — business logic modeled as a [finite state machine](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/libs/ui/src/domain/usecases/transactionList.ts#L80-L150) that maps the current state to the next state based on dispatched actions. It only knows about [interfaces](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/libs/ui/src/domain/usecases/transactionList.ts#L161-L162) — never whether data comes from an API or a mock, and never about React.
3. **Repository Interface** — [interfaces](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/libs/ui/src/domain/repositories/transaction.ts) describing the data operations a use case needs (fetch, create, update, delete).

#### B. Data Layer
[Implements the repository interfaces](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/libs/ui/src/data/openApi/transaction.ts) and decides the data source (real API or mock). It also transforms API data structures into the domain entities the use cases expect — so use cases can be tested against mock data with no logic changes.

#### C. Presentation Layer
Adapts the framework‑agnostic logic to the UI:
1. **Controller** — bridges the use case's state machine into framework state management ([example](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/libs/ui/src/presentation/controllers/controller.ts)); in React via `useReducer` for transitions and `useEffect` for side effects.
2. **Presenter** — [maps entities](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/libs/ui/src/presentation/views/transactions/widgets/TransactionList/TransactionList.presenter.tsx#L24) into the props the UI components consume.
3. **View** — the [user interface](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/libs/ui/src/presentation/views/transactions/widgets/TransactionList/TransactionList.view.tsx) itself (JSX rendered identically on web and mobile via Tamagui).

> The web (`apps/web/src/pages`) and mobile (`apps/mobile/src`) apps are intentionally thin: they mount the shared **screens** from `libs/ui` and wire navigation with Solito. Almost all real UI work lives in one place.

---

## 7. Getting Started

### Prerequisites

- **Node.js** ≥ 18 and **npm**
- **Go** ≥ 1.24
- **MySQL** (local or remote)
- **Java (JRE 21+)** — required by `openapi-generator` when generating the Go client
- *(Mobile only)* Xcode / Android Studio toolchains for iOS / Android

### 1. Clone & install

```bash
git clone https://github.com/gatherloop/gatherloop-pos.git
cd gatherloop-pos
npm install
```

### 2. Configure the backend environment

Create `apps/api/.env` from the example and fill in your values:

```bash
cp apps/api/.env.example apps/api/.env
```

```dotenv
DB_USERNAME=
DB_PASSWORD=
DB_NAME=
DB_HOST=
DB_PORT=
PORT=
JWT_SECRET=

# Logging
LOG_LEVEL=info         # debug | info | warn | error
APP_ENV=development
SERVICE_NAME=gatherloop-pos-api
```

### 3. Prepare the database

Run migrations (and optionally seed sample data) — see [Database Migrations & Seeding](#9-database-migrations--seeding).

You're ready to run the apps.

---

## 8. Running the Apps

All projects are orchestrated with Nx.

### API (Go backend)

```bash
nx run api:serve     # start the API server (regenerates the Go contract first)
nx run api:build     # compile a production binary (CGO disabled)
```

> You can also use the API's `Makefile` directly from `apps/api/` (`make dev`, `make build`, `make test`).

### Web (Next.js)

```bash
nx run web:dev       # dev server with hot reload
nx run web:build     # production build
nx run web:start     # serve the production build
```

### Mobile (React Native)

```bash
nx run mobile:start          # start the Metro bundler
nx run mobile:run-android    # run on Android device/emulator
nx run mobile:run-ios        # run on iOS device/simulator
```

---

## 9. Database Migrations & Seeding

The backend uses **versioned SQL migrations** (golang‑migrate). Migration files in `apps/api/migrations` are embedded into the binary, and a dedicated `cmd/migrate` entrypoint applies them. The same setup ships a `cmd/seed` seeder.

From `apps/api/` (uses the `DB_*` values in your `.env`):

```bash
make migrate-up                       # apply all pending migrations
make migrate-down                     # roll back the last migration
make migrate-create name=add_x_table  # scaffold a new migration pair
make migrate-version                  # show current schema version

make migrate                          # run migrations via the Go binary
make seed                             # seed the database
```

---

## 10. The API Contract Workflow

The OpenAPI spec at `libs/api-contract/src/api.yaml` is the **single source of truth** for the wire format. Code generation keeps every consumer in sync:

```bash
nx run api-contract:generate:ts   # → TypeScript types + TanStack Query hooks (via Kubb)
nx run api-contract:generate:go   # → Go types (via openapi-generator)
```

- The **frontend** consumes generated TS types and ready‑made React Query hooks — no hand‑written fetch logic, no drift between client and server shapes.
- The **backend** build (`api:serve` / `api:build`) regenerates the Go contract automatically as a dependency.

Change the spec once, regenerate, and the TypeScript compiler and Go compiler both enforce the new shape across the entire stack.

---

## 11. Testing

The codebase treats a live, revenue‑generating system with appropriate care:

```bash
npm test          # run all Jest tests across the workspace (nx run-many)
npm run lint      # lint every project

nx run api:test   # Go unit + handler integration tests
```

- **Backend** — table‑driven unit tests for domain use cases (e.g. pricing & coupon calculators) and integration tests for HTTP handlers, made possible by the repository/mock seam.
- **Frontend** — handler tests for screens plus **Storybook** stories for the shared UI components.
- **End‑to‑end** — dedicated `web-e2e` and `mobile-e2e` projects; see the planning docs in `docs/` and `E2E_TEST_PLAN.md`.

---

<sub>Built and maintained as the real POS for a coffee shop & board‑game café — and as a study in clean, type‑safe, cross‑platform engineering.</sub>
