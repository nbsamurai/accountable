"""Who added and last changed each record and activity (spec 3.11)."""

from datetime import UTC, datetime

import pytest
from sqlalchemy import insert, select

from backend.app.tables import activities, contacts, deals, organizations

from .conftest import ALEX, JORDAN

AS_ALEX = {"id": ALEX.id, "name": "Alex Rivera"}
AS_JORDAN = {"id": JORDAN.id, "name": "Jordan Blake"}


def recorded(engine, table, record_id: int) -> tuple[str | None, str | None]:
    with engine.connect() as conn:
        row = conn.execute(
            select(table.c.created_by, table.c.updated_by).where(
                table.c.id == record_id
            )
        ).one()
    return row.created_by, row.updated_by


@pytest.fixture
def jordan(as_person):
    return as_person(JORDAN.id)


def test_adding_each_kind_of_record_sets_both_people(api, engine):
    org = api.org()
    contact = api.contact(organization_id=org["id"])
    deal = api.deal(organization_id=org["id"], contact_id=contact["id"])
    activity = api.activity(contact_id=contact["id"])

    for added in (org, contact, deal):
        assert (added["created_by"], added["updated_by"]) == (AS_ALEX, AS_ALEX)
    assert activity["created_by"] == AS_ALEX
    assert recorded(engine, activities, activity["id"]) == (ALEX.id, ALEX.id)


def test_an_edit_by_someone_else_sets_updated_by_and_keeps_created_by(
    api, jordan, engine
):
    org = api.org()
    contact = api.contact()
    deal = api.deal()
    note = api.activity(contact_id=contact["id"])

    for path, record in (
        ("organizations", org),
        ("contacts", contact),
        ("deals", deal),
    ):
        changed = jordan.patch(f"/api/{path}/{record['id']}", {"name": "Renamed"})
        changed = changed.get("deal", changed)
        assert (changed["created_by"], changed["updated_by"]) == (AS_ALEX, AS_JORDAN)
        assert changed["updated_at"] > record["updated_at"]

    edited = jordan.patch(f"/api/activities/{note['id']}", {"description": "Edited"})
    assert edited["created_by"] == AS_ALEX
    assert recorded(engine, activities, note["id"]) == (ALEX.id, JORDAN.id)
    assert edited["updated_at"] > note["updated_at"]


def test_a_stage_change_sets_updated_by_and_its_activity_names_the_mover(api, jordan):
    deal = api.deal()
    changed = jordan.patch(f"/api/deals/{deal['id']}", {"stage": "qualified"})["deal"]
    assert changed["updated_by"] == AS_JORDAN
    move = api.get(f"/api/deals/{deal['id']}/timeline")["items"][0]
    assert move["type"] == "stage_change"
    assert move["created_by"] == AS_JORDAN


def test_a_board_move_sets_updated_by_within_a_column_and_to_another(api, jordan):
    first = api.deal("First")
    second = api.deal("Second")  # added at the top, above First

    within = jordan.move(first["id"], "new", before_id=second["id"])["deal"]
    assert within["updated_by"] == AS_JORDAN
    assert within["updated_at"] > first["updated_at"]

    across = api.move(second["id"], "qualified")["deal"]
    assert across["updated_by"] == AS_ALEX
    move = api.get(f"/api/deals/{second['id']}/timeline")["items"][0]
    assert move["created_by"] == AS_ALEX


def test_marking_a_follow_up_done_and_not_done_sets_updated_by(api, jordan, engine):
    contact = api.contact()
    call = api.activity(contact_id=contact["id"], follow_up_date="2026-11-24")
    jordan.patch(f"/api/activities/{call['id']}", {"done": True})
    assert recorded(engine, activities, call["id"]) == (ALEX.id, JORDAN.id)
    api.patch(f"/api/activities/{call['id']}", {"done": False})
    assert recorded(engine, activities, call["id"]) == (ALEX.id, ALEX.id)


