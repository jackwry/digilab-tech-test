# Decision Log: JAC-6 — Add node types

**Ticket:** https://linear.app/jackmcr/issue/JAC-6/add-node-types
**Branch:** feature/jac-6-add-node-types
**Date:** 2026-07-19

## Context

JAC-6 asks for the three node types (DataSource, Transform, Model) to be
introduced, each showing its type, with the user able to choose one of the
three when adding a node. Nodes already display their type (built in JAC-5's
`WorkflowNodeCard`). Per the ticket owner, this ticket's scope is narrowed to
just the missing piece: a toolbar that lets the user add a node of a chosen
type to the canvas. Connection rules (§C2), delete/rename operations, and
edge validation are separate tickets.

## Decisions

### New `features/add-node` slice, not folded into the widget

- **Choice:** Introduced the first `features/` slice (deferred in JAC-5's
  decision log until real editing behaviour existed). `AddNodeToolbar` is a
  presentational component that only knows about `NodeType` and an `onAdd`
  callback — it has no ReactFlow dependency. `useAddNode` is the hook that
  bridges it to ReactFlow's `setNodes`. (Where this gets rendered and wired
  up moved during review — see "Trigger lives in the page's title panel"
  below — but the feature slice itself stays framework-agnostic either way.)
- **Alternatives considered:** Keeping the toolbar and its logic entirely
  inside the `workflow-canvas` widget (simpler for a single ticket).
  Rejected because the next tickets (edit-node-label, delete-node,
  connect-nodes validation) will each add their own user-facing scenario, and
  starting the `features/` layer now — with a toolbar that's independently
  testable without ReactFlow — sets the right precedent instead of needing a
  larger refactor later.
- **Trade-offs / risks accepted:** Slightly more indirection (a hook +
  presentational component + wiring at the call site) than inlining the
  buttons and `setNodes` call directly where they're used.

### Trigger lives in the page's title panel, not floating over the canvas

- **Choice:** Per direct feedback, moved the "Add Node" trigger out of its
  own floating position over the canvas and into the existing top-left title
  panel (`WorkflowEditorPage`), next to "Workflow editor". This meant lifting
  ReactFlow's node/edge state out of `WorkflowCanvas` into a new
  `useWorkflowCanvasState` hook (`widgets/workflow-canvas/model/`), since the
  page now needs `setNodes` for `useAddNode` and `WorkflowCanvas` needs
  `nodes`/`edges`/the change handlers as props. `WorkflowCanvas` is now a
  controlled/presentational component; `WorkflowEditorPage` is the
  composition root that owns state and wires the title panel + canvas
  together. `AddNodeToolbar` itself dropped its own `absolute top-3 right-3`
  positioning in favour of `relative` (positioning only its own dropdown
  menu), so it can be embedded anywhere without assuming its own placement.
- **Alternatives considered:** Keeping state inside `WorkflowCanvas` and
  passing a render prop / children slot down to it for the toolbar
  (rejected — more indirection than just lifting state to the natural common
  ancestor, which is standard React practice); a shared Zustand store
  (rejected as premature — only two consumers of this state exist so far,
  and `zustand` is an installed-but-unused dependency worth reaching for once
  more features need canvas state, not for a single lift).
- **Trade-offs / risks accepted:** `WorkflowCanvas`'s public contract grew
  (5 props instead of none), and `WorkflowEditorPage` now carries state
  logic a page arguably shouldn't need to know much about beyond composition.
  If more editing features (delete-node, edit-label, connect validation)
  each need canvas state, revisit whether `useWorkflowCanvasState` should
  become a shared store instead of prop-drilling further.

### Node placement: simple staggered grid, not click-to-place or viewport-centered

- **Choice:** New nodes are placed via `nextNodePosition`, a pure function
  that lays nodes into a fixed 4-column grid below the seed graph, keyed off
  the current node count.
- **Alternatives considered:** Placing new nodes at the center of the current
  viewport (requires `useReactFlow().screenToFlowPosition` and viewport
  state); click-to-place (user clicks canvas after choosing a type). Both are
  more realistic UX but add material complexity for a ticket scoped to "the
  user can choose one of the three node types" — not polished placement.
