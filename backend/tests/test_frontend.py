"""The built frontend, served by the backend as on Render (spec 9.9)."""

import shutil

import pytest
from fastapi.testclient import TestClient

from backend.app.main import create_app

from .conftest import LOCAL

PAGE = "<!doctype html><title>Accountable</title>"
HTML = {"Accept": "text/html"}


@pytest.fixture
def built(tmp_path, migrated_db) -> TestClient:
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text(PAGE)
    (dist / "assets" / "app.js").write_text("console.log('app')")
    path = tmp_path / "test.db"
    shutil.copy(migrated_db, path)
    app = create_app(path, settings=LOCAL, sample_data_on_start=False, frontend=dist)
    return TestClient(app, base_url="http://127.0.0.1")


def test_a_file_loads_as_itself_and_any_other_address_gets_the_apps_page(built):
    script = built.get("/assets/app.js")
    assert script.status_code == 200
    assert script.text == "console.log('app')"
    for path in ("/", "/contacts/12", "/pipeline"):
        page = built.get(path, headers=HTML)
        assert page.status_code == 200, path
        assert page.text == PAGE


def test_an_unknown_api_address_still_answers_404_in_json(built):
    for headers in ({}, HTML):
        response = built.get("/api/nothing-here", headers=headers)
        assert response.status_code == 404
        assert response.json() == {"detail": "Not Found"}
    assert built.get("/api/contacts").status_code == 401
    assert built.get("/api/health").json() == {"status": "ok"}


def test_without_a_built_frontend_nothing_is_served_outside_api(anonymous):
    assert anonymous.get("/", headers=HTML).status_code == 404
    assert anonymous.get("/contacts/12", headers=HTML).status_code == 404
