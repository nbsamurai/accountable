def test_health_answers_without_a_token_and_says_only_that_the_server_is_up(anonymous):
    response = anonymous.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_allows_the_loopback_ip_with_a_port(anonymous):
    response = anonymous.get("/api/health", headers={"Host": "127.0.0.1:8000"})
    assert response.status_code == 200


def test_api_rejects_unrecognized_hosts(client):
    response = client.get("/api/contacts", headers={"Host": "untrusted.example"})
    assert response.status_code == 400


def test_on_render_the_services_own_address_is_allowed(monkeypatch, tmp_path):
    from fastapi.testclient import TestClient

    from .conftest import local_app

    monkeypatch.setenv("RENDER_EXTERNAL_HOSTNAME", "accountable.onrender.example")
    app = local_app(tmp_path / "render.db")
    client = TestClient(app, base_url="https://accountable.onrender.example")
    assert client.get("/api/health").status_code == 200


def test_fastapis_own_pages_are_off(anonymous):
    for path in ("/docs", "/redoc", "/openapi.json"):
        assert anonymous.get(path).status_code == 404
