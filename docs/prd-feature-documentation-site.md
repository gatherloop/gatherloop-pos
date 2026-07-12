# PRD + Implementation Plan: Feature Documentation Site (GitHub Pages)

> One document, two parts. **Part A** is the PRD (the *what* and *why*). **Part B** is the phased implementation plan (the *how*), where **each phase is one small, self-contained, manually reviewable pull request**.

---

# Part A — Product Requirements

## Problem Statement

Gatherloop POS is a genuinely capable product — it runs a real coffee shop, spanning sales, catalog, inventory, finance, and operations across web and mobile. But that capability is **invisible to anyone who isn't already reading the source code**.

Today the only "documentation" is:

- `README.md` — a solid but developer-facing overview (setup commands, Nx targets, Clean Architecture internals).
- `docs/*.md` — a folder of internal engineering PRDs and plans, not written for outside readers.

There is **no single, shareable, good-looking page** that answers *"what can this POS actually do?"* for a non-technical or semi-technical audience. If a café owner, a potential investor, or a recruiter lands on the repo, they have to reverse-engineer the value from code and terse feature bullets.

### The feature in one sentence

**Build a public, GitHub Pages–hosted documentation website — with a persistent sidebar that lists every feature by section — that showcases what the POS can do, and deploy it automatically on every push to the default branch.**

---

## Goals & Audiences

The site has **three audiences**, and every page should serve at least one of them well.

| Audience | What they want to learn | How the site serves them |
|---|---|---|
| **Coffee shop staff / owners** (users & prospective users) | "Can this run my shop? What does each screen do for me?" | Feature pages written in plain language, organized by the job to be done (selling, restocking, tracking money), each with a screenshot and a "why it matters" note. |
| **Investors** | "Is this a real, complete product? How broad is the surface area? Is it thoughtfully built?" | Breadth on display via the sidebar (one glance = the full feature map), a value-framed overview, and a roadmap that signals momentum. |
| **Recruiters / hiring engineers** | "Can this person design and ship a non-trivial system?" | An "Under the Hood" section: architecture diagrams, tech stack rationale, Clean Architecture write-up, testing strategy — linking into the real source. |

### Success criteria

- ✅ A visitor can understand **every major feature** of the POS in under 10 minutes, without reading code.
- ✅ The **sidebar** always shows the full feature catalog, grouped into logical sections.
- ✅ The site is **live at a public URL** (`https://gatherloop.github.io/gatherloop-pos/`) and **redeploys automatically** when docs change on the default branch.
- ✅ It looks **professional and polished** on desktop and mobile, with dark mode and working search.
- ✅ Content is **plain Markdown**, so adding a feature page later is a one-file change.

### Non-goals

- ❌ Not API reference docs / not an OpenAPI viewer (the contract already lives in `libs/api-contract`).
- ❌ Not developer setup instructions — that stays in `README.md` (the site *links* to it).
- ❌ Not a live/interactive demo of the app itself (screenshots and descriptions only).
- ❌ Not versioned docs — a single "current" version is sufficient for a showcase.

---

## The Feature Catalog (what the site must cover)

Derived from the actual app (`apps/web/src/pages/**` routes and `libs/ui/src/presentation/screens/**`). The sidebar groups these by **the job the user is doing**, not by code layout:

| Sidebar section | Features (pages) | Source anchor |
|---|---|---|
| **Overview** | What is Gatherloop POS · The big picture (one diagram) · Who it's for | `README.md` |
| **Sales & Checkout** | Transactions (cart, checkout, payment, receipt printing) · Coupons · Board-game Rentals (check-in / check-out) | `transactions/`, `coupons/`, `rentals/` |
| **Catalog** | Categories · Products · Product Variants · Materials (recipe ingredients) | `categories/`, `products/`, `variants/`, `materials/` |
| **Inventory** | Stock Checks · Purchase Lists · Suppliers | `stock-checks/`, `purchaseLists/`, `suppliers/` |
| **Finance** | Dashboard & Statistics (sales + expense charts) · Expenses · Budgets (cash-flow budgeting) · Wallets & Transfers · Cost/Profit Calculations | `index.tsx`, `expenses/`, `budgets/`, `wallets/`, `calculations/` |
| **Operations** | Operational Checklists (templates & sessions) · Tickets | `checklist-*`, `tickets/` |
| **Under the Hood** *(recruiter-focused)* | Architecture at a glance · Tech stack & why · Clean Architecture (frontend & backend) · Cross-platform (web + mobile) · Testing strategy | `README.md §5`, `docs/*TEST*` |
| **Roadmap** | Shipped / In progress / Planned (mined from `docs/prd-*.md`) | `docs/` |

