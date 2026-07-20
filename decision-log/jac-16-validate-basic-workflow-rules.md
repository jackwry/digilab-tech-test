# Decision Log: JAC-16 — Ensure frontend and backend are validating the basic workflow rules

**Ticket:** https://linear.app/jackmcr/issue/JAC-16/ensure-frontend-and-backend-are-validating-the-basic-workflow-rules
**Branch:** feature/jac-16-validate-basic-workflow-rules
**Date:** 2026-07-20

## Context

JAC-10 validates edges one at a time as they're drawn on the canvas, but nothing validates a *whole* workflow — a saved workflow could still be internally inconsistent (duplicate ids, dangling references, etc.), and until now nothing re-checked that server-side either. JAC-16 asks for the same set of whole-workflow rules (the 7 listed on the ticket, plus JAC-10's self-reference/circular-reference rules) enforced on both ends: on the frontend so bad state is never posted, with the backend re-checking independently as a hard gate — these are basic rules a workflow must never violate, not advisories.

## Decisions

### Violations are hard errors on the backend: rejected, and never saved

- **Choice:** `POST`/`PUT` run `validate_workflow` on the incoming workflow *before* touching the repository. Any issue raises `WorkflowValidationError`, caught by a FastAPI exception handler that returns 422 with `ErrorResponse` (the same envelope Pydantic's own request-shape errors use) — `repo.create`/`repo.update` is never called, so nothing is persisted.
- **Alternatives considered (superseded):** An earlier pass had the backend always save the workflow and return diagnostics as non-blocking `warnings` on a successful response, reasoning that the ticket said violations "should be returned to the client as a warning." Corrected in review: since the frontend already validates the same rules before ever posting, the backend seeing a violation at all means something is genuinely wrong (a bypassed client, a bug) — these are basic rules the workflow must not violate, so the backend should refuse to save rather than accept it, the same way it already refuses a malformed request shape.
- **Trade-offs / risks accepted:** None significant — this removes the "saved but reported as warning" state entirely rather than trading one risk for another, so there's no longer a way for an invalid workflow to end up persisted via these endpoints.

### `ErrorDetail`/`DataResponse` reverted to their pre-JAC-16 shape

- **Choice:** The `level` field added to `ErrorDetail` and the `warnings` field added to `DataResponse` were both removed once the backend stopped producing warning-level diagnostics — every failure path (Pydantic's own 422s, `WORKFLOW_NOT_FOUND`, and now `WorkflowValidationError`) is a hard error, so a `level` that's always `"error"` has no signal left to carry.
- **Alternatives considered:** Keep `level` for forward compatibility in case a genuine warning-worthy diagnostic shows up later.
- **Trade-offs / risks accepted:** None — an unused optional field with only one possible value is dead weight, not future-proofing; it can be reintroduced if a real non-blocking-diagnostic use case shows up.

### Frontend validates before posting; a failing workflow never reaches the network

- **Choice:** `useWorkflowPersistence.save()` runs `validateWorkflow(nodes, edges)` first. If it finds anything, the request is never sent — every issue is reported via `pushWarning(message, "error")` and the button shows "Fix the issues below to save" (`PersistenceStatus: "invalid"`). A rejected request (backend 422, 5xx, network failure) reports the same way, via `extractApiErrors`.
- **Alternatives considered:** Post regardless and rely solely on the backend's response; label client-side violations as `"warning"` (orange) rather than `"error"` (red), reserving red for failures that actually round-tripped to the server.
- **Trade-offs / risks accepted:** Unifying both paths to `"error"` means the toast color no longer distinguishes "caught before it left the browser" from "rejected by the server" — but both are the same class of problem (a basic rule was violated, the save didn't happen), and displaying them differently would have implied one is more serious than the other when neither is.

### Toast stack is a new `features/validate-workflow` slice, separate from JAC-10's connection warning

- **Choice:** A new `useValidationWarnings` hook + `ValidationWarnings` component: a stack of dismissible toasts, bottom-right, 5s auto-dismiss or click-to-close, with a `level: "warning" | "error"` still supported at the component level (generic toast infrastructure) even though every producer in the app currently only emits `"error"`. Kept separate from JAC-10's `useConnectionWarning`/`ConnectionWarning` (a single message anchored above the cursor, 3s, no dismiss button).
- **Alternatives considered:** Generalize JAC-10's connection warning into a stack and reuse it for both; strip the `"warning"` level out of the component entirely since nothing currently produces it.
- **Trade-offs / risks accepted:** Kept `"warning"` as a supported (tested) level on the presentational component itself, since it's generic toast-severity styling rather than business logic tied to this ticket's now-error-only rules — removing it would mean re-adding it the next time any part of the app has a genuinely non-blocking notice.

### FastAPI/Pydantic 422s (and other request failures) reuse the same toast stack

- **Choice:** `useWorkflowPersistence.save()`'s catch block calls `extractApiErrors(err)` (`shared/api/errorResponse.ts`) to pull the backend's `ErrorResponse.errors` out of a failed request and reports each one as an `"error"` toast. A failure with no structured body (e.g. a network error) falls back to one generic `"error"` toast.
- **Alternatives considered:** Leave 422s as the existing plain "Failed to save" status text only, without a toast.
- **Trade-offs / risks accepted:** None — this was explicit feedback during scaffolding review ("any validation errors coming from FastAPI and Pydantic... should be reported as errors and come up as a toast as well").

### Whole-graph cycle detection, not incremental "would this edge create one"

- **Choice:** `_find_cyclic_edges`/`findCyclicEdges` run a single DFS back-edge detection over the *entire* structurally-valid edge set at once, rather than the original `_would_create_cycle(source, target, edges_so_far)` which asked, per edge in input order, "would adding this edge close a loop over what's been accepted so far."
- **Alternatives considered:** Keep the incremental, JAC-10-style check (it's what draw-time validation still correctly uses — a single candidate edge against an already-accepted graph, which is a genuinely different question).
- **Trade-offs / risks accepted:** None — the incremental framing was carried over from JAC-10 by copy-paste but never made sense for validating a graph that already exists in full: "would adding X create a cycle" presumes edges arrive one at a time, but here they're all given at once and the result shouldn't depend on the array order they happen to be stored in. The whole-graph version is also slightly cheaper (one DFS instead of one reachability search per edge) and its output composes correctly regardless of edge ordering in the payload.

### A pre-existing bug in handle lookup, found via manual browser verification

- **Choice:** `Transform` (and any node reusing the same handle id for both an input and an output, e.g. `"dataset"`) broke handle resolution wherever a node's own list of inputs was concatenated with its outputs and searched by id: whichever list came first won, regardless of which one was actually being asked for. This silently misresolved `Transform`'s own **output** handle to its **input** handle whenever `Transform` was used as an edge's *source* — which is exactly the `Transform → Model` leg of the app's own seeded demo graph. Caught live in the browser: saving the untouched seed graph was incorrectly flagged `INVALID_CONNECTION_DIRECTION`. Fixed in three places that all shared the same pattern — the new backend `_find_handle`, the new frontend `findHandle` in `workflowValidation.ts`, and the pre-existing `findHandle` in JAC-10's `connectionValidation.ts` — by having each take a `prefer: "input" | "output"` and search the expected list first.
- **Alternatives considered:** Fix only the two new JAC-16 call sites and leave `connectionValidation.ts` (JAC-10, out of this ticket's nominal scope) as-is.
- **Trade-offs / risks accepted:** Widened this ticket's diff to touch JAC-10 code, but leaving it would mean draw-time validation and whole-workflow validation disagreed on the exact same input, which would have been an obvious inconsistency for a reviewer to catch — and it's a real, user-facing bug (dragging a connection from `Transform`'s output would have been rejected as backwards). Added regression tests in all three files.

### Backend messages pair every node/handle label with its id

- **Choice:** Added `_describe_node`/`_describe_handle` helpers (`"'{label}' (id '{id}')"`) and used them in every `validation.py` message that references a node or handle, replacing bare label-only or id-only mentions. Labels aren't guaranteed unique, so the id is what actually lets a user (or a reviewer reading a log) pin down which node a message is about; the label is what makes it readable without cross-referencing the payload.
- **Alternatives considered:** Label only (reads better but is ambiguous if two nodes share a label); id only (unambiguous but useless to a human).
- **Trade-offs / risks accepted:** None. Also fixed a latent bug found while touching this code: `UNKNOWN_NODE_REFERENCE`'s message referenced `edge.label`, a field that doesn't exist on `WorkflowEdge` — would have raised `AttributeError` the first time that branch actually ran. Replaced with a description of whichever endpoint node *is* known to exist, when there is one.

## Open questions / follow-ups

- No UI exists yet to rename a workflow or otherwise trigger a 422 from the editor, so the FastAPI/Pydantic-422-as-error-toast path is covered by unit tests (mocked `updateWorkflow` rejection) rather than a live manual repro — there's no in-app action that currently produces a malformed request. The backend's reject-and-don't-save path for a genuinely invalid workflow *was* verified live (a hand-crafted `curl` POST with a duplicate node id: 422, and the workflow does not appear in a subsequent `GET /workflows`).
- `useWorkflowPersistence`'s `"invalid"` status and `useValidationWarnings`' toasts both live at the page level (`WorkflowEditorPage`); if the workflow editor ever gets more than one save entry point, that state should move up rather than being duplicated per entry point.
