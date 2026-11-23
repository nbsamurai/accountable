"""Every change is kept: a new app on the same file, as after a restart, sees it all."""

from backend.app.deps import get_today

from .conftest import TODAY, Api, local_app, local_client


def test_data_written_by_one_app_is_there_when_the_next_starts(tmp_path):
    path = tmp_path / "accountable.db"
    first = local_app(path)
    api = Api(local_client(first))
    org = api.org(website="northpeak.example")
    jane = api.contact(organization_id=org["id"], status="qualified")
    deal = api.deal(
        organization_id=org["id"], contact_id=jane["id"], stage="proposal", value=48000
    )
    api.move(deal["id"], "won")
    api.activity("Called", contact_id=jane["id"], follow_up_date="2026-11-24")
    first.state.engine.dispose()

    second = local_app(path)
    second.dependency_overrides[get_today] = lambda: TODAY
    again = Api(local_client(second))
    assert (
        again.get(f"/api/organizations/{org['id']}")["website"]
        == "https://northpeak.example"
    )
    assert again.get(f"/api/contacts/{jane['id']}")["status"] == "customer"
    after = again.get(f"/api/deals/{deal['id']}")
    assert (after["stage"], after["value"], after["probability"]) == ("won", 48000, 100)
    timeline = again.get(f"/api/contacts/{jane['id']}/timeline")["items"]
    assert [a["description"] for a in timeline] == [
        "Called",
        "Moved from Proposal to Won",
    ]