> Each feature page follows one **template**: *What it does* → *Why it matters (business value)* → *Screenshot* → *Key capabilities (bullets)* → optional *"For engineers"* footnote linking to source. Consistency is what makes the site feel finished.

---

## Solution Overview

### Tooling decision: **VitePress**

A static-site generator that turns a folder of Markdown into a themed site with a sidebar. Recommendation and rationale:

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **VitePress** ✅ | Markdown-first (content = plain `.md`); beautiful default theme with **built-in sidebar, nav, dark mode, local search**; near-zero config; tiny footprint; trivial GitHub Pages deploy; Vue/Vite under the hood (already a Vite-friendly repo). | Not React-based (irrelevant — we write Markdown, not components). | **Chosen** |
| Docusaurus | Very featureful (versioning, blog, MDX, i18n). | Heavier, more config and dependencies than a single-version showcase needs. | Overkill |
| Nextra | Next.js-based (matches `apps/web`). | More setup than VitePress for the same result; couples docs to Next. | Runner-up |
| Hand-rolled Next.js page in `apps/web` | Reuses existing app. | We'd rebuild sidebar/search/theme by hand; bloats the product app with marketing content; slower to author. | Rejected |

**Why VitePress wins for this goal:** the deliverable is *polished feature prose behind a sidebar*, authored fast and maintained by non-experts. VitePress gives the sidebar, theme, search, and mobile layout for free, so effort goes into **content**, not scaffolding.

### Where it lives: a standalone `docs-site/` directory

- New top-level **`docs-site/`** with its own `package.json` — **decoupled from Nx**.
  - *Why not `apps/docs` in Nx?* Keeps each review PR small and avoids Nx executor/inference wiring; the site is a leaf with no dependency on the monorepo's build graph.
  - *Why not the existing `docs/` folder?* That folder holds **internal** engineering PRDs (like this one) that we do **not** want published. Keeping the published site separate avoids leaking internal planning docs to the public URL.
- Published content authored under `docs-site/` (VitePress convention: `docs-site/index.md`, `docs-site/guide/*.md`, config in `docs-site/.vitepress/config.ts`).

### Hosting & deployment: GitHub Pages via GitHub Actions

- **The repo currently has _no_ `.github/workflows/`** — so a CI workflow must be added from scratch (see Phase 2). Nothing existing is disturbed.
- Public URL (GitHub *project* site): **`https://gatherloop.github.io/gatherloop-pos/`** → VitePress `base: '/gatherloop-pos/'`.
- Deploy with the official Pages actions (`actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`), triggered on push to the default branch **only when `docs-site/**` changes** (path filter), plus manual `workflow_dispatch`.
- Pages source = **GitHub Actions** (not a `gh-pages` branch), so no build artifacts are committed to git.

### Information architecture

```
docs-site/
├─ .vitepress/
│  └─ config.ts            # site title, nav, the SIDEBAR definition, theme, search, base
├─ public/                 # screenshots & static assets (served at /gatherloop-pos/...)
│  └─ screenshots/
├─ index.md                # landing/home page (hero + feature highlights)
├─ overview/               # Overview section
├─ sales/                  # Sales & Checkout section
├─ catalog/                # Catalog section
├─ inventory/              # Inventory section
├─ finance/                # Finance section
├─ operations/             # Operations section
├─ under-the-hood/         # Architecture / tech / testing (recruiter section)
└─ roadmap.md
```

The **sidebar** is defined once in `config.ts` and mirrors the Feature Catalog table above — it is the site's spine and the investors' one-glance feature map.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| GitHub Pages base-path mistakes → broken CSS/links (classic project-site trap). | Set `base: '/gatherloop-pos/'` in Phase 2 and verify the deployed URL before writing content. Use root-relative asset paths via VitePress's `/`-prefix convention. |
| Screenshots go stale as the app evolves. | Store all images in `docs-site/public/screenshots/` with a short `README` on how to recapture; keep them in their own Phase (10) so they're easy to refresh in isolation. |
| Publishing internal PRDs by accident. | Site content lives only in `docs-site/`; the internal `docs/` folder is never part of the VitePress `srcDir`. |
| Deploy workflow needs Pages permissions. | Workflow declares `permissions: { pages: write, id-token: write }` and the correct `environment: github-pages`; called out explicitly in Phase 2. |
| Scope creep (turning into full user manual). | Every page uses the fixed template and targets the three audiences; anything deeper links into source instead. |