- **Trade-offs / risks accepted:** Nodes can currently be added off the
  initially-fitted viewport (the user needs to pan/zoom or hit "fit view" to
  see them, which the browser check above confirmed). Repositioning is native
  ReactFlow drag, so this is a one-time inconvenience per add, not a dead
  end. Worth revisiting if a later ticket cares about editor ergonomics.

### "Add Node" dropdown instead of three separate buttons

- **Choice:** Reworked the toolbar, per direct feedback after the first
  review pass, from three always-visible buttons into a single "+ Add Node"
  trigger that opens a menu (`role="menu"` / `role="menuitem"`) listing the
  three node types. Closes on: selecting an item, clicking outside
  (`pointerdown` listener), or Escape. No dropdown/menu library exists in the
  repo, so this is a small hand-rolled implementation rather than a new
  dependency (consistent with JAC-5's stance on not adding tooling for a
  single ticket's needs). The plus icon is an inlined 14px SVG rather than an
  icon library, for the same reason.
- **Alternatives considered:** Adding a headless UI/menu library (e.g. Radix)
  for correct focus-trapping and full ARIA menu keyboard navigation
  (arrow-key item traversal, roving tabindex).
- **Trade-offs / risks accepted:** The hand-rolled menu supports Escape and
  click-outside to close, but not full arrow-key roving-tabindex navigation
  within the menu (each item is still individually Tab-focusable and
  Enter/Space-activatable, so it's keyboard-operable, just not with
  arrow-key menu semantics). Acceptable for three static items; would
  reconsider a real menu primitive if more toolbar menus are added later.
- The test file (`AddNodeToolbar.test.tsx`) was rewritten to match — this is
  a genuine requirements change post-review, not a loosened assertion: the
  new tests assert the menu is hidden until opened, lists all three types
  once opened, and closes after a selection.

### Per-type label and description text in the menu

- **Choice:** Added `features/add-node/model/nodeCopy.ts` with two
  `Record<NodeType, string>` maps, per direct feedback: `NODE_TYPE_LABELS`
  (a human-readable label — `DataSource` → "Data Source"; `Transform` and
  `Model` are already readable as-is) and `NODE_TYPE_DESCRIPTIONS` (a short
  blurb: "Add a dataset source", "Transform a dataset", "Train a model from
  a dataset"). Each menu item renders the label plus its description on a
  second line. The domain `NodeType` values themselves (`"DataSource"`,
  used as the ReactFlow/API identifier) are unchanged — only the menu's
  display text was reworked.
- **Alternatives considered:** A generic PascalCase-to-spaced-words
  formatter (e.g. `"DataSource".replace(/([a-z])([A-Z])/g, "$1 $2")`)
  instead of an explicit label map. Rejected: with only three fixed types
  and one of them needing a real word split, an explicit map is more
  direct and doesn't risk mangling a future node type name whose intended
  display form isn't a mechanical word-split (e.g. an acronym). Putting the
  descriptions in `entities/workflow` alongside `NODE_DEFINITIONS` was also
  considered and rejected — this is copy for one specific menu, not domain
  data other consumers need, so it stays local to `features/add-node`.

### Vitest + React Testing Library instead of Playwright for the toolbar

- **Choice:** Followed the repo's existing test tooling (Vitest, jsdom,
  `@testing-library/react`, already installed and used for the one example
  test) for both `nextNodePosition` (pure unit test) and `AddNodeToolbar`
  (component test: the menu is hidden by default, shows all three node types
  once opened, and clicking one calls `onAdd` with the right type and closes
  the menu).
- **Alternatives considered:** Playwright, per the ticket-to-pr skill's
  default framework choice for UI-facing behaviour.
- **Trade-offs / risks accepted:** No true end-to-end browser test exists in
  the automated suite (the golden-path click-through was verified manually
  in-browser for this PR, not captured as a repeatable test). Introducing a
  net-new e2e framework and config for a single toolbar in a time-boxed
  exercise wasn't a good trade — if the project grows past this exercise,
  Playwright is worth adding for true end-to-end coverage.

## Open questions / follow-ups

- Placement heuristic is intentionally simple (see above) — a later ticket
  focused on editor polish could place nodes at the viewport center or drop
  cursor instead.
- No delete/undo for accidentally-added nodes yet — out of this ticket's
  scope, but worth calling out since the toolbar makes it trivial to spam
  nodes onto the canvas.
