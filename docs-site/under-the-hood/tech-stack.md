# Tech Stack & Why

Every choice below was made for a specific reason tied to what this product actually needs — a POS handling real money on a laptop behind a counter and, increasingly, on a phone.

## Backend

| Tech | Role | Why it was chosen |
|---|---|---|
| [Go](https://go.dev) | API server | Fast to run, cheap to deploy, and its static typing catches whole classes of bugs (a mis-typed money field, a nil pointer on a transaction) before they ever reach a till. Simple concurrency model handles concurrent checkouts without extra machinery. |
| MySQL | Database of record | Battle-tested relational storage for data with real referential structure — transactions belong to wallets, budgets belong to expenses, variants belong to products. |
| [gorilla/mux](https://github.com/gorilla/mux) | HTTP routing | A minimal, unopinionated router — Clean Architecture (below) does the structural work, so the routing layer stays thin. |

## Frontend — shared

| Tech | Role | Why it was chosen |
|---|---|---|
| [TypeScript](https://www.typescriptlang.org) | Language | End-to-end type safety from the OpenAPI-generated client through business logic to the rendered screen. |
| [Tamagui](https://tamagui.dev) | Cross-platform UI kit | Lets one component tree render as real DOM on web and real native views on iOS/Android, with shared styling and theming — the mechanism behind [Cross-Platform](/under-the-hood/cross-platform). |
| [TanStack Query](https://tanstack.com/query) | Server-state / caching | Handles request de-duplication, caching, and revalidation for API calls made from the shared `libs/ui` layer, on both platforms. |
| [ts-pattern](https://github.com/gvergnaud/ts-pattern) | Exhaustive pattern matching | Every screen's state is a discriminated union (loading / loaded / error / …); `ts-pattern`'s `.exhaustive()` makes the compiler refuse to build if a new state is ever left unhandled. |
| [Zod](https://zod.dev) | Runtime validation | Validates form input and, via generated schemas, API responses — a second line of defense alongside TypeScript's compile-time checks. |
| [React Hook Form](https://react-hook-form.com) | Forms | Every create/update screen (products, expenses, budgets, …) is a form; this keeps them fast and free of unnecessary re-renders. |

## Frontend — platform-specific

| Tech | Role | Why it was chosen |
|---|---|---|
| [Next.js](https://nextjs.org) | Web app framework | Server-side rendering for the web app's auth checks and initial page data — a POS screen shouldn't flash "loading" before showing a cashier their queue. |
| [React Native](https://reactnative.dev) | Mobile runtime | The same component and business-logic layer, compiled to genuinely native iOS/Android apps rather than a wrapped webview. |
| [Solito](https://solito.dev) | Navigation glue | Lets the same screens resolve `/transactions/:id`-style links on both Next.js routing and React Navigation, keeping URL structure consistent across platforms. |

## API contract

| Tech | Role | Why it was chosen |
|---|---|---|
| [OpenAPI](https://www.openapis.org) | API specification | `libs/api-contract/src/api.yaml` is the one place the shape of every endpoint is defined. |
| [Kubb](https://kubb.dev) | Codegen | Generates a typed TypeScript client, Zod schemas, and TanStack Query hooks straight from the OpenAPI spec for `libs/ui` to consume — no hand-written fetch calls to drift out of sync with the backend. |

## Workspace & delivery

| Tech | Role | Why it was chosen |
|---|---|---|
| [Nx](https://nx.dev) | Monorepo tooling | One repository for API, web, mobile, and shared libraries, with dependency-aware builds/tests and consistent tooling across all of them. |
| [Jest](https://jestjs.io) + [React Testing Library](https://testing-library.com/react) | Frontend unit & integration tests | See [Testing Strategy](/under-the-hood/testing-strategy). |
| Go's built-in `testing` package | Backend unit & integration tests | Same. |
| [Playwright](https://playwright.dev) | End-to-end tests | Same. |
| GitHub Actions + GitHub Pages | This documentation site | The same pipeline pattern (build → deploy) the product itself could use for CI/CD. |

## Explore the source

- Root workspace: [`package.json`](https://github.com/gatherloop/gatherloop-pos/blob/main/package.json), [`nx.json`](https://github.com/gatherloop/gatherloop-pos/blob/main/nx.json)
- OpenAPI spec: [`libs/api-contract/src/api.yaml`](https://github.com/gatherloop/gatherloop-pos/blob/main/libs/api-contract/src/api.yaml)
- Codegen config: [`libs/api-contract/kubb.config.ts`](https://github.com/gatherloop/gatherloop-pos/blob/main/libs/api-contract/kubb.config.ts)
- Tamagui setup: [`apps/web/next.config.js`](https://github.com/gatherloop/gatherloop-pos/blob/main/apps/web/next.config.js)
