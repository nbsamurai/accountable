"""The Accountable API: each area's routes under /api.

Run it with `uvicorn --factory backend.app.main:create_app`.
"""

from pathlib import Path

from fastapi import APIRouter, FastAPI

from .activities.routes import router as activities_router
from .contacts.routes import router as contacts_router
from .dashboard.routes import router as dashboard_router
from .db import database_path, init_db, make_engine
from .deals.routes import router as deals_router
from .organizations.routes import router as organizations_router
from .pipeline.routes import router as pipeline_router
from .seed import sample_data

api = APIRouter(prefix="/api")


@api.get("/health")
def health() -> dict:
    return {"status": "ok"}


for router in (organizations_router, contacts_router, deals_router, activities_router, pipeline_router, dashboard_router):
    api.include_router(router)


def create_app(path: Path | None = None, *, sample_data_on_start: bool = True) -> FastAPI:
    """The app, on the database at `path`, or the one `database_path()` names.

    A new database gets the tables, and the sample data unless `sample_data_on_start` is False.
    Errors use FastAPI's own shapes: 422 with the field and message, 404 and 409 with a message.
    """
    engine = make_engine(path or database_path())
    init_db(engine, sample_data.load if sample_data_on_start else None)
    app = FastAPI(title="Accountable")
    app.state.engine = engine
    app.include_router(api)
    return app
