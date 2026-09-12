---
name: docs-site-page
description: >-
  Add or update a feature page on the VitePress documentation site in docs-site/, including its
  sidebar entry. Use when shipping a user-facing feature that needs end-user documentation, or
  when asked to update the docs site, feature catalog, or GitHub Pages content.
---

# docs-site-page

~20 pages document the product's full feature catalog (`docs/prd-feature-documentation-site.md`
mandates completeness). A page is invisible until it's wired into
`docs-site/.vitepress/config.ts` — there's no error when that step is skipped, just a page
nobody can navigate to.

## 1. Pick the section

`docs-site/` has one directory per sidebar group, matching `themeConfig.sidebar` in
`.vitepress/config.ts`:

| Directory | Covers |
|---|---|
| `overview/` | What the product is, the big picture, who it's for |
| `sales/` | Transactions, coupons, rentals, table ordering, order checkout |
| `catalog/` | Categories, products, variants, materials |
| `inventory/` | Stock checks, purchase lists, suppliers |
| `finance/` | Dashboard, expenses, budgets, wallets, cash count |
| `operations/` | Checklists, tickets |
| `under-the-hood/` | Architecture, tech stack, clean architecture, cross-platform, testing |

## 2. Write the page

Match an existing sibling in the same section — `docs-site/sales/coupons.md` is a clean
reference. The house shape is:

1. `# <Feature name>`
2. **What it does** — operator-facing, plain language, no internal jargon.
3. **Why it matters** — the real cafe scenario that motivated it.
4. **Screenshot** — `![<Feature> screenshot](/screenshots/<name>.png)`.
5. **Key capabilities** — a bulleted list, bold lead-ins, concrete numbers and real examples
   over abstract description.
6. **For engineers** — real file paths (screens, entities, backend use cases) and a link to the
   PRD/TRD that decided the design, for a reader who wants to go deeper.

Voice is for the operator reading the page, not for an engineer reading the code — save file
paths for the last section. Put new screenshots in `docs-site/public/screenshots/` and new
diagrams in `docs-site/public/diagrams/`; if you add or change a screenshot, follow
`docs-site/public/screenshots/README.md` for how the existing ones were captured (real seeded
data, 1440×900 at 2x, no mockups) so the new one matches.

## 3. Wire the sidebar

Add a `{ text, link }` entry to the matching group in `themeConfig.sidebar` inside
`docs-site/.vitepress/config.ts`. A page that exists on disk but isn't in this array builds fine
and 404s for no one — it's just unreachable, which is worse than a build error because nothing
tells you it happened. Add it to `themeConfig.nav` too only if the whole section is new (existing
sections don't repeat their pages in `nav`).

## 4. `docs-site` is its own npm project

It has its own `package.json` and `package-lock.json` and is **not** an Nx project — there's no
`project.json` and it doesn't run through `nx run`. From inside `docs-site/`:

```bash
npm ci          # first time, or after package.json changes
npm run dev     # VitePress dev server
npm run build   # static build to .vitepress/dist
npm run preview # serve the built output
```

## Gotchas

- **`base: '/gatherloop-pos/'`.** The site is served from a subpath on GitHub Pages, so any
  absolute asset path you write by hand (not through VitePress's own `/screenshots/...`
  Markdown image syntax, which VitePress rewrites automatically) needs the `/gatherloop-pos/`
  prefix or it 404s in production while working fine in dev.
- **`deploy-pages.yml` only triggers on `docs-site/**` changes.** A page added in the same PR as
  unrelated app code still deploys correctly once merged to `main` — the workflow's path filter
  just means an app-only PR never touches the docs site build.
- **Don't author pages under `/order/`.** An inline script in `config.ts`'s `head` redirects any
  path starting `/gatherloop-pos/order/` to `ORDER_APP_BASE_URL` (a GitHub Actions *variable*,
  read at build time, not a secret) — that prefix belongs to the order web app, not to VitePress
  content, and a page placed there would be immediately redirected away.
- **Search is local** (`search: { provider: 'local' }`) and indexes at build time — a new page
  shows up in search after the next `npm run build`, not instantly in a running `npm run dev`
  session in every case.

## Verify

`npm run build` inside `docs-site/`, then `npm run preview` and check the new page renders, its
sidebar link resolves, and its screenshot loads at the `/gatherloop-pos/` base path (not just
under the dev server's root).
