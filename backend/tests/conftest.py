"""Each test gets a fresh database file with foreign keys on, a fixed today and an API client."""

from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from backend.app.deps import get_now, get_today
from backend.app.main import create_app

TODAY = date(2026, 11, 19)
START = datetime(2026, 11, 19, 15, 0, tzinfo=UTC)


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


@pytest.fixture
def app(tmp_path, clock):
    app = create_app(tmp_path / "test.db", sample_data_on_start=False)
    app.dependency_overrides[get_today] = lambda: TODAY
    app.dependency_overrides[get_now] = clock
    return app


@pytest.fixture
def engine(app):
    return app.state.engine


def local_client(app) -> TestClient:
    return TestClient(app, base_url="http://localhost")


@pytest.fixture
def client(app) -> TestClient:
    return local_client(app)


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
