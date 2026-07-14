from fastapi import APIRouter, HTTPException, status

from app.models import Workflow

router = APIRouter(prefix="/workflows", tags=["workflows"])

# TODO (candidate): persistence. In-memory, a file, SQLite — your choice
# (brief §C3). Whatever you pick, state the consequences.

@router.post("", status_code=status.HTTP_201_CREATED)
def create_workflow(workflow: Workflow) -> Workflow:
    """Create/save a workflow and return it with a stable identifier."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented — design and build POST /workflows.",
    )


@router.get("/{workflow_id}")
def get_workflow(workflow_id: str) -> Workflow:
    """Retrieve a workflow by its identifier."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented — design and build GET /workflows/{id}.",
    )


@router.put("/{workflow_id}")
def update_workflow(workflow_id: str, workflow: Workflow) -> Workflow:
    """Update an existing workflow."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented — design and build PUT /workflows/{id}.",
    )


# TODO (candidate): full-workflow validation (brief §C4). Decide whether this is
# a separate endpoint (e.g. POST /workflows/{id}/validate or POST
# /workflows/validate) or runs on save, and return structured diagnostics (see
# `ValidationResult` in app/models.py) rather than a bare boolean. Keeping the
# validation logic in its own pure module, independent of the web layer, makes
# it far easier to test.