def test_a_won_deal_makes_its_contact_a_customer_as_a_change_by_the_winner(api, jordan):
    org = api.org()
    lead = api.contact("Lead", organization_id=org["id"])
    other = api.contact("Other", organization_id=org["id"])
    deal = api.deal(organization_id=org["id"], contact_id=lead["id"])

    jordan.move(deal["id"], "won")
    assert api.get(f"/api/contacts/{lead['id']}")["updated_by"] == AS_JORDAN

    # Adding a deal in Won does the same.
    jordan.patch(f"/api/contacts/{other['id']}", {"job_title": "Buyer"})
    api.deal(
        "Won at once", organization_id=org["id"], contact_id=other["id"], stage="won"
    )
    assert api.get(f"/api/contacts/{other['id']}")["updated_by"] == AS_ALEX


def test_logging_an_activity_doesnt_change_the_record(api, jordan):
    contact = api.contact()
    deal = api.deal()
    jordan.activity(contact_id=contact["id"])
    jordan.activity(deal_id=deal["id"])
    after_contact = api.get(f"/api/contacts/{contact['id']}")
    after_deal = api.get(f"/api/deals/{deal['id']}")
    assert after_contact["updated_by"] == AS_ALEX
    assert after_contact["updated_at"] == contact["updated_at"]
    assert after_deal["updated_by"] == AS_ALEX
    assert after_deal["updated_at"] == deal["updated_at"]


def test_deleting_an_organization_leaves_its_records_updated_by_alone(
    api, jordan, client
):
    org = api.org()
    contact = api.contact(organization_id=org["id"])
    deal = api.deal(organization_id=org["id"])
    assert jordan.client.delete(f"/api/organizations/{org['id']}").status_code == 204
    kept_contact = api.get(f"/api/contacts/{contact['id']}")
    kept_deal = api.get(f"/api/deals/{deal['id']}")
    assert kept_contact["organization"] is None
    assert kept_contact["updated_by"] == AS_ALEX
    assert kept_deal["updated_by"] == AS_ALEX


def test_people_named_in_a_request_body_are_ignored(api):
    sent = {"created_by": JORDAN.id, "updated_by": JORDAN.id}
    org = api.org(**sent)
    assert (org["created_by"], org["updated_by"]) == (AS_ALEX, AS_ALEX)
    changed = api.patch(f"/api/organizations/{org['id']}", {"name": "New", **sent})
    assert changed["updated_by"] == AS_ALEX
    note = api.activity(contact_id=api.contact()["id"], **sent)
    assert note["created_by"] == AS_ALEX


def test_a_record_with_no_one_recorded_gives_null(api, engine):
    now = datetime(2026, 11, 1, tzinfo=UTC)
    stamps = {"created_at": now, "updated_at": now}
    with engine.begin() as conn:
        org_id = conn.execute(
            insert(organizations)
            .values(name="From before", **stamps)
            .returning(organizations.c.id)
        ).scalar_one()
        contact_id = conn.execute(
            insert(contacts)
            .values(name="Old contact", **stamps)
            .returning(contacts.c.id)
        ).scalar_one()
        deal_id = conn.execute(
            insert(deals)
            .values(name="Old deal", probability=10, board_position=1.0, **stamps)
            .returning(deals.c.id)
        ).scalar_one()
        conn.execute(
            insert(activities).values(
                type="note",
                contact_id=contact_id,
                description="Old note",
                occurred_at=now,
                **stamps,
            )
        )
    for path in (
        f"/api/organizations/{org_id}",
        f"/api/contacts/{contact_id}",
        f"/api/deals/{deal_id}",
    ):
        record = api.get(path)
        assert (record["created_by"], record["updated_by"]) == (None, None), path
    entry = api.get(f"/api/contacts/{contact_id}/timeline")["items"][0]
    assert entry["created_by"] is None


def test_a_person_with_no_name_shows_as_their_email(app, api):
    from fastapi.testclient import TestClient

    from backend.app.auth.people import Person

    token = app.state.sign_in.token_for(Person("sam", "sam@team.example", None))
    sam = TestClient(
        app, base_url="http://127.0.0.1", headers={"Authorization": f"Bearer {token}"}
    )
    org = sam.post("/api/organizations", json={"name": "Sam's"}).json()
    assert org["created_by"] == {"id": "sam", "name": "sam@team.example"}
