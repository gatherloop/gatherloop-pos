# PRD: Menu Search by Option Value and Variant

The order app's menu search (`apps/order-web`, `MenuListScreen`) matches the product
name and nothing else. A guest who knows the menu by the thing they order — "earl
grey", "banana", "besar" — gets an empty screen for a product that is right there.

This document widens what a search term is allowed to match, and does it without a new
endpoint, a new query parameter, or a schema change.

## Vocabulary

The words matter here because three different things are searchable and the codebase
names them precisely (`apps/api/domain/product_entity.go`, `libs/ui/src/domain/entities/Product.ts`,
`libs/ui/src/domain/entities/Variant.ts`):

| Term | Table | Example | Searchable today |
| --- | --- | --- | --- |
| Product | `products.name` | `Teh`, `Es Kopi Susu` | ✅ yes |
| Option | `options.name` | `Ukuran`, `Varian` | ❌ no |
| **Option value** | `option_values.name` | `Earl Grey`, `Besar`, `Banana` | ❌ no |
| Variant (the priced combination) | `variants.name` | `Reguler`, `Es Kopi Susu - Large` | ❌ no |
| Category | `categories.name` | `Minuman`, `Makanan` | ❌ no |

So "earl grey" is an **option value** in this data model, and "Es Kopi Susu - Large" is a
**variant name**. Both are in scope; they are two different columns and each needs its own
clause. The option name itself ("Ukuran") is deliberately left out — see D3.

## Problem Statement

### The search term only ever reaches one column

`apps/order-web` renders the search box in
`libs/ui/src/presentation/views/screens/order/MenuListScreen.tsx:82`. Typing dispatches
`CHANGE_PARAMS` with a 600 ms debounce
(`libs/ui/src/presentation/handlers/order/MenuListHandler.tsx:296-301`), the
`MenuListUsecase` refetches (`libs/ui/src/domain/usecases/menuList.ts` — `loading` and
`revalidating` both call `fetchMenu({ query })`), and
`libs/ui/src/data/api/menu.ts:32-34` forwards it as
`publicProductList({ query })` — note on line 34 that the parallel variant fetch sends
**no** query at all.

The chain ends in one SQL fragment, `apps/api/data/mysql/product_repo.go:22-24`:

```go
if query != "" {
    result = result.Where("name LIKE ?", "%"+query+"%")
}
```

`products.name` is the only column a guest's keystrokes can ever reach. A product named
`Teh` with option values `Earl Grey` / `Jasmine` is unreachable by either flavour name,
and `MenuListScreen.tsx:102-106` shows "Menu tidak ditemukan" for an item the guest can
see two scroll positions above.

### Root cause

Not a missing column in the filter — a **mismatched unit of search**. The guest searches
for what they intend to drink, which in this data model is a variant or an option value.
The query is applied to the product, which is only the container those live in. A product
is the right unit for a *result* (one card per product, configured in the detail sheet);
it is the wrong unit for a *match*.

Two second-order facts follow from that framing, and both shape the design:

- **The dedup problem is already solved elsewhere.** `variant_repo.go:35-37` filters
  variants by option value with `JOIN variant_values ... GROUP BY variants.id HAVING COUNT(*) = ?`.
  Matching a child and collapsing back to one parent row is a shape this codebase already
  has; the product list just never needed it.
- **The client already holds everything needed to explain a match.** `menu.ts:34` fetches
  *all* variants of all published purchasable products with no filter, and every product
  carries its full `options[].values[]`. So once the server decides a product matches, the
  client can work out *which* option value or variant caused it with no extra data.

### Blast radius of any fix

`GetProductList` has exactly two HTTP entry points, and both share the repository method
above:

| Endpoint | Caller | Auth | Paginated |
| --- | --- | --- | --- |
| `GET /public/products` | order app menu (`data/api/menu.ts:32`) | none (`public_handler.go:44-77`, forces `saleType=purchase`, `status=published`) | no limit sent |
| `GET /products` | POS product list (`data/api/product.ts:114`) | `CheckAuth` (`product_route.go:18`) | yes (`skip`/`limit`) |

A cashier searching the POS product list has the identical problem, so a repository-level
fix fixes both surfaces at once (D15).

## Patterns this borrows from

Three recurring approaches to catalog search, and what each implies here:

