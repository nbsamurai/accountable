"""Cards and their totals, from one ordered query."""

from datetime import date, timedelta

from sqlalchemy import Connection, and_, or_, select

from ..deals.stages import CLOSED_STAGES, OPEN_STAGES, STAGES, is_late, round_cents
from ..tables import contacts, deals, organizations


def board(conn: Connection, today: date) -> dict:
    d = deals.c
    visible = or_(
        d.stage.in_(OPEN_STAGES),
        and_(
            d.stage.in_(CLOSED_STAGES),
            d.close_date.between(today - timedelta(days=30), today),
        ),
    )
    rows = conn.execute(
        select(
            d.id,
            d.name,
            d.stage,
            d.value,
            d.probability,
            d.close_date,
            d.organization_id,
            d.contact_id,
            organizations.c.name.label("organization_name"),
            contacts.c.name.label("contact_name"),
        )
        .select_from(
            deals.outerjoin(
                organizations, d.organization_id == organizations.c.id
            ).outerjoin(contacts, d.contact_id == contacts.c.id)
        )
        .where(visible)
        .order_by(d.stage, d.board_position, d.id)
    )
    cards = {stage: [] for stage in STAGES}
    for row in rows:
        cards[row.stage].append(
            {
                "id": row.id,
                "name": row.name,
                "stage": row.stage,
                "value": row.value,
                "probability": row.probability,
                "close_date": row.close_date,
                "late": is_late(row.stage, row.close_date, today),
                "organization": {
                    "id": row.organization_id,
                    "name": row.organization_name,
                }
                if row.organization_id
                else None,
                "contact": {"id": row.contact_id, "name": row.contact_name}
                if row.contact_id
                else None,
            }
        )

    columns = []
    count = value = weighted = 0
    for stage, items in cards.items():
        column_value = sum(card["value"] or 0 for card in items)
        column_weighted = sum(
            (card["value"] or 0) * card["probability"] for card in items
        )
        columns.append(
            {
                "stage": stage,
                "cards": items,
                "count": len(items),
                "value": column_value,
                "expected_revenue": round_cents(column_weighted),
            }
        )
        if stage in OPEN_STAGES:
            count += len(items)
            value += column_value
            weighted += column_weighted
    return {
        "today": today,
        "columns": columns,
        "totals": {
            "count": count,
            "value": value,
            "expected_revenue": round_cents(weighted),
        },
    }
