# Plan: Improving the Operational Checklist (Reducing Checklist Bloat)

> Status: Proposed
> Author: Engineering
> Date: 2026-06-14
> Related: `docs/prd-operational-checklist.md`

## 1. Problem Statement

Some checklist actions are ambiguous on their own. For example, an item such as
**"Turn on lamp"** does not tell the staff _which_ lamps to turn on. To make the
action concrete, the manager currently breaks it into checkable **sub-items**
(e.g. "Lamp first floor", "Lamp second floor", "Lamp garage", ...).

This works, but it has a real cost:

- **The checklist grows large.** Every clarification becomes another checkable row.
- **Daily fatigue.** Staff open and close the shop _every day_. Seeing a long wall
  of checkboxes each morning and night is tiring and demotivating, which ironically
  makes them rush and miss things — the exact problem the checklist exists to solve.

In short: we are using a **tracking mechanism (sub-items)** to solve a
**communication problem (which lamp / how to do it)**. They are different needs and
should use different tools.

## 2. Goal

Let the manager add clarifying detail and procedures to an item **without adding
more checkable rows**, and keep the staff's daily execution view **short and calm**.

Success looks like:

- A single item "Turn on lamp" can carry a rich explanation ("bar lamp, door lamp,
  storage lamp — the switches are behind the cashier") with **zero extra checkboxes**.
- The execution screen stays compact; detail is available **on demand**, not always
  on screen.
- No regression to the existing template / session / check-uncheck behavior.

## 3. Evaluation of the Proposed Idea (Multiline Markdown Description)

> Proposed: instead of an inline one-line description, allow a **multiline Markdown**
> description on each item, so "Turn on lamp" can list the lamps / the procedure in
> the description rather than as new sub-items.

**Verdict: Strongly recommended.** This is the right call, and it fits the codebase
unusually well:

1. **The pattern already exists in this repo.** There is already a `MarkdownEditor`
   form component and a cross-platform `Markdown` renderer, and they are already used
   for the `description` field of **Products**, **Materials**, and **Variants**:
   - Renderer (web): `libs/ui/src/presentation/components/base/Markdown/index.tsx`
   - Renderer (native): `libs/ui/src/presentation/components/base/Markdown/index.native.tsx`
   - Editor (edit/preview toggle): `libs/ui/src/presentation/components/base/Form/MarkdownEditor.tsx`
   - Example usage: `libs/ui/src/presentation/components/products/ProductFormView.tsx`
   We are reusing an established convention, not inventing one.

2. **No database migration is required.** The description columns are already
   `TEXT` (nullable) and already snapshot into sessions:
   - `apps/api/migrations/000002_checklist_templates.up.sql` — `checklist_templates.description`, `checklist_template_items.description`
   - `apps/api/migrations/000003_checklist_sessions.up.sql` — `checklist_session_items.description`
   `TEXT` already stores newlines and Markdown source. The only changes needed are in
   the **UI layer** (input + rendering).

3. **It separates concerns correctly.** Description = _reference information_ (read
   it, don't track it). Sub-item = _accountability_ (must be individually checked off).
   Most "which lamp" clarifications are reference information, so they belong in the
   description.

### Current gaps that block the idea today

- The template form uses a **single-line `InputText`** for descriptions
  (`ChecklistTemplateFormView.tsx`, lines ~34 and ~104-109), so multiline / Markdown
  cannot be entered.
- The execution view renders the description as **plain text** in a `<Paragraph>`
  (`ChecklistSessionItemRow.tsx`, lines ~120-124), so Markdown would not be formatted.
- The shared `MarkdownEditor` has a **hardcoded preview field**: its preview always
  watches the top-level `['description']` field
  (`MarkdownEditor.tsx`, line ~34) instead of the `name` prop it receives. That is
  fine for Product/Material (their field _is_ `description`), but it breaks for
  **nested item descriptions** like `items.0.description`. This must be fixed before
  reusing it inside the checklist items array.

## 4. Complementary Ideas (beyond the proposal)

The Markdown description solves _authoring_. To also solve the **"too many rows is
tiring"** feeling, pair it with **progressive disclosure** in the execution view:

- **Idea A — Collapse the description behind a toggle (recommended).** By default the
  daily list shows just the item name + checkbox. An item that has a description shows
  a small info/chevron affordance; tapping it reveals the Markdown detail. The daily
  view stays lean; detail is one tap away when a staff member is unsure.
- **Idea B — Default sub-items to collapsed.** Today sub-items render expanded by
  default (`useState(true)` in `ChecklistSessionItemRow.tsx`). Defaulting them to
  collapsed (showing the `completed/total` badge) shortens the wall of checkboxes for
  templates that still legitimately need sub-items.
- **Idea C — Authoring guidance.** Add helper text/placeholder in the template form
  that nudges the manager: _"Use the description to explain or list steps. Only add
  sub-items when each step must be checked off individually."_ This prevents the bloat
  from coming back.
- **Idea D (future, optional) — Images in descriptions.** Because Markdown supports
  images, a photo of "which switches" could be embedded later. Out of scope for now,
  but the Markdown approach unlocks it for free.

**Recommended combination:** Proposal (Markdown descriptions) **+ Idea A** (collapsible
descriptions) as the core, with Idea C as cheap insurance. Ideas B and D are optional
nice-to-haves.

## 5. Design Decisions

- **Reuse, don't rebuild.** Use the existing `MarkdownEditor` (authoring) and
  `Markdown` (rendering) components everywhere, matching Products/Materials/Variants.
- **No schema/API change.** Descriptions stay `TEXT`. Sessions keep snapshotting the
  description at creation time, so historical sessions are unaffected.
- **Sub-items stay as-is.** We are not removing sub-items; we are making them
  unnecessary for pure clarification. Sub-items remain for genuine per-step tracking.
- **Backward compatible.** Existing plain-text descriptions are valid Markdown (plain
  text renders as plain text), so nothing needs migrating. Existing bloated templates
  can be cleaned up manually by the manager over time.
- **Sub-item descriptions are out of scope.** Sub-items still have no description
  field; adding one would reintroduce complexity we are trying to avoid.

## 6. Phased Implementation (each phase = one small PR)

Phases are ordered so the app is shippable and consistent after every PR.

### Phase 1 — Make `MarkdownEditor` reusable for nested fields (enabler)
**Goal:** Fix the hardcoded preview field so the editor works for any field name,
including `items.N.description`.
- File: `libs/ui/src/presentation/components/base/Form/MarkdownEditor.tsx`
  - Change the preview `FieldWatch` to watch `props.name` (fall back to `'description'`)
    instead of the hardcoded `['description']`.
- Verify existing Product/Material/Variant forms still render correctly (their field
  is `description`, so behavior is unchanged).
- Update/extend the existing story: `MarkdownEditor.stories.tsx`.
- **Risk:** very low. Pure UI fix, no data change.
- **Acceptance:** Editing a non-`description` field shows the correct preview.

### Phase 2 — Markdown authoring in the template form
**Goal:** Manager can write multiline Markdown for template and item descriptions.
- File: `libs/ui/src/presentation/components/checklistTemplates/ChecklistTemplateFormView.tsx`
  - Replace the template-level description `InputText` (~line 34) with `MarkdownEditor`.
  - Replace each item-level description `InputText` (~lines 104-109) with `MarkdownEditor`
    bound to `items.${index}.description`.
  - Add helper/placeholder text (Idea C): explain description vs sub-items.
- No API/contract change. `description` is already in `ChecklistTemplateForm`
  (`libs/ui/src/domain/entities/ChecklistTemplate.ts`).
- **Risk:** low. Form-only change; the submitted payload shape is identical.
- **Acceptance:** Manager can enter/preview multiline Markdown; saving and reloading
  preserves it.

### Phase 3 — Render Markdown in the session execution view
**Goal:** Staff see the formatted description (lists, bold, etc.) instead of raw text.
- File: `libs/ui/src/presentation/components/checklistSessions/ChecklistSessionItemRow.tsx`
  - Replace the plain `<Paragraph>{item.description}</Paragraph>` (~lines 120-124) with
    the `Markdown` component.
- Also apply `Markdown` anywhere else a checklist description is shown read-only
  (e.g. template detail/list views) for consistency:
  - `libs/ui/src/presentation/components/checklistTemplates/ChecklistTemplateList.tsx`
    / `ChecklistTemplateListItem.tsx` (consider truncating to keep the list scannable).
- **Risk:** low. Read-only rendering; existing plain text still renders fine.
- **Acceptance:** A description with a Markdown list/bold renders formatted on web and
  native.

### Phase 4 — Progressive disclosure in the execution view (Idea A)
**Goal:** Keep the daily list compact; reveal description on demand.
- File: `libs/ui/src/presentation/components/checklistSessions/ChecklistSessionItemRow.tsx`
  - When an item has a description, show a small info/chevron toggle and hide the
    Markdown behind it (collapsed by default). Tapping reveals it.
  - Keep the row tap behavior for check/uncheck intact (description toggle must not
    accidentally toggle completion).
- **Risk:** medium-low. Interaction change; must not interfere with check/uncheck on
  items that have no sub-items.
- **Acceptance:** Daily list shows names only by default; description expands on tap;
  checking/unchecking still works as before.

### Phase 5 (optional) — Compaction polish
**Goal:** Further reduce visual density for templates that still use sub-items.
- Default sub-items to collapsed in `ChecklistSessionItemRow.tsx` (Idea B), surfacing
  the `completed/total` badge.
- Optionally collapse or de-emphasize already-completed items.
- **Risk:** low. Defaults only; fully reversible.
- **Acceptance:** Long templates feel shorter; expanding still works.

## 7. Out of Scope

- Database schema or REST API changes (none required).
- Descriptions for sub-items.
- Image upload/hosting (Markdown image embedding can come later, Idea D).
- Role-based permissions (tracked separately per the PRD).
- Migrating/auto-rewriting existing templates — managers can simplify them manually.

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Markdown renders differently on web vs native | Both renderers already exist and are used in production for Products/Materials; reuse them as-is. |
| Description toggle interferes with check/uncheck tap | Isolate the toggle's press handler; cover with the existing interaction in QA (Phase 4 acceptance). |
| Managers overuse long descriptions | Helper text (Phase 2) guides description-vs-sub-item usage; descriptions are collapsed by default (Phase 4). |
| Old plain-text descriptions look unstyled | Plain text is valid Markdown and renders unchanged — no migration needed. |

## 9. Why This Is Low-Risk Overall

Every change lives in the **UI layer**, reuses **components already shipping in this
codebase**, requires **no migration and no API contract change**, and is **backward
compatible** with existing data. Each phase is independently shippable and small enough
to review quickly.
