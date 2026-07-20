# Decision Log: JAC-10 — Validate Edges on Draw

**Ticket:** https://linear.app/jackmcr/issue/JAC-10/validate-edges-on-draw
**Branch:** feature/jac-10-validate-edges-on-draw
**Date:** 2026-07-20

## Context

Every connection drawn on the canvas was accepted unconditionally (`useWorkflowCanvasState.ts` had a TODO to this effect). JAC-10 asks for three draw-time checks — handle-type compatibility, no self-references, no circular references — each surfaced to the user via an orange warning that appears just above the cursor's release point and fades after 3 seconds without tracking the cursor further.

## Decisions

### Validate in `onConnectEnd`, not `onConnect`

- **Choice:** Hook React Flow's `onConnectEnd(event, connectionState)` instead of `onConnect(connection)`, and commit the edge ourselves (via `addEdge`) inside that handler when validation passes.
- **Alternatives considered:** Keep `onConnect` (as the existing code did) and separately track pointer position via `onConnectStart`/mousemove listeners to have a release point available for the warning.
- **Trade-offs / risks accepted:** `onConnect` only fires for connections React Flow's own handle-role matching accepts (an output landing on an input); our domain-level checks still had to run in `onConnectEnd`'s `connectionState`, so consolidating both into one handler avoided duplicating the same lookup logic across two callbacks. `onConnectEnd`'s `FinalConnectionState` also isn't part of the library's most commonly documented path, so this is a slightly less conventional integration point than a bare `onConnect`.

### `validateConnection` takes plain data, not ReactFlow's node/edge types

- **Choice:** `validateConnection(connection, nodes, edges)` in `connectionValidation.ts` accepts a minimal `{ id, inputs, outputs }` / `{ source, target }` shape rather than `FlowNode`/`FlowEdge` or React Flow's `InternalNode`.
- **Alternatives considered:** Operate directly on `FlowNode[]`/`FlowEdge[]`.
- **Trade-offs / risks accepted:** Requires a small adapter (`nodes.map(...)`) at the call site in `useConnectNodes`, but keeps the validation module framework-agnostic and trivially unit-testable with plain object literals — no React Flow types or providers needed in its test file.

### Self-reference and circular-reference are distinct checks, in that order

- **Choice:** `validateConnection` checks self-reference (`source === target`) before running cycle detection, and each returns its own `reason`/`message`. Cycle detection is a BFS from the candidate edge's target, checking whether it can already reach the candidate's source via existing edges.
- **Alternatives considered:** Treat self-reference as a trivial 1-node case of the general cycle check (a single BFS covers both).
- **Trade-offs / risks accepted:** A small amount of duplication (self-reference is, in graph terms, already caught by the cycle check), but the ticket explicitly calls for a different warning message for each case, so they needed to be distinguishable outcomes rather than collapsed into one.

### `Any`-type compatibility implemented without a live handle to exercise it

- **Choice:** Implemented the general rule (`Any` is compatible with any concrete type, either direction) in `isTypeCompatible`, covered by unit tests using synthetic node fixtures, but did not add a new node type or handle to `NODE_DEFINITIONS` that actually uses `Any` in the running app.
- **Alternatives considered:** Add an `Any`-typed handle to an existing or new node type so the rule is exercised end-to-end in the UI.
- **Trade-offs / risks accepted:** Out of scope for this ticket — no node type currently needs an `Any` handle, and adding one speculatively would be scope creep. If a future ticket introduces one, this rule already covers it; flagged as a follow-up below.

## Review round: three fixes from PR feedback

The ticket owner reviewed the PR and updated the ticket's ACs in the process;
three fixes came out of that round.

### `Any` compatibility is a one-way wildcard, not symmetric

- **Choice:** The ticket was clarified mid-review: "Dataset → Any is valid.
  However Any → Model is not valid." `isTypeCompatible` no longer treats
  `Any` as compatible from either side — only an `Any`-typed **input**
  handle is a wildcard (`targetType === "Any" || sourceType === targetType`).
  An `Any`-typed **output** connecting into a concrete, non-`Any` input is
  now correctly rejected as `incompatible-type`.
- **Alternatives considered:** The original symmetric rule (`Any` compatible
  either direction), which is what the first pass implemented and unit
  tested — reasonable reading of the ticket's original, less specific
  wording, but explicitly corrected by the ticket owner in review.
- **Trade-offs / risks accepted:** None — this is a direct AC correction, not
  a judgment call.

### Cycle-detection comment was backwards; behavior was already correct

