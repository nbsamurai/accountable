"""What the contact routes take and return."""

from datetime import datetime
from typing import Literal

from pydantic import MISSING, BaseModel, Field

from ..deals.schemas import DealOut, Ref
from ..fields import Email, Name, Text

Status = Literal["lead", "qualified", "customer"]


class ContactIn(BaseModel):
    name: Name = Field(None, validate_default=True)
    email: Email = None
    phone: Text = None
    job_title: Text = None
    organization_id: int | None = None
    status: Status = "lead"


class ContactPatch(BaseModel):
    """Changes only the fields sent."""

    name: Name | MISSING = MISSING
    email: Email = None
    phone: Text = None
    job_title: Text = None
    organization_id: int | None = None
    status: Status | MISSING = MISSING


class ContactOut(BaseModel):
    id: int
    name: str
    email: str | None
    phone: str | None
    job_title: str | None
    organization: Ref | None
    status: Status
    # For the delete message (spec 4.10): their deals, and their own activities.
    deal_count: int
    activity_count: int
    created_at: datetime
    updated_at: datetime


class ContactDetail(ContactOut):
    deals: list[DealOut]


class StatusCounts(BaseModel):
    all: int
    lead: int
    qualified: int
    customer: int


class ContactPage(BaseModel):
    items: list[ContactOut]
    total: int
    # The count for each status follows the search, but not the status filter.
    status_counts: StatusCounts


class ContactSummary(BaseModel):
    """A contact in an organization's Contacts panel."""

    id: int
    name: str
    job_title: str | None
    status: Status
    email: str | None
