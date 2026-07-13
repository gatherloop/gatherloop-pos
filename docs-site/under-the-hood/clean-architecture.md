# Clean Architecture

Gatherloop POS is built on Clean Architecture principles — both on the Go backend and the shared TypeScript frontend — so that business rules can be written and tested without a database, a browser, or a phone in the loop. Each side separates into three layers: **Domain** (what the business does), **Data** (where it gets its facts), and **Presentation** (how it's exposed or shown). Dependencies only ever point inward, toward Domain.

## Backend

![Clean Architecture — backend](/diagrams/clean-architecture-backend.png)

### Domain layer

The core of the backend. It defines the data structures and every business rule, with no knowledge of HTTP or SQL.

- **Entity** — plain Go structs defining the data, e.g. [`Transaction`](https://github.com/gatherloop/gatherloop-pos/blob/main/apps/api/domain/transaction_entity.go).
- **Usecase** — the actual business logic (validating a transaction, deducting a wallet balance, recomputing a budget), e.g. [`TransactionUsecase`](https://github.com/gatherloop/gatherloop-pos/blob/main/apps/api/domain/transaction_usecase.go).
- **Repository interface** — the contract a data source must satisfy, e.g. [`TransactionRepository`](https://github.com/gatherloop/gatherloop-pos/blob/main/apps/api/domain/transaction_repository.go). The usecase depends on this interface, never on MySQL directly — which is what makes it possible to unit-test business logic against a mock repository instead of a real database.

### Data layer

[Implements the repository interfaces](https://github.com/gatherloop/gatherloop-pos/blob/main/apps/api/data/mysql/transaction_repo.go) the domain layer requires, translating between SQL rows and domain entities. Because the domain only knows the *interface*, this implementation could be swapped for a different database without touching a single business rule.

### Presentation layer

[HTTP handlers](https://github.com/gatherloop/gatherloop-pos/blob/main/apps/api/presentation/restapi/transaction_handler.go) that parse incoming requests into domain types, call the usecase, and transform the result back into JSON. This is the only layer that knows HTTP exists.

## Frontend

![Clean Architecture — frontend](/diagrams/clean-architecture-frontend.png)

The frontend (`libs/ui`) mirrors the same three layers, plus a composition layer that wires them together for each screen.

### Domain layer

- **Entity** — plain TypeScript types, e.g. [`Transaction`](https://github.com/gatherloop/gatherloop-pos/blob/main/libs/ui/src/domain/entities/Transaction.ts).
- **Usecase** — business logic modeled as a [finite state machine](https://github.com/gatherloop/gatherloop-pos/blob/main/libs/ui/src/domain/usecases/transactionList.ts): a pure `getNextState(state, action)` function, agnostic to React and to where its data comes from. See the [abstract `Usecase` base class](https://github.com/gatherloop/gatherloop-pos/blob/main/libs/ui/src/domain/usecases/IUsecase.ts) every usecase implements.
- **Repository interface** — the data contract a usecase depends on, e.g. [`TransactionRepository`](https://github.com/gatherloop/gatherloop-pos/blob/main/libs/ui/src/domain/repositories/transaction.ts), with real, mock, and URL-query-backed implementations satisfying it interchangeably.

### Data layer

[Implements the repository interfaces](https://github.com/gatherloop/gatherloop-pos/blob/main/libs/ui/src/data/api/transaction.ts) using the OpenAPI-generated client, translating API payloads into domain entities. A parallel [mock implementation](https://github.com/gatherloop/gatherloop-pos/tree/main/libs/ui/src/data/mock) satisfies the exact same interface, which is what lets every usecase be unit-tested without a network call.

### Presentation layer

The frontend presentation layer has four parts, each with one job:

1. **Controller** — a thin hook ([`useController`](https://github.com/gatherloop/gatherloop-pos/blob/main/libs/ui/src/presentation/controllers/controller.ts)) that plugs a usecase's state machine into React via `useReducer`, e.g. [`useTransactionListController`](https://github.com/gatherloop/gatherloop-pos/blob/main/libs/ui/src/presentation/controllers/TransactionListController.tsx).
2. **Handler** — combines one or more controllers for a screen, maps domain entities to UI props, and wires cross-usecase effects (e.g. re-fetching the list after a delete succeeds). Example: [`TransactionListHandler`](https://github.com/gatherloop/gatherloop-pos/blob/main/libs/ui/src/presentation/screens/TransactionListHandler.tsx).
3. **Screen** — pure Tamagui JSX driven entirely by props, with no business logic of its own. Example: [`TransactionListScreen`](https://github.com/gatherloop/gatherloop-pos/blob/main/libs/ui/src/presentation/screens/TransactionListScreen.tsx).
4. **App composition** — the outermost piece, in [`libs/ui/src/app`](https://github.com/gatherloop/gatherloop-pos/tree/main/libs/ui/src/app), instantiates the real API repositories and usecases and renders the Handler. This is the exact component both `apps/web` and `apps/mobile` import — see [Cross-Platform (Web + Mobile)](/under-the-hood/cross-platform) for how the same composition serves both.

## Why bother

Every layer boundary above is also a testing boundary: usecases are tested against mock repositories with no server or database ([Testing Strategy](/under-the-hood/testing-strategy)), and either platform's UI can be swapped without rewriting a single business rule — which is exactly how one `libs/ui` codebase ends up powering both a Next.js web app and a React Native mobile app.
