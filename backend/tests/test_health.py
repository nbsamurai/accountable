def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_allows_the_loopback_ip_with_a_port(client):
    response = client.get("/api/health", headers={"Host": "127.0.0.1:8000"})
    assert response.status_code == 200


def test_api_rejects_unrecognized_hosts(client):
    response = client.get("/api/contacts", headers={"Host": "untrusted.example"})
    assert response.status_code == 400
