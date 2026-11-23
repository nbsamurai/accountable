"""Who added and last changed a record (spec 3.11).

Adding a record sets both people to the signed-in person. Any change saved to a record
sets `updated_by` and `updated_at`. The API gives each person as `{ id, name }`, where the
name is how the person shows: their name, or their email when they have no name.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel
from sqlalchemy import Connection, FromClause, Label, Table, func, select

from .auth.people import Person
from .tables import people


class PersonRef(BaseModel):
    id: str
    name: str


def added(person: Person, now: datetime) -> dict[str, Any]:
    """The values a new record gets."""
    return {
        "created_at": now,
        "updated_at": now,
        "created_by": person.id,
        "updated_by": person.id,
    }


def changed(person: Person, now: datetime) -> dict[str, Any]:
    """The values a change sets."""
    return {"updated_at": now, "updated_by": person.id}


def shows_as(alias: FromClause, label: str) -> Label:
    return func.coalesce(alias.c.name, alias.c.email).label(label)


def ref(person_id: str | None, name: str | None) -> dict[str, str] | None:
    """A person as `{ id, name }`, or None when no one is recorded."""
    return {"id": person_id, "name": name or ""} if person_id else None


def of(conn: Connection, table: Table, record_id: int) -> dict[str, Any]:
    """`created_by` and `updated_by` of one record, each as `{ id, name }` or None."""
    creator = people.alias("creator")
    changer = people.alias("changer")
    row = conn.execute(
        select(
            table.c.created_by,
            shows_as(creator, "created_by_name"),
            table.c.updated_by,
            shows_as(changer, "updated_by_name"),
        )
        .select_from(
            table.outerjoin(creator, creator.c.id == table.c.created_by).outerjoin(
                changer, changer.c.id == table.c.updated_by
            )
        )
        .where(table.c.id == record_id)
    ).one()
    return {
        "created_by": ref(row.created_by, row.created_by_name),
        "updated_by": ref(row.updated_by, row.updated_by_name),
    }