- **Choice:** The reviewer asked whether the A → B → C shortcut (adding
  A → C afterward) would be incorrectly rejected as circular. Tracing
  `wouldCreateCycle` by hand confirmed the *algorithm* was already correct —
  it BFSes forward from `target`, so it only rejects when `target` can loop
  back around to `source`, not merely when `target` is already reachable
  from `source` (the diamond/shortcut case is fine). The function's
  docstring, however, described the reverse check, which is almost certainly
  what led to the question. Fixed the comment to describe what the code
  actually does, and added two regression tests matching the reviewer's
  exact scenarios: A → B → C then A → C into a second input handle on C
  (allowed) and A → B → C then B → A (rejected).
- **Alternatives considered:** None — no logic changed here, only the
  comment and test coverage.
- **Trade-offs / risks accepted:** None.

### `ConnectionWarning` fades and slides by 50% of its own height

- **Choice:** Per direct feedback ("a short fade in and fade out, whilst
  transitioning up and down by 50% of its height respectively"),
  `useConnectionWarning` now tracks a `phase`: `"enter"` → `"visible"` →
  `"exit"`. The off-screen states (`enter`/`exit`) sit at `opacity-0`
  and `-translate-y-1/2` (50% of the badge's own height below its resting
  spot); `visible` is `opacity-100` at `-translate-y-full` (its normal
  anchored-above-the-cursor position). `ConnectionWarning` applies a
  `transition-[opacity,transform] duration-150` class and just switches
  classes based on `phase` — the same CSS transition plays forward on
  enter and in reverse on exit.
- **Alternatives considered:** Driving the animation from the component via
  a mount-triggered `useEffect`/local state instead of from the hook.
  Rejected to keep the existing split intact: `useConnectionWarning` owns
  all timing (including now the animation phase timing), `ConnectionWarning`
  stays purely presentational. Also considered `requestAnimationFrame` for
  the enter-phase kick-off instead of `setTimeout(fn, 0)` — went with
  `setTimeout` since it composes directly with the existing
  `vi.useFakeTimers()`-based tests without relying on whether Vitest's fake
  timers also intercept `requestAnimationFrame`.
- **Trade-offs / risks accepted:** The warning's total on-screen lifetime is
  unchanged at exactly 3000ms (enter and exit transitions happen within that
  window — the exit transition starts at 2850ms and the warning unmounts at
  3000ms) rather than extending the total duration by the transition time.
  This was a deliberate choice to avoid touching the ticket's explicit "3
  seconds" timing requirement while still satisfying the new animation ask.

## §C2 now implemented: an input handle can only take one incoming edge

- **Choice:** Originally scoped out (see the old note below, kept struck
  through for history). §C2 is now enforced: `HandleDefinition` gained an
  `io: "input" | "output"` discriminator, and `inputHasExistingOutput` checks
  whether the target node's specific input handle is already the target of
  an existing edge, rejecting with a new `"existing-input"` reason if so.
  This runs before the type-compatibility check in `validateConnection`.
- **Bug fixed along the way:** the first pass of this check compared
  `edge.target` (a *node* id, e.g. `"transform-1"`) directly against
  `targetHandle.id` (a *handle* id, e.g. `"dataset"`) — two different id
  namespaces that only coincidentally never collide, so the check silently
  never matched anything. Fixed by matching on the node id *and* the handle
  id together (`edge.target === targetNodeId && edge.targetHandle ===
  targetHandle.id`), which required adding `targetHandle`/`sourceHandle` to
  `ConnectionValidationEdge` (previously node-id-only). Added unit tests for
  `inputHasExistingOutput` directly, plus a `validateConnection`-level test
  confirming a second edge into an already-fed input is rejected, and that
  outputs can still fan out to multiple inputs (only inputs are single-edge).
- **Known follow-up:** `isDirectional` (checks a source/target handle pair
  is oriented output→input) was added alongside `io` but isn't wired into
  `validateConnection` yet — React Flow's own handle `type="source"` /
  `type="target"` semantics already prevent a wrong-direction drag at the UI
  layer, so it's redundant for the real app today, but worth either wiring
  in as defense-in-depth or removing if it's not going to be used.
- ~~JAC-10 only covers the three checks in the ticket (type compatibility,
  self-reference, circular reference). The brief's §C2 also lists "an input
  handle may have at most one incoming edge" — that's a separate,
  pre-existing scope item (not part of this ticket) and was left
  untouched.~~ (superseded above)

## Open questions / follow-ups

- No node in the app currently has an `Any`-typed handle, so the "Dataset → Any is valid" rule is unit-tested but not currently visible in the live UI.
- Verified the warning UI and the type-compatibility/self-reference rejections by driving the canvas directly in a browser (synthetic mouse events, since React Flow's connection handles listen for native mouse events rather than clicks). The seeded 3-node chain (`DataSource → Transform → Model`) can't structurally form a live cycle — `DataSource` has no input handle and `Model`'s output type doesn't match `Transform`'s input — so the circular-reference path was verified via unit tests (direct 2-node and indirect 3-node cycles) rather than live in the browser.