---

# Part B — Phased Implementation Plan

**Principles for this plan**

- **One phase = one PR.** Each is small, independently reviewable by a human, and leaves `main` in a working state.
- **Deploy early.** The pipeline goes live with a placeholder (Phases 0–2) *before* any real content, so every later content PR is verifiable at the real URL.
- **Content phases are parallelizable and independently mergeable** — each adds one sidebar section and touches only its own folder.
- Each phase lists **Scope**, **Files**, **Acceptance**, and **Review size** (rough diff footprint, to reassure the reviewer).

---

## Phase 0 — Scaffold the VitePress site (local only)

**Scope:** Stand up VitePress with a single placeholder home page that runs locally. No CI, no deploy yet.

**Files**
- `docs-site/package.json` — `vitepress` devDependency; `dev` / `build` / `preview` scripts.
- `docs-site/.vitepress/config.ts` — minimal config: `title`, `description`, empty nav/sidebar.
- `docs-site/index.md` — placeholder home ("Gatherloop POS — docs coming soon").
- `docs-site/.gitignore` — ignore `.vitepress/dist` and `.vitepress/cache`.
- Root `.gitignore` — add `docs-site/node_modules` if not already covered.

**Acceptance**
- `cd docs-site && npm install && npm run dev` serves a page locally.
- `npm run build` produces `docs-site/.vitepress/dist` with no errors.

**Review size:** ~5 small files. Pure scaffolding, no content decisions.

---

## Phase 1 — Site shell: branding, nav, and the empty sidebar skeleton

**Scope:** Configure the site's identity and the **full sidebar structure** — every section from the Feature Catalog present as headings with placeholder (stub) pages. This locks the information architecture before any prose is written, so content PRs just fill pages in.

**Files**
- `docs-site/.vitepress/config.ts` — set `title: 'Gatherloop POS'`, description, top nav, dark mode, local search (`themeConfig.search: { provider: 'local' }`), social link to the repo, and the **complete `sidebar` object** matching the catalog sections.
- Stub `.md` files (one heading + "coming soon") for every planned page under `overview/`, `sales/`, `catalog/`, `inventory/`, `finance/`, `operations/`, `under-the-hood/`, and `roadmap.md`.
- `docs-site/index.md` — VitePress "home" layout hero (title, tagline, "Explore features" CTA) using front-matter `layout: home`.

**Acceptance**
- Local dev shows a working sidebar with every section; each entry navigates to a stub page.
- Search box and dark-mode toggle work.

**Review size:** 1 config file + ~20 one-line stub pages. Reviewer checks the IA, not prose.

---

## Phase 2 — GitHub Pages deployment pipeline (goes live)

**Scope:** Add the CI workflow that builds `docs-site/` and deploys to GitHub Pages. After this PR, the shell + stubs are publicly live and every later PR is verifiable at the real URL.

**Files**
- `.github/workflows/deploy-docs.yml` — **new** (repo has no workflows today):
  - Triggers: `push` to default branch with `paths: ['docs-site/**', '.github/workflows/deploy-docs.yml']`, plus `workflow_dispatch`.
  - `permissions: { contents: read, pages: write, id-token: write }`, `environment: github-pages`.
  - Steps: checkout → setup Node → `npm ci` in `docs-site` → `npm run build` → `actions/configure-pages` → `actions/upload-pages-artifact` (path `docs-site/.vitepress/dist`) → `actions/deploy-pages`.
- `docs-site/.vitepress/config.ts` — add `base: '/gatherloop-pos/'`.

**Acceptance**
- Merging runs the workflow green; **`https://gatherloop.github.io/gatherloop-pos/` loads** the shell with correct CSS and working links (base path verified).
- A no-op change outside `docs-site/` does **not** trigger a docs deploy.

**Review size:** 1 workflow file + 1 config line. **Manual step noted in PR description:** repo Settings → Pages → Source = "GitHub Actions" (one-time, by the maintainer).

> **Phases 0–2 deliver a live, empty-but-polished site.** Everything below is pure content, each PR independently shippable.

---

## Phase 3 — Content: Overview section

**Scope:** Fill the `overview/` pages — the front door for all three audiences.

