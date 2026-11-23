"""The same queries on SQLite and Postgres (spec 9.5), checked without a Postgres server."""

import re
from io import StringIO

from alembic import command
from sqlalchemy import select
from sqlalchemy.dialects import postgresql, sqlite

from backend.app.contacts.service import SORTS as CONTACT_SORTS
from backend.app.dashboard.service import closed_by_month
from backend.app.db import ROOT, alembic_config
from backend.app.lists import fold_text, order, search
from backend.app.search.service import matching
from backend.app.tables import contacts, organizations

from .conftest import TODAY


def sql(statement, dialect) -> str:
    return str(statement.compile(dialect=dialect))


def a_search_and_a_sort():
    matches = search("Ann", [contacts.c.name, organizations.c.name])
    assert matches is not None
    return (
        select(contacts.c.id)
        .where(matches)
        .order_by(*order(CONTACT_SORTS["name"], "asc", contacts.c.id))
    )


def test_searches_and_text_sorts_fold_only_a_to_z_on_postgres():
    compiled = sql(a_search_and_a_sort(), postgresql.dialect())
    assert 'lower(contacts.name COLLATE "C") LIKE' in compiled
    assert 'lower(organizations.name COLLATE "C") LIKE' in compiled
    assert 'ORDER BY lower(contacts.name COLLATE "C") ASC NULLS LAST' in compiled


def test_searches_and_text_sorts_use_lower_on_sqlite():
    compiled = sql(a_search_and_a_sort(), sqlite.dialect())
    assert "lower(contacts.name) LIKE" in compiled
    assert "lower(organizations.name) LIKE" in compiled
    assert "ORDER BY lower(contacts.name) ASC NULLS LAST" in compiled
    assert "COLLATE" not in compiled


def test_the_search_term_is_folded_the_same_way():
    assert fold_text("ÉMILE") == "Émile"
    assert fold_text("Ann O'Brien & CO") == "ann o'brien & co"
    params = a_search_and_a_sort().compile(dialect=postgresql.dialect()).params.values()
    assert "ann" in params


def test_the_top_bars_search_folds_and_orders_the_same_way_on_postgres():
    stmt = matching(select(contacts.c.id), contacts.c.name, contacts.c.id, "ann")
    compiled = sql(stmt, postgresql.dialect())
    assert 'lower(contacts.name COLLATE "C") LIKE' in compiled
    assert 'ORDER BY CASE WHEN (lower(contacts.name COLLATE "C") LIKE' in compiled


def test_the_dashboard_groups_months_with_extract():
    on_postgres = sql(closed_by_month(TODAY), postgresql.dialect())
    assert "EXTRACT(year FROM deals.close_date)" in on_postgres
    assert "EXTRACT(month FROM deals.close_date)" in on_postgres
    assert "strftime" not in on_postgres.lower()


def test_the_migrations_turn_on_row_level_security_for_every_table_on_postgres():
    config = alembic_config(**{"sqlalchemy.url": "postgresql+psycopg://"})
    config.output_buffer = StringIO()
    command.upgrade(config, "head", sql=True)
    written = config.output_buffer.getvalue()

    made = set(re.findall(r"CREATE TABLE (\w+)", written))
    assert made == {
        "alembic_version",
        "organizations",
        "contacts",
        "deals",
        "activities",
        "people",
    }
    secured = set(re.findall(r"ALTER TABLE (\w+) ENABLE ROW LEVEL SECURITY", written))
    assert secured == made
    assert "FOREIGN KEY(created_by) REFERENCES people (id)" in written


def test_no_sqlite_only_sql_is_left_outside_lists_py():
    app = ROOT / "backend" / "app"
    found = [
        f"{path.relative_to(ROOT)}: {word}"
        for path in app.rglob("*.py")
        if path.name != "lists.py"
        for word in re.findall(
            r"strftime|nocase|julianday", path.read_text(), re.IGNORECASE
        )
    ]
    assert found == []
