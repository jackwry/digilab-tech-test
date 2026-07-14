# Software Engineer — Full-Stack Technical Exercise

> Setup is already done for you — see [`README.md`](./README.md),
> [`frontend/README.md`](./frontend/README.md), and
> [`backend/README.md`](./backend/README.md). Spend your time on the problem
> below, not on scaffolding.

## Before you start

This exercise describes more than can be built to production quality in the time
available. That is deliberate. We are not measuring how much you complete. We
are interested in:

- how you understand and shape an ambiguous problem;
- how you design the boundary between frontend and backend;
- what you prioritise, and what you deliberately leave out;
- how you reason about correctness, failure, and future change;
- whether you can explain and take ownership of what you submitted.

Treat this as the first iteration of a real product, not as a checklist or an
exam. A smaller, coherent implementation with clear trade-offs beats a larger,
inconsistent one.

**Time.** Please spend approximately **3–4 hours on the mandatory core**
described below. The core is sized to fit that time. A set of **optional
extensions** follows; they are genuinely optional and are not required to score
well. Do not exceed the time box to attempt them — we would rather see a clean
core and a paragraph of design thinking about the rest.

**AI tools.** You may use AI-assisted development tools. You are responsible for
all submitted code and documentation, and you should be able to explain every
significant decision and modify the solution during the follow-up discussion.
The follow-up is the most important part of our assessment, so favour a solution
you fully understand over a larger one you do not.

---

## Context

Our platform lets users define machine-learning workflows as directed graphs.
Each workflow consists of **nodes** (processing steps), typed **input/output
handles** (data passed between steps), and **edges** (the flow of data from one
node to another).

For example:

```text
Load Dataset → Transform Dataset → Train Model
```

Support these node types:

| Node type    | Input     | Output    |
| ------------ | --------- | --------- |
| `DataSource` | None      | `Dataset` |
| `Transform`  | `Dataset` | `Dataset` |
| `Model`      | `Dataset` | `Model`   |

A possible representation (also provided in the starter, in
`frontend/src/types/workflow.ts` and `backend/app/models.py`):

```ts
type DataType = "Dataset" | "Model" | "Any";

type HandleDefinition = {
  id: string;
  label: string;
  type: DataType;
  required?: boolean;
};

type WorkflowNode = {
  id: string;
  type: "DataSource" | "Transform" | "Model";
  position: { x: number; y: number };
  data: {
    label: string;
    inputs: HandleDefinition[];
    outputs: HandleDefinition[];
  };
};

type WorkflowEdge = {
  id: string;
  sourceNodeId: string;
  sourceHandleId: string;
  targetNodeId: string;
  targetHandleId: string;
};

type Workflow = {
  id?: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};
```

The precise schema is part of the design problem. Explain any material changes
you make.

---

## Your task

Build a small full-stack application that lets a user create, validate, save,
and retrieve a workflow. It should include a browser app in **React and
TypeScript**, an API in **Python** (preferably **FastAPI**), and a clearly
defined contract between them. No authentication, deployment, or real ML
execution is required. The frontend and backend should form one coherent
vertical slice — not two unrelated demos in one repository.

The starter already sets up React/TypeScript/Vite/ReactFlow and a FastAPI app;
use it so your time goes on the workflow behaviour and the contract between the
two.

---

## Mandatory core (target: ~3–4 hours)

Everything in this section is expected. A submission that does this cleanly,
with clear trade-offs, can score well across every category without touching the
optional extensions.

**C1. View and edit a workflow.** Display, or let the user create, a workflow of
at least `DataSource → Transform → Model`. Each node must clearly show its type,
its label, its inputs and outputs, and the type of each handle. Support a small
but meaningful set of editing operations — enough to demonstrate a sound design.
**Adding a node and connecting two handles are required.** Choose one or two more
(delete a node, delete an edge, rename a label); repositioning is optional. You
may use ReactFlow or another graph library.

**C2. Apply connection rules.** Connections must obey:

- a connection must start at an output handle and end at an input handle;
- source and target handles must be type-compatible;
- an input handle may have at most one incoming edge;
- an output handle may have multiple outgoing edges;
- all referenced nodes and handles must exist.

Valid: `DataSource.Dataset → Transform.Dataset`;
`Transform.Dataset → Model.Dataset`.
Invalid: `Model.Model → Transform.Dataset` (incompatible types);
`Transform.Dataset → DataSource.*` (`DataSource` has no input handle to target).

The user should get useful feedback when a connection is rejected.

**C3. Save and retrieve.** Provide an API the frontend uses for persistence.
Browser-local state alone is not sufficient. At minimum: create/save a workflow,
receive a stable identifier, retrieve by that identifier, and handle a request
for a workflow that does not exist. A possible shape:

```http
POST /workflows
GET  /workflows/{workflow_id}
PUT  /workflows/{workflow_id}
```

Persistence may be in-memory, a file, SQLite, or another lightweight option.
In-memory is completely acceptable if the consequences are stated.

