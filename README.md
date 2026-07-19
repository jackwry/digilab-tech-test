# Full-Stack Workflow Exercise — Starter

A starter repository for the full-stack engineering exercise. It gives you a
running React + TypeScript frontend and a runnable FastAPI backend so you can
spend your time on the problem — designing and building the workflow editor,
the API contract, validation, and persistence — rather than on project setup.

> **Read [`EXERCISE.md`](./EXERCISE.md) first.** It is the canonical brief.

## What's in the box

```
gui-starter/
├── EXERCISE.md          # the brief — read this first
├── frontend/            # React 19 · TypeScript · Vite · ReactFlow · Tailwind · Zustand · TanStack Query · Vitest
├── backend/             # FastAPI · Pydantic v2 · Poetry · pytest
├── docker-compose.yml   # optional: run the backend in a container
└── package.json         # optional: run both apps with one command
```

Each half has its own README with details:
[`frontend/README.md`](./frontend/README.md) and
[`backend/README.md`](./backend/README.md).

The starter is deliberately a **skeleton**: both apps run, compile, and have
passing tests, but the workflow endpoints, validation, editing operations, and
save/load wiring are stubbed with `TODO`s. That's the exercise. Everything here
is a starting point you're free to restructure — just explain material changes.

## Prerequisites

- **Node 20+** and npm (frontend)
- **Python 3.12+** and [Poetry](https://python-poetry.org/docs/#installation) (backend)

## Quick start

Run the two apps in separate terminals (recommended):

```bash
# Terminal 1 — backend  →  http://localhost:8000  (docs at /docs)
cd backend
poetry install
poetry run uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend  →  http://localhost:3000
cd frontend
npm install
npm run dev
```

### Optional: run both with one command

```bash
npm install          # installs `concurrently` at the root
npm run dev          # starts frontend + backend together
```

(Assumes you've already run `poetry install` in `backend/` and `npm install` in
`frontend/`.)

### Optional: backend in Docker

If you'd rather not install Python/Poetry:

```bash
docker compose up    # backend at http://localhost:8000
```

Then run the frontend with npm as above.

## Running the tests

```bash
cd frontend && npm run test:run     # Vitest
cd backend  && poetry run pytest     # pytest
```

## Type alignment

The domain contract is defined on both sides and kept in step by hand for now:
`frontend/src/entities/workflow/model/types.ts` and `backend/app/models.py`. The backend
serialises to camelCase so both ends share one wire shape. Keeping these aligned
(and how you might automate it) is something to think about — see the brief.
