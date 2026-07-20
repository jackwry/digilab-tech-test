# Decision Log: JAC-19 — Delete nodes

**Ticket:** https://linear.app/jackmcr/issue/JAC-19/delete-nodes
**Branch:** feature/jac-19-delete-nodes
**Date:** 2026-07-20

## Context

JAC-19 asks for a node to be deletable via a cross icon in its top-right
corner, with no confirmation prompt, and for any edges connected to that
node to be removed along with it. Frontend-only — no backend persistence
exists yet to worry about. Unlike JAC-9, this ticket had clear, explicit
acceptance criteria, which resolved most of the judgment calls the previous
ticket had to make (e.g. no ambiguity about whether a confirmation step was
wanted).

## Decisions

### Canvas state moved from a page-drilled hook to a Zustand store

- **Choice:** Per direct instruction, extracted `nodes`/`edges`/their
  setters/change-handlers out of `widgets/workflow-canvas/model/useWorkflowCanvasState.ts`
  (a `useNodesState`/`useEdgesState`-backed hook, prop-drilled from
  `WorkflowEditorPage` down through `WorkflowCanvasProps`) into a Zustand
  store: `entities/workflow/model/workflowStore.ts`, exporting
  `useWorkflowStore`. This follows [@xyflow/react's documented Zustand
  pattern](https://reactflow.dev/learn/advanced-use/state-management)
  (`applyNodeChanges`/`applyEdgeChanges`/`addEdge` inside store actions)
  rather than a hand-rolled alternative. `zustand` was already an
  installed-but-unused dependency — flagged as worth reaching for in both
  the JAC-6 and JAC-9 decision logs once more than a couple of features
  needed canvas state, which is now the case with `delete-node` as the third
  feature slice.
- **Alternatives considered:** Continuing to prop-drill a fourth/fifth prop
  onto `WorkflowCanvasProps` (rejected — this is exactly the pattern flagged
  as due for revisiting); a React Context provider instead of Zustand
  (rejected — Zustand is already an installed dependency with no context
  provider wiring required, and is the pattern the ReactFlow docs themselves
  recommend for this exact use case).
- **Trade-offs / risks accepted:** None significant. The store has no
  persistence/sync middleware — still purely in-memory, matching the
  ticket's explicit "frontend only, not persisted to the backend" scope.

### Store lives in `entities/workflow`, not `widgets/workflow-canvas`

- **Choice:** The store (and the seed data it initializes from, moved
  alongside it as `entities/workflow/model/initialWorkflow.ts`) sits in the
  `entities` layer, not in the `widgets/workflow-canvas` layer where the
  superseded hook used to live.
- **Alternatives considered:** Keeping the store inside
  `widgets/workflow-canvas/model/`, closer to where the canvas-owning code
  used to be.
- **Trade-offs / risks accepted:** None — this isn't really a trade-off,
  it's a hard constraint. This repo's FSD layering only allows `features/*`
  to depend on `entities`/`shared`, not on `widgets` (widgets sit above
  features). `features/add-node`, `features/edit-node-label`, and the new
  `features/delete-node` all need direct store access for their bridging
  hooks to work the way `WorkflowCanvas` now calls them — if the store lived
  in `widgets`, those feature hooks couldn't import it without inverting the
  layering that JAC-9's decision log already established as a hard rule in
  the other direction (entities can't depend on features).

### Feature hooks keep taking `setNodes`/`setEdges` as parameters, not pulled from the store internally

- **Choice:** Per direct instruction, `useAddNode`, `useUpdateNodeLabel`,
  and the new `useDeleteNode` all keep their existing shape — they receive
  `setNodes`/`setEdges` as function parameters rather than calling
  `useWorkflowStore` themselves. The store's `setNodes`/`setEdges` are typed
  as `Dispatch<SetStateAction<T>>`, the exact shape `useNodesState`'s setter
  already had, so **`useAddNode` and `useUpdateNodeLabel`'s bodies and
  existing tests needed zero changes** — only their call sites (now
  `useWorkflowStore((s) => s.setNodes)` instead of `useNodesState()`'s
  return value) moved.
- **Alternatives considered:** Having each feature hook call
  `useWorkflowStore` directly and drop the `setNodes`/`setEdges` parameters
  entirely (e.g. `useAddNode()` instead of `useAddNode(setNodes)`). This
  would remove one more level of indirection at each call site, but ties
  every feature hook directly to Zustand and would have required updating
  `useUpdateNodeLabel.test.ts`'s and (new) `useDeleteNode.test.ts`'s setup to
  mock or reset real store state between tests, instead of passing a plain
  `vi.fn()`.
- **Trade-offs / risks accepted:** The Zustand dependency is still "one hop
  away" from each feature hook rather than fully inlined — callers have to
  know to source `setNodes`/`setEdges` from the store. Kept deliberately, on
  direct instruction, in favour of not touching already-merged JAC-6/JAC-9
  hook internals or their tests.

### `WorkflowCanvas` wires `onLabelChange`/`onDelete` itself instead of receiving them as props

- **Choice:** `WorkflowCanvas` now calls `useUpdateNodeLabel(setNodes)` and
  `useDeleteNode(setNodes, setEdges)` directly (with `setNodes`/`setEdges`
  read from the store), rather than `WorkflowEditorPage` calling them and
  passing the results down as props. `WorkflowCanvasProps` is gone
  entirely — the component now takes no props.
- **Alternatives considered:** Keeping the previous pattern (page calls the
  hooks, passes callbacks down as props), just swapping where the page gets
  `setNodes`/`setEdges` from.
- **Trade-offs / risks accepted:** Both `onLabelChange` and `onDelete` are
  consumed entirely inside `WorkflowNodeCard`, which is only ever rendered
  by `WorkflowCanvas` (via `nodeTypes`) — threading them through the page
  was pure passthrough with no other consumer. `useAddNode` stays wired at
  the page level, unchanged, since its trigger (`AddNodeToolbar`) renders in
  the page's title panel, not inside the canvas. This does mean
  `WorkflowCanvas` now directly imports two feature slices
  (`features/edit-node-label`, `features/delete-node`) — legal under this
  repo's FSD layering (widgets may depend on features) and, since both
  callbacks only exist to be handed straight to the node card the canvas
  itself renders, arguably where they belonged already.

### Delete icon is always visible, not hover-revealed like the edit icon

- **Choice:** The "×" sits in the node's header bar and is visible by
  default — no `opacity-0`/`group-hover` treatment like the label's edit
  icon (JAC-9).
- **Alternatives considered:** Hover-revealed, matching the edit icon's
  pattern for visual consistency.
- **Trade-offs / risks accepted:** None — the ticket explicitly specifies
  "a cross icon in the top right of the node," not a hover-revealed one,
  so this follows the spec directly rather than a judgment call. It also
  incidentally avoids the discoverability complaint the edit icon's
  original double-click design drew in JAC-9.

### No confirmation step, immediate delete on click

- **Choice:** Clicking the "×" calls `onDelete(id)` synchronously — no
  `window.confirm`, no modal, no undo affordance.
- **Alternatives considered:** None seriously — the ticket explicitly says
  "This action does not prompt a confirmation."
- **Trade-offs / risks accepted:** A single misclick permanently removes a
  node and its edges with no way to recover it from within the app (browser
  undo/refresh aside). Explicitly the ticket's specified behaviour, not an
  oversight — flagged below in case a future ticket wants to revisit it.

## Open questions / follow-ups

- No undo for an accidental delete — explicitly in scope per the ticket's
  "no confirmation" instruction, but worth flagging if user feedback ever
  asks for it.
- The Zustand migration touches call sites in already-shipped JAC-6/JAC-9
  code (`useAddNode`'s and `useUpdateNodeLabel`'s call sites, not their
  internals) — full existing test suite (18 pre-existing tests) still passes
  unchanged, and the golden paths (add, edit label, delete) were re-verified
  manually in-browser after the migration.
- Connection-rule validation (brief §C2, the `onConnect` TODO) still lives
  unimplemented in the store, carried over verbatim from
  `useWorkflowCanvasState` — unrelated to this ticket's scope.
