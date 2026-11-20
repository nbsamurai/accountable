"""Stage changes (spec 3.1 to 3.3): probability, close date, customer status, the activity and late deals."""

from datetime import date

import pytest

from backend.app.deals.stages import PROBABILITY, STAGES, expected_revenue, is_late

from .conftest import TODAY


def stage_changes(api, deal_id):
    return [a for a in api.get(f"/api/deals/{deal_id}/timeline")["items"] if a["type"] == "stage_change"]


@pytest.mark.parametrize("stage", [s for s in STAGES if s != "new"])
def test_moving_to_each_stage_sets_its_usual_probability(api, stage):
    deal = api.deal(probability=33)
    changed = api.patch(f"/api/deals/{deal['id']}", {"stage": stage})["deal"]
    assert changed["stage"] == stage
    assert changed["probability"] == PROBABILITY[stage]


def test_moving_back_to_new_sets_its_probability(api):
    deal = api.deal(stage="proposal")
    assert api.move(deal["id"], "new")["deal"]["probability"] == 10


@pytest.mark.parametrize("stage", ["won", "lost"])
def test_moving_to_won_or_lost_sets_the_close_date_to_today(api, stage):
    deal = api.deal(stage="negotiation", close_date="2027-01-31")
    changed = api.move(deal["id"], stage)["deal"]
    assert changed["close_date"] == TODAY.isoformat()


def test_moving_between_open_stages_keeps_the_close_date(api):
    deal = api.deal(stage="qualified", close_date="2027-01-31")
    assert api.move(deal["id"], "proposal")["deal"]["close_date"] == "2027-01-31"


def test_won_with_no_main_contact_changes_nothing_else(api):
    deal = api.deal(stage="negotiation")
    result = api.move(deal["id"], "won")
    assert result["contact"] is None
    assert result["deal"]["stage"] == "won"


def test_each_change_writes_one_stage_change_activity(api):
    deal = api.deal(stage="proposal")
    api.move(deal["id"], "negotiation")
    entries = stage_changes(api, deal["id"])
    assert [e["description"] for e in entries] == ["Moved from Proposal to Negotiation"]
    api.patch(f"/api/deals/{deal['id']}", {"stage": "won"})
    entries = stage_changes(api, deal["id"])
    assert [e["description"] for e in entries] == [
        "Moved from Negotiation to Won",
        "Moved from Proposal to Negotiation",
    ]


def test_a_reopened_won_deal_keeps_its_close_date_and_shows_as_late(api, client, app):
    from backend.app.deps import get_today

    deal = api.deal(stage="negotiation")
    api.move(deal["id"], "won")
    # A week later, the deal moves back to Proposal.
    app.dependency_overrides[get_today] = lambda: date(2026, 11, 26)
    reopened = api.move(deal["id"], "proposal")["deal"]
    assert reopened["close_date"] == TODAY.isoformat()
    assert reopened["probability"] == 50
    assert reopened["late"] is True


def test_a_hand_set_probability_is_kept_until_the_stage_changes(api):
    deal = api.deal(stage="proposal")
    edited = api.patch(f"/api/deals/{deal['id']}", {"probability": 65, "name": "Website redesign v2"})["deal"]
    assert edited["probability"] == 65
    edited = api.patch(f"/api/deals/{deal['id']}", {"value": 1000})["deal"]
    assert edited["probability"] == 65
    moved = api.patch(f"/api/deals/{deal['id']}", {"stage": "negotiation"})["deal"]
    assert moved["probability"] == 75


def test_fields_sent_with_a_stage_change_win_over_the_defaults(api):
    deal = api.deal(stage="negotiation")
    changed = api.patch(
        f"/api/deals/{deal['id']}", {"stage": "won", "probability": 90, "close_date": "2026-11-15"}
    )["deal"]
    assert changed["probability"] == 90
    assert changed["close_date"] == "2026-11-15"


def test_creating_a_deal_at_a_stage_writes_no_activity(api):
    deal = api.deal(stage="proposal")
    assert deal["probability"] == 50
    assert stage_changes(api, deal["id"]) == []


