"""The sample data (spec 8), the large data set, and resetting a database that's in use."""

import os
import subprocess
import sys
from collections import Counter
from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import func, select

from backend.app.db import ROOT, reset
from backend.app.seed import large_data, sample_data
from backend.app.tables import activities, contacts, deals, organizations, people

from .conftest import TODAY


@pytest.fixture
def seeded(api, engine):
    reset(engine, sample_data.load, TODAY)
    return api


def everything(api, path):
    return api.get(f"{path}?page_size=200")["items"]


def test_the_counts_in_spec_8(seeded, engine):
    orgs = everything(seeded, "/api/organizations")
    assert len(orgs) == 15
    assert len({o["industry"] for o in orgs}) == 10
    assert all(o["website"].endswith(".example") for o in orgs)

    people = seeded.get("/api/contacts")
    assert people["status_counts"] == {
        "all": 40,
        "lead": 16,
        "qualified": 10,
        "customer": 14,
    }
    assert (
        sum(1 for c in everything(seeded, "/api/contacts") if c["organization"] is None)
        == 4
    )
    assert all(
        c["email"].endswith(".example") for c in everything(seeded, "/api/contacts")
    )

    all_deals = everything(seeded, "/api/deals")
    assert len(all_deals) == 30
    assert Counter(d["stage"] for d in all_deals) == {
        "new": 5,
        "qualified": 4,
        "proposal": 4,
        "negotiation": 3,
        "won": 10,
        "lost": 4,
    }
    assert min(d["value"] for d in all_deals) == 2000
    assert max(d["value"] for d in all_deals) == 120000
    assert sum(1 for d in all_deals if d["late"]) == 3
    recent = TODAY - timedelta(days=30)
    closed_recently = Counter(
        d["stage"]
        for d in all_deals
        if d["stage"] in ("won", "lost")
        and date.fromisoformat(d["close_date"]) >= recent
    )
    assert closed_recently == {"won": 2, "lost": 1}

    with engine.connect() as conn:
        logged = conn.execute(
            select(activities).where(activities.c.type != "stage_change")
        ).all()
        stage_changes = conn.execute(
            select(activities).where(activities.c.type == "stage_change")
        ).all()
    assert len(logged) == 80
    assert {a.type for a in logged} == {"note", "call", "email"}
    assert (
        sum(1 for a in logged if a.contact_id) > 0
        and sum(1 for a in logged if a.deal_id) > 0
    )
    open_follow_ups = [a for a in logged if a.follow_up_date and not a.done]
    assert sum(1 for a in open_follow_ups if a.follow_up_date < TODAY) == 4
    upcoming = [
        a
        for a in open_follow_ups
        if TODAY <= a.follow_up_date <= TODAY + timedelta(days=6)
    ]
    assert len(upcoming) == 5
    assert sum(1 for a in upcoming if a.follow_up_date == TODAY) == 1
    assert sum(1 for a in logged if a.follow_up_date and a.done) == 3
    # Notes, calls and emails over the last six months.
    assert min(a.occurred_at for a in logged).date() >= TODAY - timedelta(days=183)

    # Each deal past New has one stage change, for its last move.
    past_new = [d for d in all_deals if d["stage"] != "new"]
    assert len(stage_changes) == len(past_new) == 25
    assert sorted(a.deal_id for a in stage_changes) == sorted(d["id"] for d in past_new)


def recorded(engine) -> tuple[list, dict[str, set]]:
    """The people, and who added and last changed each table's rows."""
    with engine.connect() as conn:
        team = conn.execute(
            select(people.c.id, people.c.name, people.c.email).order_by(people.c.name)
        ).all()
        by = {
            table.name: set(
                conn.execute(select(table.c.created_by, table.c.updated_by)).all()
            )
            for table in (organizations, contacts, deals, activities)
        }
    return team, by


def test_three_teammates_added_and_changed_every_sample_record(engine):
    reset(engine, sample_data.load, TODAY)
    team, by = recorded(engine)
    assert [(p.name, p.email) for p in team] == [
        ("Alex Rivera", "alex.rivera@team.example"),
        ("Casey Morgan", "casey.morgan@team.example"),
        ("Jordan Blake", "jordan.blake@team.example"),
    ]
    ids = {p.id for p in team}
    for table, pairs in by.items():
        people_recorded = {person for pair in pairs for person in pair}
        assert people_recorded <= ids, table
        assert None not in people_recorded, table
    # Every teammate added something, and some records were last changed by someone else.
    assert {created for created, _ in by["organizations"]} == ids
    assert any(created != updated for created, updated in by["deals"])


