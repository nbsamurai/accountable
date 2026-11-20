"""The contact routes. They only handle HTTP: the rules are in service.py."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from ..deps import Conn, Now, Today
from ..lists import Direction, Paging, paging
from . import service
from .schemas import ContactDetail, ContactIn, ContactPage, ContactPatch, Status

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=ContactPage)
def list_contacts(
    conn: Conn,
    page: Annotated[Paging, Depends(paging)],
    q: str | None = None,
    status: Status | None = None,
    organization_id: int | None = None,
    sort: service.ContactSort = "name",
    dir: Direction = "asc",
):
    return service.list_contacts(
        conn,
        q=q,
        status=status,
        organization_id=organization_id,
        sort=sort,
        direction=dir,
        page=page,
    )


@router.post("", status_code=201, response_model=ContactDetail)
def add_contact(data: ContactIn, conn: Conn, today: Today, now: Now):
    return service.create(conn, data, today=today, now=now)


@router.get("/{contact_id}", response_model=ContactDetail)
def get_contact(contact_id: int, conn: Conn, today: Today):
    return service.detail(conn, contact_id, today)


@router.patch("/{contact_id}", response_model=ContactDetail)
def change_contact(
    contact_id: int, data: ContactPatch, conn: Conn, today: Today, now: Now
):
    return service.patch(conn, contact_id, data, today=today, now=now)


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int, conn: Conn):
    service.remove(conn, contact_id)
    return Response(status_code=204)
