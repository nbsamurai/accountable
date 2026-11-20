"""Card order on the board (spec 9.4)."""

from sqlalchemy import update

from backend.app.deals import ordering
from backend.app.tables import deals


def column(api, stage):
    """The names in a column, top to bottom, from the deals' positions."""
    items = api.get("/api/deals?page_size=200")["items"]
    cards = sorted(
        (d for d in items if d["stage"] == stage),
        key=lambda d: (d["board_position"], d["id"]),
    )
    return [d["name"] for d in cards]


def make_column(api, stage, names):
    """Adds the deals so the column reads `names` from top to bottom."""
    made = {}
    for name in reversed(names):  # each new deal goes to the top
        made[name] = api.deal(name, stage=stage)
    return made


def test_pure_positions():
    assert ordering.between(1.0, 2.0) == 1.5
    assert ordering.between(None, 1.0) == 0.0
    assert ordering.top(None) == 1.0
    assert ordering.top(-3.0) == -4.0
    assert ordering.bottom(None) == 1.0
    assert ordering.bottom(4.0) == 5.0
    assert ordering.between(1.0, 1.0000005) is None


def test_a_drop_between_two_cards_takes_their_midpoint(api):
    made = make_column(api, "proposal", ["A", "B", "C"])
    other = api.deal("X", stage="new")
    a, b = made["A"]["board_position"], made["B"]["board_position"]
    moved = api.move(other["id"], "proposal", before_id=made["B"]["id"])["deal"]
    assert moved["board_position"] == (a + b) / 2
    assert column(api, "proposal") == ["A", "X", "B", "C"]


def test_a_drop_at_the_top_takes_one_less_than_the_first(api):
    made = make_column(api, "proposal", ["A", "B"])
    other = api.deal("X", stage="new")
    moved = api.move(other["id"], "proposal", before_id=made["A"]["id"])["deal"]
    assert moved["board_position"] == made["A"]["board_position"] - 1
    assert column(api, "proposal") == ["X", "A", "B"]


def test_a_drop_at_the_bottom_goes_last(api):
    make_column(api, "proposal", ["A", "B"])
    other = api.deal("X", stage="new")
    api.move(other["id"], "proposal")
    assert column(api, "proposal") == ["A", "B", "X"]


def test_a_drop_into_an_empty_column_goes_last(api):
    other = api.deal("X", stage="new")
    moved = api.move(other["id"], "negotiation")["deal"]
    assert moved["board_position"] == 1.0
    assert column(api, "negotiation") == ["X"]


def test_moving_within_a_column(api):
    make_column(api, "proposal", ["A", "B", "C"])
    ids = {d["name"]: d["id"] for d in api.get("/api/deals")["items"]}
    api.move(ids["C"], "proposal", before_id=ids["A"])
    assert column(api, "proposal") == ["C", "A", "B"]
    api.move(ids["C"], "proposal")
    assert column(api, "proposal") == ["A", "B", "C"]


def test_close_neighbors_renumber_the_column_in_the_same_order(api, engine):
    made = make_column(api, "proposal", ["A", "B", "C"])
    with engine.begin() as conn:
        conn.execute(
            update(deals)
            .where(deals.c.id == made["A"]["id"])
            .values(board_position=1.0)
        )
        conn.execute(
            update(deals)
            .where(deals.c.id == made["B"]["id"])
            .values(board_position=1.0000001)
        )
        conn.execute(
            update(deals)
            .where(deals.c.id == made["C"]["id"])
            .values(board_position=1.0000002)
        )
    other = api.deal("X", stage="new")
    moved = api.move(other["id"], "proposal", before_id=made["B"]["id"])["deal"]
    assert column(api, "proposal") == ["A", "X", "B", "C"]
    positions = {d["name"]: d["board_position"] for d in api.get("/api/deals")["items"]}
    assert (positions["A"], positions["B"], positions["C"]) == (1.0, 2.0, 3.0)
    assert moved["board_position"] == 1.5


def test_a_stage_change_from_elsewhere_puts_the_card_at_the_top(api):
    make_column(api, "negotiation", ["A", "B"])
    deal = api.deal("X", stage="proposal")
    api.patch(f"/api/deals/{deal['id']}", {"stage": "negotiation"})
    assert column(api, "negotiation") == ["X", "A", "B"]


def test_a_new_deal_goes_to_the_top_of_its_column(api):
    make_column(api, "qualified", ["A", "B"])
    api.deal("X", stage="qualified")
    assert column(api, "qualified") == ["X", "A", "B"]


def test_a_before_id_from_another_column_is_refused(api, client):
    other_column = api.deal("Elsewhere", stage="new")
    deal = api.deal("X", stage="proposal")
    response = client.post(
        f"/api/deals/{deal['id']}/move",
        json={"stage": "proposal", "before_id": other_column["id"]},
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "before_id"]
