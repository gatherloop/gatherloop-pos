# Gatherloop POS

A Point of Sale system built for a coffee shop, running on web, mobile and a customer-facing
ordering app. It covers the catalog (categories, products, variants, materials), sales
(transactions, carts, tables, tickets, coupons), inventory (suppliers, stock checks), finance
(expenses, budgets, wallets, profit calculation) and daily operations (checklists, rentals).

The full feature documentation lives at
[gatherloop.github.io/gatherloop-pos](https://gatherloop.github.io/gatherloop-pos) (source in
`docs-site/`).

![screenshot of gatherloop POS](https://i.ibb.co.com/5KQJmMz/Screenshot-2024-11-28-at-14-39-36.png)

## 1. Project structure

An [Nx](https://nx.dev) monorepo. Apps are thin shells; nearly all frontend code lives in
`libs/ui`, shared by web, mobile and order.

```
apps/
  api/          Go backend (REST API, MySQL)
  web/          Next.js admin/cashier app (Pages Router)
  order/        Next.js customer app — scan a table QR, order from your phone
  mobile/       React Native (Expo) app for iOS/Android
  *-e2e/        Playwright end-to-end tests per app
libs/
  ui/           All shared frontend code: entities, use cases, screens, components
  api-contract/ OpenAPI spec (src/api.yaml) + generated TS and Go clients
  provider/     App-level providers (Tamagui, theme, toast)
docs/           PRDs and TRDs (product and technical design docs)
docs-site/      VitePress feature documentation site
```

The three frontends share the same UI layer through [Tamagui](https://tamagui.dev), which renders
to both React DOM and React Native.

## 2. Running the project

### Prerequisites

- Node.js 20+ and npm
- Go 1.24+
- A MySQL database

### Setup

```bash
npm install
cp apps/api/.env.example apps/api/.env    # DB credentials, JWT secret, CORS origins
cp apps/web/.env.example apps/web/.env.local
cp apps/order/.env.example apps/order/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

### Run

```bash
npx nx run api:serve      # Go API, on the PORT set in apps/api/.env
npx nx run web:dev        # POS web app     → http://localhost:3000
npx nx run order:dev      # customer app    → http://localhost:3000
npx nx run mobile:start   # React Native dev server (then run-android / run-ios)
npx nx run ui:storybook   # component explorer → http://localhost:6006
```

Web and order proxy `/api/*` to `NEXT_PUBLIC_API_BASE_URL`, so start the API first. Both default to
port 3000 — to run them side by side, give one another port (`npx nx run order:dev --port=3001`) and
add that origin to `CORS_ALLOWED_ORIGINS` in `apps/api/.env`.

### Test, lint, and codegen

```bash
npm test                            # all unit tests (Jest for TS, go test for the API)
npm run lint
npx nx run web-e2e:e2e              # Playwright end-to-end tests
npx nx run api-contract:generate:ts # regenerate TS client after editing src/api.yaml
npx nx run api-contract:generate:go # regenerate Go models
```

Codegen runs automatically as a dependency of the `dev`, `build` and `serve` targets — run it
manually only when you want to inspect the output.

## 3. Architecture

Both sides follow the same Clean Architecture split: **domain → data → presentation**, where the
domain depends on nothing and the outer layers depend inwards through interfaces.

### 3.1. Backend (`apps/api`)

```
domain/               <entity|repository|usecase>.go per feature
data/mysql/, data/mock/   repository implementations
presentation/restapi/     handler + route + transformer per feature
main.go                   wires repositories → use cases → handlers
```

- **Domain** — entities, business logic in use cases, and repository *interfaces*. No SQL, no HTTP.
- **Data** — implements those interfaces against MySQL (or in-memory mocks used by tests).
- **Presentation** — HTTP handlers built on `gorilla/mux`; transformers map between JSON request
  and response shapes and domain entities.

Dependencies are constructed once in `main.go` and injected, so use cases are testable in isolation
(see the `*_usecase_test.go` files next to them).

### 3.2. Frontend (`libs/ui/src`)

```
domain/       entities, repository interfaces, use cases (framework-agnostic)
data/         api/ (OpenAPI client), mock/, memory/, browser/ repository implementations
presentation/ controllers/, screens/, components/
app/          per-route composition: builds repositories + use cases, renders a Handler
```

- **Domain** — each use case is a **finite state machine**: a state union (`idle`, `loading`,
  `loaded`, `error`, …), an action union, and a pure reducer. Contains no React.
- **Data** — implements the repository interfaces, mostly against the generated OpenAPI client with
  TanStack Query, and maps API types to entities. Swapping in a mock repository is how use cases
  and screens are tested.
- **Presentation** — a **controller** hook binds a use case's state machine to React
  (`useReducer` + effects); a `*Handler` maps that state to props with `ts-pattern`; a `*Screen`
  is pure Tamagui JSX with Storybook stories.
- **app/** — the composition root: instantiates repositories and use cases, then renders the
  handler. Pages in `apps/web`, `apps/order` and `apps/mobile` mostly just re-export these.

Every surface builds with the [React Compiler](https://react.dev/learn/react-compiler), so don't
hand-write `useMemo`/`useCallback`/`React.memo` for re-render performance — opt a misbehaving
component out with `"use no memo"` instead. (One exception: `useCallback` around a `useFocusEffect`
callback is still needed, because the Jest setup has no compiler pass.) See
`docs/trd-react-compiler-adoption.md`.

## 4. Where to look next

- `docs/` — PRDs and TRDs for each feature; read the relevant one before changing behaviour.
- `docs/forms.md` — form conventions (react-hook-form + zod).
- `docs/trd-vps-deployment-automation.md` — how the API ships: a static binary built in CI and run
  on a VPS under systemd (`.github/workflows/deploy-api.yml`). The order app deploys to its own
  Vercel project (`apps/order/vercel.json`).
- `docs/trd-storybook-vercel-deployment.md` — how the component explorer ships: its own Vercel
  project rooted at `libs/ui` (`libs/ui/vercel.json`).
