"""The input rules (spec 2), a deal's main contact (spec 3.4), 404s and the delete counts."""

import pytest


def errors(response):
    assert response.status_code == 422, response.text
    return {tuple(e["loc"]): e["msg"] for e in response.json()["detail"]}


@pytest.mark.parametrize("path", ["/api/organizations", "/api/contacts", "/api/deals"])
def test_the_name_is_required_trimmed_and_up_to_200_characters(client, path):
    assert errors(client.post(path, json={})) == {("body", "name"): "Enter a name."}
    assert errors(client.post(path, json={"name": "   "})) == {("body", "name"): "Enter a name."}
    assert errors(client.post(path, json={"name": "x" * 201})) == {("body", "name"): "Use 200 characters or fewer."}
    made = client.post(path, json={"name": "  " + "x" * 199 + "  "})
    assert made.status_code == 201
    assert made.json()["name"] == "x" * 199


def test_a_name_cant_be_emptied_by_an_edit(api, client):
    org = api.org()
    assert errors(client.patch(f"/api/organizations/{org['id']}", json={"name": ""})) == {
        ("body", "name"): "Enter a name."
    }
    assert errors(client.patch(f"/api/organizations/{org['id']}", json={"name": None})) == {
        ("body", "name"): "Enter a name."
    }


def test_empty_fields_are_stored_as_empty(api):
    org = api.org(website="  ", industry="", notes="   ")
    assert (org["website"], org["industry"], org["notes"]) == (None, None, None)
    jane = api.contact(email="", phone=" ", job_title="")
    assert (jane["email"], jane["phone"], jane["job_title"]) == (None, None, None)


def test_websites(api, client):
    assert api.org(website="northpeak.example")["website"] == "https://northpeak.example"
    assert api.org(website="http://northpeak.example/about")["website"] == "http://northpeak.example/about"
    for bad in ["javascript:alert(1)", "ftp://northpeak.example", "mailto:jane@northpeak.example"]:
        response = client.post("/api/organizations", json={"name": "Bad", "website": bad})
        assert ("body", "website") in errors(response), bad


def test_emails_must_look_like_an_email(api, client):
    assert api.contact(email="jane@northpeak.example")["email"] == "jane@northpeak.example"
    assert ("body", "email") in errors(client.post("/api/contacts", json={"name": "Jane", "email": "jane"}))


def test_values_must_be_0_or_more_and_probabilities_0_to_100(api, client):
    assert api.deal(value=0)["value"] == 0
    assert ("body", "value") in errors(client.post("/api/deals", json={"name": "D", "value": -1}))
    assert ("body", "probability") in errors(client.post("/api/deals", json={"name": "D", "probability": 101}))
    assert ("body", "probability") in errors(client.post("/api/deals", json={"name": "D", "probability": -1}))
    assert api.deal(probability=0)["probability"] == 0
    assert api.deal(probability=100)["probability"] == 100


def test_a_main_contact_from_another_organization_is_refused(api, client):
    northpeak = api.org("Northpeak")
    brightlane = api.org("Brightlane")
    jane = api.contact(organization_id=brightlane["id"])
    response = client.post(
        "/api/deals", json={"name": "D", "organization_id": northpeak["id"], "contact_id": jane["id"]}
    )
    assert errors(response) == {("body", "contact_id"): "Jane Doe doesn't work at this deal's organization."}
    deal = api.deal(organization_id=northpeak["id"])
    response = client.patch(f"/api/deals/{deal['id']}", json={"contact_id": jane["id"]})
    assert ("body", "contact_id") in errors(response)


def test_a_contact_with_no_organization_can_lead_a_deal_with_no_organization(api):
    jane = api.contact()
    deal = api.deal(contact_id=jane["id"])
    assert deal["contact"]["id"] == jane["id"]
    assert deal["organization"] is None


