# Decision Log: JAC-5 — Setup Frontend project with React Flow

**Ticket:** https://linear.app/jackmcr/issue/JAC-5/setup-frontend-project-with-react-flow
**Branch:** feature/jac-5-setup-frontend-project-with-react-flow
**Date:** 2026-07-19

## Context

The starter repo already ships a working React + TypeScript + Vite + ReactFlow
canvas (per `frontend/README.md`, this is intentional — the exercise measures
workflow behaviour, not setup). JAC-5 asks for this to be organised as
Feature-Sliced Design (FSD). There is no new business behaviour in this
ticket; editing operations, connection rules, and persistence are separate
tickets (JAC-6, JAC-9, JAC-10, JAC-12, ...). The scope here is purely
structural: reorganise the existing flat layout (`types/`, `api/`,
`features/workflow/`) into FSD layers without changing behaviour.

## Decisions

### Layer mapping for the current code

- **Choice:** `entities/workflow` holds the domain contract (`model/types.ts`),
  ReactFlow-specific shapes (`model/flowTypes.ts`), node definitions/factory,
  the workflow CRUD client (`api/workflowApi.ts`), and the node card component
  (`ui/WorkflowNodeCard.tsx`, renamed from `WorkflowNode` to avoid colliding
  with the domain `WorkflowNode` type). `widgets/workflow-canvas` composes the
  ReactFlow canvas itself plus the seed graph. `pages/workflow-editor` owns
  page-level chrome (the title panel, and later the toolbar). `app/` holds the
  root shell and provider setup (moved out of `main.tsx` into
  `app/providers/AppProviders.tsx`). `shared/api/client.ts` holds the bare
  axios instance so entity-level API modules aren't hardcoding the base URL.
- **Alternatives considered:** Keeping node/edge UI split into a separate
  `entities/workflow-node` entity — rejected for now since there's no
  edge-specific UI yet to justify splitting the entity; can be split later if
  it earns its keep.
- **Trade-offs / risks accepted:** `entities/workflow` is a fairly large slice
  (types + api + node UI + node factory). If the entity grows further (e.g. a
  distinct edge entity), it should be split, but splitting speculatively now
  would be premature.

### No `features/` layer yet

- **Choice:** Left the `features/` layer absent rather than scaffolding empty
  folders. The interactive behaviours FSD would put there (add-node,
  connect-nodes with validation, edit-node-label) are each their own ticket
  (JAC-6, JAC-9, JAC-10) and don't exist yet — for now, the trivial
  `onConnect` handler (accepts every connection unconditionally, with a TODO)
  lives in the `widgets/workflow-canvas` widget since it's not yet real
  feature-level behaviour.
- **Alternatives considered:** Pre-creating `features/add-node`,
  `features/connect-nodes` as empty stubs — rejected as scaffolding without
  content, which the project guidance says to avoid.
- **Trade-offs / risks accepted:** The next ticket that adds real editing
  behaviour will need to introduce the `features/` layer and possibly move the
  `onConnect` handler out of the widget into a feature slice.

### No automated FSD boundary enforcement

- **Choice:** Documented the layer-import convention (`app → pages → widgets →
  features → entities → shared`, public API via `index.ts`) in
  `frontend/README.md` rather than adding a lint plugin (e.g.
  `eslint-plugin-boundaries` or Steiger) to enforce it.
- **Alternatives considered:** Adding a boundaries lint rule now.
- **Trade-offs / risks accepted:** Convention isn't mechanically enforced, so
  a future change could add a stray deep import across slices without the
  linter catching it. Worth adding if the codebase grows past this exercise's
  scope.

### Kept `pages/` even though there's currently one page

- **Choice:** Confirmed with the ticket owner: a workflows homepage/list is
  coming in a later ticket, so `pages/workflow-editor` stays as its own slice
  now rather than folding the page chrome into `app/App.tsx`.
- **Alternatives considered:** Skipping `pages/` until a second page exists.
- **Trade-offs / risks accepted:** None significant — this is a thin
  pass-through today, but it avoids a larger reshuffle once routing and the
  homepage land.

## Open questions / follow-ups

- No new tests were written — this ticket is a structural move with no new
  logic. The existing `NODE_DEFINITIONS` test moved to
  `entities/workflow/model/__tests__/` unchanged and still passes. Acceptance
  for this ticket was verified via `npm run typecheck`, `npm run lint`,
  `npm run test:run`, `npm run build`, and a manual render check in the
  browser (seed `DataSource → Transform → Model` graph renders identically to
  before the reorg, no console errors).
- Follow-up tickets (JAC-6 node types, JAC-9 edit label, JAC-10 edge
  validation) will likely need to introduce the `features/` layer.
