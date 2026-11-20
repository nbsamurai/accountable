"""Activities: logging, changing and deleting notes, calls and emails (spec 3.5)."""

from datetime import datetime
from typing import Any

from sqlalchemy import Connection, Row, delete, insert, select, update

from ..errors import conflict, invalid, not_found
from ..tables import activities, contacts, deals
from . import timelines
from .schemas import ActivityIn, ActivityPatch

READ_ONLY = (
    "Stage changes are a record of what happened, so they can't be changed or deleted."
)


def get_row(conn: Connection, activity_id: int) -> Row:
    row = conn.execute(select(activities).where(activities.c.id == activity_id)).first()
    if row is None:
        raise not_found("activity")
    return row


def _check_record(
    conn: Connection, contact_id: int | None, deal_id: int | None
) -> None:
    if (contact_id is None) == (deal_id is None):
        raise invalid("contact_id", "Log the activity on one contact or one deal.")
    if contact_id is not None:
        if (
            conn.execute(
                select(contacts.c.id).where(contacts.c.id == contact_id)
            ).first()
            is None
        ):
            raise invalid("contact_id", "This contact no longer exists.")
    elif conn.execute(select(deals.c.id).where(deals.c.id == deal_id)).first() is None:
        raise invalid("deal_id", "This deal no longer exists.")


def create(conn: Connection, data: ActivityIn, *, now: datetime) -> dict[str, Any]:
    _check_record(conn, data.contact_id, data.deal_id)
    values = data.model_dump()
    values["occurred_at"] = data.occurred_at or now
    activity_id = conn.execute(
        insert(activities)
        .values(**values, created_at=now, updated_at=now)
        .returning(activities.c.id)
    ).scalar_one()
    return timelines.one(conn, activity_id)


def patch(
    conn: Connection, activity_id: int, data: ActivityPatch, *, now: datetime
) -> dict[str, Any]:
    row = get_row(conn, activity_id)
    if row.type == "stage_change":
        raise conflict(READ_ONLY)
    values = data.model_dump(exclude_unset=True)
    for field in ("contact_id", "deal_id"):
        if field in values and values[field] != getattr(row, field):
            raise invalid(field, "An activity's contact or deal can't be changed.")
        values.pop(field, None)
    if values:
        conn.execute(
            update(activities)
            .where(activities.c.id == activity_id)
            .values(**values, updated_at=now)
        )
    return timelines.one(conn, activity_id)


def remove(conn: Connection, activity_id: int) -> None:
    row = get_row(conn, activity_id)
    if row.type == "stage_change":
        raise conflict(READ_ONLY)
    conn.execute(delete(activities).where(activities.c.id == activity_id))
