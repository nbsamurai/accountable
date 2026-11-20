"""The activity routes, and the two timelines (so contacts and deals don't import activities)."""

from typing import Annotated

from fastapi import APIRouter, Query, Response

from ..contacts import service as contacts_service
from ..deals import service as deals_service
from ..deps import Conn, Now
from . import service, timelines
from .schemas import ActivityIn, ActivityOut, ActivityPatch, Timeline

router = APIRouter(tags=["activities"])

Offset = Annotated[int, Query(ge=0)]
Limit = Annotated[int, Query(ge=1, le=200)]


@router.post("/activities", status_code=201, response_model=ActivityOut)
def log_activity(data: ActivityIn, conn: Conn, now: Now):
    return service.create(conn, data, now=now)


@router.patch("/activities/{activity_id}", response_model=ActivityOut)
def change_activity(activity_id: int, data: ActivityPatch, conn: Conn, now: Now):
    return service.patch(conn, activity_id, data, now=now)


@router.delete("/activities/{activity_id}", status_code=204)
def delete_activity(activity_id: int, conn: Conn):
    service.remove(conn, activity_id)
    return Response(status_code=204)


@router.get("/contacts/{contact_id}/timeline", response_model=Timeline)
def contact_timeline(
    contact_id: int,
    conn: Conn,
    offset: Offset = 0,
    limit: Limit = timelines.TIMELINE_PAGE,
):
    contacts_service.get_row(conn, contact_id)
    return timelines.contact_timeline(conn, contact_id, offset, limit)


@router.get("/deals/{deal_id}/timeline", response_model=Timeline)
def deal_timeline(
    deal_id: int, conn: Conn, offset: Offset = 0, limit: Limit = timelines.TIMELINE_PAGE
):
    deals_service.get_row(conn, deal_id)
    return timelines.deal_timeline(conn, deal_id, offset, limit)