1. **Fold the children into the parent's searchable text.** The searchable unit stays the
   product; variant names and attribute values are concatenated into its search surface.
   Results stay one card per product. Cheap, and it is exactly what a per-token
   `OR EXISTS (...)` does in SQL without materialising the blob.
2. **Index children, deduplicate to the parent at query time** (nested documents, or a
   record-per-variant index with dedup on the parent key). Same result set as (1), with
   per-child relevance — worth it only when relevance ordering matters.
3. **Normalise before matching** — case folding, accent folding, synonym dictionaries
   ("besar"/"large", "es"/"ice"). The first two come free from the column collation (D8);
   synonyms need a word list from the operator and are deferred.

This design takes (1), keeps the product as the result unit, and defers (2) and the
synonym half of (3).

## Alternatives Considered

### Option A — Widen the SQL filter to the child tables (server-side)

Match each search token against `products.name`, `products.description`, the product's
category name, its variant names, and its option values, using correlated `EXISTS`
subqueries.

- ✅ One place to change: `GetProductList` + `GetProductListTotal` in `product_repo.go`.
- ✅ Fixes the POS product list in the same commit (both endpoints share the method).
- ✅ Honest with pagination — `skip`/`limit` and `total` still describe the same set.
- ✅ No contract change, so no `api-contract` codegen round and no generated-client churn.
- ✅ `EXISTS` keeps one row per product; no `DISTINCT` fighting `ORDER BY`.
- ❌ `LIKE '%token%'` cannot use an index; cost grows with catalog size (R5).
- ❌ Matching logic must be mirrored in TypeScript for the client-side hint (D12).

### Option B — Filter the fully-loaded catalog in the client

Stop sending `query` to `/public/products`, fetch the whole published catalog once, and
filter in `MenuListUsecase`.

- ✅ Zero backend risk; no Go, no SQL, no migration.
- ✅ Instant results — the 600 ms debounce and the network round trip both disappear.
- ✅ Ranking, highlighting and fuzzy matching become easy (all data is local).
- ❌ Leaves the POS product list broken: it is paginated over `/products`, and a client
  filter cannot page.
- ❌ Two different search semantics for one catalog — the cashier and the guest would get
  different answers to the same word.
- ❌ Promotes "the whole catalog fits on the client" from an incidental property of
  `menu.ts:34` into a load-bearing requirement.

### Option C — Denormalised search column or table + `FULLTEXT`

Maintain `products.search_text` (or a `product_search_index` table) on write, index it
`FULLTEXT` with the `ngram` parser.

- ✅ Scales past `LIKE '%…%'`; gives real relevance scores.
- ❌ Every product/option/variant write must keep the blob in sync — new failure mode, new
  backfill migration, new consistency bug class, for a café-sized catalog.
- ❌ `FULLTEXT` word semantics fight substring search in Indonesian without the `ngram`
  parser, and `ngram` brings its own token-size tuning.
- ❌ Solves a scale problem this product does not have yet.

### Recommended

**Option A**, plus a thin client-side layer that explains and acts on the match (the hint
on the card, and preselecting the matched option value in the detail sheet) — that layer
needs no server data it does not already have. Option C stays on the shelf behind the
explicit thresholds in *Deferred*; Option B's best idea (instant local narrowing) is also
deferred, as a pure UX addition on top of A.

## Proposed Solution

### System design overview

```
guest types "earl grey"
        │
        ▼
MenuListScreen (Input, placeholder "Cari menu atau varian")   ← FR-6
        │ onSearchValueChange
        ▼
MenuListHandler ─── CHANGE_PARAMS { query, fetchDebounceDelay: 600 }
        │
        ▼
MenuListUsecase ─── fetchMenu({ query })        (unchanged)
        │
        ▼
ApiMenuRepository ── GET /public/products?query=earl+grey   (unchanged contract)
        │            GET /public/categories, GET /public/variants  (unchanged)
        ▼
PublicHandler.GetProductList ── ProductUsecase.GetProductList   (unchanged)
        │
        ▼
Repository.GetProductList ── applyProductSearchFilter(db, query)   ← NEW (Phase 1/2)
        │                     per token: name OR description OR
        │                     EXISTS(category) OR EXISTS(variants)
        │                     OR EXISTS(options→option_values)
        ▼
products rows  ──►  one card per product
        │
        ▼
MenuListHandler ── matchMenuSearch(query, product, variants)   ← NEW (Phase 3)
        ├──► matchedLabelsByProductId  → hint on MenuProductCard        (Phase 4)
        └──► preselectedOptionValueIds → MenuItemDetailUsecase          (Phase 5)
```

