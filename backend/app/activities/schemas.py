"""What the activity routes take and return."""

from datetime import date, datetime
from typing import Literal

from pydantic import AwareDatetime, BaseModel, Field

from ..deals.schemas import Ref
from ..fields import RequiredText

# People log these three. The app writes stage_change itself.
LoggedType = Literal["note", "call", "email"]
ActivityType = Literal["note", "call", "email", "stage_change"]


class ActivityIn(BaseModel):
    """A note, call or email on exactly one contact or deal. `occurred_at` is now when not sent."""

    type: LoggedType
    contact_id: int | None = None
    deal_id: int | None = None
    description: RequiredText = Field(None, validate_default=True)
    occurred_at: AwareDatetime | None = None
    follow_up_date: date | None = None
    done: bool = False


class ActivityPatch(BaseModel):
    """Changes only the fields sent. The contact or deal can't change."""

    type: LoggedType = None
    contact_id: int | None = None
    deal_id: int | None = None
    description: RequiredText = None
    occurred_at: AwareDatetime = None
    follow_up_date: date | None = None
    done: bool = None


class ActivityOut(BaseModel):
    id: int
    type: ActivityType
    description: str
    occurred_at: datetime
    follow_up_date: date | None
    done: bool
    contact: Ref | None
    deal: Ref | None
    created_at: datetime
    updated_at: datetime


class Timeline(BaseModel):
    items: list[ActivityOut]
    total: int
