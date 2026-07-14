from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    """Liveness check — useful for local sanity checks and container health."""
    return {"status": "ok"}
