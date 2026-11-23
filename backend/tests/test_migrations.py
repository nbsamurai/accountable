"""The migrations make the tables in tables.py, keep older rows, and run once (spec 9.5)."""

from datetime import UTC, datetime

from alembic import command
from sqlalchemy import Engine, MetaData, func, insert, inspect, select

from backend.app.db import alembic_config, init_db, make_engine, sqlite_url
from backend.app.seed import sample_data
from backend.app.tables import activities, contacts, deals, metadata, organizations

from .conftest import TODAY

NOW = datetime(2026, 11, 19, 15, 0, tzinfo=UTC)
STAMPS = {"created_at": NOW, "updated_at": NOW}


def schema(engine: Engine) -> dict:
    """Each table's columns, foreign keys, indexes and checks, as SQLite reports them."""
    with engine.connect() as conn:
        found = inspect(conn)
        return {
            table: {
                "columns": [
                    (c["name"], str(c["type"]), c["nullable"], c["default"])
                    for c in found.get_columns(table)
                ],
                "foreign_keys": sorted(
                    (
                        tuple(fk["constrained_columns"]),
                        fk["referred_table"],
                        tuple(fk["referred_columns"]),
                        fk["options"].get("ondelete"),
                    )
                    for fk in found.get_foreign_keys(table)
                ),
                "indexes": sorted(
                    (index["name"], tuple(index["column_names"]))
                    for index in found.get_indexes(table)
                ),
                "checks": sorted(
                    (check["name"], check["sqltext"])
                    for check in found.get_check_constraints(table)
                ),
            }
            for table in found.get_table_names()
            if table != "alembic_version"
        }


def columns_by_name(described: dict) -> dict:
    """Columns keyed by name, since a rebuilt table can order them differently."""
    return {
        table: {**parts, "columns": sorted(parts["columns"])}
        for table, parts in described.items()
    }


def version(engine: Engine) -> str | None:
    with engine.connect() as conn:
        found = MetaData()
        found.reflect(conn)
        if "alembic_version" not in found.tables:
            return None
        return conn.execute(
            select(found.tables["alembic_version"].c.version_num)
        ).scalar()


def test_the_migrations_make_the_tables_in_tables_py(tmp_path):
    described = make_engine(sqlite_url(tmp_path / "described.db"))
    with described.begin() as conn:
        metadata.create_all(conn)
    migrated = make_engine(sqlite_url(tmp_path / "migrated.db"))
    init_db(migrated)

    expected = columns_by_name(schema(described))
    assert columns_by_name(schema(migrated)) == expected
    assert set(expected) == {
        "people",
        "organizations",
        "contacts",
        "deals",
        "activities",
    }
    assert version(migrated) == "0002"


def old_file(tmp_path) -> Engine:
    """A local database from before this change: today's tables, no alembic_version, rows."""
    engine = make_engine(sqlite_url(tmp_path / "old.db"))
    with engine.begin() as conn:
        command.upgrade(alembic_config(conn), "0001")
        old = MetaData()
        old.reflect(conn, only=["alembic_version"])
        old.tables["alembic_version"].drop(conn)
        conn.execute(
            insert(organizations).values(id=1, name="Northpeak Energy", **STAMPS)
        )
        conn.execute(
            insert(contacts).values(
                id=1, name="Jane Doe", organization_id=1, status="customer", **STAMPS
            )
        )
        conn.execute(
            insert(deals).values(
                id=1,
                name="Website redesign",
                organization_id=1,
                contact_id=1,
                stage="won",
                probability=100,
                board_position=1.0,
                **STAMPS,
            )
        )
        conn.execute(
            insert(activities).values(
                id=1,
                type="call",
                contact_id=1,
                description="Called Jane",
                occurred_at=NOW,
                done=True,
                **STAMPS,
            )
        )
        conn.execute(
            insert(activities).values(
                id=2,
                type="stage_change",
                deal_id=1,
                description="Moved from New to Won",
                occurred_at=NOW,
                **STAMPS,
            )
        )
    return engine


def rows(engine: Engine) -> dict:
    with engine.connect() as conn:
        return {
            table.name: [
                row._asdict()
                for row in conn.execute(select(table).order_by(table.c.id))
            ]
            for table in (organizations, contacts, deals, activities)
        }


def test_a_file_from_before_this_change_keeps_its_rows_with_no_one_recorded(tmp_path):
    engine = old_file(tmp_path)
    assert version(engine) is None

    init_db(engine, sample_data.load, TODAY)

    assert version(engine) == "0002"
    kept = rows(engine)
    assert [o["name"] for o in kept["organizations"]] == ["Northpeak Energy"]
    assert kept["contacts"][0]["organization_id"] == 1
    assert (kept["deals"][0]["organization_id"], kept["deals"][0]["contact_id"]) == (
        1,
        1,
    )
    assert [(a["contact_id"], a["deal_id"], a["done"]) for a in kept["activities"]] == [
        (1, None, True),
        (None, 1, False),
    ]
    assert all(
        row["created_by"] is None and row["updated_by"] is None
        for table in kept.values()
        for row in table
    )
    # Foreign keys are back on after the migrations, so the delete rules still hold.
    with engine.begin() as conn:
        conn.execute(organizations.delete())
        assert conn.execute(select(contacts.c.organization_id)).scalar() is None


def test_running_the_migrations_again_changes_nothing(tmp_path):
    engine = make_engine(sqlite_url(tmp_path / "twice.db"))
    init_db(engine, sample_data.load, TODAY)
    before, data = schema(engine), rows(engine)
    init_db(engine, sample_data.load, TODAY)
    assert schema(engine) == before
    assert rows(engine) == data
    assert version(engine) == "0002"


def test_the_sample_data_loads_only_when_the_tables_are_empty(tmp_path):
    engine = make_engine(sqlite_url(tmp_path / "sample.db"))
    init_db(engine, sample_data.load, TODAY)
    with engine.connect() as conn:
        assert (
            conn.execute(select(func.count()).select_from(organizations)).scalar() == 15
        )

    with engine.begin() as conn:
        conn.execute(organizations.delete().where(organizations.c.id > 1))
    init_db(engine, sample_data.load, TODAY)
    with engine.connect() as conn:
        assert (
            conn.execute(select(func.count()).select_from(organizations)).scalar() == 1
        )
