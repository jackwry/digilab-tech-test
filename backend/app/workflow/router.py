import sqlite3

from fastapi import APIRouter, Depends, Query, status

from app.db import get_connection
from app.dto import DataResponse, ListResponse
from app.workflow.models import Workflow
from app.workflow.repository import WorkflowRepository
from app.workflow.validation import WorkflowValidationError, validate_workflow

router = APIRouter(prefix="/workflows", tags=["workflows"])


def get_repository(
    conn: sqlite3.Connection = Depends(get_connection),
) -> WorkflowRepository:
    return WorkflowRepository(conn)


def _ensure_valid(workflow: Workflow) -> None:
    """Runs whole-workflow validation (JAC-16) and rejects the request if it
    fails. The frontend already runs the same rules before ever posting, so
    the backend isn't expected to see a workflow that fails them — this
    exists as a second, independent check, not a lenient one, so a workflow
    that fails it is never saved."""
    issues = validate_workflow(workflow)
    if issues:
        raise WorkflowValidationError(issues)


@router.post(
    "",
    response_model=DataResponse[Workflow],
    status_code=status.HTTP_201_CREATED,
)
def create_workflow(
    workflow: Workflow, repo: WorkflowRepository = Depends(get_repository)
) -> DataResponse[Workflow]:
    """Create a workflow and return it with a stable, server-assigned identifier."""
    _ensure_valid(workflow)
    return DataResponse(data=repo.create(workflow))


@router.get("", response_model=ListResponse[Workflow])
def list_workflows(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=50),
    repo: WorkflowRepository = Depends(get_repository),
) -> ListResponse[Workflow]:
    """List workflows, most recently updated first (JAC-13 homepage).

    Paginated via `offset`/`limit` query params; the frontend doesn't request
    a page yet (it just takes the default), but the repository and this
    endpoint both support it for when it does.
    """
    workflows = repo.list_all(offset=offset, limit=limit)
    return ListResponse(data=workflows, offset=offset, limit=limit)


@router.get("/{workflow_id}", response_model=DataResponse[Workflow])
def get_workflow(
    workflow_id: str, repo: WorkflowRepository = Depends(get_repository)
) -> DataResponse[Workflow]:
    """Retrieve a workflow by its identifier."""
    return DataResponse(data=repo.get(workflow_id))


@router.put("/{workflow_id}", response_model=DataResponse[Workflow])
def update_workflow(
    workflow_id: str,
    workflow: Workflow,
    repo: WorkflowRepository = Depends(get_repository),
) -> DataResponse[Workflow]:
    """Update an existing workflow. 404s if the id doesn't exist yet (no upsert)."""
    _ensure_valid(workflow)
    return DataResponse(data=repo.update(workflow_id, workflow))