**New APIs: none.** No new endpoint, no new query parameter, no new response field. The
meaning of the existing `query` parameter on `GET /public/products` and `GET /products`
widens. `libs/api-contract/src/api.yaml` is **not** edited, so no `api-contract:generate:go`
/ `:generate:ts` round is needed and no generated client changes.

**New tables: none. New indexes: none.** The three `EXISTS` subqueries correlate on columns
that are already indexed — `idx_options_product_id`, `idx_option_values_option_id`,
`idx_variants_product_id`, `idx_products_category_id`
(`apps/api/data/mysql/migrations/000001_initial_schema.up.sql:73-141`). The `LIKE '%token%'`
inside each subquery cannot use an index at all (leading wildcard), so adding one would be
dead weight — see D10.

**New backend code:**

| File | Change |
| --- | --- |
| `apps/api/data/mysql/product_search.go` | new — `applyProductSearchFilter(db *gorm.DB, query string) *gorm.DB` |
| `apps/api/data/mysql/product_repo.go` | `GetProductList:22-24` and `GetProductListTotal:62-64` both call the helper instead of inlining `name LIKE ?` |
| `apps/api/domain/search_query.go` | new — `TokenizeSearchQuery(query string) []string` (Phase 2) |
| `apps/api/data/mysql/product_search_test.go` | new — dry-run SQL assertions, same `newDryRunDb` pattern as `availability_columns_test.go:15-28` |
| `apps/api/domain/search_query_test.go` | new — tokenizer table test |

**New frontend code:**

| File | Change |
| --- | --- |
| `libs/ui/src/utils/matchMenuSearch.ts` | new — pure matcher returning which option values / variants a query hit |
| `libs/ui/src/utils/index.ts` | barrel export (invisible to consumers otherwise) |
| `libs/ui/src/data/mock/menu.ts:123-135` | `MockMenuRepository.fetchMenu` mirrors the widened matching, so usecase/handler tests exercise it |
| `libs/ui/src/presentation/views/components/menu/MenuProductCard.tsx` | new optional `matchedLabels: string[]` prop, rendered as chips under the name |
| `libs/ui/src/presentation/views/screens/order/MenuListScreen.tsx` | new `matchedLabelsByProductId: Record<number, string[]>` prop (mirrors the existing `startingPriceByProductId`), placeholder copy |
| `libs/ui/src/presentation/handlers/order/MenuListHandler.tsx` | computes the record and the preselection; no new effects |
| `libs/ui/src/domain/usecases/menuItemDetail.ts` | `SELECT_PRODUCT` gains optional `preselectedOptionValueIds`, merged with the existing `initialSelectedOptionValueIds` (`:58-64`) |
| stories + tests | `MenuProductCard.stories.tsx`, `MenuListScreen.stories.tsx`, `MenuListHandler.test.tsx`, `menuItemDetail.test.ts`, `matchMenuSearch.test.ts` |
| `apps/order-web-e2e/src/table-ordering.spec.ts:100-113` | a search-by-option-value case |

The SQL the helper produces, per token (existing `deleted_at`, `sale_type`, `status`,
`ORDER BY`, `LIMIT`/`OFFSET` clauses untouched):

```sql
AND (
      products.name LIKE ?                                    -- '%earl grey%'
   OR products.description LIKE ?
   OR EXISTS (SELECT 1 FROM categories c
               WHERE c.id = products.category_id AND c.name LIKE ?)
   OR EXISTS (SELECT 1 FROM variants v
               WHERE v.product_id = products.id
                 AND v.deleted_at IS NULL                     -- D5
                 AND v.name LIKE ?)
   OR EXISTS (SELECT 1 FROM options o
               JOIN option_values ov ON ov.option_id = o.id
              WHERE o.product_id = products.id AND ov.name LIKE ?)
)
```

`products.description` is nullable `TEXT`; `NULL LIKE ?` yields `NULL`, which is not `TRUE`,
so a missing description simply never matches — no `COALESCE` needed.

### Functional requirements

