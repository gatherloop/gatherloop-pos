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
| **Template Item** | A single action within a template (e.g., "Turn on bar lamp", "Check coffee bean stock"). Has a name, optional description, and display order. |
| **Checklist Session** | An instance of a template created for a specific date. Represents "Opening Checklist for April 3, 2026". Tracks overall completion status. |
| **Session Item** | A single action within a session, derived from the template item at the time of session creation. Can be checked/unchecked by staff. Optionally tracks who completed it and when. |

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
  - **Name** (required): The action to perform, e.g., "Turn on bar lamp"
  - **Description** (optional): Additional instructions or notes
  - **Display order**: Determines the sequence in which items appear

**Rules:**
- Template names must be unique
- Items can be reordered via drag-and-drop or manual ordering
- Deleting a template should not delete historical sessions (soft delete or archive)
- Editing a template does NOT retroactively change existing sessions (sessions are snapshots)

### FR-2: Checklist Session Management

The system shall allow users to create a checklist session from a template for a specific date.

**A session consists of:**
- **Template reference**: Which template this session is based on
- **Date** (required): The date this checklist applies to (defaults to today)
- **Status**: Derived from item completion — incomplete, or completed (all items checked)
- **Session items**: Copied from template items at creation time, each with a checked/unchecked state
- **Created at**: Timestamp of when the session was created
- **Completed at**: Timestamp of when all items were checked (nullable)

**Rules:**
- Only one session per template per date (prevent duplicates, e.g., you can't have two "Opening Checklists" for April 3)
- Session items are a snapshot of the template items at the time of creation
- A session is marked as "completed" automatically when all its items are checked

### FR-3: Checking/Unchecking Session Items

Staff shall be able to check and uncheck individual items within a session.

**When checking an item:**
- The item is marked as completed
- A `completed_at` timestamp is recorded
- If all items are now checked, the session is automatically marked as completed with a `completed_at` timestamp

**When unchecking an item:**
- The item is marked as incomplete
- The `completed_at` timestamp is cleared
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
- Completion timestamps for checked items
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
- User can reorder items
- User can save the template
- Validation: name is required, at least 1 item is required, template name must be unique

**US-2: Edit a checklist template**
> As a manager, I want to edit an existing checklist template (rename, add/remove/reorder items), so that I can update procedures when operations change.

**Acceptance Criteria:**
- User can modify template name, description, and items
- Adding/removing/reordering items is supported
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

**US-6: Check off completed items**
> As a staff member, I want to check off items as I complete them, so that I can track my progress and ensure nothing is missed.

**Acceptance Criteria:**
- User can tap/click an item to toggle its checked state
- Checked items show a completion timestamp
- Progress indicator updates in real time (e.g., "5/10 completed")
- When all items are checked, the session is automatically marked as completed

**US-7: Uncheck an item**
> As a staff member, I want to uncheck an item if I marked it by mistake, so that the checklist accurately reflects what has been done.

**Acceptance Criteria:**
- User can uncheck a previously checked item
- The completion timestamp is cleared
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
├── completed_at (nullable)
├── created_at
└── updated_at
```

**Key relationships:**
- A template has many template items (1:N)
- A template has many sessions (1:N)
- A session has many session items (1:N)
- Unique constraint on `(checklist_template_id, date)` in sessions table
- Session items store a copy of the template item data (snapshot pattern) plus a reference back to the original template item

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