def test_creating_a_won_deal_makes_its_main_contact_a_customer(api):
    contact = api.contact("Jane Doe", status="lead")
    created = api._post("/api/deals", {"name": "Website redesign", "stage": "won", "contact_id": contact["id"]})
    deal = created["deal"]
    assert deal["close_date"] == TODAY.isoformat()
    assert created["contact"] == {"id": contact["id"], "name": "Jane Doe", "status": "customer"}
    assert api.get(f"/api/contacts/{contact['id']}")["status"] == "customer"
    assert stage_changes(api, deal["id"]) == []


def test_creating_a_deal_reports_no_contact_when_nothing_changed(api):
    customer = api.contact(status="customer")
    lead = api.contact("Lead", status="lead")
    won = api._post("/api/deals", {"name": "Won", "stage": "won", "contact_id": customer["id"]})
    open_deal = api._post("/api/deals", {"name": "Open", "stage": "proposal", "contact_id": lead["id"]})
    assert won["contact"] is None
    assert open_deal["contact"] is None
    assert api.get(f"/api/contacts/{lead['id']}")["status"] == "lead"


def test_moving_a_card_within_its_column_writes_no_activity(api):
    first = api.deal("First", stage="proposal")
    second = api.deal("Second", stage="proposal")
    api.move(first["id"], "proposal", before_id=second["id"])
    assert stage_changes(api, first["id"]) == []


def test_a_patch_with_the_same_stage_writes_no_activity(api):
    deal = api.deal(stage="proposal")
    api.patch(f"/api/deals/{deal['id']}", {"stage": "proposal", "probability": 40})
    assert stage_changes(api, deal["id"]) == []
    assert api.get(f"/api/deals/{deal['id']}")["probability"] == 40


@pytest.mark.parametrize(
    ("stage", "close_date", "late"),
    [
        ("proposal", date(2026, 11, 18), True),
        ("proposal", TODAY, False),
        ("proposal", None, False),
        ("won", date(2026, 11, 1), False),
        ("lost", date(2026, 11, 1), False),
    ],
)
def test_late(stage, close_date, late):
    assert is_late(stage, close_date, TODAY) is late


def test_late_in_the_api(api):
    late = api.deal("Late", stage="qualified", close_date="2026-11-18")
    due_today = api.deal("Due today", stage="qualified", close_date="2026-11-19")
    assert api.get(f"/api/deals/{late['id']}")["late"] is True
    assert api.get(f"/api/deals/{due_today['id']}")["late"] is False


def test_expected_revenue_rounds_halves_up():
    assert expected_revenue(1, 50) == 1  # $0.50 rounds up
    assert expected_revenue(None, 50) == 0
    assert expected_revenue(48000, 50) == 24000


def test_moving_to_won_makes_the_main_contact_a_customer(api):
    org = api.org()
    jane = api.contact(organization_id=org["id"], status="qualified")
    deal = api.deal(organization_id=org["id"], contact_id=jane["id"], stage="negotiation")
    result = api.move(deal["id"], "won")
    assert result["contact"] == {"id": jane["id"], "name": "Jane Doe", "status": "customer"}
    assert api.get(f"/api/contacts/{jane['id']}")["status"] == "customer"


def test_won_with_a_contact_who_is_already_a_customer_reports_no_change(api):
    jane = api.contact(status="customer")
    deal = api.deal(contact_id=jane["id"], stage="negotiation")
    assert api.move(deal["id"], "won")["contact"] is None


def test_a_reopened_deal_keeps_its_contacts_status(api):
    jane = api.contact(status="lead")
    deal = api.deal(contact_id=jane["id"], stage="negotiation")
    api.move(deal["id"], "won")
    api.move(deal["id"], "proposal")
    assert api.get(f"/api/contacts/{jane['id']}")["status"] == "customer"


def test_won_through_the_deal_form_uses_the_contact_sent_with_it(api):
    jane = api.contact(status="lead")
    deal = api.deal(stage="negotiation")
    result = api.patch(f"/api/deals/{deal['id']}", {"contact_id": jane["id"], "stage": "won"})
    assert result["contact"]["status"] == "customer"
