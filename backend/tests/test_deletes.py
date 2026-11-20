"""Deleting (spec 3.7), through the real foreign keys."""


def test_deleting_an_organization_keeps_its_contacts_and_deals(api, client):
    org = api.org()
    jane = api.contact(organization_id=org["id"])
    deal = api.deal(organization_id=org["id"], contact_id=jane["id"])
    assert client.delete(f"/api/organizations/{org['id']}").status_code == 204
    assert api.get(f"/api/contacts/{jane['id']}")["organization"] is None
    after = api.get(f"/api/deals/{deal['id']}")
    assert after["organization"] is None
    assert after["contact"]["id"] == jane["id"]


def test_deleting_a_contact_keeps_their_deals_and_deletes_their_activities(api, client):
    jane = api.contact()
    deal = api.deal(contact_id=jane["id"])
    own = api.activity("Their own", contact_id=jane["id"])
    on_deal = api.activity("On the deal", deal_id=deal["id"])
    assert client.delete(f"/api/contacts/{jane['id']}").status_code == 204
    after = api.get(f"/api/deals/{deal['id']}")
    assert after["contact"] is None
    timeline = api.get(f"/api/deals/{deal['id']}/timeline")["items"]
    assert [a["id"] for a in timeline] == [on_deal["id"]]
    assert client.patch(f"/api/activities/{own['id']}", json={"done": True}).status_code == 404


def test_deleting_a_deal_deletes_its_activities_stage_changes_included(api, client):
    jane = api.contact()
    deal = api.deal(contact_id=jane["id"], stage="proposal")
    api.activity(deal_id=deal["id"])
    api.move(deal["id"], "negotiation")
    kept = api.activity("Kept", contact_id=jane["id"])
    assert client.delete(f"/api/deals/{deal['id']}").status_code == 204
    timeline = api.get(f"/api/contacts/{jane['id']}/timeline")["items"]
    assert [a["id"] for a in timeline] == [kept["id"]]


def test_deleting_an_activity_changes_nothing_else(api, client):
    jane = api.contact()
    deal = api.deal(contact_id=jane["id"])
    first = api.activity("First", deal_id=deal["id"])
    second = api.activity("Second", deal_id=deal["id"])
    assert client.delete(f"/api/activities/{first['id']}").status_code == 204
    assert [a["id"] for a in api.get(f"/api/deals/{deal['id']}/timeline")["items"]] == [second["id"]]
    assert api.get(f"/api/deals/{deal['id']}")["contact"]["id"] == jane["id"]
