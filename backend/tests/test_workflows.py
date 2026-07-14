"""Example API tests.

The workflow endpoints are stubs for now, so these assert the not-yet-implemented
behaviour and keep the suite green. Replace them with tests for the persistence
and validation you build (see the brief's "Testing" section) — for example
round-tripping a saved workflow, a 404 on a missing id, and rejection of an
incompatible connection.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_create_workflow_is_not_yet_implemented():
    response = client.post(
        "/workflows", json={"name": "demo", "nodes": [], "edges": []}
    )
    assert response.status_code == 501


def test_get_missing_workflow_is_not_yet_implemented():
    response = client.get("/workflows/does-not-exist")
    assert response.status_code == 501
