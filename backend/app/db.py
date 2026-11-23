"""The database: where it lives, the engine, the migrations, and the sample data on first start.

A local copy keeps its data in a SQLite file. On Supabase, it's the Postgres database that
DATABASE_URL points at (spec 9.5). The same migrations, in backend/migrations, run on both.
"""

import os
from collections.abc import Callable, Generator
from contextlib import contextmanager
from datetime import date
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import (
    Connection,
    Engine,
    MetaData,
    create_engine,
    event,
    exists,
    inspect,
    select,
)

from .tables import metadata

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PATH = ROOT / "data" / "accountable.db"
MIGRATIONS = ROOT / "backend" / "migrations"
BASELINE = "0001"


def database_path() -> Path:
    """`ACCOUNTABLE_DB` when it's set, relative to the repository, or data/accountable.db."""
    configured = os.environ.get("ACCOUNTABLE_DB")
    if not configured:
        return DEFAULT_PATH
    path = Path(configured)
    return path if path.is_absolute() else ROOT / path


def sqlite_url(path: Path) -> str:
    return f"sqlite:///{path}"


def _set_pragmas(dbapi_connection, foreign_keys: bool) -> None:
    # SQLite ignores these inside a transaction, so set them in autocommit mode.
    dbapi_connection.autocommit = True
    cursor = dbapi_connection.cursor()
    cursor.execute(f"PRAGMA foreign_keys = {'ON' if foreign_keys else 'OFF'}")
    cursor.close()
    # Then real transactions, so that DDL is transactional too (the reset needs it).
    dbapi_connection.autocommit = False


def _on_connect(dbapi_connection, _record) -> None:
    dbapi_connection.autocommit = True
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode = WAL")
    cursor.execute("PRAGMA busy_timeout = 5000")
    cursor.close()
    _set_pragmas(dbapi_connection, foreign_keys=True)


def make_engine(url: str) -> Engine:
    """An engine for a SQLite file, with foreign keys on, or for Postgres through psycopg."""
    if not url.startswith("sqlite"):
        # Supabase's pooler closes idle connections, so check each one before use.
        return create_engine(url, pool_pre_ping=True)
    database = url.removeprefix("sqlite:///")
    Path(database).parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(url, connect_args={"check_same_thread": False})
    event.listen(engine, "connect", _on_connect)
    return engine


def is_sqlite(engine_or_conn: Engine | Connection) -> bool:
    return engine_or_conn.dialect.name == "sqlite"


def alembic_config(conn: Connection | None = None, **options: str) -> Config:
    config = Config()
    config.set_main_option("script_location", str(MIGRATIONS))
    for key, value in options.items():
        config.set_main_option(key, value)
    if conn is not None:
        config.attributes["connection"] = conn
    return config


def migrate(conn: Connection) -> None:
    """Brings the schema up to date, inside the connection's transaction.

    A local file from before migrations has the tables but no alembic_version, so it's
    stamped at the baseline first, which it already matches.
    """
    tables = inspect(conn).get_table_names()
    if "organizations" in tables and "alembic_version" not in tables:
        command.stamp(alembic_config(conn), BASELINE)
    command.upgrade(alembic_config(conn), "head")


@contextmanager
def _foreign_keys_off(conn: Connection) -> Generator[None]:
    """Turns SQLite's foreign keys off while the migrations rebuild tables.

    Rebuilding a table drops the old one, and with foreign keys on, that drop would set
    links to it to null and delete the activities that cascade from it.
    """
    if not is_sqlite(conn):
        yield
        return
    raw = conn.connection.dbapi_connection
    _set_pragmas(raw, foreign_keys=False)
    try:
        yield
    finally:
        _set_pragmas(raw, foreign_keys=True)


def _check_links(conn: Connection) -> None:
    """With foreign keys off, makes sure every link still points at a row."""
    if is_sqlite(conn):
        broken = conn.exec_driver_sql("PRAGMA foreign_key_check").all()
        if broken:
            raise RuntimeError(f"The migrations broke these links: {broken}")


def is_empty(conn: Connection) -> bool:
    return not any(
        conn.execute(select(exists().select_from(table))).scalar()
        for table in metadata.sorted_tables
    )


def init_db(
    engine: Engine,
    load_sample: Callable[[Connection, date], None] | None = None,
    today: date | None = None,
) -> None:
    """Runs the migrations, then loads the sample data when the tables are empty."""
    with engine.connect() as conn, _foreign_keys_off(conn), conn.begin():
        migrate(conn)
        _check_links(conn)
    if load_sample is None:
        return
    with engine.begin() as conn:
        if is_empty(conn):
            load_sample(conn, today or date.today())


def reset(
    engine: Engine, load: Callable[[Connection, date], None], today: date | None = None
) -> None:
    """Drops every table, runs the migrations and loads the data, in one transaction.

    It resets the tables inside the file rather than deleting it, so it works while the
    app runs: a refresh then shows the new data. It only resets a local SQLite file.
    """
    if not is_sqlite(engine):
        raise RuntimeError("Only a local SQLite database can be reset.")
    with engine.begin() as conn:
        existing = MetaData()
        existing.reflect(conn)
        existing.drop_all(conn)
        migrate(conn)
        load(conn, today or date.today())
