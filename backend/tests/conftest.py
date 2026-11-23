"""Each test gets its own database, a fixed today and an API client signed in as Alex Rivera.

- No test touches Supabase: the three settings are cleared, and every app runs as a local copy.
- The migrations run once per session. Each test gets a copy of that database file.
- Any test that takes more than a second fails, because CI runs on a slower machine.
"""

import os
import shutil
from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from backend.app.db import init_db, make_engine, sqlite_url
from backend.app.deps import get_now, get_today
from backend.app.main import create_app
from backend.app.seed.sample_data import TEAMMATES
from backend.app.settings import SUPABASE_SETTINGS, Settings

for name in SUPABASE_SETTINGS:
    os.environ.pop(name, None)

TODAY = date(2026, 11, 19)
START = datetime(2026, 11, 19, 15, 0, tzinfo=UTC)
ALEX, JORDAN, CASEY = TEAMMATES
LOCAL = Settings()
# Tests never serve a built frontend, unless they make one.
NO_FRONTEND = Path(__file__).parent / "no-frontend"
LIMIT_SECONDS = 1.0


@pytest.hookimpl(wrapper=True)
def pytest_runtest_makereport(item, call):
    """Fails any test whose setup or body takes more than a second."""
    report = yield
    too_slow = call.duration > LIMIT_SECONDS
    if report.when in ("setup", "call") and report.passed and too_slow:
        report.outcome = "failed"
        report.longrepr = (
            f"The {report.when} took {call.duration:.2f} s. A unit test must take "
            f"under {LIMIT_SECONDS:.0f} s."
        )
    return report


class Clock:
    """Now, one second later on every call, so entries made in a row keep their order."""

    def __init__(self) -> None:
        self.current = START

    def __call__(self) -> datetime:
        self.current += timedelta(seconds=1)
        return self.current


@pytest.fixture
def clock() -> Clock:
    return Clock()


@pytest.fixture(scope="session")
def migrated_db(tmp_path_factory) -> Path:
    """An empty database with the migrations run, made once for the whole session."""
    path = tmp_path_factory.mktemp("migrated") / "migrated.db"
    engine = make_engine(sqlite_url(path))
    init_db(engine)
    engine.dispose()
    return path


def local_app(path: Path, *, sample_data_on_start: bool = False):
    """An app on the database at `path`, as a local copy."""
    return create_app(
        path,
        settings=LOCAL,
        sample_data_on_start=sample_data_on_start,
        frontend=NO_FRONTEND,
    )


@pytest.fixture
def app(tmp_path, clock, migrated_db):
    path = tmp_path / "test.db"
    shutil.copy(migrated_db, path)
    app = local_app(path)
    app.dependency_overrides[get_today] = lambda: TODAY
    app.dependency_overrides[get_now] = clock
    return app


@pytest.fixture
def engine(app):
    return app.state.engine


def local_client(app, person_id: str = ALEX.id) -> TestClient:
    """A client on 127.0.0.1, signed in as a teammate through local sign-in."""
    client = TestClient(app, base_url="http://127.0.0.1")
    response = client.post("/api/auth/local", json={"person_id": person_id})
    assert response.status_code == 200, response.text
    client.headers["Authorization"] = f"Bearer {response.json()['access_token']}"
    return client


@pytest.fixture
def client(app) -> TestClient:
    return local_client(app)


@pytest.fixture
def anonymous(app) -> TestClient:
    """A client on 127.0.0.1 that hasn't signed in."""
    return TestClient(app, base_url="http://127.0.0.1")


class Api:
    """Short ways to add records through the API, failing loudly if the API refuses."""

    def __init__(self, client: TestClient) -> None:
        self.client = client

    def _post(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        response = self.client.post(path, json=body)
        assert response.status_code == 201, response.text
        return response.json()

    def org(self, name: str = "Northpeak Energy", **fields: Any) -> dict[str, Any]:
        return self._post("/api/organizations", {"name": name, **fields})

    def contact(self, name: str = "Jane Doe", **fields: Any) -> dict[str, Any]:
        return self._post("/api/contacts", {"name": name, **fields})

    def deal(self, name: str = "Website redesign", **fields: Any) -> dict[str, Any]:
        return self._post("/api/deals", {"name": name, **fields})["deal"]

    def activity(
        self, description: str = "Called about pricing", **fields: Any
    ) -> dict[str, Any]:
        return self._post(
            "/api/activities", {"type": "note", "description": description, **fields}
        )

    def get(self, path: str) -> dict[str, Any]:
        response = self.client.get(path)
        assert response.status_code == 200, response.text
        return response.json()

    def patch(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        response = self.client.patch(path, json=body)
        assert response.status_code == 200, response.text
        return response.json()

    def move(
        self, deal_id: int, stage: str, before_id: int | None = None
    ) -> dict[str, Any]:
        response = self.client.post(
            f"/api/deals/{deal_id}/move", json={"stage": stage, "before_id": before_id}
        )
        assert response.status_code == 200, response.text
        return response.json()


@pytest.fixture
def api(client) -> Api:
    return Api(client)


@pytest.fixture
def as_person(app) -> Callable[[str], Api]:
    """An API signed in as another teammate: `as_person(JORDAN.id)`."""
    return lambda person_id: Api(local_client(app, person_id))
