# PRD: Operational Checklist Management

## Problem Statement

Cafe staff must complete a set of routine actions at specific operational moments — **opening the shop**, **closing the shop**, and **weekly cleaning**. Currently, there is no system to track these tasks, leading to two critical problems:

1. **Staff forget actions**: With many checklist items to remember (prepare cashier tablet, open gate, turn on bar lamp, check stock, etc.), staff consistently miss one or two tasks each day.
2. **Manager has no visibility**: The manager cannot verify which actions were or were not completed on any given date, making accountability and follow-up impossible.

These problems recur across multiple operational contexts (opening, closing, weekly cleaning), each with its own distinct set of required actions.

---

## Context: Existing System

The POS system (Gatherloop POS) is a monorepo application with:

- **Backend**: Go REST API with MySQL database, using Clean Architecture (domain → data → presentation)
- **Frontend**: React (Next.js) web app + React Native mobile app, sharing a UI library built on Tamagui
- **Existing modules**: Transactions, Products, Materials, Categories, Wallets, Budgets, Expenses, Calculations, Coupons, Rentals, Suppliers
- **Auth**: Simple username/password login with JWT — **no role-based access control** (all users have equal permissions)
- **Patterns**: Every feature follows a consistent CRUD pattern with list/create/update/delete screens, React Query for server state, and Zod for validation
- **No existing task/checklist feature**: There is no prior art for task tracking, checklists, or recurring operational workflows in the system

### Key Architectural Consideration

Since the system currently has **no user roles**, this feature should be designed to work without strict role separation initially. However, it should be structured so that role-based features (e.g., "only manager can create templates") can be layered on later if RBAC is introduced.

---

## Proposed Solution: Operational Checklist Management

### Feature Overview

A **template-based checklist system** that allows the manager to define reusable checklist templates (e.g., "Opening Checklist", "Closing Checklist", "Weekly Cleaning") and lets staff create checklist sessions from those templates to track completion of each action item on specific dates.

### Core Concepts

| Concept | Description |
|---|---|
| **Checklist Template** | A reusable blueprint defining a set of actions for a specific operational context (e.g., "Opening Checklist"). Contains an ordered list of action items. |
| **Template Item** | A single action within a template (e.g., "Turn on lamp", "Turn on music"). Has a name, optional description, and display order. May contain an ordered list of sub-items. |
| **Template Sub-Item** | A specific step or component within a template item (e.g., "Bar Lamp" and "Door Lamp" under "Turn on lamp"). Has a name and display order. Allows a single item to be broken down into concrete sub-tasks. |
| **Checklist Session** | An instance of a template created for a specific date. Represents "Opening Checklist for April 3, 2026". Tracks overall completion status. |
| **Session Item** | A single action within a session, derived from the template item at the time of session creation. Can be checked/unchecked by staff. If the original template item had sub-items, this session item tracks completion per sub-item instead of at the item level. |
| **Session Sub-Item** | A specific step within a session item, copied from the template sub-item at session creation. Can be checked/unchecked independently. A session item with sub-items is considered completed when all its sub-items are checked. |

### Why Template-Based?

- **Consistency**: Ensures every opening/closing follows the same standard procedure
- **Flexibility**: Manager can update the template when procedures change (e.g., new equipment added), and future sessions automatically reflect the change
- **Reusability**: Same template used daily without re-entering all items
- **Auditability**: Sessions are snapshots — even if the template changes later, historical sessions retain what was actually required on that date
- **Scalability**: Easily add new checklist types (e.g., "Monthly Deep Clean", "Event Preparation") without code changes

---

## Feature Requirements

### FR-1: Checklist Template Management

The system shall allow users to create, view, edit, and delete checklist templates.

**A template consists of:**
- **Name** (required): e.g., "Opening Checklist", "Closing Checklist", "Weekly Cleaning"
- **Description** (optional): Additional context about when/how to use this checklist
- **Items** (at least 1 required): An ordered list of action items, each with:
  - **Name** (required): The action to perform, e.g., "Turn on lamp", "Turn on music"
  - **Description** (optional): Additional instructions or notes
  - **Display order**: Determines the sequence in which items appear
  - **Sub-items** (optional): An ordered list of specific steps within this item, each with:
    - **Name** (required): The specific component or step, e.g., "Bar Lamp", "Door Lamp"
    - **Display order**: Determines the sequence in which sub-items appear