- **FR-1** A search term matches a product if it matches any of: the product name, the
  product description, the product's category name, any non-deleted variant name of the
  product, or any option value name of the product. Results remain one card per product,
  grouped by category exactly as today (`MenuListHandler.groupByCategory`).
- **FR-2** A multi-word query requires **every** word to match at least one of those
  fields; different words may match different fields. "earl grey" matches the option value
  `Earl Grey`; "teh besar" matches a `Teh` whose option values include `Besar`.
- **FR-3** Matching is case-insensitive and substring-based, so "grey", "GREY" and
  "rl gre" all find `Earl Grey`.
- **FR-4** When a product appears because a variant or option value matched, its card shows
  the matching label(s) — e.g. a chip reading `Earl Grey` under the product name — so the
  guest sees *why* the result is there. Sold-out option values (per
  `resolveOptionValueAvailability`) are shown last or omitted, never presented as
  orderable. A product that matched only on its own name shows no hint.
- **FR-5** Opening a search result whose match was unambiguous (exactly one matching value
  within a given option) preselects that option value in the detail sheet, so "earl grey" →
  tap → the `Earl Grey` chip is already active. Ambiguous matches preselect nothing. The
  guest can always change the selection.
- **FR-6** The search placeholder tells the guest the box accepts more than a product name:
  "Cari menu atau varian" replaces "Cari menu". (`sel.menuList.searchInput` in
  `apps/order-web-e2e/src/utils/selectors.ts:11` uses `getByPlaceholder('Cari menu')`, which
  is substring-matching by default and keeps working — to be confirmed in the phase that
  makes the change.)
- **FR-7** The POS product list (`GET /products`) gains the same matching, with its
  pagination and totals still consistent.
- **FR-8** An unmatched query still shows the existing empty state
  (`MenuListScreen.tsx:102-106`); no copy change required.

## Design decisions

- **D1 — The product stays the result unit; option values and variants are only *reasons*.**
  One card per product, as today.
  *Alternative rejected:* variant-level results (a card per variant). A two-size drink would
  appear twice, and `groupByCategory` / `computeStartingPriceByProductId` in
  `MenuListHandler.tsx:39-59` both assume one card per product.

- **D2 — Widen the server query; the client stays a consumer of it.** `query` on
  `/public/products` remains authoritative.
  *Alternative rejected:* Option B (client-side filtering). It forks POS semantics from
  order-app semantics and makes "the whole catalog fits on the client" a requirement rather
  than a coincidence.

- **D3 — Searchable: `products.name`, `products.description`, `categories.name`,
  `variants.name`, `option_values.name`. Not searchable: `products.recipe`,
  `variants.recipe`, `variants.description`, `options.name`, material names.** Recipe is
  internal staff content and must not be reachable from an unauthenticated endpoint.
  `options.name` ("Ukuran") describes the *question*, not an answer a guest would type.

- **D4 — One shared helper for both SQL sites.** `GetProductList` and
  `GetProductListTotal` duplicate the filter today (`product_repo.go:22-24` and `:62-64`);
  widening it in one and not the other would make a page's `total` disagree with its rows.
  `applyProductSearchFilter` is called by both, and the test asserts both produce the same
  `WHERE` fragment.

- **D5 — Correlated `EXISTS`, not `JOIN` + `GROUP BY`.** A join to `option_values` fans out
  one row per matching value, which then needs `DISTINCT`/`GROUP BY` and collides with the
  existing `ORDER BY` + `skip`/`limit`. The variant `EXISTS` filters
  `v.deleted_at IS NULL`, so a soft-deleted variant can never resurface its product.
  (`option_values` and `options` have no `deleted_at` column — removals there are hard
  deletes in `UpdateProductById` — so no equivalent clause is needed.)

- **D6 — Tokenised AND-of-ORs.** Every whitespace-separated token must match some field;
  tokens are independent of each other. Consequence, accepted deliberately: "earl grey
  besar" matches a `Teh` that has an `Earl Grey` variant and a `Besar` variant even when no
  single variant is both. The guest is shown a product they then configure, and the detail
  sheet's chips already disable impossible combinations via
  `resolveOptionValueAvailability`.

- **D7 — Bound the query: at most 8 tokens, at most 100 characters, longer input truncated.**
  Each token adds 5 placeholders to the SQL; unbounded input means unbounded statement size
  on an unauthenticated endpoint. No minimum token length — "es" and "teh" are real
  Indonesian search terms.

