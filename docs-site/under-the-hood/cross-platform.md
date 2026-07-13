# Cross-Platform (Web + Mobile)

Gatherloop POS ships as a Next.js web app and a React Native mobile app from **one shared codebase**, `libs/ui`. This isn't a shared component kit that two separate products both import — the screens, business logic, and entities are identical, literal, single-source code running on both platforms. What differs between web and mobile is a thin shell of routing and initial data-loading, nothing more.

## What's shared (nearly everything)

Every layer described in [Clean Architecture](/under-the-hood/clean-architecture) — entities, usecases, controllers, handlers, and screens — lives in `libs/ui` and is imported as-is by both apps. Concretely, `apps/mobile/src/app/App.tsx` and `apps/web/src/pages/**` both import components straight from `libs/ui/src/app` (e.g. `TransactionList`, `ProductCreate`, `ChecklistSessionDetail`) — the same composition root that instantiates the real API repositories, wires up the usecases, and renders the same Handler and Screen.

That sharing is possible because of [Tamagui](https://tamagui.dev): the Screen layer is written once using Tamagui's component set (`View`, `Button`, `Text`, …), which compiles to real DOM on web and real native views on iOS/Android — not a webview, and not two separate implementations kept in sync by hand.

## What's platform-specific (the shell)

| Concern | Web (`apps/web`) | Mobile (`apps/mobile`) |
|---|---|---|
| Routing | Next.js file-based pages under `apps/web/src/pages` | React Navigation's `NativeStackNavigator`, configured in [`App.tsx`](https://github.com/gatherloop/gatherloop-pos/blob/main/apps/mobile/src/app/App.tsx) |
| URL structure | Native to Next.js | A `linking.config` in the same `App.tsx` mirrors the exact same paths (`transactions/:transactionId`, `wallets/:walletId/transfers`, …), kept in sync by hand so a deep link means the same thing on either platform |
| Cross-platform link/route glue | [Solito](https://solito.dev) | Solito |
| Initial data | `getServerSideProps` fetches data server-side with the real API repositories and passes it as props — faster first paint, and where the login redirect is enforced | Screens mount with empty initial params and the shared usecase fetches client-side on mount instead |
| Auth gate | Server-side redirect in `getServerSideProps` if no session cookie | Client-side, driven by the same `AuthLogoutUsecase` shared with web |

Everything below the routing layer — what a "product create" screen looks like, what happens when a transaction is paid, how a budget total is recomputed — is the same code, not a parallel implementation.

## Why this matters

A conventional "web + mobile" POS is really two products that happen to talk to the same API, with every screen, form, and business rule built and maintained twice — and two chances for the two to quietly disagree. Here, a bug fix or a new validation rule in a usecase is fixed everywhere at once, and a new feature built for web (like [Board-game Rentals](/sales/rentals)) is one `Stack.Screen` registration away from also working on mobile, because the screen, its state machine, and its data layer already exist.

## Explore the source

- Shared app composition: [`libs/ui/src/app`](https://github.com/gatherloop/gatherloop-pos/tree/main/libs/ui/src/app)
- Mobile navigation shell: [`apps/mobile/src/app/App.tsx`](https://github.com/gatherloop/gatherloop-pos/blob/main/apps/mobile/src/app/App.tsx)
- Web routing: [`apps/web/src/pages`](https://github.com/gatherloop/gatherloop-pos/tree/main/apps/web/src/pages)
- Tamagui config: [`apps/web/next.config.js`](https://github.com/gatherloop/gatherloop-pos/blob/main/apps/web/next.config.js), [`libs/ui`](https://github.com/gatherloop/gatherloop-pos/tree/main/libs/ui)
