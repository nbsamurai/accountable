"""Deals: their queries and rules, including the one function that changes a stage (spec 3.2)."""

from datetime import date, datetime
from typing import Any, Literal

from sqlalchemy import (
    Connection,
    Row,
    case,
    delete,
    func,
    insert,
    nulls_last,
    select,
    update,
)

from .. import authors
from ..auth.people import Person
from ..errors import invalid, not_found
from ..lists import Direction, Paging, Sortable, order, page_of, search
from ..tables import activities, contacts, deals, organizations
from . import ordering
from .schemas import DealIn, DealPatch
from .stages import (
    CLOSED_STAGES,
    ORDER,
    PROBABILITY,
    Stage,
    expected_revenue,
    is_late,
    move_description,
)

org = organizations.alias("deal_org")
person = contacts.alias("deal_contact")
person_org = organizations.alias("deal_contact_org")

ACTIVITY_COUNT = (
    select(func.count())
    .where(activities.c.deal_id == deals.c.id)
    .correlate(deals)
    .scalar_subquery()
)

SORTS: dict[str, Sortable] = {
    "name": Sortable(deals.c.name, text=True),
    "organization": Sortable(org.c.name, text=True),
    "contact": Sortable(person.c.name, text=True),
    "stage": Sortable(case(ORDER, value=deals.c.stage)),
    "value": Sortable(deals.c.value),
    "probability": Sortable(deals.c.probability),
    "expected_revenue": Sortable(func.coalesce(deals.c.value, 0) * deals.c.probability),
    "close_date": Sortable(deals.c.close_date),
}
DealSort = Literal[
    "name",
    "organization",
    "contact",
    "stage",
    "value",
    "probability",
    "expected_revenue",
    "close_date",
]


def _select():
    return select(
        deals,
        org.c.name.label("organization_name"),
        person.c.name.label("contact_name"),
        person.c.organization_id.label("contact_organization_id"),
        person_org.c.name.label("contact_organization_name"),
    ).select_from(
        deals.outerjoin(org, org.c.id == deals.c.organization_id)
        .outerjoin(person, person.c.id == deals.c.contact_id)
        .outerjoin(person_org, person_org.c.id == person.c.organization_id)
    )


