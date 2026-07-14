from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import SETTINGS
from app.routers import health, workflows

app = FastAPI(
    title="Workflow API — Full-Stack Exercise",
    description="Starter backend for the workflow builder exercise. See README.md.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=SETTINGS.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(workflows.router)
