"""Activities and timelines (spec 3.5 and 3.6)."""

from .conftest import START


def errors(response):
    assert response.status_code == 422, response.text
    return {tuple(e["loc"]): e["msg"] for e in response.json()["detail"]}


def test_a_logged_activity_needs_a_type_a_description_and_one_record(api, client):
    jane = api.contact()
    deal = api.deal()
    assert ("body", "type") in errors(client.post("/api/activities", json={"description": "X", "contact_id": jane["id"]}))
    assert ("body", "type") in errors(
        client.post("/api/activities", json={"type": "stage_change", "description": "X", "deal_id": deal["id"]})
    )
    assert errors(client.post("/api/activities", json={"type": "note", "description": " ", "contact_id": jane["id"]})) == {
        ("body", "description"): "Enter a description."
    }
    assert ("body", "contact_id") in errors(client.post("/api/activities", json={"type": "note", "description": "X"}))
    both = {"type": "note", "description": "X", "contact_id": jane["id"], "deal_id": deal["id"]}
    assert ("body", "contact_id") in errors(client.post("/api/activities", json=both))


def test_occurred_at_is_now_when_not_given(api):
    jane = api.contact()
    activity = api.activity(contact_id=jane["id"])
    assert activity["occurred_at"].endswith("Z")
    assert activity["occurred_at"] > START.isoformat().replace("+00:00", "Z")
    given = api.activity(contact_id=jane["id"], occurred_at="2026-11-12T14:30:00Z")
    assert given["occurred_at"] == "2026-11-12T14:30:00Z"


def test_occurred_at_needs_a_time_zone(api, client):
    jane = api.contact()
    response = client.post(
        "/api/activities",
        json={"type": "call", "description": "X", "contact_id": jane["id"], "occurred_at": "2026-11-12T14:30:00"},
    )
    assert ("body", "occurred_at") in errors(response)


def test_an_activitys_contact_or_deal_cant_be_changed(api, client):
    jane = api.contact()
    sam = api.contact("Sam")
    deal = api.deal()
    activity = api.activity(contact_id=jane["id"])
    assert ("body", "contact_id") in errors(client.patch(f"/api/activities/{activity['id']}", json={"contact_id": sam["id"]}))
    assert ("body", "deal_id") in errors(client.patch(f"/api/activities/{activity['id']}", json={"deal_id": deal["id"]}))
    edited = api.patch(f"/api/activities/{activity['id']}", {"description": "Edited", "type": "call"})
    assert (edited["description"], edited["type"], edited["contact"]["id"]) == ("Edited", "call", jane["id"])


def test_editing_or_deleting_a_stage_change_gets_409(api, client):
    deal = api.deal(stage="proposal")
    api.move(deal["id"], "negotiation")
    entry = api.get(f"/api/deals/{deal['id']}/timeline")["items"][0]
    assert entry["type"] == "stage_change"
    assert client.patch(f"/api/activities/{entry['id']}", json={"description": "X"}).status_code == 409
    assert client.delete(f"/api/activities/{entry['id']}").status_code == 409


def test_a_follow_up_can_be_marked_done_and_not_done_again(api):
    jane = api.contact()
    activity = api.activity(contact_id=jane["id"], follow_up_date="2026-11-24")
    assert activity["done"] is False
    assert api.patch(f"/api/activities/{activity['id']}", {"done": True})["done"] is True
    assert api.patch(f"/api/activities/{activity['id']}", {"done": False})["done"] is False


def test_a_contacts_timeline_has_their_activities_and_those_on_their_deals(api):
    jane = api.contact()
    sam = api.contact("Sam")
    theirs = api.deal("Theirs", contact_id=jane["id"], stage="proposal")
    not_theirs = api.deal("Not theirs", contact_id=sam["id"])
    api.activity("Own note", contact_id=jane["id"])
    api.activity("On their deal", deal_id=theirs["id"])
    api.activity("On Sam", contact_id=sam["id"])
    api.activity("On another deal", deal_id=not_theirs["id"])
    api.move(theirs["id"], "negotiation")
    timeline = api.get(f"/api/contacts/{jane['id']}/timeline")
    assert [a["description"] for a in timeline["items"]] == [
        "Moved from Proposal to Negotiation",
        "On their deal",
        "Own note",
    ]
    assert timeline["total"] == 3
    assert timeline["items"][1]["deal"] == {"id": theirs["id"], "name": "Theirs"}


def test_timelines_are_newest_first_by_occurred_at_then_created_at(api):
    deal = api.deal()
    api.activity("Older", deal_id=deal["id"], occurred_at="2026-11-10T09:00:00Z")
    api.activity("Same time, made first", deal_id=deal["id"], occurred_at="2026-11-12T09:00:00Z")
    api.activity("Same time, made second", deal_id=deal["id"], occurred_at="2026-11-12T09:00:00Z")
    api.activity("Newest", deal_id=deal["id"], occurred_at="2026-11-18T09:00:00Z")
    items = api.get(f"/api/deals/{deal['id']}/timeline")["items"]
    assert [a["description"] for a in items] == ["Newest", "Same time, made second", "Same time, made first", "Older"]


def test_timelines_page_by_offset_and_limit(api):
    deal = api.deal()
    for day in range(1, 8):
        api.activity(f"Day {day}", deal_id=deal["id"], occurred_at=f"2026-11-0{day}T09:00:00Z")
    page = api.get(f"/api/deals/{deal['id']}/timeline?offset=2&limit=3")
    assert [a["description"] for a in page["items"]] == ["Day 5", "Day 4", "Day 3"]
    assert page["total"] == 7
