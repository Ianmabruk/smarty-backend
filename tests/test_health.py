"""Health endpoint and AI isolation tests.

Authentication must keep working when Ollama is unavailable. The health
endpoint must never depend on model inference.
"""

import pytest


def test_health_does_not_require_the_database(client):
    response = client.get("/health")

    assert response.status_code == 200
    body = response.get_json()
    assert body["status"] == "ok"
    assert body["service"] == "Educore API"


def test_health_does_not_leak_configuration(client):
    body = client.get("/health").get_json()

    assert set(body.keys()) == {"status", "service"}


def test_readiness_reports_the_database(client):
    response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.get_json()["database"] == "ok"


def test_readiness_reports_a_broken_database(client, monkeypatch):
    from sqlalchemy.exc import OperationalError

    from app import db

    def explode(*args, **kwargs):
        raise OperationalError("SELECT 1", {}, Exception("database is gone"))

    monkeypatch.setattr(db.session, "execute", explode)

    response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.get_json()["database"] == "unavailable"


def test_authentication_works_when_ollama_is_unavailable(client, app, monkeypatch):
    import app.ai_service as ai_service

    def explode(*args, **kwargs):
        raise RuntimeError("Ollama is not configured for this environment.")

    monkeypatch.setattr(ai_service, "generate_chat_reply", explode)

    registration = client.post(
        "/api/auth/register",
        json={"name": "No AI", "email": "noai@example.com", "password": "still-works"},
    )
    assert registration.status_code == 201

    login = client.post(
        "/api/auth/login",
        json={"email": "noai@example.com", "password": "still-works"},
    )
    assert login.status_code == 200

    # The health endpoint stays green while the AI provider is down.
    assert client.get("/health").status_code == 200


def test_chat_reports_the_ai_failure_separately(client, registered_user, monkeypatch):
    import app.ai_service as ai_service

    def explode(*args, **kwargs):
        raise RuntimeError("Ollama could not complete the request")

    monkeypatch.setattr(ai_service, "generate_chat_reply", explode)

    headers = {"Authorization": f"Bearer {registered_user['token']}"}
    conversation = client.post("/api/chat", json={"title": "Test"}, headers=headers)
    assert conversation.status_code == 201
    conversation_id = conversation.get_json()["data"]["id"]

    response = client.post(
        f"/api/chat/{conversation_id}/message",
        json={"content": "hello", "role": "user"},
        headers=headers,
    )

    assert response.status_code == 503
    assert response.get_json()["success"] is False


@pytest.mark.parametrize("path", ["/health", "/api/health"])
def test_health_endpoints_are_public(client, path):
    response = client.get(path)

    assert response.status_code == 200
