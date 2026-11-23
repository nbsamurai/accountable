"""Contacts: their queries and rules."""

from datetime import date, datetime
from typing import Any, Literal

from sqlalchemy import Connection, Row, case, delete, func, insert, select, update

from .. import authors
from ..auth.people import Person
from ..deals import service as deals
from ..errors import invalid, not_found
from ..lists import Direction, Paging, Sortable, fold, order, page_of, search
from ..tables import activities, contacts, organizations
from ..tables import deals as deals_table
from .schemas import ContactIn, ContactPatch

STATUS_ORDER = {"lead": 0, "qualified": 1, "customer": 2}

DEAL_COUNT = (
    select(func.count())
    .where(deals_table.c.contact_id == contacts.c.id)
    .correlate(contacts)
    .scalar_subquery()
)
ACTIVITY_COUNT = (
    select(func.count())
    .where(activities.c.contact_id == contacts.c.id)
    .correlate(contacts)
    .scalar_subquery()
)

SORTS: dict[str, Sortable] = {
    "name": Sortable(contacts.c.name, text=True),
    "organization": Sortable(organizations.c.name, text=True),
    "job_title": Sortable(contacts.c.job_title, text=True),
    "email": Sortable(contacts.c.email, text=True),
    "phone": Sortable(contacts.c.phone, text=True),
    "status": Sortable(case(STATUS_ORDER, value=contacts.c.status)),
}
ContactSort = Literal["name", "organization", "job_title", "email", "phone", "status"]


def _from():
    return contacts.outerjoin(
        organizations, organizations.c.id == contacts.c.organization_id
    )


def _select():
    return select(
        contacts,
        organizations.c.name.label("organization_name"),
        DEAL_COUNT.label("deal_count"),
        ACTIVITY_COUNT.label("activity_count"),
    ).select_from(_from())


def to_out(row: Row) -> dict[str, Any]:
    return {
        "id": row.id,
        "name": row.name,
        "email": row.email,
        "phone": row.phone,
        "job_title": row.job_title,
        "organization": (
            {"id": row.organization_id, "name": row.organization_name}
            if row.organization_id
            else None
        ),
        "status": row.status,
        "deal_count": row.deal_count,
        "activity_count": row.activity_count,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def get_row(conn: Connection, contact_id: int) -> Row:
    row = conn.execute(select(contacts).where(contacts.c.id == contact_id)).first()
    if row is None:
        raise not_found("contact")
    return row


def detail(conn: Connection, contact_id: int, today: date) -> dict[str, Any]:
    row = conn.execute(_select().where(contacts.c.id == contact_id)).first()
    if row is None:
        raise not_found("contact")
    return {
        **to_out(row),
        **authors.of(conn, contacts, contact_id),
        "deals": deals.deals_where(conn, deals_table.c.contact_id == contact_id, today),
    }


def list_contacts(
    conn: Connection,
    *,
    q: str | None,
    status: str | None,
    organization_id: int | None,
    sort: ContactSort,
    direction: Direction,
    page: Paging,
) -> dict[str, Any]:
    filters = []
    matches = search(
        q,
        [
            contacts.c.name,
            contacts.c.email,
            contacts.c.phone,
            contacts.c.job_title,
            organizations.c.name,
        ],
    )
    if matches is not None:
        filters.append(matches)
    if organization_id is not None:
        filters.append(contacts.c.organization_id == organization_id)

    counts = dict(
        conn.execute(
            select(contacts.c.status, func.count())
            .select_from(_from())
            .where(*filters)
            .group_by(contacts.c.status)
        ).all()
    )
    status_counts = {name: counts.get(name, 0) for name in STATUS_ORDER}

    stmt = _select().where(*filters)
    if status is not None:
        stmt = stmt.where(contacts.c.status == status)
    rows, total = page_of(
        conn, stmt, order(SORTS[sort], direction, contacts.c.id), page
    )
    return {
        "items": [to_out(row) for row in rows],
        "total": total,
        "status_counts": {"all": sum(status_counts.values()), **status_counts},
    }


def contacts_at(conn: Connection, organization_id: int) -> list[dict[str, Any]]:
    """An organization's people, A to Z."""
    rows = conn.execute(
        select(
            contacts.c.id,
            contacts.c.name,
            contacts.c.job_title,
            contacts.c.status,
            contacts.c.email,
        )
        .where(contacts.c.organization_id == organization_id)
        .order_by(fold(contacts.c.name), contacts.c.id)
    ).all()
    return [row._asdict() for row in rows]


def _check_organization(conn: Connection, organization_id: int | None) -> None:
    if organization_id is None:
        return
    found = conn.execute(
        select(organizations.c.id).where(organizations.c.id == organization_id)
    ).first()
    if found is None:
        raise invalid("organization_id", "This organization no longer exists.")


def create(
    conn: Connection, data: ContactIn, *, person: Person, today: date, now: datetime
) -> dict[str, Any]:
    _check_organization(conn, data.organization_id)
    contact_id = conn.execute(
        insert(contacts)
        .values(**data.model_dump(), **authors.added(person, now))
        .returning(contacts.c.id)
    ).scalar_one()
    return detail(conn, contact_id, today)


def patch(
    conn: Connection,
    contact_id: int,
    data: ContactPatch,
    *,
    person: Person,
    today: date,
    now: datetime,
) -> dict[str, Any]:
    """Changes the fields sent. A contact who moves to another organization stays on their deals."""
    get_row(conn, contact_id)
    values = data.model_dump(exclude_unset=True)
    if "organization_id" in values:
        _check_organization(conn, values["organization_id"])
    if values:
        conn.execute(
            update(contacts)
            .where(contacts.c.id == contact_id)
            .values(**values, **authors.changed(person, now))
        )
    return detail(conn, contact_id, today)


def remove(conn: Connection, contact_id: int) -> None:
    """Deletes a contact. Their deals stay with no main contact, and their own activities go."""
    get_row(conn, contact_id)
    conn.execute(delete(contacts).where(contacts.c.id == contact_id))
