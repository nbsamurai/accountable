"""The two timelines (spec 3.6), newest first by occurred_at, then created_at.

- A deal's: the deal's activities, stage changes included.
- A contact's: their own activities, and every activity on deals where they're the
  main contact today. Each deal entry names its deal.
"""

from typing import Any

from sqlalchemy import ColumnElement, Connection, desc, func, or_, select

from ..tables import activities, contacts, deals

TIMELINE_PAGE = 50


def select_with_links():
    return select(
        activities,
        contacts.c.name.label("contact_name"),
        deals.c.name.label("deal_name"),
    ).select_from(
        activities.outerjoin(contacts, contacts.c.id == activities.c.contact_id).outerjoin(
            deals, deals.c.id == activities.c.deal_id
        )
    )


def to_out(row) -> dict[str, Any]:
    return {
        "id": row.id,
        "type": row.type,
        "description": row.description,
        "occurred_at": row.occurred_at,
        "follow_up_date": row.follow_up_date,
        "done": row.done,
        "contact": {"id": row.contact_id, "name": row.contact_name} if row.contact_id else None,
        "deal": {"id": row.deal_id, "name": row.deal_name} if row.deal_id else None,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


NEWEST_FIRST = (desc(activities.c.occurred_at), desc(activities.c.created_at), desc(activities.c.id))


def _page(conn: Connection, condition: ColumnElement[bool], offset: int, limit: int) -> dict[str, Any]:
    total = conn.execute(select(func.count()).select_from(activities).where(condition)).scalar_one()
    rows = conn.execute(select_with_links().where(condition).order_by(*NEWEST_FIRST).offset(offset).limit(limit)).all()
    return {"items": [to_out(row) for row in rows], "total": total}


def deal_timeline(conn: Connection, deal_id: int, offset: int = 0, limit: int = TIMELINE_PAGE) -> dict[str, Any]:
    return _page(conn, activities.c.deal_id == deal_id, offset, limit)


def contact_timeline(
    conn: Connection, contact_id: int, offset: int = 0, limit: int = TIMELINE_PAGE
) -> dict[str, Any]:
    their_deals = select(deals.c.id).where(deals.c.contact_id == contact_id)
    condition = or_(activities.c.contact_id == contact_id, activities.c.deal_id.in_(their_deals))
    return _page(conn, condition, offset, limit)


def one(conn: Connection, activity_id: int) -> dict[str, Any] | None:
    row = conn.execute(select_with_links().where(activities.c.id == activity_id)).first()
    return to_out(row) if row else None