def test_links_to_missing_records_are_refused(client):
    assert ("body", "organization_id") in errors(client.post("/api/contacts", json={"name": "J", "organization_id": 99}))
    assert ("body", "contact_id") in errors(client.post("/api/deals", json={"name": "D", "contact_id": 99}))


def test_a_contact_who_moves_stays_on_their_deals(api):
    northpeak = api.org("Northpeak")
    brightlane = api.org("Brightlane")
    jane = api.contact(organization_id=northpeak["id"])
    deal = api.deal(organization_id=northpeak["id"], contact_id=jane["id"])
    api.patch(f"/api/contacts/{jane['id']}", {"organization_id": brightlane["id"]})
    after = api.get(f"/api/deals/{deal['id']}")
    assert after["contact"] == {
        "id": jane["id"],
        "name": "Jane Doe",
        "organization_id": brightlane["id"],
        "organization_name": "Brightlane",
    }
    assert after["organization"]["id"] == northpeak["id"]
    # The board still moves it, as it sends only the stage.
    assert api.move(deal["id"], "proposal")["deal"]["stage"] == "proposal"


@pytest.mark.parametrize("kind", ["organizations", "contacts", "deals"])
def test_a_record_that_doesnt_exist_gets_404(client, kind):
    singular = kind[:-1]
    assert client.get(f"/api/{kind}/99").status_code == 404
    assert client.get(f"/api/{kind}/99").json() == {"detail": f"This {singular} no longer exists."}
    assert client.patch(f"/api/{kind}/99", json={"name": "X"}).status_code == 404
    assert client.delete(f"/api/{kind}/99").status_code == 404


def test_missing_activities_and_timelines_get_404(client):
    assert client.patch("/api/activities/99", json={"description": "X"}).status_code == 404
    assert client.delete("/api/activities/99").status_code == 404
    assert client.get("/api/contacts/99/timeline").status_code == 404
    assert client.get("/api/deals/99/timeline").status_code == 404


def test_each_get_returns_the_counts_its_delete_message_needs(api):
    org = api.org()
    jane = api.contact(organization_id=org["id"])
    api.contact("Sam", organization_id=org["id"])
    deal = api.deal(organization_id=org["id"], contact_id=jane["id"], stage="proposal")
    api.deal("Second", organization_id=org["id"], stage="won")
    api.activity(contact_id=jane["id"])
    api.activity(deal_id=deal["id"])
    api.move(deal["id"], "negotiation")

    organization = api.get(f"/api/organizations/{org['id']}")
    assert (organization["contact_count"], organization["deal_count"]) == (2, 2)
    contact = api.get(f"/api/contacts/{jane['id']}")
    assert (contact["deal_count"], contact["activity_count"]) == (1, 1)
    detail = api.get(f"/api/deals/{deal['id']}")
    assert (detail["activity_count"], detail["stage_change_count"]) == (2, 1)


def test_an_organizations_page_has_its_people_deals_and_figures(api):
    org = api.org()
    api.contact("Jane Doe", organization_id=org["id"], job_title="CTO")
    api.deal("Open", organization_id=org["id"], stage="proposal", value=1000)
    api.deal("Won", organization_id=org["id"], stage="won", value=500)
    detail = api.get(f"/api/organizations/{org['id']}")
    assert [c["name"] for c in detail["contacts"]] == ["Jane Doe"]
    assert [d["name"] for d in detail["deals"]] == ["Open", "Won"]
    assert detail["figures"] == {"open_pipeline": 1000, "expected_revenue": 500, "won_to_date": 500}
    assert (detail["open_deal_count"], detail["open_pipeline"]) == (1, 1000)


def test_a_contacts_page_has_their_deals(api):
    jane = api.contact()
    api.deal("Theirs", contact_id=jane["id"])
    api.deal("Not theirs")
    assert [d["name"] for d in api.get(f"/api/contacts/{jane['id']}")["deals"]] == ["Theirs"]
