"""`GET /search?q`: the top bar's search (spec 4.12 and 9.4)."""

from fastapi import APIRouter
from pydantic import BaseModel

from ..deals.stages import Stage
from ..deps import Conn
from . import service

router = APIRouter(tags=["search"])


class OrganizationMatch(BaseModel):
    id: int
    name: str
    industry: str | None


class ContactMatch(BaseModel):
    id: int
    name: str
    organization: str | None


class DealMatch(BaseModel):
    id: int
    name: str
    organization: str | None
    stage: Stage


class Matches(BaseModel):
    organizations: list[OrganizationMatch]
    contacts: list[ContactMatch]
    deals: list[DealMatch]


@router.get("/search", response_model=Matches)
def search(conn: Conn, q: str = ""):
    return service.search(conn, q)
