from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import SETTINGS
from app.db import connect
from app.dto import ErrorDetail, ErrorResponse
from app.health.router import router as health_router
from app.workflow.repository import WorkflowNotFoundError, init_db
from app.workflow.router import router as workflow_router
from app.workflow.validation import WorkflowValidationError


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    conn = connect()
    try:
        init_db(conn)
    finally:
        conn.close()
    yield


app = FastAPI(
    title="Workflow API — Full-Stack Exercise",
    description="Starter backend for the workflow builder exercise. See README.md.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=SETTINGS.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(WorkflowNotFoundError)
def handle_workflow_not_found(
    request: Request, exc: WorkflowNotFoundError
) -> JSONResponse:
    body = ErrorResponse(
        errors=[ErrorDetail(code="WORKFLOW_NOT_FOUND", message=str(exc))]
    )
    return JSONResponse(status_code=404, content=body.model_dump(by_alias=True))


@app.exception_handler(WorkflowValidationError)
def handle_workflow_validation_error(
    request: Request, exc: WorkflowValidationError
) -> JSONResponse:
    body = ErrorResponse(
        errors=[
            ErrorDetail.model_validate(
                {
                    "code": issue.code,
                    "message": issue.message,
                    "nodeId": issue.node_id,
                    "edgeId": issue.edge_id,
                }
            )
            for issue in exc.issues
        ]
    )
    return JSONResponse(status_code=422, content=body.model_dump(by_alias=True))


@app.exception_handler(RequestValidationError)
def handle_validation_error(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    body = ErrorResponse(
        errors=[
            ErrorDetail.model_validate(
                {
                    "code": "VALIDATION_ERROR",
                    "message": str(error["msg"]),
                    "loc": list(error["loc"]),
                }
            )
            for error in exc.errors()
        ]
    )
    return JSONResponse(status_code=422, content=body.model_dump(by_alias=True))


app.include_router(health_router)
app.include_router(workflow_router)
