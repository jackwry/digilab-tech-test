"""API-level tests for the workflow endpoints, exercised through the DTO
envelope (JAC-12). See `test_workflow_repository.py` for persistence-only
tests that don't go through HTTP."""

from fastapi.testclient import TestClient


def create_demo_workflow(client: TestClient) -> dict:
    response = client.post(
        "/workflows", json={"name": "demo", "nodes": [], "edges": []}
    )
    assert response.status_code == 201
    return response.json()["data"]


def test_create_workflow_returns_201_wrapped_in_a_data_envelope(
    client: TestClient,
) -> None:
    response = client.post(
        "/workflows", json={"name": "demo", "nodes": [], "edges": []}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["data"]["id"]
    assert body["data"]["name"] == "demo"


def test_create_workflow_assigns_id_ignoring_any_client_supplied_one(
    client: TestClient,
) -> None:
    response = client.post(
        "/workflows",
        json={"id": "client-supplied", "name": "demo", "nodes": [], "edges": []},
    )

    assert response.status_code == 201
    assert response.json()["data"]["id"] != "client-supplied"


def test_create_workflow_stores_and_returns_the_client_supplied_lid(
    client: TestClient,
) -> None:
    response = client.post(
        "/workflows",
        json={"lid": "local-1", "name": "demo", "nodes": [], "edges": []},
    )

    assert response.status_code == 201
    body = response.json()["data"]
    assert body["lid"] == "local-1"
    assert body["id"] != "local-1"


def test_create_workflow_missing_name_returns_422_dto_error(
    client: TestClient,
) -> None:
    response = client.post("/workflows", json={"nodes": [], "edges": []})

    assert response.status_code == 422
    body = response.json()
    assert body["errors"][0]["code"] == "VALIDATION_ERROR"


def test_created_workflow_can_be_retrieved(client: TestClient) -> None:
    created = create_demo_workflow(client)

    response = client.get(f"/workflows/{created['id']}")

    assert response.status_code == 200
    assert response.json()["data"] == created


def test_get_missing_workflow_returns_404_dto_error(client: TestClient) -> None:
    response = client.get("/workflows/does-not-exist")

    assert response.status_code == 404
    body = response.json()
    assert body["errors"][0]["code"] == "WORKFLOW_NOT_FOUND"


def test_update_persists_changes(client: TestClient) -> None:
    created = create_demo_workflow(client)

    update = client.put(
        f"/workflows/{created['id']}",
        json={"name": "renamed", "nodes": [], "edges": []},
    )
    assert update.status_code == 200
    assert update.json()["data"]["name"] == "renamed"

    fetched = client.get(f"/workflows/{created['id']}")
    assert fetched.json()["data"]["name"] == "renamed"


def test_update_missing_workflow_returns_404_dto_error(client: TestClient) -> None:
    response = client.put(
        "/workflows/does-not-exist",
        json={"name": "x", "nodes": [], "edges": []},
    )

    assert response.status_code == 404
    body = response.json()
    assert body["errors"][0]["code"] == "WORKFLOW_NOT_FOUND"
