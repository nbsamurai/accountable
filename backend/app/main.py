"""The Accountable API: each area's routes under /api, and the built frontend when there is one.

Run it with `uvicorn --factory backend.app.main:create_app`.
"""

import os
import sys
from pathlib import Path

from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from .activities.routes import router as activities_router
from .auth.local import LocalSignIn
from .auth.routes import open_router as auth_open_router
from .auth.routes import router as auth_router
from .auth.tokens import SupabaseSignIn
from .contacts.routes import router as contacts_router
from .dashboard.routes import router as dashboard_router
from .db import database_path, init_db, make_engine, sqlite_url
from .deals.routes import router as deals_router
from .deps import get_person
from .frontend import DIST, mount_frontend
from .organizations.routes import router as organizations_router
from .pipeline.routes import router as pipeline_router
from .search.routes import router as search_router
from .seed import sample_data
from .settings import Settings, SettingsError, read_settings

api = APIRouter(prefix="/api")


@api.get("/health")
def health() -> dict:
    """Says the server is up, and nothing else. Open to everyone."""
    return {"status": "ok"}


# Open to everyone: how to sign in, and local sign-in. They hold no records.
api.include_router(auth_open_router)

# Every other route needs a valid token (spec 9.4).
for router in (
    auth_router,
    organizations_router,
    contacts_router,
    deals_router,
    activities_router,
    pipeline_router,
    dashboard_router,
    search_router,
):
    api.include_router(router, dependencies=[Depends(get_person)])


def allowed_hosts() -> list[str]:
    """This computer, and on Render, the service's own address."""
    hosts = ["127.0.0.1", "localhost"]
    render_host = os.environ.get("RENDER_EXTERNAL_HOSTNAME", "").strip()
    return [*hosts, render_host] if render_host else hosts


def create_app(
    path: Path | None = None,
    *,
    settings: Settings | None = None,
    sample_data_on_start: bool = True,
    frontend: Path = DIST,
) -> FastAPI:
    """The app, on Supabase with all three settings, or as a local copy with none.

    A local copy uses the SQLite file at `path`, or the one `database_path()` names.
    Tests pass a `path`, so they use SQLite whatever the settings say. The migrations run
    first, then the sample data loads when the tables are empty, unless
    `sample_data_on_start` is False. A partial set of settings stops the backend.
    The built frontend in `frontend` is served when it exists.
    """
    if settings is None:
        try:
            settings = read_settings()
        except SettingsError as error:
            sys.exit(str(error))
    if path is None and settings.database_url:
        url = settings.database_url
    else:
        url = sqlite_url(path or database_path())
    engine = make_engine(url)
    init_db(engine, sample_data.load if sample_data_on_start else None)

    app = FastAPI(title="Accountable", docs_url=None, redoc_url=None, openapi_url=None)
    app.add_middleware(
        TrustedHostMiddleware, allowed_hosts=allowed_hosts(), www_redirect=False
    )
    app.state.engine = engine
    app.state.settings = settings
    app.state.sign_in = (
        SupabaseSignIn(settings.supabase_url, settings.publishable_key)
        if settings.supabase_url and settings.publishable_key
        else LocalSignIn()
    )
    app.include_router(api)
    mount_frontend(app, frontend)
    return app