**C4. Validate a complete workflow.** The system must validate an entire
workflow, not only individual drag-and-drop operations. 
We suggest you cover:
- references to unknown nodes
- references to unknown handles
- invalid source/target direction
- incompatible handle types
- more than one incoming edge for an input
- duplicate node identifiers
- duplicate edge identifiers

Choose **one additional graph-level rule** (for example: no cycles; required inputs must be connected; at
least one `DataSource` exists; disconnected nodes produce warnings; every node
reachable from a `DataSource`).

Say why you chose it and whether a violation is
an error or a warning. Return structured diagnostics (a list of coded issues),
not a single boolean, and show the result usefully in the UI. Example shape:

```json
{
  "valid": false,
  "errors": [
    {
      "code": "INCOMPATIBLE_HANDLE_TYPES",
      "message": "Model output cannot connect to Dataset input",
      "edgeId": "edge-4",
      "path": "edges[3]"
    }
  ],
  "warnings": [
    {
      "code": "DISCONNECTED_NODE",
      "message": "Node transform-2 is not connected",
      "nodeId": "transform-2"
    }
  ]
}
```

**C5. Handle failure and server state.** The frontend should distinguish the
states that matter, including where appropriate: unsaved local changes; saving;
save success; validation failure; server/network failure; loading a saved
workflow; a workflow that no longer exists. Visual polish is not required, but
the user should never be left uncertain about what happened.

**C6. One written consistency decision (required).** In your README, state
clearly **what happens when two updates are made to the same workflow** — even if
your answer is "last write wins, and here is why that is acceptable for a first
iteration." This is the one consistency question we require in writing; the rest
can be discussed live.

---

## Optional extensions (only if the core is clean and time remains)

These are not required and carry no penalty if omitted. Attempt at most one, and
prefer a short written design over rushed code. Your choice is assessed for
coherence with the rest of your solution, never for volume.

- **Execution seam.** Define an execution API and domain model
  (`POST /workflows/{id}/runs`, `GET /runs/{run_id}`) with states such as
  `queued → running → completed / failed`. Implement a thin stub that may
  simulate work, **or** simply document the design (state transitions, async
  processing, idempotency, retries, persistence, how the frontend observes
  progress, and how it might run in AWS).
- **Optimistic concurrency.** Add a workflow revision number and reject stale
  updates with an appropriate HTTP status; describe how the frontend responds.
- **Schema alignment.** Generate client types from OpenAPI, or otherwise show
  how frontend and backend types stay aligned. (Even without this extension, the
  core requires one sentence on how you keep them aligned.)
- **`Any` type support.** If you implement it, document its compatibility rules.

---

## Deliberately unspecified

Make reasonable decisions and record them briefly. Do not try to support every
interpretation:

- whether invalid workflows may be saved;
- whether validation happens automatically or on demand;
- whether node definitions are hard-coded or supplied by the API;
- whether layout (`position`) is domain data or UI-only;
- whether updates replace the whole workflow or apply partial changes;
- whether execution operates on the latest workflow or an immutable version;
- whether warnings prevent execution.

---

## Non-goals

You do not need: authentication/authorisation; multi-user collaboration; a real
ML model; execution of arbitrary user code; a production-grade queue; a polished
design system; drag-and-drop config panels; every graph operation; or full AWS
deployment. You may discuss any of these where relevant.

---

## Testing

Include automated tests focused on the behaviour you consider most important —
not exhaustive coverage. Good candidates: graph validation rules; API behaviour;
persistence behaviour; frontend state transitions; user-visible handling of API
failures; the interaction between editing and validation. Your selection should
reflect your priorities.

---

## Submission and README

Submit a link to a GitHub repository (if private, contact us for usernames to
grant access). Keep the README focused — **prefer building over writing**. It
should contain:

**Running the solution.** Prerequisites; dependency installation; how to start
backend and frontend; how to run tests; any environment variables; how to
create, save, and retrieve a workflow; and example API requests or another way
to explore the API.

**Decisions & trade-offs (one consolidated section).** What you implemented and
what you did not; how you spent your time; the main frontend/backend
responsibility boundary; the source of truth for validation; your persistence
choice and its consequences; your error-handling approach; **your one required
consistency decision (concurrent updates)**; one sentence on how frontend/backend
types stay aligned; your most significant compromise; and any key assumptions.
Aim for signal over length — a page is plenty.

**AI-assisted development.** Which tools you used, for what, how you reviewed or
tested the output, and anything you substantially changed. Using AI is neither
positive nor negative; we assess the result and your ownership of it.

---

## Follow-up discussion

The follow-up is the most important part of our assessment. We may ask you to
walk through the save flow end to end, explain the schema, identify the
authoritative validation layer, explain what happens when browser and server
disagree, add or design a node type, change a connection rule, prevent lost
updates, make versions immutable, add cancellation to a run, propagate a new API
field through the UI, diagnose a deliberately introduced bug, discuss an AWS
deployment, or make a small live change. The goal is to understand your
reasoning and how you respond to changing requirements — not typing speed. You
may consult your own documentation and use your normal tools, including AI,
provided you explain and verify the result.
