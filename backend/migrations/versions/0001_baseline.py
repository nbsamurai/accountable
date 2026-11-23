"""The schema as it was before people: four tables, their foreign keys and indexes.

A local database from before migrations has these tables already, so the app stamps it
at this revision without running it (backend/app/db.py). The tables are written out here,
not imported, so later changes to tables.py don't change what this revision makes.
Only `done`'s default differs from those older files: `false`, which Postgres accepts too.

Revision ID: 0001
Revises:
"""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

NAME_LENGTH = 200


def _stamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(NAME_LENGTH), nullable=False),
        sa.Column("website", sa.String),
        sa.Column("industry", sa.String),
        sa.Column("notes", sa.Text),
        *_stamps(),
    )
    op.create_index("ix_organizations_name", "organizations", ["name"])
    op.create_index("ix_organizations_industry", "organizations", ["industry"])
    op.create_index("ix_organizations_website", "organizations", ["website"])

    op.create_table(
        "contacts",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(NAME_LENGTH), nullable=False),
        sa.Column("email", sa.String),
        sa.Column("phone", sa.String),
        sa.Column("job_title", sa.String),
        sa.Column(
            "organization_id",
            sa.Integer,
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
        ),
        sa.Column("status", sa.String, nullable=False, server_default="lead"),
        *_stamps(),
        sa.CheckConstraint(
            "status IN ('lead', 'qualified', 'customer')", name="ck_contacts_status"
        ),
    )
    for column in ("organization_id", "name", "email", "phone", "job_title", "status"):
        op.create_index(f"ix_contacts_{column}", "contacts", [column])

    op.create_table(
        "deals",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(NAME_LENGTH), nullable=False),
        sa.Column(
            "organization_id",
            sa.Integer,
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "contact_id", sa.Integer, sa.ForeignKey("contacts.id", ondelete="SET NULL")
        ),
        sa.Column("stage", sa.String, nullable=False, server_default="new"),
        sa.Column("value", sa.Integer),
        sa.Column("probability", sa.Integer, nullable=False),
        sa.Column("close_date", sa.Date),
        sa.Column("board_position", sa.Float, nullable=False),
        *_stamps(),
        sa.CheckConstraint(
            "stage IN ('new', 'qualified', 'proposal', 'negotiation', 'won', 'lost')",
            name="ck_deals_stage",
        ),
        sa.CheckConstraint("value IS NULL OR value >= 0", name="ck_deals_value"),
        sa.CheckConstraint(
            "probability BETWEEN 0 AND 100", name="ck_deals_probability"
        ),
    )
    op.create_index("ix_deals_organization_id", "deals", ["organization_id"])
    op.create_index("ix_deals_contact_id", "deals", ["contact_id"])
    op.create_index("ix_deals_name", "deals", ["name"])
    op.create_index("ix_deals_stage_position", "deals", ["stage", "board_position"])
    op.create_index("ix_deals_value", "deals", ["value"])
    op.create_index("ix_deals_probability", "deals", ["probability"])
    op.create_index("ix_deals_close_date", "deals", ["close_date"])

    op.create_table(
        "activities",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("type", sa.String, nullable=False),
        sa.Column(
            "contact_id", sa.Integer, sa.ForeignKey("contacts.id", ondelete="CASCADE")
        ),
        sa.Column("deal_id", sa.Integer, sa.ForeignKey("deals.id", ondelete="CASCADE")),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("occurred_at", sa.DateTime, nullable=False),
        sa.Column("follow_up_date", sa.Date),
        sa.Column("done", sa.Boolean, nullable=False, server_default=sa.false()),
        *_stamps(),
        sa.CheckConstraint(
            "type IN ('note', 'call', 'email', 'stage_change')",
            name="ck_activities_type",
        ),
        sa.CheckConstraint(
            "(contact_id IS NULL) <> (deal_id IS NULL)",
            name="ck_activities_one_record",
        ),
    )
    op.create_index(
        "ix_activities_contact_id", "activities", ["contact_id", "occurred_at"]
    )
    op.create_index("ix_activities_deal_id", "activities", ["deal_id", "occurred_at"])
    op.create_index("ix_activities_occurred_at", "activities", ["occurred_at"])
    op.create_index("ix_activities_follow_up", "activities", ["done", "follow_up_date"])


def downgrade() -> None:
    for table in ("activities", "deals", "contacts", "organizations"):
        op.drop_table(table)
