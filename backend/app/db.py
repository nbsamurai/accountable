"""The database: where it lives, the engine, and making it on first start."""

import os
from collections.abc import Callable
from datetime import date
from pathlib import Path

from sqlalchemy import Connection, Engine, create_engine, event, inspect

from .tables import metadata

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PATH = ROOT / "data" / "accountable.db"


def database_path() -> Path:
    """`ACCOUNTABLE_DB` when it's set, relative to the repository, or data/accountable.db."""
    configured = os.environ.get("ACCOUNTABLE_DB")
    if not configured:
        return DEFAULT_PATH
    path = Path(configured)
    return path if path.is_absolute() else ROOT / path


def _on_connect(dbapi_connection, _record) -> None:
    # SQLite ignores these inside a transaction, so set them first in autocommit mode.
    dbapi_connection.autocommit = True
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.execute("PRAGMA journal_mode = WAL")
    cursor.execute("PRAGMA busy_timeout = 5000")
    cursor.close()
    # Then real transactions, so that DDL is transactional too (the reset needs it).
    dbapi_connection.autocommit = False


def make_engine(path: Path) -> Engine:
    path.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        f"sqlite:///{path}",
        connect_args={"check_same_thread": False},
    )
    event.listen(engine, "connect", _on_connect)
    return engine


def is_new(conn: Connection) -> bool:
    return not inspect(conn).has_table("organizations")


def init_db(
    engine: Engine,
    load_sample: Callable[[Connection, date], None] | None = None,
    today: date | None = None,
) -> None:
    """Makes the tables, and loads the sample data when the database is new."""
    with engine.begin() as conn:
        new = is_new(conn)
        metadata.create_all(conn)
        if new and load_sample is not None:
            load_sample(conn, today or date.today())


def reset(engine: Engine, load: Callable[[Connection, date], None], today: date | None = None) -> None:
    """Drops and makes the tables, and loads the data, in one transaction.

    It resets the tables inside the file rather than deleting it, so it works while the
    app runs: a refresh then shows the new data.
    """
    with engine.begin() as conn:
        metadata.drop_all(conn)
        metadata.create_all(conn)
        load(conn, today or date.today())
