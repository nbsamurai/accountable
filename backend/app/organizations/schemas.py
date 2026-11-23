"""What the organization routes take and return."""

from datetime import datetime

from pydantic import MISSING, BaseModel, Field

from ..authors import PersonRef
from ..contacts.schemas import ContactSummary
from ..deals.schemas import DealOut
from ..fields import Name, Text, Website


class OrganizationIn(BaseModel):
    name: Name = Field(None, validate_default=True)
    website: Website = None
    industry: Text = None
    notes: Text = None


class OrganizationPatch(BaseModel):
    """Changes only the fields sent."""

    name: Name | MISSING = MISSING
    website: Website = None
    industry: Text = None
    notes: Text = None


class OrganizationOut(BaseModel):
    id: int
    name: str
    website: str | None
    industry: str | None
    notes: str | None
    contact_count: int
    open_deal_count: int
    open_pipeline: int
    created_at: datetime
    updated_at: datetime


class Figures(BaseModel):
    open_pipeline: int
    expected_revenue: int
    won_to_date: int


class OrganizationDetail(OrganizationOut):
    # For the delete message (spec 4.10): every deal, open or closed.
    deal_count: int
    created_by: PersonRef | None
    updated_by: PersonRef | None
    figures: Figures
    contacts: list[ContactSummary]
    deals: list[DealOut]


class OrganizationPage(BaseModel):
    items: list[OrganizationOut]
    total: int
