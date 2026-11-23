"""`npm run seed` refuses to reset the team's database on Supabase (spec 9.6)."""

import pytest
from sqlalchemy import func, select

from backend.app.db import init_db, make_engine, sqlite_url
from backend.app.seed import sample_data
from backend.app.seed.__main__ import main
from backend.app.tables import organizations

from .conftest import TODAY

MESSAGE = (
    "npm run seed only resets a local database. DATABASE_URL points at the team's "
    "database on Supabase, so nothing changed."
)


def test_with_database_url_set_the_seed_changes_nothing_and_fails(
    tmp_path, monkeypatch, capsys
):
    path = tmp_path / "local.db"
    engine = make_engine(sqlite_url(path))
    init_db(engine, sample_data.load, TODAY)
    with engine.begin() as conn:
        conn.execute(organizations.delete().where(organizations.c.id > 1))
    monkeypatch.setenv("ACCOUNTABLE_DB", str(path))
    monkeypatch.setenv("DATABASE_URL", "postgresql://nobody@127.0.0.1:1/none")

    with pytest.raises(SystemExit) as stopped:
        main([])

    assert stopped.value.code == MESSAGE  # printed to stderr, with exit status 1
    assert capsys.readouterr().out == ""
    with engine.connect() as conn:
        assert (
            conn.execute(select(func.count()).select_from(organizations)).scalar() == 1
        )


def test_an_empty_database_url_counts_as_not_set(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("ACCOUNTABLE_DB", str(tmp_path / "local.db"))
    monkeypatch.setenv("DATABASE_URL", "  ")
    main([])
    assert "Reset local.db to the sample data" in capsys.readouterr().out
