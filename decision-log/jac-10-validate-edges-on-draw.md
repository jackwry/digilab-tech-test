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

## Open questions / follow-ups

- No node in the app currently has an `Any`-typed handle, so the "Dataset → Any is valid" rule is unit-tested but not currently visible in the live UI.
- JAC-10 only covers the three checks in the ticket (type compatibility, self-reference, circular reference). The brief's §C2 also lists "an input handle may have at most one incoming edge" — that's a separate, pre-existing scope item (not part of this ticket) and was left untouched.
- Verified the warning UI and the type-compatibility/self-reference rejections by driving the canvas directly in a browser (synthetic mouse events, since React Flow's connection handles listen for native mouse events rather than clicks). The seeded 3-node chain (`DataSource → Transform → Model`) can't structurally form a live cycle — `DataSource` has no input handle and `Model`'s output type doesn't match `Transform`'s input — so the circular-reference path was verified via unit tests (direct 2-node and indirect 3-node cycles) rather than live in the browser.
