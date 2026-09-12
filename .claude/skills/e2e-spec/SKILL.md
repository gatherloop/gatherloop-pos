---
name: e2e-spec
description: >-
  Write or debug a Playwright end-to-end spec for pos-web-e2e or order-web-e2e. Use when adding
  e2e coverage for a user flow, or when an e2e suite fails locally or in the post-merge E2E
  workflow.
---

# e2e-spec

Two suites, each driving a different app, whose CI environment (`.github/workflows/e2e-main.yml`)
encodes several hard-won traps. They run **post-merge on `main`**, not in `pr-test.yml` — so a
broken spec is only found after it is too late to be cheap. Run it locally before you push.

## 1. Where specs live

| Suite | Drives | Config |
|---|---|---|
| `apps/pos-web-e2e/src/*.spec.ts` | `pos-web`, via `npx nx dev pos-web` | `apps/pos-web-e2e/playwright.config.ts` |
| `apps/order-web-e2e/src/*.spec.ts` | `order-web`, via `nx run order-web:build && nx run order-web:start` | `apps/order-web-e2e/playwright.config.ts` |

`apps/pos-mobile-e2e` is still the unmodified Nx Playwright scaffold (all three browsers, no
CI wiring) and is not run in CI or covered by this skill — see the `pos-mobile` note in §8 of
`docs/plan-claude-md-and-skills.md` before adding real specs there.

Shared helpers live in each suite's `src/utils/`: `api.ts` (seed/clean up data via the real API,
using an `APIRequestContext`), `selectors.ts` (role/label-based locators, grouped by
screen/component), and, for `order-web-e2e` only, `dokuStub.ts` (drives the DOKU stub — see §5).
Follow an existing spec's shape (`wallets.spec.ts` is a clean example: create fixtures via the UI,
assert, clean up in `test.afterAll` via `api.ts`, swallowing delete errors since the row may
already be gone).

## 2. The environment the suite assumes

Both suites assume, and CI provisions before either runs:

- a migrated MySQL database,
- a seeded user with no registration endpoint to create one through
  (`apps/api/presentation/restapi/auth_route.go` has none) — the account is inserted directly
  into `users` with a bcrypt hash,
- for `order-web-e2e`'s checkout flow, a seeded wallet at the fixed `ORDER_PAYMENT_WALLET_ID`
  with `is_payment_target = 1` (D15 in `docs/prd-order-checkout-qris-doku.md`) — `PaymentUsecase.Checkout`
  validates it exists on every call, so checkout specs fail at the first request without it.

Locally, point the suite at a database you migrated and seeded yourself (`db-migration` skill for
the migration step); there is no local seed script, so mirror the CI steps in
`e2e-main.yml` by hand (or run against a database you already exercised through the app once).

## 3. Auth is pre-baked (pos-web-e2e only)

`pos-web-e2e`'s `global-setup.ts` logs in once, against `E2E_USERNAME`/`E2E_PASSWORD`
(defaulting to `mnindrazaka` / a placeholder password locally; CI overrides both), and saves the
session to `src/.auth/storageState.json`. Every project except `chromium-no-auth` reuses that
storage state, so specs run authenticated by default and should not log in themselves.

- A spec that must run **unauthenticated** goes in `auth.spec.ts` — that filename is what routes
  it to the `chromium-no-auth` project (`testMatch: /auth\.spec\.ts/`), which starts from an
  empty storage state instead.
- A spec that needs a **mobile viewport** is named `*.mobile.spec.ts` (e.g.
  `transactions.mobile.spec.ts`) — that suffix is what the `mobile-chromium` project's
  `testMatch` picks up, and the plain `chromium` project's `testIgnore` excludes it explicitly.
  Adding a new mobile spec means adding its filename to **both** lists in
  `apps/pos-web-e2e/playwright.config.ts`, not just naming the file correctly — the routing is
  config-driven, not inferred from the suffix at runtime. `rentals.checkout.mobile.spec.ts` is a
  live example of getting this wrong: despite the suffix, it is absent from both the `chromium`
  project's `testIgnore` and the `mobile-chromium` project's `testMatch`, so today it only runs
  at desktop viewport. Check both lists before trusting a `*.mobile.spec.ts` filename alone.

`order-web-e2e` has no `global-setup.ts` or storage state: the customer app it drives is
anonymous by design, and specs seed whatever fixtures they need directly through the API
(`utils/api.ts`) using staff credentials meant only for that seeding (see the comment in
`apps/order-web-e2e/.env.example`).

## 4. Run it locally

```sh
npx playwright install chromium   # once
npx nx run pos-web-e2e:e2e
npx nx run order-web-e2e:e2e
```

Both apps default to port 3000, so the two suites cannot run concurrently against the same
machine — run one at a time. Both configs are Chromium-only (the `chromium` / `chromium-no-auth`
/ `mobile-chromium` projects) unless `FULL_BROWSER_MATRIX` is set, which adds Firefox and WebKit.

## 5. Gotchas

- **Use `BASE_URL=http://localhost:3000`, never `127.0.0.1`.** The API stamps the session cookie
  with `Domain=<the request's Origin host>` (`GetOriginDomain` in
  `apps/api/presentation/restapi/base_transformers.go`), and browsers reject a `Domain` attribute
  that is a bare IP — so against `127.0.0.1` the cookie is silently dropped and every
  authenticated test fails with no useful error. `pos-web-e2e/playwright.config.ts`'s own
  fallback baseURL is the IP form, which is exactly why CI sets `BASE_URL` explicitly.
- **Both apps default to port 3000** — `pos-web-e2e` and `order-web-e2e` are separate CI jobs
  (`strategy.matrix` in `e2e-main.yml`) precisely so they never run concurrently on one machine.
- **The QRIS checkout flow in `order-web-e2e`'s `checkout.spec.ts` runs against
  `apps/api/cmd/dokustub`**, a stand-in for DOKU's sandbox, never real DOKU. Drive it through
  `utils/dokuStub.ts` (e.g. `markPaid(partnerReferenceNo)`, which POSTs to the stub's
  `/_stub/pay`), and set `DOKU_STUB_URL` if the stub isn't on its default port. None of the
  `DOKU_*` env values in CI are real credentials — the stub never checks them.
- **`pos-mobile-e2e` is not run in CI** and is still the stock Nx scaffold — do not treat it as
  a reference for either suite's conventions.
- Failures upload three artifacts from the CI job: the Playwright HTML report, the API's stdout
  log, and (for `order-web-e2e`) the DOKU stub's log — check all three before assuming the spec
  itself is wrong.

## 6. Verify

Run the suite green locally before pushing — `pr-test.yml` does not run either e2e suite, so
nothing else will catch a broken spec before it merges to `main` and fails post-merge:

```sh
npx nx run pos-web-e2e:e2e      # or order-web-e2e:e2e
```
