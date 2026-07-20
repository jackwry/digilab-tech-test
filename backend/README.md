# Backend — Workflow API (FastAPI)

A FastAPI service for persisting and validating workflows: CRUD endpoints
backed by SQLite, plus whole-workflow validation that mirrors the frontend's
rules as a second, independent gate rather than a trusting one.

## Prerequisites

- Python **3.12+**
- [Poetry](https://python-poetry.org/docs/#installation)

> Rather not install Python locally? A containerised path is provided — see
> [_Docker (optional)_](#docker-optional).

## Install & run

```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload --port 8000
```

- API root: `http://localhost:8000`
- Interactive docs (Swagger UI): `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health` → `{"status": "ok"}`

## Test

```bash
poetry run pytest
```

## Typecheck

```bash
poetry run mypy app tests
```

## What's here

- `POST /workflows`, `GET /workflows` (paginated, most recently updated
  first), `GET /workflows/{id}`, `PUT /workflows/{id}` — backed by a SQLite
  repository (one row per workflow, JSON payload column; see
  `app/workflow/repository.py`). Updates are last-write-wins — no optimistic
  concurrency check.
- Whole-workflow validation (`app/workflow/validation.py`) runs on every
  create/update; any violation is rejected with a `422` and nothing is
  saved. Failures are always reported through a shared `{errors: [...]}`
  envelope, whether they come from this validation, a `404`, or FastAPI's
  own request-shape checks.
- CORS configured for the Vite dev server (`app/config.py`), overridable via
  `ALLOWED_ORIGINS`.

## Example requests

```bash
# Health
curl http://localhost:8000/health

# Create a workflow
curl -X POST http://localhost:8000/workflows \
  -H 'Content-Type: application/json' \
  -d '{"name":"My workflow","nodes":[],"edges":[]}'
```

## Layout

```
backend/
├── app/
│   ├── main.py             # FastAPI app + CORS + exception handlers
│   ├── config.py           # settings (CORS origins, database path)
│   ├── db.py                # SQLite connection (one per request)
│   ├── dto.py                # response envelopes (DataResponse, ErrorResponse, ...)
│   ├── health/router.py     # GET /health
│   └── workflow/
│       ├── models.py         # Pydantic domain models (the wire contract)
│       ├── repository.py     # SQLite-backed CRUD
│       ├── router.py         # POST/GET/PUT /workflows
│       └── validation.py     # whole-workflow rule checks
├── tests/                    # pytest + FastAPI TestClient
├── pyproject.toml            # Poetry project + dev tooling (pytest, black, flake8, mypy)
└── Dockerfile                # optional containerised run
```

## Docker (optional)

From the repo root, `docker compose up` builds and runs this backend in a
container (handy if you'd rather not install Python/Poetry). The frontend
still runs with npm. See the root `README.md`.
