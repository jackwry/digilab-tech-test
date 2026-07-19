# Frontend — Workflow Editor (React + TypeScript)

A small React + TypeScript + Vite app with a running ReactFlow canvas. It
**renders a seed workflow and compiles, lints, and tests cleanly** — the editing
operations, validation feedback, and save/load wiring are the exercise (see
[`../EXERCISE.md`](../EXERCISE.md)).

## Prerequisites

- Node **20+** (`.nvmrc` at the repo root pins a version)
- npm

## Install & run

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at `http://localhost:3000`.

Point the app at the backend by copying `.env.example` to `.env` (the default,
`http://localhost:8000`, already matches the backend starter).

## Scripts

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Start the Vite dev server             |
| `npm run build`     | Type-check and build for production   |
| `npm run test`      | Run Vitest in watch mode              |
| `npm run test:run`  | Run Vitest once                       |
| `npm run lint`      | ESLint                                |
| `npm run typecheck` | `tsc --noEmit`                        |
| `npm run format`    | Prettier                              |

## What's provided vs. what's yours

**Provided (so you don't spend time on setup):**

- React 19 + TypeScript (strict) + Vite, with a `@/` path alias.
- Tailwind CSS v4, ReactFlow (`@xyflow/react`), Zustand, TanStack Query, axios,
  and `sonner` (toasts) installed and wired.
- A running canvas (`widgets/workflow-canvas/ui/WorkflowCanvas.tsx`) with a
  basic custom node, node definitions, a node factory, and a seed graph.
- The domain contract in `entities/workflow/model/types.ts` and an API client
  seam in `entities/workflow/api/workflowApi.ts`.
- Vitest configured, with one example test.

**Yours to design and build:**

- Editing: add a node, connect handles, plus one or two more operations (§C1).
- Connection rules and the feedback when a connection is rejected (§C2).
- Save/load against the API, and the states that matter — unsaved, saving,
  saved, validation failure, network failure, loading, not-found (§C3, §C5).
- How validation results are surfaced in the UI (§C4).
- The mapping between ReactFlow's `Flow*` objects and the persisted `Workflow`.

## Layout

The app is organised as [Feature-Sliced Design](https://feature-sliced.design)
(FSD): layers are ordered `app → pages → widgets → features → entities →
shared`, and a layer may only import from layers below it. Each slice exposes
a public API via its `index.ts` — import `@/entities/workflow`, not
`@/entities/workflow/model/types`.

```
frontend/src/
├── main.tsx                          # entry point
├── index.css                         # global styles (Tailwind)
├── app/
│   ├── App.tsx                       # shell: renders the current page
│   └── providers/AppProviders.tsx    # QueryClient + ReactFlowProvider + Toaster
├── pages/
│   └── workflow-editor/              # the editor page (start here for page chrome)
├── widgets/
│   └── workflow-canvas/              # the ReactFlow canvas composition
├── features/
│   └── add-node/                     # toolbar to add a permitted node type (JAC-6)
├── entities/
│   └── workflow/                     # the workflow domain: types, node
│       ├── model/                    #   definitions/factory, ReactFlow-specific
│       ├── api/                      #   shapes, CRUD calls, and the node card UI
│       └── ui/
└── shared/
    └── api/client.ts                 # axios instance (base URL, etc.)
```

`features/` holds one slice per user-facing scenario (e.g. `add-node`). Add a
new slice per ticket as interactive behaviour lands (e.g. connect-nodes,
edit-node-label) rather than growing an existing slice to cover unrelated
scenarios.

Everything here is a starting point — restructure it as you see fit and explain
material changes in your README.
