"""Shared SQLite connection plumbing (JAC-12).

Generic infrastructure, not workflow-specific — any future domain module
that needs a database connection depends on `get_connection` the same way
`app/workflow/router.py` does.
"""

import sqlite3
from collections.abc import Iterator

from app.config import SETTINGS


def connect() -> sqlite3.Connection:
    # check_same_thread=False: FastAPI's sync dependency-with-yield pattern
    # can resume a generator (e.g. the post-yield commit) on a different
    # threadpool worker thread than the one that opened the connection, even
    # though it's still a single logical unit of work for one request.
    conn = sqlite3.connect(SETTINGS.database_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def get_connection() -> Iterator[sqlite3.Connection]:
    """FastAPI dependency: one connection per request, committed on success.

    An exception raised while the request is in flight propagates before the
    commit, so a failed request's writes are never persisted.
    """
    conn = connect()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
