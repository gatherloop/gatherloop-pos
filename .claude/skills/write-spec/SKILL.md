---
name: write-spec
description: >-
  Write a PRD or TRD in this repo's docs/ house style — numbered design decisions, alternatives
  considered, and a phased delivery plan sized one phase per PR. Use when asked to plan,
  design, spec, or write a PRD/TRD/plan for a feature or refactor before implementing it.
---

# write-spec

~30 documents in `docs/` already follow this format. Feature work in this repo starts as a
`docs/prd-*.md` or `docs/trd-*.md`, is delivered as the phases that document names, and later
documents cite its decisions by number (`D15`, `D21`) — so match the format, don't improvise one.

## 1. Which document

- **`prd-<kebab-topic>.md`** — *what and why, for the operator.* Product behaviour, UX,
  alternatives among product-level options. Example: `docs/prd-cash-flow-budgeting.md`.
- **`trd-<kebab-topic>.md`** — *how, structurally.* Architecture, refactors, migrations between
  technical approaches. Example: `docs/trd-presentation-layer-architecture.md`.
- **`plan-<kebab-topic>.md`** — a pure phase breakdown of an already-agreed design, when the
  design itself doesn't need a PRD/TRD's alternatives-and-decisions treatment. Example: this
  skill's own `docs/plan-claude-md-and-skills.md`.

All three live in `docs/`, never at the repo root — see the Gotchas section for why that matters
here specifically.

## 2. PRD outline

Match `docs/prd-cash-flow-budgeting.md`'s headings:

1. **Problem Statement** — what's broken today, with real file/function citations, ending in a
   **Root cause** subsection if the symptom and the cause are different things.
2. **How the Industry Handles This** *(when relevant)* — how comparable products solve it, with
   sources listed at the bottom of the doc.
3. **Alternatives Considered** — each option labelled Option A/B/C with a ✅ or ❌ verdict per
   bullet and an explicit **Recommended** pick. Don't present options neutrally; argue for one.
4. **Proposed Solution** — the design, broken into numbered functional requirements (`FR-1`,
   `FR-2`, ...) where useful.
5. **Design decisions** — `D1..Dn` (see §4 below).
6. **Phased plan** — see §5 below.
7. **Risks**, and as needed: **Out of Scope**, **Open Questions**, **Rollout Notes**, **Success
   Criteria**, **Sources**.

## 3. TRD outline

Match `docs/trd-presentation-layer-architecture.md`'s headings:

1. **Problem statement**
2. **Goals and non-goals** — goals labelled `G1..Gn`, non-goals `N1..Nn`, each one sentence.
3. **Current-state audit** — with real counts (file counts, line counts, call-site counts), the
   way §3 of `docs/plan-claude-md-and-skills.md` counts use cases and handlers. A TRD without
   measured numbers is an opinion, not an audit.
4. **Target architecture**
5. **Design decisions** — `D1..Dn` (see §4 below), each with an **Alternative rejected** where
   one was seriously considered.
6. **Phased delivery** — see §5 below; split into tracks if two concerns interleave.
7. **Risks**
8. **Rollback**
9. **Deferred** — named and reasoned about, not silently dropped.
10. **Settled in review** — decisions made after the doc was first written, recorded rather than
    silently edited in.

## 4. Decision numbering

One `D<n>` per decision. Numbers are stable once written — a later decision appends as `D<n+1>`;
never renumber existing ones, because other documents and even code comments cite them by
number (`D15`, `D21`). If a decision is superseded, say so in prose next to the old number rather
than reusing it for something else.

## 5. Phase sizing

Each phase is one PR. A phase entry states the files it touches, leaves `main` green and the
product shippable on its own, and names its own acceptance check — see the phase table format in
`docs/plan-claude-md-and-skills.md` §6. If a phase can't be described in one paragraph, it's two
phases.

## 6. Keep the living references current

If a decision changes a rule that `docs/handlers.md` or `docs/forms.md` document, update those
files in the same phase — they are the permanent short-form references other work loads, and a
PRD/TRD is not a substitute for keeping them accurate.

## Gotchas

- **Supersede, don't silently rewrite.** When a new version of a design replaces an old one in
  the same document, open with a **Revision note** explaining what changed and why — see the top
  of `docs/prd-cash-flow-budgeting.md`.
- **Never create a new root-level plan file.** `docs/` is where every PRD/TRD/plan lives. The
  repo root already carries four stale planning documents describing a `controllers/` layer that
  has since been removed (named in the root `CLAUDE.md`) — that mess is exactly what putting new
  documents in `docs/` avoids.
- Cite real files and symbols, not paraphrased behaviour — a claim a reviewer can't verify
  against the code is the first thing that goes stale.
