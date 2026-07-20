# Full-Stack Workflow Exercise — Starter

[![CI](https://github.com/jackwry/digilab-tech-test/actions/workflows/ci.yml/badge.svg)](https://github.com/jackwry/digilab-tech-test/actions/workflows/ci.yml)

This repo contains two applications that together form a basic workflow editor.

In the Frontend project we have a React app, using a
[FSD architecture](https://feature-sliced.design). In the backend we have a
FastAPI application using Pydantic and a SQLite database integration.

See their respective READMEs for details:
[`frontend/README.md`](./frontend/README.md) and
[`backend/README.md`](./backend/README.md).

## Rationale

For the purposes of this project / challenge, I wanted to approach it as if I
were starting an early iteration of a web app which is intended to be deployed
to production. I believe that setting out a strong architecture at an early
stage, prevents future rework, and also helps establish clear patterns that
other developers and AI agents can follow. The trade off is that the FSD and
modular architectures would be considered heavyweight for a purely prototype
application.

## Approach

Initially I spent time analysing the assignment and creating tasks in
[Linear](https://linear.app). I distilled the requirements for the core of the
exercise into light acceptance criteria. I then made heavy use of agentic
development, using Claude Code, to implement each task, step by step. This
involved a PR review process in Github, acting as an approval gate before merge
into main. Whilst the agent was developing each task I would be checking output
steps, code and functional output. I also ensured a good level of test coverage
was put in place by forcing the agent into a TDD approach.

I initially started implementing frontend features with React Flow as this was
more of an unknown for me but the implementation seemed very intuitive and
obviously inspired some of the existing data types. As such I decided to change
the example datatypes very little.

## Decisions and Trade-offs

I did not have time to continue beyond the core tasks and did not put emphasis
on styling the components. This was in the interest of completing as much of the
core implementation as possible. There are several aspects of this application
that I would change given more time. Primarily moving more application "source
of truth" to the backend.

Currently, fixed node definitions exist in the frontend. The backend only cares
about what it considers a "valid" workflow. I would much prefer to move node
definitions to the backend.

The **database approach** was to add a very lightweight SQLite integration with
a database written to file. Again this is because I wanted to focus on feature
implementation and architecture. I would swap out SQLite for an ORM, most
likely SQL Alchemy, and integrate this in the existing repository layer.

**Consistency decision:** Given the lightweight nature of the data layer, I have
stuck to the most basic decision here which is to allow most recent update wins.
There are several approaches that could be taken in an application such as this,
and so I thought this would be an interesting discussion point.

Our **validation source of truth** is in the backend layer, but this is guarded
strongly by frontend validation checks, which allow for better user feedback.
Given the editor nature of the application I would have liked to extend this
feedback into a more "console" like experience, showing a history of warnings
and errors.

**Type alignment:** Backend and frontend types are manually aligned currently,
but both could be generated from an Open API schema to improve alignment.

**Error handling** on the backend is managed using thrown custom exceptions, in
combination with exception handlers. I have not included logging in this
application but this would be an important next step to highlight any genuine
errors.

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