**Files:** `docs-site/overview/*.md` (What is Gatherloop POS, The big picture, Who it's for) + polish `index.md` hero with the top 4–6 feature highlights.

**Acceptance:** Overview reads cleanly end-to-end; hero links into the feature sections; a first-time visitor understands the product's purpose.

**Review size:** ~3–4 prose pages.

---

## Phase 4 — Content: Sales & Checkout

**Scope:** Feature pages for **Transactions** (cart → checkout → payment → receipt printing), **Coupons**, and **Rentals** (check-in/check-out), each using the standard page template.

**Files:** `docs-site/sales/*.md`.

**Acceptance:** Each page has What/Why/Key-capabilities; screenshots referenced (placeholders acceptable until Phase 10); business value stated in plain language.

**Review size:** ~3 prose pages.

---

## Phase 5 — Content: Catalog

**Scope:** **Categories, Products, Product Variants, Materials** — emphasize the recipe/material→product cost linkage that powers pricing.

**Files:** `docs-site/catalog/*.md`.

**Acceptance:** Pages explain how catalog structure feeds cost & profit tracking; consistent template.

**Review size:** ~4 prose pages.

---

## Phase 6 — Content: Inventory

**Scope:** **Stock Checks, Purchase Lists, Suppliers** — the restock loop.

**Files:** `docs-site/inventory/*.md`.

**Acceptance:** The flow from stock check → purchase list → supplier is legible to a shop owner.

**Review size:** ~3 prose pages.

---

## Phase 7 — Content: Finance

**Scope:** **Dashboard & Statistics** (sales + expense charts), **Expenses**, **Budgets** (cash-flow budgeting), **Wallets & Transfers**, **Cost/Profit Calculations** — the money story that most impresses investors.

**Files:** `docs-site/finance/*.md`.

**Acceptance:** The budgeting/cash-flow model and the automatic cost/profit calculation are clearly explained; charts shown via screenshots.

**Review size:** ~5 prose pages.

---

## Phase 8 — Content: Operations

**Scope:** **Operational Checklists** (templates & sessions) and **Tickets**.

**Files:** `docs-site/operations/*.md`.

**Acceptance:** Daily-operations value is clear (opening/closing routines, issue tracking).

**Review size:** ~2 prose pages.

---

## Phase 9 — Content: Under the Hood (recruiter section)

**Scope:** The engineering-credibility pages — **Architecture at a glance, Tech stack & rationale, Clean Architecture (FE & BE), Cross-platform web+mobile, Testing strategy** — reusing `README.md §5` and the existing test-plan docs, embedding the architecture diagrams, and linking into real source files.

**Files:** `docs-site/under-the-hood/*.md`; copy/optimize the two architecture PNGs into `docs-site/public/`.

**Acceptance:** A hiring engineer can assess system design without cloning; diagrams render; source links resolve to `github.com/gatherloop/gatherloop-pos`.

**Review size:** ~5 prose pages + 2 images.

---

## Phase 10 — Polish: screenshots, roadmap, SEO & final pass

**Scope:** Capture and drop in real UI screenshots across all feature pages, write the **Roadmap** (mined from `docs/prd-*.md`: shipped / in-progress / planned), and add finishing touches.

**Files**
- `docs-site/public/screenshots/*` + a short `docs-site/public/screenshots/README.md` on how to recapture.
- `docs-site/roadmap.md`.
- `config.ts` — SEO/social meta (`head` tags: description, Open Graph title/image, favicon), and a footer.

**Acceptance:** Every feature page shows a real screenshot; roadmap is current; link preview (OG image) renders when the URL is shared; Lighthouse/manual pass looks professional on mobile + desktop, light + dark.

**Review size:** Mostly assets + 1 page + config; visually reviewable.

---

## Rollout summary

| Phase | PR title (suggested) | Deliverable | Depends on |
|---|---|---|---|
| 0 | `docs: scaffold VitePress site` | Runs locally | — |
| 1 | `docs: site shell + sidebar skeleton` | Full IA, stub pages | 0 |
| 2 | `ci: deploy docs to GitHub Pages` | **Live site** at public URL | 1 |
| 3 | `docs: overview section` | Front-door content | 2 |
| 4 | `docs: sales & checkout` | Feature pages | 2 |
| 5 | `docs: catalog` | Feature pages | 2 |
| 6 | `docs: inventory` | Feature pages | 2 |
| 7 | `docs: finance` | Feature pages | 2 |
| 8 | `docs: operations` | Feature pages | 2 |
| 9 | `docs: under the hood` | Architecture/recruiter content | 2 |
| 10 | `docs: screenshots, roadmap & polish` | Final showcase | 3–9 |

Phases 0–2 are strictly sequential (they build the live pipeline). Phases 3–9 are **independent** and can be authored/merged in any order or in parallel once the pipeline exists. Phase 10 lands last as the finishing pass.
