"""Search, sorting and paging on the server (spec 4.3)."""

import pytest


def names(api, path):
    return [item["name"] for item in api.get(path)["items"]]


def test_search_ignores_case_and_matches_any_part(api):
    api.org("Northpeak Energy", industry="Energy")
    api.org("Brightlane Retail", website="brightlane.example")
    api.org("Quillon Mutual", industry="Financial services")
    assert names(api, "/api/organizations?q=PEAK") == ["Northpeak Energy"]
    assert names(api, "/api/organizations?q=financial") == ["Quillon Mutual"]
    assert names(api, "/api/organizations?q=lane.exam") == ["Brightlane Retail"]


def test_contact_search_covers_each_field_and_the_organizations_name(api):
    org = api.org("Brightlane Retail")
    api.contact("Ana Lopez", organization_id=org["id"])
    api.contact("Sam Okafor", email="sam@quillon.example")
    api.contact("Tom Becker", phone="+1 555 0100", job_title="Plant manager")
    assert names(api, "/api/contacts?q=brightlane") == ["Ana Lopez"]
    assert names(api, "/api/contacts?q=QUILLON") == ["Sam Okafor"]
    assert names(api, "/api/contacts?q=555") == ["Tom Becker"]
    assert names(api, "/api/contacts?q=plant") == ["Tom Becker"]


def test_deal_search_covers_its_organization_and_main_contact(api):
    org = api.org("Saltmarsh Hotels")
    leila = api.contact("Leila Haddad", organization_id=org["id"])
    api.deal("Hotel booking engine", organization_id=org["id"], contact_id=leila["id"])
    api.deal("Kiosk network")
    assert names(api, "/api/deals?q=saltmarsh") == ["Hotel booking engine"]
    assert names(api, "/api/deals?q=haddad") == ["Hotel booking engine"]
    assert names(api, "/api/deals?q=kiosk") == ["Kiosk network"]


def test_percent_and_underscore_match_themselves(api):
    api.org("100% Growth")
    api.org("100 Growth")
    api.org("snake_case Labs")
    api.org("snakeXcase Labs")
    assert names(api, "/api/organizations?q=100%25") == ["100% Growth"]
    assert names(api, "/api/organizations?q=snake_case") == ["snake_case Labs"]


def test_sorting_both_ways_with_empty_values_last(api):
    api.org("Alpha", industry="Retail")
    api.org("bravo", industry=None)
    api.org("Charlie", industry="Energy")
    assert names(api, "/api/organizations?sort=industry&dir=asc") == ["Charlie", "Alpha", "bravo"]
    assert names(api, "/api/organizations?sort=industry&dir=desc") == ["Alpha", "Charlie", "bravo"]
    # Names sort A to Z, ignoring case.
    assert names(api, "/api/organizations") == ["Alpha", "bravo", "Charlie"]
    assert names(api, "/api/organizations?dir=desc") == ["Charlie", "bravo", "Alpha"]


@pytest.mark.parametrize(
    ("path", "columns"),
    [
        ("/api/organizations", ["name", "industry", "website", "contacts", "open_deals", "open_pipeline"]),
        ("/api/contacts", ["name", "organization", "job_title", "email", "phone", "status"]),
        (
            "/api/deals",
            ["name", "organization", "contact", "stage", "value", "probability", "expected_revenue", "close_date"],
        ),
    ],
)
def test_every_sortable_column_sorts_both_ways(api, path, columns):
    org = api.org("Org", industry="Retail", website="org.example")
    jane = api.contact("Jane", organization_id=org["id"], email="jane@org.example", phone="1", job_title="CTO")
    api.contact("Empty")
    api.deal("Deal", organization_id=org["id"], contact_id=jane["id"], value=100, close_date="2026-12-01")
    api.deal("Empty deal")
    for column in columns:
        for direction in ("asc", "desc"):
            response = api.client.get(f"{path}?sort={column}&dir={direction}")
            assert response.status_code == 200, (column, direction, response.text)


def test_empty_values_go_last_for_numbers_and_dates(api):
    api.deal("No value")
    api.deal("Small", value=10, close_date="2026-12-01")
    api.deal("Big", value=1000, close_date="2027-01-01")
    assert names(api, "/api/deals?sort=value&dir=asc") == ["Small", "Big", "No value"]
    assert names(api, "/api/deals?sort=value&dir=desc") == ["Big", "Small", "No value"]
    assert names(api, "/api/deals?sort=close_date&dir=desc") == ["Big", "Small", "No value"]


def test_stage_sorts_in_pipeline_order(api):
    for name, stage in [("A", "won"), ("B", "new"), ("C", "lost"), ("D", "negotiation"), ("E", "qualified"), ("F", "proposal")]:
        api.deal(name, stage=stage)
    assert names(api, "/api/deals?sort=stage") == ["B", "E", "F", "D", "A", "C"]
    assert names(api, "/api/deals?sort=stage&dir=desc") == ["C", "A", "D", "F", "E", "B"]


def test_organization_counts_sort(api):
    big = api.org("Big")
    api.org("Small")
    api.contact("One", organization_id=big["id"])
    api.deal("Open", organization_id=big["id"], value=500)
    assert names(api, "/api/organizations?sort=contacts&dir=desc") == ["Big", "Small"]
    assert names(api, "/api/organizations?sort=open_pipeline&dir=asc") == ["Small", "Big"]
    listed = api.get("/api/organizations")["items"][0]
    assert (listed["contact_count"], listed["open_deal_count"], listed["open_pipeline"]) == (1, 1, 500)


def test_pages_hold_50_rows_and_total_counts_every_match(api):
    for n in range(60):
        api.contact(f"Contact {n:02d}")
    first = api.get("/api/contacts")
    assert len(first["items"]) == 50
    assert first["total"] == 60
    second = api.get("/api/contacts?page=2")
    assert [c["name"] for c in second["items"]] == [f"Contact {n}" for n in range(50, 60)]
    assert second["total"] == 60
    assert api.get("/api/contacts?q=Contact 1")["total"] == 10


def test_the_contacts_status_counts_follow_the_search(api):
    api.contact("Ana Lopez", status="lead")
    api.contact("Ana Smith", status="customer")
    api.contact("Sam Okafor", status="qualified")
    everyone = api.get("/api/contacts")
    assert everyone["status_counts"] == {"all": 3, "lead": 1, "qualified": 1, "customer": 1}
    anas = api.get("/api/contacts?q=ana&status=lead")
    assert [c["name"] for c in anas["items"]] == ["Ana Lopez"]
    assert anas["total"] == 1
    assert anas["status_counts"] == {"all": 2, "lead": 1, "qualified": 0, "customer": 1}


def test_the_contacts_organization_filter(api):
    org = api.org()
    api.contact("In", organization_id=org["id"])
    api.contact("Out")
    assert names(api, f"/api/contacts?organization_id={org['id']}") == ["In"]


@pytest.mark.parametrize("path", ["/api/organizations", "/api/contacts", "/api/deals"])
def test_an_unknown_sort_column_gets_422(client, path):
    response = client.get(f"{path}?sort=password")
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["query", "sort"]
    assert client.get(f"{path}?dir=sideways").status_code == 422