def to_out(row: Row, today: date) -> dict[str, Any]:
    return {
        "id": row.id,
        "name": row.name,
        "organization": (
            {"id": row.organization_id, "name": row.organization_name}
            if row.organization_id
            else None
        ),
        "contact": (
            {
                "id": row.contact_id,
                "name": row.contact_name,
                "organization_id": row.contact_organization_id,
                "organization_name": row.contact_organization_name,
            }
            if row.contact_id
            else None
        ),
        "stage": row.stage,
        "value": row.value,
        "probability": row.probability,
        "expected_revenue": expected_revenue(row.value, row.probability),
        "close_date": row.close_date,
        "late": is_late(row.stage, row.close_date, today),
        "board_position": row.board_position,
        "activity_count": row.activity_count,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def get_row(conn: Connection, deal_id: int) -> Row:
    row = conn.execute(select(deals).where(deals.c.id == deal_id)).first()
    if row is None:
        raise not_found("deal")
    return row


def detail(conn: Connection, deal_id: int, today: date) -> dict[str, Any]:
    stmt = (
        _select()
        .add_columns(ACTIVITY_COUNT.label("activity_count"))
        .where(deals.c.id == deal_id)
    )
    row = conn.execute(stmt).first()
    if row is None:
        raise not_found("deal")
    stage_changes = conn.execute(
        select(func.count()).where(
            activities.c.deal_id == deal_id, activities.c.type == "stage_change"
        )
    ).scalar_one()
    return {
        **to_out(row, today),
        **authors.of(conn, deals, deal_id),
        "stage_change_count": stage_changes,
    }


def deals_where(conn: Connection, condition: Any, today: date) -> list[dict[str, Any]]:
    """The deals linked to a record, in pipeline order, then by close date."""
    stmt = (
        _select()
        .add_columns(ACTIVITY_COUNT.label("activity_count"))
        .where(condition)
        .order_by(
            case(ORDER, value=deals.c.stage),
            nulls_last(deals.c.close_date),
            deals.c.name,
            deals.c.id,
        )
    )
    return [to_out(row, today) for row in conn.execute(stmt)]


def list_deals(
    conn: Connection,
    *,
    q: str | None,
    sort: DealSort,
    direction: Direction,
    page: Paging,
    today: date,
) -> dict[str, Any]:
    stmt = _select().add_columns(ACTIVITY_COUNT.label("activity_count"))
    matches = search(q, [deals.c.name, org.c.name, person.c.name])
    if matches is not None:
        stmt = stmt.where(matches)
    rows, total = page_of(conn, stmt, order(SORTS[sort], direction, deals.c.id), page)
    return {"items": [to_out(row, today) for row in rows], "total": total}


# A deal's organization and main contact (spec 3.4)


def check_links(
    conn: Connection, organization_id: int | None, contact_id: int | None
) -> None:
    """Refuses links to records that don't exist, and a main contact who works elsewhere."""
    if organization_id is not None:
        found = conn.execute(
            select(organizations.c.id).where(organizations.c.id == organization_id)
        ).first()
        if found is None:
            raise invalid("organization_id", "This organization no longer exists.")
    if contact_id is None:
        return
    contact = conn.execute(
        select(contacts.c.name, contacts.c.organization_id).where(
            contacts.c.id == contact_id
        )
    ).first()
    if contact is None:
        raise invalid("contact_id", "This contact no longer exists.")
    if contact.organization_id != organization_id:
        raise invalid(
            "contact_id", f"{contact.name} doesn't work at this deal's organization."
        )


# Card order


def first_position(conn: Connection, stage: str) -> float | None:
    return conn.execute(
        select(func.min(deals.c.board_position)).where(deals.c.stage == stage)
    ).scalar()


def _renumber(conn: Connection, ids: list[int]) -> None:
    for deal_id, position in zip(ids, ordering.renumbered(len(ids)), strict=True):
        conn.execute(
            update(deals).where(deals.c.id == deal_id).values(board_position=position)
        )


def drop_position(
    conn: Connection, deal_id: int, stage: str, before_id: int | None
) -> float:
    """The position for a card dropped in `stage`, just above `before_id`, or last."""
    column = conn.execute(
        select(deals.c.id, deals.c.board_position)
        .where(deals.c.stage == stage, deals.c.id != deal_id)
        .order_by(deals.c.board_position, deals.c.id)
    ).all()
    if before_id is None:
        return ordering.bottom(column[-1].board_position if column else None)
    ids = [row.id for row in column]
    if before_id not in ids:
        raise invalid("before_id", "That card isn't in this column.")
    index = ids.index(before_id)
    above = column[index - 1].board_position if index > 0 else None
    position = ordering.between(above, column[index].board_position)
    if position is None:
        _renumber(conn, ids)
        position = ordering.between(
            float(index) if index > 0 else None, float(index + 1)
        )
    assert position is not None
    return position


# Changing a stage (spec 3.2)


def _promote_contact(
    conn: Connection, contact_id: int | None, person: Person, now: datetime
) -> dict[str, Any] | None:
    """Makes a Won deal's main contact a customer, as a change by whoever won it."""
    if contact_id is None:
        return None
    contact = (
        conn.execute(
            update(contacts)
            .where(contacts.c.id == contact_id, contacts.c.status != "customer")
            .values(status="customer", **authors.changed(person, now))
            .returning(contacts.c.id, contacts.c.name, contacts.c.status)
        )
        .mappings()
        .one_or_none()
    )
    return dict(contact) if contact is not None else None


def change_stage(
    conn: Connection,
    deal_id: int,
    new_stage: Stage,
    *,
    person: Person,
    today: date,
    now: datetime,
    sent: dict[str, Any] | None = None,
    from_board: bool = False,
) -> dict[str, Any] | None:
    """The one function that changes a deal's stage. Every stage change goes through it.

    1. The probability becomes the new stage's usual one.
    2. For Won or Lost, the close date becomes today.
    3. For Won, the main contact becomes a customer.
    4. A stage_change activity is written on the deal, by the person who moved it.
    5. Unless the move came from the board, the card goes to the top of its new column.

    Steps 1 and 2 apply only to the fields the request didn't send, which are in `sent`.
    Returns the contact when step 3 changed their status.
    """
    deal = get_row(conn, deal_id)
    old_stage = deal.stage
    if new_stage == old_stage:
        return None
    sent = sent or {}

    values: dict[str, Any] = {"stage": new_stage, **authors.changed(person, now)}
    values["probability"] = (
        sent["probability"] if "probability" in sent else PROBABILITY[new_stage]
    )
    if "close_date" in sent:
        values["close_date"] = sent["close_date"]
    elif new_stage in CLOSED_STAGES:
        values["close_date"] = today
    if not from_board:
        values["board_position"] = ordering.top(first_position(conn, new_stage))
    conn.execute(update(deals).where(deals.c.id == deal_id).values(**values))

    changed = (
        _promote_contact(conn, deal.contact_id, person, now)
        if new_stage == "won"
        else None
    )

    conn.execute(
        insert(activities).values(
            type="stage_change",
            deal_id=deal_id,
            description=move_description(old_stage, new_stage),
            occurred_at=now,
            done=False,
            **authors.added(person, now),
        )
    )
    return changed


# Adding, changing, moving and deleting


def create(
    conn: Connection, data: DealIn, *, person: Person, today: date, now: datetime
) -> dict[str, Any]:
    """Adds a deal at the top of its column. Creating at a stage writes no activity.

    A deal created in Won makes its main contact a customer. Returns the deal, and the
    contact when its status changed, as a stage change does.
    """
    check_links(conn, data.organization_id, data.contact_id)
    sent = data.model_fields_set
    probability = (
        data.probability if data.probability is not None else PROBABILITY[data.stage]
    )
    close_date = data.close_date
    if "close_date" not in sent and data.stage in CLOSED_STAGES:
        close_date = today
    deal_id = conn.execute(
        insert(deals)
        .values(
            name=data.name,
            organization_id=data.organization_id,
            contact_id=data.contact_id,
            stage=data.stage,
            value=data.value,
            probability=probability,
            close_date=close_date,
            board_position=ordering.top(first_position(conn, data.stage)),
            **authors.added(person, now),
        )
        .returning(deals.c.id)
    ).scalar_one()
    changed = (
        _promote_contact(conn, data.contact_id, person, now)
        if data.stage == "won"
        else None
    )
    return {"deal": detail(conn, deal_id, today), "contact": changed}


def patch(
    conn: Connection,
    deal_id: int,
    data: DealPatch,
    *,
    person: Person,
    today: date,
    now: datetime,
) -> dict[str, Any]:
    deal = get_row(conn, deal_id)
    values = data.model_dump(exclude_unset=True)
    if "organization_id" in values or "contact_id" in values:
        check_links(
            conn,
            values.get("organization_id", deal.organization_id),
            values.get("contact_id", deal.contact_id),
        )
    new_stage = values.pop("stage", deal.stage)
    sent: dict[str, Any] = {}
    if new_stage != deal.stage:
        sent = {
            field: values.pop(field)
            for field in ("probability", "close_date")
            if field in values
        }
    if values:
        conn.execute(
            update(deals)
            .where(deals.c.id == deal_id)
            .values(**values, **authors.changed(person, now))
        )
    changed = None
    if new_stage != deal.stage:
        changed = change_stage(
            conn, deal_id, new_stage, person=person, today=today, now=now, sent=sent
        )
    return {"deal": detail(conn, deal_id, today), "contact": changed}


def move(
    conn: Connection,
    deal_id: int,
    stage: Stage,
    before_id: int | None,
    *,
    person: Person,
    today: date,
    now: datetime,
) -> dict[str, Any]:
    """A move on the board: to a stage and a place. Within a column, only the place changes.

    Either way, it's a change by the person who moved the card.
    """
    deal = get_row(conn, deal_id)
    position = drop_position(conn, deal_id, stage, before_id)
    changed = None
    if stage != deal.stage:
        changed = change_stage(
            conn, deal_id, stage, person=person, today=today, now=now, from_board=True
        )
    conn.execute(
        update(deals)
        .where(deals.c.id == deal_id)
        .values(board_position=position, **authors.changed(person, now))
    )
    return {"deal": detail(conn, deal_id, today), "contact": changed}


def remove(conn: Connection, deal_id: int) -> None:
    """Deletes a deal. The database deletes its activities, stage changes included."""
    get_row(conn, deal_id)
    conn.execute(delete(deals).where(deals.c.id == deal_id))
