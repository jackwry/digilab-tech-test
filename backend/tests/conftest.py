import sqlite3
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.db import get_connection
from app.main import app
from app.workflow.repository import init_db


@pytest.fixture()
def db_connection() -> Iterator[sqlite3.Connection]:
    """A fresh, isolated in-memory database per test."""
    # check_same_thread=False: this connection is reused across several
    # TestClient requests within one test, each of which FastAPI may run on
    # a different threadpool worker thread.
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    init_db(conn)
    yield conn
    conn.close()


@pytest.fixture()
def client(db_connection: sqlite3.Connection) -> Iterator[TestClient]:
    """A TestClient whose `get_connection` dependency is overridden to reuse
    `db_connection`, so writes and reads within one test see each other."""

    def override_get_connection() -> Iterator[sqlite3.Connection]:
        yield db_connection
        db_connection.commit()

    app.dependency_overrides[get_connection] = override_get_connection
    yield TestClient(app)
    app.dependency_overrides.clear()
