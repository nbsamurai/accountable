"""What the deal routes take and return."""

from datetime import date, datetime

from pydantic import BaseModel, Field

from ..fields import Money, Name, Percent
from .stages import Stage


class DealIn(BaseModel):
    name: Name = Field(None, validate_default=True)
    organization_id: int | None = None
    contact_id: int | None = None
    stage: Stage = "new"
    value: Money = None
    # The stage's usual probability, and today for Won or Lost, when not sent.
    probability: Percent | None = None
    close_date: date | None = None


class DealPatch(BaseModel):
    """Changes only the fields sent. A new stage follows spec 3.2."""

    name: Name = None
    organization_id: int | None = None
    contact_id: int | None = None
    stage: Stage = None
    value: Money = None
    probability: Percent = None
    close_date: date | None = None


class MoveIn(BaseModel):
    """Moves a card to a stage, just above the card `before_id`, or to the bottom when it's null."""

    stage: Stage
    before_id: int | None = None


class Ref(BaseModel):
    id: int
    name: str


class ContactRef(Ref):
    organization_id: int | None
    # The contact's organization today, so the deal form can show a mismatch (spec 3.4).
    organization_name: str | None = None


class DealOut(BaseModel):
    id: int
    name: str
    organization: Ref | None
    contact: ContactRef | None
    stage: Stage
    value: int | None
    probability: int
    expected_revenue: int
    close_date: date | None
    late: bool
    board_position: float
    activity_count: int
    created_at: datetime
    updated_at: datetime


class DealDetail(DealOut):
    # For the delete message (spec 4.10).
    stage_change_count: int


class DealPage(BaseModel):
    items: list[DealOut]
    total: int


class ChangedContact(BaseModel):
    id: int
    name: str
    status: str


class DealChange(BaseModel):
    """A deal after a change, and the contact it made a customer, if any."""

    deal: DealDetail
    contact: ChangedContact | None
