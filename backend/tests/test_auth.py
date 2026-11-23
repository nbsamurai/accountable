"""Signing in (spec 3.10 and 9.4): every route needs a token, and local sign-in stays local."""

import re

from fastapi.routing import APIRoute, iter_route_contexts
from fastapi.testclient import TestClient

from backend.app.auth.local import LocalSignIn
from backend.app.auth.tokens import SupabaseSignIn
from backend.app.settings import Settings

from .conftest import ALEX, JORDAN, TEAMMATES, local_client

OPEN = {"/api/health", "/api/auth/config", "/api/auth/local"}
SUPABASE_URL = "https://project.supabase.example"
PUBLISHABLE_KEY = "test-publishable-key"
SUPABASE = Settings(
    database_url="postgresql://nobody@127.0.0.1:1/none",
    supabase_url=SUPABASE_URL,
    publishable_key=PUBLISHABLE_KEY,
)


def on_supabase(app) -> None:
    """Switches the app to Supabase sign-in, as it would start with the three settings."""
    app.state.settings = SUPABASE
    app.state.sign_in = SupabaseSignIn(
        SUPABASE_URL, PUBLISHABLE_KEY, fetch=lambda: {"keys": []}
    )


def every_route(app) -> list[tuple[str, str, str]]:
    """Each method and path in the app, with every id in the path set to 1."""
    return [
        (method, re.sub(r"\{[^}]+\}", "1", route.path or ""), route.path or "")
        for route in iter_route_contexts(app.routes)
        if isinstance(route.original_route, APIRoute)
        for method in sorted((route.methods or set()) - {"HEAD"})
    ]


def test_every_route_but_the_three_open_ones_answers_401_without_a_token(
    app, anonymous
):
    routes = every_route(app)
    assert len(routes) >= 25
    for headers in (
        {},
        {"Authorization": "Bearer not-a-token"},
        {"Authorization": "x"},
    ):
        for method, path, template in routes:
            response = anonymous.request(method, path, headers=headers)
            if template in OPEN:
                assert response.status_code != 401, (method, path)
            else:
                assert response.status_code == 401, (method, path, headers)


def test_auth_config_on_a_local_copy_lists_the_teammates(anonymous):
    assert anonymous.get("/api/auth/config").json() == {
        "mode": "local",
        "people": [{"id": t.id, "name": t.name, "email": t.email} for t in TEAMMATES],
    }


def test_auth_config_on_supabase_gives_the_url_and_publishable_key(app, anonymous):
    on_supabase(app)
    assert anonymous.get("/api/auth/config").json() == {
        "mode": "supabase",
        "supabase_url": "https://project.supabase.example",
        "publishable_key": "test-publishable-key",
    }


def test_local_sign_in_gives_a_teammate_a_token(anonymous):
    response = anonymous.post("/api/auth/local", json={"person_id": JORDAN.id})
    assert response.status_code == 200
    token = response.json()["access_token"]
    me = anonymous.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json() == {
        "id": JORDAN.id,
        "email": "jordan.blake@team.example",
        "name": "Jordan Blake",
    }


def test_local_sign_in_refuses_anyone_but_a_teammate(anonymous):
    response = anonymous.post("/api/auth/local", json={"person_id": "someone-else"})
    assert response.status_code == 422


def test_local_sign_in_answers_404_on_supabase(app, anonymous):
    on_supabase(app)
    response = anonymous.post("/api/auth/local", json={"person_id": ALEX.id})
    assert response.status_code == 404


def test_local_sign_in_and_local_tokens_work_only_on_a_connection_to_127_0_0_1(
    app, client
):
    # localhost here stands for any address but 127.0.0.1, whatever the Host header says.
    elsewhere = TestClient(app, base_url="http://localhost")
    response = elsewhere.post(
        "/api/auth/local",
        json={"person_id": ALEX.id},
        headers={"Host": "127.0.0.1"},
    )
    assert response.status_code == 403

    token = client.headers["Authorization"]
    response = elsewhere.get(
        "/api/me", headers={"Authorization": token, "Host": "127.0.0.1"}
    )
    assert response.status_code == 401


def test_a_local_token_is_refused_on_supabase_and_after_a_restart(app, client):
    assert client.get("/api/me").status_code == 200

    app.state.sign_in = LocalSignIn()  # a restart makes a new signing key
    assert client.get("/api/me").status_code == 401

    fresh = local_client(app)
    on_supabase(app)
    assert fresh.get("/api/me").status_code == 401


def test_me_gives_the_signed_in_person(client):
    assert client.get("/api/me").json() == {
        "id": ALEX.id,
        "email": "alex.rivera@team.example",
        "name": "Alex Rivera",
    }


def test_a_person_named_in_the_request_is_ignored(client):
    response = client.get(
        f"/api/me?person_id={JORDAN.id}&sub={JORDAN.id}",
        headers={"X-Person-Id": JORDAN.id, "X-User-Id": JORDAN.id},
    )
    assert response.json()["id"] == ALEX.id
