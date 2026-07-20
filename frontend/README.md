# Frontend — Workflow Editor (React + TypeScript)

A React + TypeScript + Vite app for building and editing node-based
workflows on a [ReactFlow](https://reactflow.dev) canvas: add nodes, connect
them with type- and direction-checked edges, edit labels, and save/load
against the backend API.

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

Point the app at the backend by copying `.env.example` to `.env` (the
default, `http://localhost:8000`, matches the backend's default port).

## Scripts

| Command              | What it does                        |
| --------------------- | ------------------------------------ |
| `npm run dev`         | Start the Vite dev server           |
| `npm run build`       | Type-check and build for production |
| `npm run test`        | Run Vitest in watch mode            |
| `npm run test:run`    | Run Vitest once                     |
| `npm run lint`        | ESLint                              |
| `npm run typecheck`   | `tsc --noEmit`                      |
| `npm run format`      | Prettier                            |

## What's here

- A homepage listing saved workflows, most recently updated first, with a
  "New workflow" action.
- An editor canvas (ReactFlow) supporting adding nodes, connecting/deleting
  edges, deleting nodes, and renaming node labels.
- Whole-workflow validation (duplicate/unknown ids, invalid connection
  direction, incompatible handle types, self- and circular-references,
  multiple incoming edges) that runs client-side before every save, blocking
  a bad save rather than letting it reach the API.
- Save-state UI: a Saved/Unsaved-changes indicator with the last-saved time,
  automatic retry of a failed save on a `5xx`, and a clear dialog if the
  server is genuinely unavailable.

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
│   ├── App.tsx                       # shell: router + page routes
│   └── providers/AppProviders.tsx    # QueryClient + ReactFlowProvider + Toaster
├── pages/
│   ├── workflows-home/                # homepage: list + create workflows
│   └── workflow-editor/               # the editor page, keyed by :workflowId
├── widgets/
│   └── workflow-canvas/               # the ReactFlow canvas composition
├── features/
│   ├── add-node/                      # toolbar to add a permitted node type
│   ├── connect-nodes/                 # draw-time connection validation
│   ├── edit-node-label/               # rename a node
│   ├── delete-node/                   # remove a node and its edges
│   ├── validate-workflow/             # whole-workflow rules + toast stack
│   └── persist-workflow/              # load/save, save-state UI, retry
├── entities/
│   └── workflow/                      # the workflow domain: types, node
│       ├── model/                     #   definitions/factory, ReactFlow-specific
│       ├── api/                       #   shapes, CRUD calls, and the node card UI
│       └── ui/
└── shared/
    └── api/                           # axios instance + shared error-response parsing
```

`features/` holds one slice per user-facing scenario; add a new slice as
interactive behaviour lands rather than growing an existing slice to cover
an unrelated scenario.
