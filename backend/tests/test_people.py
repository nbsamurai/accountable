"""People's rows, kept up to date from their tokens, and how a person shows (spec 2, Person)."""

from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.app.auth import people
from backend.app.auth.people import Person, shows_as
from backend.app.tables import people as people_table

from .conftest import START


def row(engine, person_id: str):
    with engine.connect() as conn:
        return conn.execute(
            select(people_table).where(people_table.c.id == person_id)
        ).one_or_none()


def signed_in_as(app, person: Person) -> TestClient:
    token = app.state.sign_in.token_for(person)
    return TestClient(
        app,
        base_url="http://127.0.0.1",
        headers={"Authorization": f"Bearer {token}"},
    )


def test_the_first_request_makes_the_row_and_a_new_name_updates_it(app, engine):
    sam = Person(id="sam-lee", email="sam@team.example", name=None)
    assert row(engine, "sam-lee") is None

    assert signed_in_as(app, sam).get("/api/me").status_code == 200
    first = row(engine, "sam-lee")
    assert (first.email, first.name) == ("sam@team.example", None)

    signed_in_as(app, sam).get("/api/me")
    assert row(engine, "sam-lee").updated_at == first.updated_at  # nothing changed

    renamed = Person(id="sam-lee", email="sam.lee@team.example", name="Sam Lee")
    signed_in_as(app, renamed).get("/api/me")
    after = row(engine, "sam-lee")
    assert (after.email, after.name) == ("sam.lee@team.example", "Sam Lee")
    assert after.created_at == first.created_at
    assert after.updated_at > first.updated_at


def test_two_first_requests_at_once_make_one_row(engine):
    sam = Person(id="sam-lee", email="sam@team.example", name="Sam Lee")
    with engine.begin() as conn:
        people.keep(conn, sam, START)
        people.keep(conn, sam, START)
        assert len(conn.execute(select(people_table)).all()) == 1


def test_a_person_shows_as_their_name_or_their_email():
    assert shows_as("Alex Rivera", "alex.rivera@team.example") == "Alex Rivera"
    assert shows_as(None, "sam@team.example") == "sam@team.example"
    assert Person("sam", "sam@team.example").shows_as == "sam@team.example"
    assert shows_as(None, None) == ""