- **D8 — Rely on the column collation for case/accent folding; never wrap columns in
  `LOWER()`.** The catalog tables are declared `DEFAULT CHARSET=utf8mb4` with no explicit
  collation (`000001_initial_schema.up.sql`), so `LIKE` follows the server's default
  collation, which is case-insensitive on both MySQL 5.7 (`utf8mb4_general_ci`) and 8.0
  (`utf8mb4_0900_ai_ci`). `LOWER(col) LIKE ?` would add a per-row function call and rule out
  any future index. FR-3 is verified behaviourally in the e2e phase, not assumed from the
  DDL.

- **D9 — No relevance ranking; the existing `sortBy`/`order` is preserved.** The order app
  regroups results by category before rendering
  (`MenuListHandler.tsx:39-47`, `MenuListScreen.tsx:117-123`), so a global relevance order
  would be invisible on the screen that motivated this work. Ranking becomes worth doing
  only together with a flat "search results" list — see *Deferred*.

- **D10 — No new tables and no new indexes.** The `EXISTS` correlations already have their
  FK indexes; the `LIKE '%…%'` predicates cannot use an index under any schema we could add
  short of `FULLTEXT` (Option C).

- **D11 — The match hint and the preselection are computed client-side, from data already
  on the client.** `matchMenuSearch(query, product, variants)` in `libs/ui/src/utils/`,
  consumed by `MenuListHandler`.
  *Alternative rejected:* returning `matchedOptionValueIds` on the public product response.
  It would be authoritative, but it puts a search-only field on the shared `Product` schema
  (also used by POS product forms), costs a codegen round, and makes a cosmetic hint into a
  contract. Because the server still decides membership, a client/server disagreement
  degrades to "no hint shown" — never to a wrong or missing product.

- **D12 — Accept that the matcher exists in Go and in TypeScript, and pin it with one shared
  fixture table.** The same `query → expected` cases (including "earl grey", "EARL GREY",
  "teh besar", "rl gre") appear in `product_search_test.go` and `matchMenuSearch.test.ts`,
  with a comment in each pointing at the other. Divergence is then a failing test, not a
  silent drift.

- **D13 — Preselect only an unambiguous match.** If exactly one value of an option matched,
  select it; if two values of the same option matched, select none of them. Implemented by
  extending `SELECT_PRODUCT` in `menuItemDetail.ts`, alongside the existing single-option
  auto-selection at `:59-64` — not as a new effect in the handler (a use case is a state
  machine; selection state belongs in it).

- **D14 — Keep the 600 ms search debounce** (`MenuListHandler.tsx:300`). Its reason is the
  server round trip, which this change does not remove. Revisit only with instant local
  narrowing (*Deferred*).

- **D15 — The POS product list inherits the widened matching, intentionally.** Same
  repository method, same fix, same benefit for a cashier typing "earl grey" into the
  product list. `productList.ts` and its URL-persisted query need no change. Worth one line
  in the release notes so it is not read as a regression.

## Phased plan

Seven PRs on two independent tracks. Each leaves `main` green and the product shippable.

| Phase | Track | Title | Depends on |
| --- | --- | --- | --- |
| P1 | Backend | Widen the product query filter to category, variant and option-value names | — |
| P2 | Backend | Multi-word (tokenised) matching + query caps | P1 |
| P3 | Frontend | `matchMenuSearch` util + widen the mock menu repository | — |
| P4 | Frontend | Match hint on the product card + placeholder copy | P3 |
| P5 | Frontend | Preselect the matched option value in the detail sheet | P3 |
| P6 | QA | e2e: find a product by its option value | P1 |
| P7 | Docs | Document menu search on the docs site | P1 (for accuracy) |

Dependency graph — **P1 and P3 can start at the same time**, and after P1 lands, P2, P6 and
P7 are independent of each other:

```
P1 ──┬── P2
     ├── P6
     └── P7

P3 ──┬── P4
     └── P5
```

P4 and P5 are siblings and can be reviewed in parallel; both touch `MenuListHandler.tsx`,
so whichever lands second rebases on the first. Nothing in the frontend track needs the
backend track to have merged — P3–P5 are exercised by `MockMenuRepository`, and against a
pre-P1 server they simply render no hints because no option-value match ever reaches the
client.

