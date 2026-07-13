# Architecture at a Glance

Gatherloop POS is one [Nx](https://nx.dev) monorepo: a single Go backend, two frontends (web and mobile) that share almost all of their code, and a small set of libraries that make that sharing possible. Every piece below is running in a real coffee shop today — nothing here is a demo scaffold.

## The system in one diagram

```
                                  MySQL
                                    ▲
                                    │  database/sql
                          ┌─────────┴──────────┐
                          │  apps/api            │  Go · Clean Architecture
                          │  domain → data/mysql  │  (see: Clean Architecture)
                          │  → presentation       │
                          └─────────▲──────────┘
                                    │  REST — described once as OpenAPI
                                    │  libs/api-contract/src/api.yaml
                                    │  → generated Go types   (apps/api)
                                    │  → generated TS client  (libs/ui)
                          ┌─────────┴──────────┐
                          │  libs/ui              │  shared business logic + UI
                          │  entities → usecases   │  (Tamagui, cross-platform)
                          │  → controllers →       │
                          │  handlers → screens     │
                          └────┬─────────────┬────┘
                               │             │
                    ┌──────────▼───┐   ┌─────▼───────────┐
                    │  apps/web      │   │  apps/mobile      │
                    │  Next.js, SSR  │   │  React Native      │
                    └────────────────┘   └────────────────────┘
```

## The pieces

| Piece | What it is | Role |
|---|---|---|
| `apps/api` | Go service | Owns every business rule and the MySQL database. The only thing allowed to touch the database. |
| `libs/api-contract` | OpenAPI spec + codegen | The single source of truth for what the API looks like — generates the Go request/response types the backend uses and the typed TypeScript client the frontend uses, so the two sides can't silently drift apart. |
| `libs/ui` | Shared TypeScript library | Every entity, business rule, controller, and screen in the product, written once and rendered on both web and mobile via [Tamagui](https://tamagui.dev). |
| `apps/web` | Next.js app | Thin: server-side data fetching (auth, initial page data) plus routing, then hands off to `libs/ui` for everything else. |
| `apps/mobile` | React Native app | Thin: navigation and linking config, then hands off to the exact same `libs/ui` screens. |
| `libs/provider` | Small shared runtime | Cross-platform providers (theming, toasts, query client) that both apps mount once at the root. |

## Three decisions that shape everything else

1. **Clean Architecture, independently, on both sides of the wire.** The Go API and the shared UI library each separate *what the business does* from *how it's stored* and *how it's shown*, so either can be tested without a database, a browser, or a phone. Details: [Clean Architecture](/under-the-hood/clean-architecture).
2. **One contract, not two hand-maintained clients.** The API shape is defined once in `libs/api-contract` and generated into both languages, so a renamed field is a compile error, not a production bug. Details: [Tech Stack & Why](/under-the-hood/tech-stack).
3. **One UI codebase, not two products.** `libs/ui` is not a component kit shared *between* web and mobile apps — it *is* the web and mobile apps, down to the screens and business logic. The platform-specific code is a thin shell around it. Details: [Cross-Platform (Web + Mobile)](/under-the-hood/cross-platform).

## Explore the source

- Workspace config: [`nx.json`](https://github.com/gatherloop/gatherloop-pos/blob/main/nx.json), [`package.json`](https://github.com/gatherloop/gatherloop-pos/blob/main/package.json)
- Backend: [`apps/api`](https://github.com/gatherloop/gatherloop-pos/tree/main/apps/api)
- API contract: [`libs/api-contract`](https://github.com/gatherloop/gatherloop-pos/tree/main/libs/api-contract)
- Shared UI + business logic: [`libs/ui`](https://github.com/gatherloop/gatherloop-pos/tree/main/libs/ui)
- Web: [`apps/web`](https://github.com/gatherloop/gatherloop-pos/tree/main/apps/web)
- Mobile: [`apps/mobile`](https://github.com/gatherloop/gatherloop-pos/tree/main/apps/mobile)
