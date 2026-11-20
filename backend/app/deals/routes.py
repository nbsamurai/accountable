"""The deal routes. They only handle HTTP: the rules are in service.py."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from ..deps import Conn, Now, Today
from ..lists import Direction, Paging, paging
from . import service
from .schemas import DealChange, DealDetail, DealIn, DealPage, DealPatch, MoveIn

router = APIRouter(prefix="/deals", tags=["deals"])


@router.get("", response_model=DealPage)
def list_deals(
    conn: Conn,
    today: Today,
    page: Annotated[Paging, Depends(paging)],
    q: str | None = None,
    sort: service.DealSort = "name",
    dir: Direction = "asc",
):
    return service.list_deals(conn, q=q, sort=sort, direction=dir, page=page, today=today)


@router.post("", status_code=201, response_model=DealChange)
def add_deal(data: DealIn, conn: Conn, today: Today, now: Now):
    return service.create(conn, data, today=today, now=now)


@router.get("/{deal_id}", response_model=DealDetail)
def get_deal(deal_id: int, conn: Conn, today: Today):
    return service.detail(conn, deal_id, today)


@router.patch("/{deal_id}", response_model=DealChange)
def change_deal(deal_id: int, data: DealPatch, conn: Conn, today: Today, now: Now):
    return service.patch(conn, deal_id, data, today=today, now=now)


@router.post("/{deal_id}/move", response_model=DealChange)
def move_deal(deal_id: int, data: MoveIn, conn: Conn, today: Today, now: Now):
    return service.move(conn, deal_id, data.stage, data.before_id, today=today, now=now)


@router.delete("/{deal_id}", status_code=204)
def delete_deal(deal_id: int, conn: Conn):
    service.remove(conn, deal_id)
    return Response(status_code=204)
