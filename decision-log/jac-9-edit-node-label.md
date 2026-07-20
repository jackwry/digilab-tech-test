# Decision Log: JAC-9 — Edit node label

**Ticket:** https://linear.app/jackmcr/issue/JAC-9/edit-node-label
**Branch:** feature/jac-9-edit-node-label
**Date:** 2026-07-19

## Context

JAC-9 asks that each node's label be editable. The ticket is a single line
("Each Node should have a label which can be edited") with no acceptance
criteria — the trigger, commit/cancel behaviour, and empty-label handling
were all left to be decided here. `label` already existed on node data (set
by JAC-6's `createFlowNode`, defaulting to the node type); this ticket adds
the editing UI and the state plumbing to mutate it, not a schema change.

## Decisions

### Hover-revealed edit icon as the trigger, not double-click

- **Choice:** A small pencil icon button sits at the end of the label row.
  It's transparent by default and fades in on hover of the row (Tailwind
  `group`/`group-hover`), plus on keyboard focus (`focus-visible`) so it's
  still reachable without a mouse. Clicking it swaps the label for a text
  `<input>` in place, autofocused with the existing text selected. Enter or
  blur commits (trimmed); Escape cancels and reverts to the pre-edit value.
- **Alternatives considered:** Double-click on the label text itself (this
  was the original scaffold's trigger — reworked per direct feedback that
  it wasn't visually clear enough that a label was editable); an
  always-visible icon (rejected — adds visual clutter to every node's label
  row when most of the time the user isn't renaming anything).
- **Trade-offs / risks accepted:** None beyond the general hover-affordance
  caveat below — hover-only discovery still doesn't help a touch-only user
  who hasn't first tapped/focused the node, but the icon is now reachable
  via keyboard focus even without hover, which double-click was not.

### Empty (or whitespace-only) label reverts instead of committing

- **Choice:** If the trimmed draft is empty on commit, the edit is treated
  like a cancel — the previous label is kept and `onLabelChange` is not
  called.
- **Alternatives considered:** Allowing an empty label (nodes would render
  with a blank label area); falling back to the node's type name
  (`nodeType`) as a synthetic default, mirroring `createFlowNode`'s existing
  `label ?? nodeType` fallback for newly-added nodes.
- **Trade-offs / risks accepted:** No inline validation message is shown
  when this happens — the input just silently reverts. Given the ticket
  doesn't specify desired behaviour here, this was a judgement call; a
  reviewer may prefer the type-name fallback for consistency with
  `createFlowNode`, or an inline error instead of silent revert.

### New `features/edit-node-label` slice with a bridging hook, callback threaded through `nodeTypes`

- **Choice:** Mirrored JAC-6's `add-node` shape: `useUpdateNodeLabel(setNodes)`
  returns `(id, label) => void`, which `WorkflowEditorPage` wires up and
  passes to `WorkflowCanvas` as a new `onLabelChange` prop (alongside the
  existing `onNodesChange`/`onConnect`). `WorkflowCanvas` closes over it in a
  `useMemo`'d `nodeTypes` map so `WorkflowNodeCard` receives it as a normal
  prop rather than reaching into ReactFlow's node-data.
- **Alternatives considered:** Calling `useReactFlow().setNodes()` directly
  from inside `WorkflowNodeCard` (avoids prop-threading, but writes to
  ReactFlow's internal store while `useWorkflowCanvasState` — the actual
  source of truth in this controlled setup — still holds the pre-edit
  array; the next `onNodesChange`-driven render would clobber the edit).
  A React context provided by the feature slice and consumed inside
  `WorkflowNodeCard` (rejected: `entities/workflow` sits below
  `features/` in this repo's FSD layering, so the entity component can't
  import from a feature without inverting that dependency).
- **Trade-offs / risks accepted:** Same as JAC-6's canvas-state decision —
  this is now a third consumer of prop-threaded canvas state
  (`add-node`, `edit-node-label`, and node/edge changes themselves). If a
  fourth editing feature (delete-node, connection validation) needs the
  same treatment, it's worth promoting `useWorkflowCanvasState` to a shared
  store rather than continuing to grow `WorkflowCanvasProps`.

### Local edit-mode state stays in `WorkflowNodeCard`, not a separate hook/component

- **Choice:** `isEditing`/draft value are plain `useState` inside
  `WorkflowNodeCard` itself, not extracted into a shared hook or a
  presentational subcomponent in the feature slice.
- **Alternatives considered:** Extracting an `EditableLabel` component into
  `features/edit-node-label/ui`. Rejected for the same FSD-layering reason
  as above (the entity component can't import it), and because the local
  state here is small and has exactly one consumer — extracting it now
  would be premature.

### Vitest + React Testing Library, matching JAC-6's precedent

- **Choice:** `WorkflowNodeCard.test.tsx` covers the editing interaction
  (edit icon present but hover-revealed, enter/exit edit mode via the icon,
  commit via Enter, commit via blur, cancel via Escape, whitespace
  trimming, empty-label revert, no-op when unchanged);
  `useUpdateNodeLabel.test.ts` covers the pure state-mapping logic in
  isolation. No Playwright test was added.
- **Alternatives considered:** Playwright, per the ticket-to-pr skill's
  default for UI-facing behaviour — same call as JAC-6, for the same
  reason (see that decision log): this repo has already established
  Vitest + RTL as its UI test tooling, and introducing a second framework
  for one more interaction isn't a good trade in a time-boxed exercise.
- The hover → click icon → Enter flow was also verified manually in-browser
  (along with blur-commit and Escape-cancel, and confirming the icon
  actually fades in on hover rather than just existing in the DOM) — not
  captured as an automated end-to-end test, same gap as JAC-6.

## Open questions / follow-ups

- Empty-label handling (silent revert vs. fallback to `nodeType` vs. inline
  validation) was a judgement call with no ticket guidance — flagging for
  the ticket owner to confirm intended behaviour.
- If `delete-node` or `connect-nodes` validation (both referenced in JAC-6's
  decision log as upcoming) also need canvas-state access, revisit whether
  `useWorkflowCanvasState` should become a shared store instead of a fourth
  prop threaded through `WorkflowCanvasProps`.
