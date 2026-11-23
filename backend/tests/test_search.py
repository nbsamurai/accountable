"""Search in the top bar (spec 4.12): organizations, contacts and deals by part of a name."""

import pytest


@pytest.fixture
def records(api):
    north = api.org("Northpeak Energy", industry="Energy")
    api.org("Peak Partners")
    api.org("Summit Northpeak")
    jane = api.contact("Jane Northpeak-Doe", organization_id=north["id"])
    api.contact("Pete Loner")
    deal = api.deal(
        "Peak season rollout",
        organization_id=north["id"],
        contact_id=jane["id"],
        stage="proposal",
    )
    api.deal("Unlinked deal")
    return {"north": north, "jane": jane, "deal": deal}


def search(api, q: str) -> dict:
    return api.get(f"/api/search?q={q}")


def names(found: dict, kind: str) -> list[str]:
    return [match["name"] for match in found[kind]]


def test_part_of_a_name_in_any_case_finds_each_kind(api, records):
    found = search(api, "nORTHp")
    assert names(found, "organizations") == ["Northpeak Energy", "Summit Northpeak"]
    assert names(found, "contacts") == ["Jane Northpeak-Doe"]
    assert names(found, "deals") == []
    assert names(search(api, "SEASON"), "deals") == ["Peak season rollout"]


def test_names_that_start_with_the_search_come_first_then_the_rest(api, records):
    found = search(api, "peak")
    assert names(found, "organizations") == [
        "Peak Partners",
        "Northpeak Energy",
        "Summit Northpeak",
    ]
    assert names(found, "contacts") == ["Jane Northpeak-Doe"]
    assert names(found, "deals") == ["Peak season rollout"]


def test_at_most_five_of_each_kind(api):
    for n in range(7):
        api.org(f"Acme {n}")
        api.contact(f"Acme person {n}")
        api.deal(f"Acme deal {n}")
    found = search(api, "acme")
    assert [len(found[kind]) for kind in ("organizations", "contacts", "deals")] == [
        5,
        5,
        5,
    ]
    assert names(found, "organizations") == [f"Acme {n}" for n in range(5)]


def test_each_match_has_its_detail_or_nothing(api, records):
    found = search(api, "north")
    assert found["organizations"][0] == {
        "id": records["north"]["id"],
        "name": "Northpeak Energy",
        "industry": "Energy",
    }
    assert found["organizations"][1]["industry"] is None
    assert found["contacts"][0] == {
        "id": records["jane"]["id"],
        "name": "Jane Northpeak-Doe",
        "organization": "Northpeak Energy",
    }
    assert search(api, "loner")["contacts"][0]["organization"] is None
    assert search(api, "season")["deals"][0] == {
        "id": records["deal"]["id"],
        "name": "Peak season rollout",
        "organization": "Northpeak Energy",
        "stage": "proposal",
    }
    assert search(api, "unlinked")["deals"][0]["organization"] is None


def test_percent_and_underscore_match_themselves(api):
    api.org("100% Organic")
    api.org("1000 Organic")
    api.org("snake_case Ltd")
    api.org("snakeXcase Ltd")
    assert names(search(api, "100%"), "organizations") == ["100% Organic"]
    assert names(search(api, "e_c"), "organizations") == ["snake_case Ltd"]


def test_an_empty_search_finds_nothing(api, records):
    assert search(api, "  ") == {"organizations": [], "contacts": [], "deals": []}


def test_without_a_token_search_answers_401(anonymous):
    assert anonymous.get("/api/search?q=peak").status_code == 401