def test_the_large_set_records_the_same_teammates_on_every_row(engine):
    reset(engine, large_data.load, TODAY)
    team, by = recorded(engine)
    assert {p.name for p in team} == {"Alex Rivera", "Jordan Blake", "Casey Morgan"}
    for table, pairs in by.items():
        assert {person for pair in pairs for person in pair} == {p.id for p in team}, (
            table
        )


def test_every_won_deals_main_contact_is_a_customer(seeded):
    won = [d for d in everything(seeded, "/api/deals") if d["stage"] == "won"]
    for deal in won:
        assert (
            seeded.get(f"/api/contacts/{deal['contact']['id']}")["status"] == "customer"
        ), deal["name"]


def test_every_main_contact_works_at_the_deals_organization(seeded):
    for deal in everything(seeded, "/api/deals"):
        assert deal["contact"]["organization_id"] == deal["organization"]["id"], deal[
            "name"
        ]


def dates(engine):
    with engine.connect() as conn:
        close = dict(conn.execute(select(deals.c.name, deals.c.close_date)).all())
        follow = [
            row.follow_up_date
            for row in conn.execute(
                select(activities.c.follow_up_date).order_by(activities.c.id)
            )
        ]
        when = [
            row.occurred_at
            for row in conn.execute(
                select(activities.c.occurred_at).order_by(activities.c.id)
            )
        ]
    return close, follow, when


def test_loading_on_another_day_moves_the_dates_by_the_same_number_of_days(engine):
    reset(engine, sample_data.load, TODAY)
    close_a, follow_a, when_a = dates(engine)
    reset(engine, sample_data.load, TODAY + timedelta(days=45))
    close_b, follow_b, when_b = dates(engine)
    assert all(close_b[name] - close_a[name] == timedelta(days=45) for name in close_a)
    assert all(b - a == timedelta(days=45) for a, b in zip(follow_a, follow_b) if a)
    # Timestamps keep their local time of day, so they move by 45 days, give or take a clock change.
    assert all(
        abs((b - a) - timedelta(days=45)) <= timedelta(hours=1)
        for a, b in zip(when_a, when_b)
    )


def test_the_seed_command_resets_a_database_another_connection_has_open(tmp_path):
    from .conftest import Api, local_app, local_client

    path = tmp_path / "running.db"
    app = local_app(path, sample_data_on_start=True)  # empty tables get the sample data
    api = Api(local_client(app))
    api.org("Added before the reset")
    assert api.get("/api/organizations")["total"] == 16

    with app.state.engine.connect() as open_connection:
        open_connection.execute(
            select(func.count()).select_from(organizations)
        ).scalar_one()
        result = subprocess.run(
            [sys.executable, "-m", "backend.app.seed"],
            cwd=ROOT,
            check=False,
            env={**os.environ, "ACCOUNTABLE_DB": str(path)},
            capture_output=True,
            text=True,
            timeout=60,
        )
    assert result.returncode == 0, result.stderr
    assert "sample data" in result.stdout
    assert api.get("/api/organizations")["total"] == 15
    assert api.get("/api/contacts")["total"] == 40


def test_the_large_set_has_the_counts_in_spec_8(engine):
    reset(engine, large_data.load, TODAY)
    with engine.connect() as conn:
        counts = {
            t.name: conn.execute(select(func.count()).select_from(t)).scalar_one()
            for t in (organizations, contacts, deals, activities)
        }
        stages = Counter(conn.execute(select(deals.c.stage)).scalars())
        oldest = conn.execute(
            select(func.min(deals.c.close_date)).where(
                deals.c.stage.in_(("won", "lost"))
            )
        ).scalar()
    assert counts == {
        "organizations": 1000,
        "contacts": 5000,
        "deals": 2000,
        "activities": 20000,
    }
    assert (
        stages["new"] + stages["qualified"] + stages["proposal"] + stages["negotiation"]
        == 1000
    )
    assert oldest >= TODAY - timedelta(days=731)


def test_the_same_seed_makes_the_same_data():
    now = datetime(2026, 11, 19, 12, tzinfo=UTC)
    assert large_data.generate(TODAY, now) == large_data.generate(TODAY, now)
    assert large_data.generate(TODAY, now, seed=1) != large_data.generate(TODAY, now)