**P1 — Widen the product query filter.** Add `apps/api/data/mysql/product_search.go` with
`applyProductSearchFilter`, emitting the five-way `OR` from the *System design overview* for
the whole query string (still one token), and call it from both `GetProductList:22-24` and
`GetProductListTotal:62-64`. Files: those two plus `product_search_test.go`.
*Acceptance:* `npx nx run api:test` green; a dry-run test (the `newDryRunDb` helper pattern
from `availability_columns_test.go:15-28`) asserts the statement contains all three `EXISTS`
clauses, the variant clause carries `deleted_at`, the vars are five copies of `%earl grey%`,
and list and total produce identical `WHERE` text. Manual check against a seeded DB:
`GET /public/products?query=earl%20grey` returns the parent product.

**P2 — Tokenised matching.** Add `TokenizeSearchQuery` to `apps/api/domain/search_query.go`
(lowercase-agnostic split on whitespace, drop empties, cap 8 tokens / 100 chars per D7) and
make `applyProductSearchFilter` `AND` one five-way `OR` group per token. Files:
`domain/search_query.go`, `domain/search_query_test.go`, `data/mysql/product_search.go`,
`data/mysql/product_search_test.go`. *Acceptance:* `npx nx run api:test`; the tokenizer
table test covers empty, whitespace-only, 9-token and 120-char inputs; the SQL test asserts
two tokens produce two `AND`-ed groups and 10 vars.

**P3 — `matchMenuSearch` + mock parity.** Add the pure util and export it from
`libs/ui/src/utils/index.ts`; it takes `(query, product, variants)` and returns the matched
option values, matched variant names, and whether the product name itself matched. Then
make `MockMenuRepository.fetchMenu` (`libs/ui/src/data/mock/menu.ts:123-135`) filter through
it, so every existing usecase/handler test starts exercising the real semantics. Files: the
util, its test, the barrel, the mock. *Acceptance:* `npx nx run ui:test`;
`matchMenuSearch.test.ts` carries the D12 fixture table verbatim; `menuList.test.ts` still
passes unchanged.

**P4 — The hint on the card.** `MenuProductCard` gains `matchedLabels?: string[]` rendered
as small chips under the product name; `MenuListScreen` gains
`matchedLabelsByProductId: Record<number, string[]>` beside the existing
`startingPriceByProductId`; `MenuListHandler` computes it from `matchMenuSearch` over
`menuList.state.products` / `.variants`, ordering sold-out values last per FR-4. Placeholder
copy per FR-6. Files: those three, plus `MenuProductCard.stories.tsx`,
`MenuListScreen.stories.tsx`, `MenuListHandler.test.tsx`. *Acceptance:* `npx nx run ui:test`
and `npx nx run ui:storybook` render a searched-by-option-value story; a handler test types
"besar" into the search box and asserts the chip is visible by accessible role; the e2e
placeholder selector still resolves.

**P5 — Preselect the matched option value.** Extend `MenuItemDetailAction`'s
`SELECT_PRODUCT` with `preselectedOptionValueIds?: number[]`, merge it into the initial
selection next to `initialSelectedOptionValueIds` (`menuItemDetail.ts:58-64`), drop
ambiguous matches per D13, and pass it from the handler's existing `SELECT_PRODUCT`
dispatch. Files: `menuItemDetail.ts`, `menuItemDetail.test.ts`, `MenuListHandler.tsx`,
`MenuListHandler.test.tsx`. *Acceptance:* `npx nx run ui:test`; a `UsecaseTester` case
asserts a preselected value moves the machine straight to `resolvingVariant`, and an
ambiguous match leaves `selectingOptions` with no selection.

**P6 — e2e coverage.** Extend `apps/order-web-e2e/src/table-ordering.spec.ts:100-113`: the
fixture already creates option values `Reguler` / `Besar`, so add a case that searches
`Besar` (and `BESAR`, for FR-3) and asserts the product card appears while the decoy
product stays hidden. Files: that spec only. *Acceptance:* `npx playwright test` against a
locally running order app and API — the suite only runs post-merge
(`.github/workflows/e2e-main.yml`), so it must be run locally before merging.

**P7 — Docs.** A "Mencari menu" section in `docs-site/sales/table-ordering.md` explaining
that a guest can search by product, flavour, size or category, plus a line in
`docs-site/catalog/products.md` noting that option values are searchable — which is a
reason to name them the way guests say them. Files: those two, and the sidebar only if a
new page is added (it is not). *Acceptance:* `npx nx run docs-site:build`.

