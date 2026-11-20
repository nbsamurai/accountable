"""Organizations: their queries and rules."""

from datetime import date, datetime
from typing import Any, Literal

from sqlalchemy import Connection, Row, case, delete, func, insert, select, update

from ..contacts import service as contacts_service
from ..deals import service as deals_service
from ..deals.stages import OPEN_STAGES, round_cents
from ..errors import not_found
from ..lists import Direction, Paging, Sortable, order, page_of, search
from ..tables import contacts, deals, organizations
from .schemas import OrganizationIn, OrganizationPatch

contact_counts = (
    select(contacts.c.organization_id, func.count().label("contact_count"))
    .group_by(contacts.c.organization_id)
    .subquery("contact_counts")
)
open_deals = (
    select(
        deals.c.organization_id,
        func.count().label("open_deal_count"),
        func.sum(func.coalesce(deals.c.value, 0)).label("open_pipeline"),
    )
    .where(deals.c.stage.in_(OPEN_STAGES))
    .group_by(deals.c.organization_id)
    .subquery("open_deals")
)
CONTACT_COUNT = func.coalesce(contact_counts.c.contact_count, 0)
OPEN_DEAL_COUNT = func.coalesce(open_deals.c.open_deal_count, 0)
OPEN_PIPELINE = func.coalesce(open_deals.c.open_pipeline, 0)

SORTS: dict[str, Sortable] = {
    "name": Sortable(organizations.c.name, text=True),
    "industry": Sortable(organizations.c.industry, text=True),
    "website": Sortable(organizations.c.website, text=True),
    "contacts": Sortable(CONTACT_COUNT),
    "open_deals": Sortable(OPEN_DEAL_COUNT),
    "open_pipeline": Sortable(OPEN_PIPELINE),
}
OrganizationSort = Literal["name", "industry", "website", "contacts", "open_deals", "open_pipeline"]


def _select():
    return select(
        organizations,
        CONTACT_COUNT.label("contact_count"),
        OPEN_DEAL_COUNT.label("open_deal_count"),
        OPEN_PIPELINE.label("open_pipeline"),
    ).select_from(
        organizations.outerjoin(contact_counts, contact_counts.c.organization_id == organizations.c.id).outerjoin(
            open_deals, open_deals.c.organization_id == organizations.c.id
        )
    )


def to_out(row: Row) -> dict[str, Any]:
    return {
        "id": row.id,
        "name": row.name,
        "website": row.website,
        "industry": row.industry,
        "notes": row.notes,
        "contact_count": row.contact_count,
        "open_deal_count": row.open_deal_count,
        "open_pipeline": row.open_pipeline,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def get_row(conn: Connection, organization_id: int) -> Row:
    row = conn.execute(select(organizations).where(organizations.c.id == organization_id)).first()
    if row is None:
        raise not_found("organization")
    return row


def figures(conn: Connection, organization_id: int) -> dict[str, int]:
    """Open pipeline, expected revenue, and won to date (spec 4.4)."""
    value = func.coalesce(deals.c.value, 0)
    is_open = deals.c.stage.in_(OPEN_STAGES)
    row = conn.execute(
        select(
            func.coalesce(func.sum(case((is_open, value), else_=0)), 0).label("open_pipeline"),
            func.coalesce(func.sum(case((is_open, value * deals.c.probability), else_=0)), 0).label("expected"),
            func.coalesce(func.sum(case((deals.c.stage == "won", value), else_=0)), 0).label("won"),
        ).where(deals.c.organization_id == organization_id)
    ).one()
    return {
        "open_pipeline": row.open_pipeline,
        "expected_revenue": round_cents(row.expected),
        "won_to_date": row.won,
    }


def detail(conn: Connection, organization_id: int, today: date) -> dict[str, Any]:
    row = conn.execute(_select().where(organizations.c.id == organization_id)).first()
    if row is None:
        raise not_found("organization")
    deal_count = conn.execute(
        select(func.count()).where(deals.c.organization_id == organization_id)
    ).scalar_one()
    return {
        **to_out(row),
        "deal_count": deal_count,
        "figures": figures(conn, organization_id),
        "contacts": contacts_service.contacts_at(conn, organization_id),
        "deals": deals_service.deals_where(conn, deals.c.organization_id == organization_id, today),
    }


def list_organizations(
    conn: Connection, *, q: str | None, sort: OrganizationSort, direction: Direction, page: Paging
) -> dict[str, Any]:
    stmt = _select()
    matches = search(q, [organizations.c.name, organizations.c.industry, organizations.c.website])
    if matches is not None:
        stmt = stmt.where(matches)
    rows, total = page_of(conn, stmt, order(SORTS[sort], direction, organizations.c.id), page)
    return {"items": [to_out(row) for row in rows], "total": total}


def create(conn: Connection, data: OrganizationIn, *, today: date, now: datetime) -> dict[str, Any]:
    organization_id = conn.execute(
        insert(organizations).values(**data.model_dump(), created_at=now, updated_at=now)
    ).inserted_primary_key[0]
    return detail(conn, organization_id, today)


def patch(
    conn: Connection, organization_id: int, data: OrganizationPatch, *, today: date, now: datetime
) -> dict[str, Any]:
    get_row(conn, organization_id)
    values = data.model_dump(exclude_unset=True)
    if values:
        conn.execute(
            update(organizations).where(organizations.c.id == organization_id).values(**values, updated_at=now)
        )
    return detail(conn, organization_id, today)


def remove(conn: Connection, organization_id: int) -> None:
    """Deletes an organization. Its contacts and deals stay, with no organization."""
    get_row(conn, organization_id)
    conn.execute(delete(organizations).where(organizations.c.id == organization_id))
