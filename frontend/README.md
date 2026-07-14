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
- A running canvas (`features/workflow/WorkflowEditor.tsx`) with a basic custom
  node, node definitions, a node factory, and a seed graph.
- The domain contract in `src/types/workflow.ts` and an API client seam in
  `src/api/workflows.ts`.
- Vitest configured, with one example test.

**Yours to design and build:**

- Editing: add a node, connect handles, plus one or two more operations (§C1).
- Connection rules and the feedback when a connection is rejected (§C2).
- Save/load against the API, and the states that matter — unsaved, saving,
  saved, validation failure, network failure, loading, not-found (§C3, §C5).
- How validation results are surfaced in the UI (§C4).
- The mapping between ReactFlow's `Flow*` objects and the persisted `Workflow`.

## Layout

```
frontend/src/
├── main.tsx                    # root: QueryClient + ReactFlowProvider + Toaster
├── App.tsx                     # shell
├── types/workflow.ts           # domain contract (mirrors the backend)
├── api/workflows.ts            # axios client seam (create / get / update)
└── features/workflow/
    ├── WorkflowEditor.tsx      # the ReactFlow canvas (start here)
    ├── WorkflowNode.tsx        # custom node (improve me)
    ├── flowTypes.ts            # ReactFlow-specific node/edge types
    ├── nodeDefinitions.ts      # handles per node type
    ├── nodeFactory.ts          # build a node of a given type
    ├── initialWorkflow.ts      # seed graph
    └── __tests__/              # example Vitest test
```

Everything here is a starting point — restructure it as you see fit and explain
material changes in your README.
