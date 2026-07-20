"""Unit tests for `WorkflowRepository` — persistence logic in isolation from
the HTTP layer. See `test_workflows.py` for the API-level equivalents."""

import sqlite3
from collections.abc import Iterator

import pytest

from app.workflow.models import (
    HandleDefinition,
    Position,
    Workflow,
    WorkflowNode,
    WorkflowNodeData,
)
from app.workflow.repository import (
    WorkflowNotFoundError,
    WorkflowRepository,
    init_db,
)


@pytest.fixture()
def conn() -> Iterator[sqlite3.Connection]:
    connection = sqlite3.connect(":memory:")
    connection.row_factory = sqlite3.Row
    init_db(connection)
    yield connection
    connection.close()


@pytest.fixture()
def repo(conn: sqlite3.Connection) -> WorkflowRepository:
    return WorkflowRepository(conn)


def make_workflow(**overrides: object) -> Workflow:
    defaults: dict[str, object] = {"name": "demo", "nodes": [], "edges": []}
    defaults.update(overrides)
    return Workflow.model_validate(defaults)


def test_create_assigns_a_stable_server_side_id(repo: WorkflowRepository) -> None:
    created = repo.create(make_workflow())
    assert created.id
    assert isinstance(created.id, str)


def test_create_ignores_a_client_supplied_id(repo: WorkflowRepository) -> None:
    created = repo.create(make_workflow(id="client-supplied"))
    assert created.id != "client-supplied"


def test_create_preserves_a_client_supplied_lid(repo: WorkflowRepository) -> None:
    created = repo.create(make_workflow(lid="local-1"))
    assert created.lid == "local-1"
    assert created.id != "local-1"


def test_create_returns_two_distinct_ids_for_two_workflows(
    repo: WorkflowRepository,
) -> None:
    first = repo.create(make_workflow())
    second = repo.create(make_workflow())
    assert first.id != second.id


def test_get_round_trips_a_created_workflow(repo: WorkflowRepository) -> None:
    workflow = make_workflow(
        name="demo",
        nodes=[
            WorkflowNode(
                id="n1",
                type="DataSource",
                position=Position(x=1, y=2),
                data=WorkflowNodeData(
                    label="Load",
                    inputs=[],
                    outputs=[
                        HandleDefinition(
                            id="dataset", label="Dataset", io="output", type="Dataset"
                        )
                    ],
                ),
            )
        ],
        edges=[],
    )
    created = repo.create(workflow)
    assert created.id is not None

    fetched = repo.get(created.id)

    assert fetched.id == created.id
    assert fetched.name == "demo"
    assert fetched.nodes == created.nodes


def test_get_missing_workflow_raises(repo: WorkflowRepository) -> None:
    with pytest.raises(WorkflowNotFoundError):
        repo.get("does-not-exist")


def test_update_replaces_the_stored_fields(repo: WorkflowRepository) -> None:
    created = repo.create(make_workflow(name="original"))
    assert created.id is not None

    updated = repo.update(created.id, make_workflow(name="renamed"))

    assert updated.id == created.id
    assert updated.name == "renamed"
    assert repo.get(created.id).name == "renamed"


def test_update_missing_workflow_raises(repo: WorkflowRepository) -> None:
    with pytest.raises(WorkflowNotFoundError):
        repo.update("does-not-exist", make_workflow())


def test_update_does_not_change_the_id(repo: WorkflowRepository) -> None:
    created = repo.create(make_workflow())
    assert created.id is not None

    updated = repo.update(created.id, make_workflow(id="some-other-id"))

    assert updated.id == created.id


def test_create_sets_updated_at(repo: WorkflowRepository) -> None:
    created = repo.create(make_workflow())

    assert created.updated_at is not None


def test_update_refreshes_updated_at(repo: WorkflowRepository) -> None:
    created = repo.create(make_workflow())
    assert created.id is not None
    assert created.updated_at is not None

    updated = repo.update(created.id, make_workflow(name="renamed"))

    assert updated.updated_at is not None
    assert updated.updated_at >= created.updated_at


def test_list_all_is_empty_when_no_workflows_exist(
    repo: WorkflowRepository,
) -> None:
    assert repo.list_all() == []


def test_list_all_returns_every_workflow(repo: WorkflowRepository) -> None:
    first = repo.create(make_workflow(name="first"))
    second = repo.create(make_workflow(name="second"))

    ids = {workflow.id for workflow in repo.list_all()}

    assert ids == {first.id, second.id}


def test_list_all_orders_by_updated_at_descending(
    repo: WorkflowRepository,
) -> None:
    first = repo.create(make_workflow(name="first"))
    assert first.id is not None
    second = repo.create(make_workflow(name="second"))
    # Touch `first` again so it becomes the most recently updated.
    repo.update(first.id, make_workflow(name="first-renamed"))

    results = repo.list_all()

    assert [workflow.id for workflow in results] == [first.id, second.id]


def test_list_all_respects_limit(repo: WorkflowRepository) -> None:
    repo.create(make_workflow(name="first"))
    repo.create(make_workflow(name="second"))

    assert len(repo.list_all(limit=1)) == 1


def test_list_all_respects_offset(repo: WorkflowRepository) -> None:
    first = repo.create(make_workflow(name="first"))
    second = repo.create(make_workflow(name="second"))

    results = repo.list_all(offset=1, limit=1)

    assert [workflow.id for workflow in results] == [first.id]
    assert second.id not in [workflow.id for workflow in results]
