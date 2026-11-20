from datetime import UTC, datetime, timedelta

from .conftest import TODAY


def test_board_uses_visible_cards_and_rounds_open_expected_revenue_once(client, api):
    organization = api.org()
    contact = api.contact(organization_id=organization["id"])
    api.contact("Another contact", organization_id=organization["id"])

    def deal(name, stage, value, days=None):
        data = {"name": name, "stage": stage, "value": value,
                "organization_id": organization["id"], "contact_id": contact["id"]}
        if days is not None:
            data["close_date"] = (TODAY - timedelta(days=days)).isoformat()
        response = client.post("/api/deals", json=data)
        assert response.status_code == 201

    for index in range(3):
        deal(f"Proposal {index}", "proposal", 1)
    deal("In window", "won", 100, 30)
    deal("Out of window", "won", 200, 31)
    deal("Future close", "lost", 200, -1)
    deal("Closed today", "lost", 300, 0)

    response = client.get("/api/pipeline")
    assert response.status_code == 200
    board = response.json()
    assert board["totals"] == {"count": 3, "value": 3, "expected_revenue": 2}
    columns = {column["stage"]: column for column in board["columns"]}
    assert [card["name"] for card in columns["proposal"]["cards"]] == ["Proposal 2", "Proposal 1", "Proposal 0"]
    assert columns["proposal"]["expected_revenue"] == 2
    assert columns["proposal"]["cards"][0]["contact"]["id"] == contact["id"]
    assert columns["won"]["value"] == 100
    assert columns["lost"]["value"] == 300


def test_dashboard_figures_and_reporting_window(api):
    assert api.get("/api/dashboard")["win_rate"]["percent"] is None
    for index in range(3):
        api.deal(f"Proposal {index}", stage="proposal", value=1)
    api.deal(stage="won", value=100, close_date="2026-11-01")
    api.deal(stage="won", value=200, close_date="2025-12-01")
    api.deal(stage="won", value=400, close_date="2025-11-30")
    api.deal(stage="lost", value=800, close_date="2026-01-01")

    dashboard = api.get("/api/dashboard")
    assert (dashboard["pipeline"]["count"], dashboard["pipeline"]["value"], dashboard["pipeline"]["expected_revenue"]) == (3, 3, 2)
    assert dashboard["win_rate"] == {"won": 2, "closed": 3, "percent": 2 * 100 / 3}
    assert dashboard["won_this_month"] == {"month": "2026-11-01", "value": 100, "count": 1}
    assert len(dashboard["months"]) == 12
    assert dashboard["months"][0] == {"month": "2025-12-01", "value": 200, "count": 1}
    assert dashboard["months"][1] == {"month": "2026-01-01", "value": 0, "count": 0}
    funnel = dashboard["funnel"]
    assert [row["count"] for row in funnel] == [6, 6, 6, 3, 3]
    assert [row["value"] for row in funnel] == [703, 703, 703, 700, 700]
    assert funnel[0]["share"] == 100


def test_dashboard_activity_windows(api):
    contact = api.contact()
    for days in (-1, 0, 6, 7):
        api.activity(str(days), contact_id=contact["id"], follow_up_date=(TODAY + timedelta(days=days)).isoformat())
    api.activity("Already done", contact_id=contact["id"], follow_up_date=TODAY.isoformat(), done=True)
    api.activity("Future", contact_id=contact["id"], occurred_at=datetime(2027, 1, 1, tzinfo=UTC).isoformat())
    for index in range(12):
        api.activity(f"Recent {index}", contact_id=contact["id"])

    dashboard = api.get("/api/dashboard")
    assert [activity["description"] for activity in dashboard["follow_ups"]] == ["-1", "0", "6"]
    assert [activity["description"] for activity in dashboard["recent_activity"]] == [
        f"Recent {index}" for index in range(11, 1, -1)
    ]
