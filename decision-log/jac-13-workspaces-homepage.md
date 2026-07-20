# Decision Log: JAC-13 — Workspaces Homepage

**Ticket:** https://linear.app/jackmcr/issue/JAC-13/workspaces-homepage
**Branch:** feature/jac-13-workspaces-homepage
**Date:** 2026-07-20

## Context

Before this ticket the app had exactly one workflow: `WorkflowEditorPage`
loaded/created a single fixed document via a hardcoded `lid` cached in
`localStorage`, and there was no routing at all. JAC-13 asks for a homepage
that lists every saved workflow (most recently updated first), lets the user
create a new one (seeded with `DataSource → Transform → Model`, named
`"Workflow ####"`), and open an existing one for editing.

## Decisions

### Introduced `react-router-dom`, replacing the single hardcoded document

- **Choice:** Added `react-router-dom` and two routes — `/` (`WorkflowsHomePage`)
  and `/workflows/:workflowId` (`WorkflowEditorPage`). `useWorkflowPersistence`
  now takes `workflowId` as a parameter (sourced from the route) instead of
  owning a fixed `WORKFLOW_LID` constant and a `localStorage`-cached id.
- **Alternatives considered:** Keep the localStorage-cached single id and
  bolt a list UI in front of it. Rejected — the existing code's own comment
  said routing was deliberately deferred to this exact ticket, and a real
  multi-workflow app needs the id in the URL (shareable/bookmarkable, and
  matches what `getWorkflow`/`updateWorkflow` already expect).
- **Trade-offs / risks accepted:** This removed the "auto-create on first
  load, fall back to create on a stale cached id" behavior entirely — the
  editor now only loads an existing id and never creates one implicitly.
  Creation is solely the homepage's responsibility. This rewrote
  `useWorkflowPersistence.test.ts` from scratch (the old `localStorage`
  fallback tests no longer apply to the new contract).

### Backend gained a list endpoint and `updated_at` tracking

- **Choice:** Added `updated_at` (ISO-8601, set on create, refreshed on
  update) as both a SQLite column (for `ORDER BY`) and a `Workflow` field (so
  the frontend can show "last updated" without a second lookup), plus
  `GET /workflows` returning the already-scaffolded-but-unused
  `ListResponse[Workflow]` envelope from JAC-12, ordered by `updated_at DESC`.
- **Alternatives considered:** Compute "most recently updated" by re-parsing
  each row's JSON payload for a client-supplied timestamp. Rejected — trusting
  a client-supplied timestamp for ordering is fragile (clock skew, no
  guarantee it's ever set); a server-assigned column keeps ordering
  authoritative and lets SQLite do the sort.
- **Trade-offs / risks accepted:** No pagination — `list_all()` returns every
  row and the endpoint sets `limit` to the returned count. Fine for this
  exercise's scale; `ListResponse`'s `offset`/`limit` fields are populated
  but not yet meaningful for paging.

### Default name generation lives on the frontend, at creation time

- **Choice:** `generateDefaultWorkflowName()` (`"Workflow " + 4 random
  A–Z0–9 chars`) runs in the browser when the "New workflow" button is
  clicked, and the generated name is sent as part of the initial `POST
  /workflows` body — the backend has no opinion on default names.
- **Alternatives considered:** Generate the default name server-side in
  `WorkflowRepository.create`. Rejected — `name` is already a required field
  on `Workflow`, and every other piece of "what should a fresh workflow look
  like" (the seeded `DataSource → Transform → Model` graph) already lives in
  `entities/workflow/model/initialWorkflow.ts` on the frontend; keeping name
  generation there avoids splitting "what a new workflow looks like" across
  both layers.

### Editor page shows a dedicated not-found state instead of erroring

- **Choice:** `useWorkflowPersistence` distinguishes a 404 (`"not-found"`
  status) from other failures (`"error"`), and `WorkflowEditorPage` renders a
  "This workflow no longer exists" message with a link back to the homepage
  for the former.
- **Alternatives considered:** Collapse both into the existing generic
  "error" status. Rejected — a deleted/bad-id workflow is a very different,
  much more common situation (e.g. a stale bookmark or a workflow deleted in
  another tab) than a network/server failure, and deserves a specific,
  actionable message rather than a generic error banner.

## Open questions / follow-ups

- No pagination on `GET /workflows` — fine at this scale, called out above
  as a known gap if the list grows large.
- The homepage doesn't show node/edge counts or a thumbnail, only name +
  last-updated — kept deliberately minimal per the ticket's scope; JAC-7-style
  styling polish was left for a follow-up.
- Deleting a workflow from the homepage isn't part of this ticket and wasn't
  added.