**Rules:**
- Template names must be unique
- Items can be reordered via drag-and-drop or manual ordering
- Sub-items can be reordered within their parent item
- An item either has sub-items or is treated as a single checkable action — it cannot be both (i.e., if sub-items exist, the item itself is not directly checkable; completion is derived from its sub-items)
- Deleting a template should not delete historical sessions (soft delete or archive)
- Editing a template does NOT retroactively change existing sessions (sessions are snapshots)

### FR-2: Checklist Session Management

The system shall allow users to create a checklist session from a template for a specific date.

**A session consists of:**
- **Template reference**: Which template this session is based on
- **Date** (required): The date this checklist applies to (defaults to today)
- **Status**: Derived from item completion — incomplete, or completed (all items checked)
- **Session items**: Copied from template items at creation time, each with a checked/unchecked state
  - If a template item had sub-items, the corresponding session item will have session sub-items (each independently checkable)
  - If a template item had no sub-items, the session item itself is directly checkable
- **Created at**: Timestamp of when the session was created
- **Completed at**: Timestamp of when all items were checked (nullable)

**Rules:**
- Only one session per template per date (prevent duplicates, e.g., you can't have two "Opening Checklists" for April 3)
- Session items are a snapshot of the template items at the time of creation (including any sub-items)
- A session item with sub-items is considered completed when all its sub-items are checked
- A session is marked as "completed" automatically when all its items are completed

### FR-3: Checking/Unchecking Session Items and Sub-Items

Staff shall be able to check and uncheck individual items (or sub-items) within a session.

**For items without sub-items — when checking:**
- The item is marked as completed
- A `completed_at` timestamp is recorded
- If all items are now completed, the session is automatically marked as completed with a `completed_at` timestamp

**For items without sub-items — when unchecking:**
- The item is marked as incomplete
- The `completed_at` timestamp is cleared
- If the session was previously completed, its `completed_at` is also cleared

**For items with sub-items — when checking a sub-item:**
- The sub-item is marked as completed with a `completed_at` timestamp
- If all sub-items under the parent item are now checked, the parent item is automatically marked as completed
- If all items are now completed, the session is automatically marked as completed

**For items with sub-items — when unchecking a sub-item:**
- The sub-item is marked as incomplete; its `completed_at` is cleared
- If the parent item was previously completed, its `completed_at` is cleared
- If the session was previously completed, its `completed_at` is also cleared

### FR-4: Checklist Session List & Filtering

The system shall provide a list view of checklist sessions with filtering capabilities.

**Filters:**
- **By template**: Show sessions for a specific template (e.g., only "Opening Checklist")
- **By date range**: Show sessions within a date range (e.g., "this week", "last month")
- **By status**: Show only completed or incomplete sessions

**List view displays:**
- Template name
- Date
- Completion progress (e.g., "7/10 items completed")
- Status indicator (completed / incomplete)

### FR-5: Checklist Session Detail & History View

The system shall provide a detail view for each session showing:
- All items with their checked/unchecked state
- For items with sub-items: all sub-items listed under the parent, each with their checked/unchecked state and completion timestamp
- Completion timestamps for checked items (and sub-items)
- Overall session completion status and timestamp
- The date the session was created for

This serves as the **audit trail** for managers to review what was and wasn't done on any given date.

---

## User Stories

### Template Management

**US-1: Create a checklist template**
> As a manager, I want to create a new checklist template with a name and a list of action items, so that I can define the standard procedure for a recurring operational task.

**Acceptance Criteria:**
- User can enter a template name and optional description
- User can add multiple items, each with a name and optional description
- For each item, user can optionally add sub-items (e.g., "Bar Lamp", "Door Lamp" under "Turn on lamp")
- User can reorder items; user can reorder sub-items within their parent item
- User can save the template
- Validation: name is required, at least 1 item is required, template name must be unique
- Sub-item names are required if a sub-item is added

**US-2: Edit a checklist template**
> As a manager, I want to edit an existing checklist template (rename, add/remove/reorder items and sub-items), so that I can update procedures when operations change.

**Acceptance Criteria:**
- User can modify template name, description, items, and sub-items
- Adding/removing/reordering items and sub-items is supported
- User can add sub-items to an existing item, or remove all sub-items to make it a directly-checkable item
- Changes do NOT affect already-created sessions
- Validation rules same as creation

**US-3: Delete a checklist template**
> As a manager, I want to delete a checklist template that is no longer needed, so that the template list stays clean and relevant.

**Acceptance Criteria:**
- User is prompted with a confirmation dialog before deletion
- Existing sessions linked to this template are preserved (not deleted)
- Deleted template no longer appears in the template list
- Users cannot create new sessions from a deleted template

**US-4: View all checklist templates**
> As a manager, I want to view all available checklist templates, so that I can manage and review the operational procedures.

**Acceptance Criteria:**
- Templates are displayed in a list with name, description, and item count
- User can navigate to template detail/edit from the list

---

### Session Execution

**US-5: Start a checklist session**
> As a staff member, I want to create a new checklist session from a template for today's date, so that I can track which opening/closing tasks I've completed.

**Acceptance Criteria:**
- User can select a template and a date (defaults to today)
- A new session is created with all items copied from the template, all unchecked
- If a session for the same template and date already exists, the user is notified and directed to the existing session
- Session items reflect the template's items at the time of creation

**US-6: Check off completed items and sub-items**
> As a staff member, I want to check off items (or their sub-items) as I complete them, so that I can track my progress and ensure nothing is missed.

**Acceptance Criteria:**
- For items without sub-items: user can tap/click the item to toggle its checked state
- For items with sub-items: the item is expanded to show its sub-items; user checks each sub-item individually
- Items with sub-items show a mini progress indicator (e.g., "2/3") until all sub-items are done, then display as completed
- Checked items/sub-items show a completion timestamp
- Overall progress indicator updates in real time (e.g., "5/10 completed")
- When all items (and all their sub-items) are completed, the session is automatically marked as completed

**US-7: Uncheck an item or sub-item**
> As a staff member, I want to uncheck an item or sub-item if I marked it by mistake, so that the checklist accurately reflects what has been done.

**Acceptance Criteria:**
- User can uncheck a previously checked item (for items without sub-items)
- User can uncheck a previously checked sub-item (for items with sub-items)
- The completion timestamp is cleared for the unchecked item/sub-item
- If unchecking a sub-item causes the parent item to become incomplete, the parent item's completion is also reverted
- If the session was marked as completed, the completion status is reverted

---

### Review & Accountability

**US-8: View checklist sessions with filters**
> As a manager, I want to browse all checklist sessions filtered by template, date range, and completion status, so that I can monitor operational compliance over time.

**Acceptance Criteria:**
- User can filter sessions by template name
- User can filter sessions by date range
- User can filter sessions by status (completed / incomplete)
- List shows: template name, date, progress (e.g., "8/10"), and status
- Default view shows today's sessions

**US-9: View session detail for audit**
> As a manager, I want to view the detail of a specific checklist session, so that I can see exactly which items were completed and which were missed on a given date.

**Acceptance Criteria:**
- Displays all session items with checked/unchecked state
- Shows completion timestamp for each checked item
- Shows overall session completion status and timestamp
- Clearly highlights any unchecked (missed) items

**US-10: Quick overview of today's checklists**
> As a staff member or manager, I want to see a quick summary of today's checklist sessions on a dashboard-style view, so that I can immediately see what's done and what's pending.

**Acceptance Criteria:**
- Shows all sessions for today grouped by template
- Each session shows progress bar or fraction (e.g., "7/10")
- Completed sessions are visually distinct from incomplete ones
- If no session exists for a template today, show an option to start one

---

## Delivery Phases

This feature is divided into **5 phases**, each producing a deployable increment that delivers standalone value. Each phase builds on the previous one. Developers should complete all items within a phase before moving to the next.

### Phase 1: Backend — Checklist Template CRUD

**Goal:** Establish the database foundation and API endpoints for managing checklist templates and their items.

**Deliverables:**
- Database migrations for `checklist_templates`, `checklist_template_items`, and `checklist_template_sub_items` tables (including soft delete, unique constraints, and indexes)
- REST API endpoints:
  - `GET /checklist-templates` — list all templates (with item count)
  - `GET /checklist-templates/:id` — get template detail with items and their sub-items
  - `POST /checklist-templates` — create template with items and optional sub-items per item
  - `PUT /checklist-templates/:id` — update template (name, description, add/remove/reorder items and sub-items)
  - `DELETE /checklist-templates/:id` — soft-delete template
- Input validation (name required, unique name, at least 1 item, sub-item names required if sub-items provided)
- Unit/integration tests for all endpoints

**Covers:** FR-1

**Exit Criteria:** All template CRUD endpoints are functional and tested. A developer can create, read, update, and delete templates via API.

---

### Phase 2: Frontend — Checklist Template Management

**Goal:** Provide a UI for managers to create, view, edit, and delete checklist templates.

**Deliverables:**
- Add **"Checklists"** menu item to sidebar navigation
- Template list screen — displays all templates with name, description, and item count
- Template create screen — form with name, description, and dynamic item list (add/remove/reorder items); each item supports an optional nested sub-item list (add/remove/reorder sub-items)
- Template edit screen — pre-populated form, same capabilities as create
- Template delete — confirmation dialog, triggers soft-delete API
- Form validation with React Hook Form + Zod (name required, unique, at least 1 item)
- Shared UI components (if needed) in the Tamagui-based UI library
- React Query integration for server state

**Covers:** US-1, US-2, US-3, US-4

**Exit Criteria:** A user can fully manage checklist templates (list, create, edit, delete) from both the web and mobile apps.

---

### Phase 3: Backend — Checklist Session & Item Execution

**Goal:** Implement the API layer for creating sessions from templates and checking/unchecking items.

**Deliverables:**
- Database migrations for `checklist_sessions`, `checklist_session_items`, and `checklist_session_sub_items` tables (including unique constraint on `template_id + date`)
- REST API endpoints:
  - `POST /checklist-sessions` — create a session from a template for a given date (snapshot items and sub-items from template, enforce one-session-per-template-per-date)
  - `GET /checklist-sessions/:id` — get session detail with all items, their sub-items, and completion state
  - `PUT /checklist-session-items/:id/check` — mark item as completed (only for items without sub-items; set `completed_at`; auto-complete session if all items done)
  - `PUT /checklist-session-items/:id/uncheck` — mark item as incomplete (only for items without sub-items; clear `completed_at`; revert session completion if needed)
  - `PUT /checklist-session-sub-items/:id/check` — mark sub-item as completed (set `completed_at`; auto-complete parent item if all sub-items checked; auto-complete session if all items done)
  - `PUT /checklist-session-sub-items/:id/uncheck` — mark sub-item as incomplete (clear `completed_at`; revert parent item and session completion if needed)
  - `DELETE /checklist-sessions/:id` — soft-delete session
- Input validation (template must exist and not be deleted, date required, duplicate session prevention)
- Unit/integration tests for all endpoints, including edge cases (duplicate session, sub-item cascading to item completion, item cascading to session completion, uncheck cascading logic)

**Covers:** FR-2, FR-3

**Exit Criteria:** A developer can create sessions, check/uncheck items, and observe automatic session completion via API.

---

### Phase 4: Frontend — Session Execution

**Goal:** Allow staff to start a checklist session and check off items through a tablet-friendly UI.

**Deliverables:**
- Session creation flow — select a template, pick a date (defaults to today), create session (with duplicate detection and redirect to existing session)
- Session execution screen:
  - Displays all items with large, tap-friendly checkboxes (optimized for tablet)
  - Items without sub-items: tap to check/uncheck directly
  - Items with sub-items: displayed as a collapsible group; each sub-item has its own checkbox; parent item shows mini progress (e.g., "1/2") until all sub-items are done
  - Real-time progress indicator (e.g., "5/10 completed")
  - Completion timestamps shown per item or sub-item
  - Visual feedback when session is fully completed
- React Query mutations for check/uncheck with optimistic updates
- Session delete with confirmation dialog

**Covers:** US-5, US-6, US-7

**Exit Criteria:** Staff can start a checklist for today, check off items in a smooth tablet-friendly experience, and see real-time progress. The session auto-completes when all items are checked.

---

### Phase 5: Session List, Filtering & Dashboard Overview

**Goal:** Provide managers with review and accountability tools, and give all users a quick daily overview.

**Deliverables:**
- Session list screen with filters:
  - `GET /checklist-sessions` — list endpoint with query params for `template_id`, `date_from`, `date_to`, `status` (completed/incomplete), and pagination
  - Filter UI: template dropdown, date range picker, status toggle
  - List displays: template name, date, progress fraction (e.g., "8/10"), status badge
  - Default view: today's sessions
- Session detail screen (audit view):
  - All items with checked/unchecked state
  - Completion timestamps for checked items
  - Overall session status and completion timestamp
  - Visual highlighting of missed (unchecked) items
- Today's dashboard overview:
  - All sessions for today, grouped by template
  - Progress bar or completion fraction per session
  - Visual distinction between completed and incomplete sessions
  - Quick-start button for templates with no session today

**Covers:** FR-4, FR-5, US-8, US-9, US-10

**Exit Criteria:** Managers can browse, filter, and review historical sessions for accountability. All users see a dashboard of today's checklists with clear progress indicators.

---

### Phase Summary

| Phase | Scope | Key FRs / User Stories | Dependency |
|---|---|---|---|
| **Phase 1** | Backend Template CRUD | FR-1 | None |
| **Phase 2** | Frontend Template Management | US-1 – US-4 | Phase 1 |
| **Phase 3** | Backend Session & Execution | FR-2, FR-3 | Phase 1 |
| **Phase 4** | Frontend Session Execution | US-5 – US-7 | Phase 2, Phase 3 |
| **Phase 5** | Session List, Filters & Dashboard | FR-4, FR-5, US-8 – US-10 | Phase 4 |

> **Note:** Phases 2 and 3 can be developed **in parallel** by separate developers since they have no dependency on each other (both depend only on Phase 1).

---

## Out of Scope (for v1)

These features are intentionally excluded from the initial release to keep scope manageable:

- **Role-based access control**: All users can create templates and sessions. RBAC can be layered on later.
- **Recurring session auto-creation**: Sessions are created manually. Automatic daily/weekly creation can be added later.
- **Notifications/reminders**: No push notifications or alerts for incomplete checklists.
- **Photo/evidence attachments**: No ability to attach photos as proof of completion.
- **Assignee tracking**: No assignment of specific items to specific staff members.
- **Analytics/reporting**: No charts or trend reports on completion rates (can build on top of the session data later).
- **Mobile offline support**: Sessions require network connectivity.

---

## Data Model (Conceptual)

```
checklist_templates
├── id (PK)
├── name (unique, required)
├── description (nullable)
├── created_at
├── updated_at
└── deleted_at (nullable, soft delete)

checklist_template_items
├── id (PK)
├── checklist_template_id (FK → checklist_templates)
├── name (required)
├── description (nullable)
├── display_order (integer)
├── created_at
├── updated_at
└── deleted_at (nullable, soft delete)

checklist_template_sub_items
├── id (PK)
├── checklist_template_item_id (FK → checklist_template_items)
├── name (required)
├── display_order (integer)
├── created_at
├── updated_at
└── deleted_at (nullable, soft delete)

checklist_sessions
├── id (PK)
├── checklist_template_id (FK → checklist_templates)
├── date (required, unique with template_id)
├── completed_at (nullable)
├── created_at
├── updated_at
└── deleted_at (nullable, soft delete)

checklist_session_items
├── id (PK)
├── checklist_session_id (FK → checklist_sessions)
├── checklist_template_item_id (FK → checklist_template_items, nullable)
├── name (required, copied from template item)
├── description (nullable, copied from template item)
├── display_order (integer, copied from template item)
├── completed_at (nullable — null if item has sub-items; derived from sub-item completion)
├── created_at
└── updated_at

checklist_session_sub_items
├── id (PK)
├── checklist_session_item_id (FK → checklist_session_items)
├── checklist_template_sub_item_id (FK → checklist_template_sub_items, nullable)
├── name (required, copied from template sub-item)
├── display_order (integer, copied from template sub-item)
├── completed_at (nullable)
├── created_at
└── updated_at
```

**Key relationships:**
- A template has many template items (1:N)
- A template item optionally has many template sub-items (1:N)
- A template has many sessions (1:N)
- A session has many session items (1:N)
- A session item optionally has many session sub-items (1:N), mirroring the template item's sub-items at snapshot time
- Unique constraint on `(checklist_template_id, date)` in sessions table
- Session items store a copy of the template item data (snapshot pattern) plus a reference back to the original template item
- Session sub-items store a copy of the template sub-item data plus a reference back to the original template sub-item
- A session item's `completed_at` is set automatically when all its sub-items are checked; if it has no sub-items, it is set directly when the item is checked

---

## UX Considerations

### Navigation
- Add a new **"Checklists"** menu item in the sidebar, consistent with existing navigation (Transactions, Products, Materials, etc.)
- Sub-navigation or tabs for **Templates** and **Sessions**

### Session Execution Screen
- Optimized for **tablet use** (primary device is cashier tablet)
- Large, tap-friendly checkboxes
- Real-time progress indicator at the top
- Minimal friction — staff should be able to go through the checklist quickly

### Consistency with Existing UI
- Follow existing Tamagui component patterns (ListItem, Form, Tabs, Navbar, etc.)
- Use existing confirmation dialog pattern for destructive actions (delete template)
- Follow existing list → create → update → delete screen pattern
- Use React Hook Form + Zod for form validation, consistent with all other features

---

## Success Metrics

1. **Completion rate**: Percentage of sessions fully completed per day (target: >95% after 2 weeks of adoption)
2. **Missed items reduction**: Number of unchecked items per session decreases over time
3. **Manager review frequency**: Manager reviews session history at least once per week
4. **Template adoption**: All recurring operational procedures are captured as templates within 1 week of launch
