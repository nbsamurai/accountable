"""The organization routes. They only handle HTTP: the rules are in service.py."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from ..deps import Conn, Now, Today
from ..lists import Direction, Paging, paging
from . import service
from .schemas import (
    OrganizationDetail,
    OrganizationIn,
    OrganizationPage,
    OrganizationPatch,
)

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("", response_model=OrganizationPage)
def list_organizations(
    conn: Conn,
    page: Annotated[Paging, Depends(paging)],
    q: str | None = None,
    sort: service.OrganizationSort = "name",
    dir: Direction = "asc",
):
    return service.list_organizations(conn, q=q, sort=sort, direction=dir, page=page)


@router.post("", status_code=201, response_model=OrganizationDetail)
def add_organization(data: OrganizationIn, conn: Conn, today: Today, now: Now):
    return service.create(conn, data, today=today, now=now)


@router.get("/{organization_id}", response_model=OrganizationDetail)
def get_organization(organization_id: int, conn: Conn, today: Today):
    return service.detail(conn, organization_id, today)


@router.patch("/{organization_id}", response_model=OrganizationDetail)
def change_organization(
    organization_id: int, data: OrganizationPatch, conn: Conn, today: Today, now: Now
):
    return service.patch(conn, organization_id, data, today=today, now=now)


@router.delete("/{organization_id}", status_code=204)
def delete_organization(organization_id: int, conn: Conn):
    service.remove(conn, organization_id)
    return Response(status_code=204)
