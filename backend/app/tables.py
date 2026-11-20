"""All four tables, their foreign keys (spec 3.7) and their indexes.

Dates without a time (close and follow-up dates) are stored as YYYY-MM-DD.
Timestamps are stored in UTC and read back with their time zone, so the API
always sends them with a "Z" and the browser shows them in local time.
"""

from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    TypeDecorator,
)

NAME_LENGTH = 200


class UtcDateTime(TypeDecorator):
    """A timestamp stored as UTC with no time zone, and read back as UTC."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("Timestamps must have a time zone")
        return value.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, value: datetime | None, dialect):
        if value is None:
            return None
        return value.replace(tzinfo=UTC)


metadata = MetaData()


def _stamps() -> list[Column]:
    return [
        Column("created_at", UtcDateTime, nullable=False),
        Column("updated_at", UtcDateTime, nullable=False),
    ]


organizations = Table(
    "organizations",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(NAME_LENGTH), nullable=False),
    Column("website", String),
    Column("industry", String),
    Column("notes", Text),
    *_stamps(),
    Index("ix_organizations_name", "name"),
    Index("ix_organizations_industry", "industry"),
    Index("ix_organizations_website", "website"),
)

contacts = Table(
    "contacts",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(NAME_LENGTH), nullable=False),
    Column("email", String),
    Column("phone", String),
    Column("job_title", String),
    Column("organization_id", Integer, ForeignKey("organizations.id", ondelete="SET NULL")),
    Column("status", String, nullable=False, server_default="lead"),
    *_stamps(),
    CheckConstraint("status IN ('lead', 'qualified', 'customer')", name="ck_contacts_status"),
    Index("ix_contacts_organization_id", "organization_id"),
    Index("ix_contacts_name", "name"),
    Index("ix_contacts_email", "email"),
    Index("ix_contacts_phone", "phone"),
    Index("ix_contacts_job_title", "job_title"),
    Index("ix_contacts_status", "status"),
)

deals = Table(
    "deals",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(NAME_LENGTH), nullable=False),
    Column("organization_id", Integer, ForeignKey("organizations.id", ondelete="SET NULL")),
    Column("contact_id", Integer, ForeignKey("contacts.id", ondelete="SET NULL")),
    Column("stage", String, nullable=False, server_default="new"),
    Column("value", Integer),
    Column("probability", Integer, nullable=False),
    Column("close_date", Date),
    Column("board_position", Float, nullable=False),
    *_stamps(),
    CheckConstraint(
        "stage IN ('new', 'qualified', 'proposal', 'negotiation', 'won', 'lost')",
        name="ck_deals_stage",
    ),
    CheckConstraint("value IS NULL OR value >= 0", name="ck_deals_value"),
    CheckConstraint("probability BETWEEN 0 AND 100", name="ck_deals_probability"),
    Index("ix_deals_organization_id", "organization_id"),
    Index("ix_deals_contact_id", "contact_id"),
    Index("ix_deals_name", "name"),
    Index("ix_deals_stage_position", "stage", "board_position"),
    Index("ix_deals_value", "value"),
    Index("ix_deals_probability", "probability"),
    Index("ix_deals_close_date", "close_date"),
)

activities = Table(
    "activities",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("type", String, nullable=False),
    Column("contact_id", Integer, ForeignKey("contacts.id", ondelete="CASCADE")),
    Column("deal_id", Integer, ForeignKey("deals.id", ondelete="CASCADE")),
    Column("description", Text, nullable=False),
    Column("occurred_at", UtcDateTime, nullable=False),
    Column("follow_up_date", Date),
    Column("done", Boolean, nullable=False, server_default="0"),
    *_stamps(),
    CheckConstraint("type IN ('note', 'call', 'email', 'stage_change')", name="ck_activities_type"),
    CheckConstraint("(contact_id IS NULL) <> (deal_id IS NULL)", name="ck_activities_one_record"),
    Index("ix_activities_contact_id", "contact_id", "occurred_at"),
    Index("ix_activities_deal_id", "deal_id", "occurred_at"),
    Index("ix_activities_occurred_at", "occurred_at"),
    Index("ix_activities_follow_up", "done", "follow_up_date"),
)
