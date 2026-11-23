"""Runs the migrations, from code only (backend/app/db.py), on the connection it's given.

The app runs them when it starts, on the connection in `config.attributes["connection"]`,
inside that connection's transaction. Tests also write them as SQL for Postgres, offline.
"""

from alembic import context

from backend.app.tables import metadata

config = context.config

if context.is_offline_mode():
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=metadata,
        literal_binds=True,
    )
else:
    connection = config.attributes.get("connection")
    if connection is None:
        raise RuntimeError(
            "The migrations run when Accountable starts. Run npm run dev or npm start."
        )
    context.configure(
        connection=connection, target_metadata=metadata, render_as_batch=True
    )

with context.begin_transaction():
    context.run_migrations()