## Risks

- **R1 — Noisier results from description matching.** Searching "es" may now match
  descriptions across the menu. Mitigation: `products.description` is one `OR` line in one
  helper and can be dropped without touching anything else; FR-4's hint makes the reason for
  every result visible, which is how the operator will notice if it is too loose.
- **R2 — The existing N+1 on availability gets more work to do.**
  `ProductUsecase.GetProductList` (`apps/api/domain/product_usecase.go:29-48`) calls
  `resolveAvailability` per returned product, and each call is a full `GetVariantList` with
  six `Preload`s. A broader matcher returns more products per query, so a one-character
  query costs proportionally more. Mitigation: measure `GET /public/products?query=a` before
  and after P1 on a production-sized catalog; batching `resolveAvailability` is a separate,
  already-worthwhile change (*Deferred*) and is not a blocker at café scale.
- **R3 — Go/TypeScript matcher drift** (D12). Contained by construction: the server decides
  membership, so drift shows up as a missing hint, never a wrong result set. The shared
  fixture table turns it into a failing test.
- **R4 — The POS product list changes behaviour for cashiers** (D15). Intentional, but it
  will be noticed. Mitigation: the P7 docs line and a release note.
- **R5 — `LIKE '%token%'` scales linearly and cannot be indexed.** At café scale
  (tens of products, low hundreds of variants) this is noise. Mitigation: the thresholds in
  *Deferred* name when Option C becomes the answer.
- **R6 — Statement size on an unauthenticated endpoint.** Bounded by D7's token and length
  caps, asserted in P2's test.

## Out of Scope

- The KDS and mobile POS surfaces — neither has a menu search box today.
- Rental products (`saleType = 'rental'`): they flow through the same repository method and
  therefore get the same widening for free, but no rental-specific search UX is designed
  here.
- Search analytics (what guests searched and found nothing).

## Deferred

- **Typo tolerance and synonyms** — "kopi susi", "besar"/"large", "es"/"ice". Needs a word
  list from the operator plus either trigram scoring or a search engine; revisit after
  seeing real zero-result queries (which requires the analytics above).
- **Relevance ranking and match highlighting** — only meaningful together with a flat
  search-results list that replaces the category grouping while a query is active (D9).
- **Instant client-side narrowing** while the debounced request is in flight — Option B's
  best idea, layered on top of A. Non-trivial because the currently loaded set is already
  server-filtered: narrowing is valid when the guest adds characters and invalid when they
  delete them.
- **`FULLTEXT`/`ngram` index or a `product_search_index` table** (Option C). Trigger: more
  than ~1,000 published products, or p95 `GET /public/products?query=…` above 300 ms.
- **Batching `resolveAvailability`** into one variant query per request instead of one per
  product (R2) — independently worthwhile, sized as its own TRD.
- **Matching material names** ("what has oat milk") — staff-facing, and would expose recipe
  composition on a public endpoint, so it belongs behind `CheckAuth` if ever wanted.

## Success Criteria

1. Searching "earl grey" in the order app returns the product carrying that option value;
   searching "banana" returns the product carrying a `Banana` variant or option value.
2. Both of those cards show *why* they matched, and tapping one opens the detail sheet with
   the matched chip already selected.
3. "EARL GREY", "earl grey" and "rl gre" return the same product (FR-3).
4. "teh besar" returns only products satisfying both words (FR-2).
5. The POS product list finds the same products for the same terms (FR-7).
6. No change to `libs/api-contract/src/api.yaml`, no migration, no new index.
7. `npx nx affected -t test lint` green on every phase; the order-web e2e suite green
   locally before P6 merges.

## Open Questions

1. **Is `products.description` in or out?** Recommended in (guests do search "gula aren"),
   but it is the one field likely to generate complaints about noise, and it is one line to
   remove. Decide before P1 merges.
2. **Should the POS list get the widening in the same PR, or behind a flag first?**
   Recommended in the same PR (D15) — a flag would mean two search semantics, which is the
   thing this PRD is trying to remove.
3. **Should a zero-result query fall back to a looser match** (any token instead of all
   tokens) with a "showing results for one of your words" note, or keep the strict empty
   state? Recommended: keep it strict now; revisit with real zero-result data.
