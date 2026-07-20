# Decision Log: JAC-12 — Persist workflow in SQLite database

**Ticket:** https://linear.app/jackmcr/issue/JAC-12/persist-workflow-in-sqlite-database
**Branch:** feature/jac-12-persist-workflow-in-sqlite-database
**Date:** 2026-07-20

## Context

The backend's workflow endpoints were stubs returning `501`. JAC-12 asks for three things: real POST/PUT persistence backed by SQLite, a domain-modular backend architecture (organized by business domain — `workflow` — rather than a flat `routers`/`models` split), and a DTO envelope pattern for API responses.

## Decisions

### Full domain-module restructure, not just new endpoints

- **Choice:** Replaced the flat `app/routers/` + `app/models.py` layout with `app/health/` and `app/workflow/` packages, each owning its own router (and, for `workflow`, its models and persistence). Generic infrastructure (`db.py`, `dto.py`, `config.py`) stays at the app root since it isn't specific to any one domain.
- **Alternatives considered:** Leave the existing flat layout and just fill in the stubbed handlers.
- **Trade-offs / risks accepted:** A larger diff that touches files unrelated to persistence logic (health router just moved, unchanged), but the ticket explicitly asks for "modular architecture according to the business domain (ie workflow)" — filling in the stubs without restructuring wouldn't satisfy that.

### Workflows stored as one JSON payload per row, not normalized tables

- **Choice:** `workflows(id TEXT PRIMARY KEY, payload TEXT NOT NULL)`, where `payload` is the full `Workflow.model_dump_json()`. Reading back is `Workflow.model_validate_json(payload)`.
- **Alternatives considered:** Normalize into `workflows`, `nodes`, `edges` (and `handles`) tables with foreign keys.
- **Trade-offs / risks accepted:** Loses relational queryability (e.g. "find all workflows containing a `Model` node") and referential integrity at the DB level. Nothing in this ticket needs either — the API only ever reads/writes a whole workflow at once — and normalizing now would be speculative complexity for a shape (nodes/edges arrays) that's naturally document-like. If a future ticket needs to query inside workflows, this is the seam to revisit.

### `POST` always assigns a fresh server-side id; `PUT` 404s rather than upserting

- **Choice:** `WorkflowRepository.create` ignores any client-supplied `id` and generates its own (`uuid.uuid4().hex`). `update` requires the id to already exist and raises `WorkflowNotFoundError` (→ 404) otherwise.
- **Alternatives considered:** Let `POST` respect a client-supplied id if present; let `PUT` upsert (create on a missing id).
- **Trade-offs / risks accepted:** A `PUT` to an id that was never created 404s instead of silently creating it. This matches "receive a stable identifier" from POST (§C3) and avoids ambiguity about which endpoint is authoritative for id assignment — but it does mean a client can't "PUT to create" with a chosen id.

### DTO envelope: `CamelModel` moved to a shared `app/dto.py`, alongside `DataResponse`/`ListResponse`/`ErrorResponse`

- **Choice:** All three response shapes from the ticket are defined in `app/dto.py`. `DataResponse[T]` and `ErrorResponse` are wired into the workflow endpoints and into two global FastAPI exception handlers (`WorkflowNotFoundError` → 404, `RequestValidationError` → 422), so *every* error response shares one shape, not just workflow-specific ones. `ListResponse[T]` is defined but not wired to any endpoint, since there's no list/paginated route in this ticket's scope.
- **Alternatives considered:** Keep the envelope logic inline per-endpoint rather than as reusable generics; skip normalizing Pydantic's default validation-error shape.
- **Trade-offs / risks accepted:** `ListResponse` is currently dead code from the type checker's perspective — justified because the ticket explicitly asked to "establish" the pattern (all three shapes), not just use the one shape the current endpoints need.
- **`extraProps` is not a field.** The brief's example (`"extraProps": ""`) is illustrative, not a literal field name to implement — `ErrorDetail` instead sets `model_config = ConfigDict(extra="allow")`, so any endpoint-specific extras (e.g. the validation handler's `loc`) are passed straight through and serialise flat, alongside `code`/`message`, rather than nested under a fixed key. New error types can add whatever fields are useful without a schema change here. Since pydantic's static typing (`dataclass_transform`) doesn't know about `extra="allow"` at the type-checker level, extra-bearing instances are built via `ErrorDetail.model_validate({...})` rather than keyword arguments, so `mypy` doesn't reject the unknown kwarg.

## Open questions / follow-ups

- No concurrent-write handling (last write wins on `PUT`) — out of scope for this ticket (see JAC-12's sibling concerns around §C6 in the brief) but worth flagging for whoever picks that up.
- `ListResponse[T]` is unused until a list/paginated endpoint exists.
- The frontend's `workflowApi.ts` was updated to unwrap the new `{ data: ... }` envelope so the contract isn't silently broken, but no UI currently calls `createWorkflow`/`getWorkflow`/`updateWorkflow` yet (save/load wiring is still a separate, not-yet-built concern per the frontend README) — so this change has no live browser-observable effect yet.
- Verified end-to-end manually against a running server and a real SQLite file (POST → GET → PUT → GET, plus the 404 and 422 error shapes) in addition to the automated test suite.
