"""SQLite-backed persistence for workflows (JAC-12).

Workflows are stored one-per-row as a single JSON payload rather than
normalized into separate node/edge tables — see the decision log for the
trade-off.
"""

import sqlite3
import uuid

from app.workflow.models import Workflow

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL
)
"""


class WorkflowNotFoundError(Exception):
    """Raised when a workflow id has no matching row."""

    def __init__(self, workflow_id: str) -> None:
        self.workflow_id = workflow_id
        super().__init__(f"Workflow '{workflow_id}' was not found.")


def init_db(conn: sqlite3.Connection) -> None:
    conn.execute(CREATE_TABLE_SQL)
    conn.commit()


class WorkflowRepository:
    """Domain persistence for `Workflow`s, backed by a single SQLite connection."""

    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn

    def create(self, workflow: Workflow) -> Workflow:
        """Insert a new workflow, assigning it a fresh server-side id."""
        stored = workflow.model_copy(update={"id": uuid.uuid4().hex})
        self._conn.execute(
            "INSERT INTO workflows (id, payload) VALUES (?, ?)",
            (stored.id, stored.model_dump_json(by_alias=True)),
        )
        return stored

    def get(self, workflow_id: str) -> Workflow:
        """Fetch a workflow by id, or raise `WorkflowNotFoundError`."""
        row = self._conn.execute(
            "SELECT payload FROM workflows WHERE id = ?", (workflow_id,)
        ).fetchone()
        if row is None:
            raise WorkflowNotFoundError(workflow_id)
        return Workflow.model_validate_json(row["payload"])

    def update(self, workflow_id: str, workflow: Workflow) -> Workflow:
        """Replace an existing workflow's fields, or raise `WorkflowNotFoundError`."""
        stored = workflow.model_copy(update={"id": workflow_id})
        cursor = self._conn.execute(
            "UPDATE workflows SET payload = ? WHERE id = ?",
            (stored.model_dump_json(by_alias=True), workflow_id),
        )
        if cursor.rowcount == 0:
            raise WorkflowNotFoundError(workflow_id)
        return stored
