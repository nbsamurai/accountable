"""People, who added and last changed each record, and row-level security on Postgres.

- `people`: everyone who has signed in, and the sample data's made-up teammates.
- `created_by` and `updated_by` on the four record tables, linked to `people.id`. Rows
  from before this change keep them empty, as no one is recorded (spec 3.11).
- On Postgres, row-level security on every table, with no policies, so Supabase's Data
  API serves none of their rows (spec 9.5). The backend owns the tables, so it isn't limited.

SQLite can't add a foreign key to a table, so batch mode rebuilds each record table there.
The app turns SQLite's foreign keys off while it does (backend/app/db.py).

Revision ID: 0002
Revises: 0001
"""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

RECORDS = ("organizations", "contacts", "deals", "activities")
AUTHORS = ("created_by", "updated_by")
ALL_TABLES = ("people", *RECORDS, "alembic_version")


def _on_postgres() -> bool:
    return op.get_context().dialect.name == "postgresql"


def upgrade() -> None:
    op.create_table(
        "people",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("email", sa.String, nullable=False),
        sa.Column("name", sa.String),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    for table in RECORDS:
        with op.batch_alter_table(table) as batch:
            for column in AUTHORS:
                batch.add_column(sa.Column(column, sa.String))
                batch.create_foreign_key(
                    f"fk_{table}_{column}_people", "people", [column], ["id"]
                )
    if _on_postgres():
        for table in ALL_TABLES:
            op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    if _on_postgres():
        for table in ALL_TABLES:
            op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
    for table in RECORDS:
        with op.batch_alter_table(table) as batch:
            for column in AUTHORS:
                batch.drop_constraint(f"fk_{table}_{column}_people", type_="foreignkey")
                batch.drop_column(column)
    op.drop_table("people")
