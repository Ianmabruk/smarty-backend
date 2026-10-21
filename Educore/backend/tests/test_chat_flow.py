import json
import os
import urllib.request

from app import create_app, db
from app.models import User


def _client(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    monkeypatch.setenv("JWT_SECRET_KEY", "test-jwt-secret")
    app = create_app()
    app.config.update(TESTING=True)
    with app.app_context():
        db.drop_all()
        db.create_all()
    return app.test_client(), app


def test_register_login_and_chat_round_trip(monkeypatch):
    client, app = _client(monkeypatch)

    with app.app_context():
        before = User.query.filter_by(email="newuser@example.com").first()
        assert before is None

    register = client.post(
        "/api/auth/register",
        json={"name": "New User", "email": "newuser@example.com", "password": "strongpass"},
    )
    assert register.status_code == 201, register.get_data(as_text=True)
    data = register.get_json()
    token = data["data"]["token"]
    assert token

    chat = client.post(
        "/api/chat",
        json={"title": "Study Chat"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert chat.status_code == 201, chat.get_data(as_text=True)
    conversation = chat.get_json()["data"]
    conversation_id = conversation["id"]

    def fake_generate(messages, system_prompt=None):
        return "This is a generated reply about studying."

    import app.ai_service
    monkeypatch.setattr(app.ai_service, "generate_chat_reply", fake_generate)

    reply = client.post(
        f"/api/chat/{conversation_id}/message",
        json={"content": "Explain photosynthesis in simple terms."},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert reply.status_code == 201, reply.get_data(as_text=True)
    payload = reply.get_json()
    assert payload["data"]["assistant_message"]["content"] == "This is a generated reply about studying."

    list_resp = client.get("/api/chat", headers={"Authorization": f"Bearer {token}"})
    assert list_resp.status_code == 200
    items = list_resp.get_json()["data"]
    assert any(item["id"] == conversation_id for item in items)


def test_generate_chat_reply_uses_gemini_api_contract(monkeypatch):
    monkeypatch.setenv("AI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("AI_API_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
    monkeypatch.setenv("AI_MODEL", "gemini-2.5-flash")

    seen = {}

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def read(self):
            return json.dumps({
                "candidates": [{
                    "content": {"parts": [{"text": "Gemini says hi"}]}
                }]
            }).encode("utf-8")

    def fake_urlopen(req, timeout=45):
        seen["url"] = req.full_url
        seen["headers"] = dict(req.header_items())
        seen["method"] = req.get_method()
        seen["data"] = json.loads(req.data.decode("utf-8"))
        return FakeResponse()

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)

    import app.ai_service as ai_service

    result = ai_service.generate_chat_reply([
        {"role": "user", "content": "Explain photosynthesis"},
    ], system_prompt="You are Smarty")

    assert result == "Gemini says hi"
    assert seen["method"] == "POST"
    assert "models/gemini-2.5-flash:generateContent" in seen["url"]
    assert any(key.lower() == "x-goog-api-key" and value == "test-gemini-key" for key, value in seen["headers"].items())
    assert seen["data"]["contents"][0]["parts"][0]["text"] == "You are Smarty\nUser: Explain photosynthesis"


def test_generate_chat_reply_uses_ollama_api_contract(monkeypatch):
    monkeypatch.delenv("AI_API_KEY", raising=False)
    monkeypatch.setenv("AI_API_BASE_URL", "http://127.0.0.1:11434")
    monkeypatch.setenv("AI_MODEL", "qwen2.5:7b")

    seen = {}

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def read(self):
            return json.dumps({
                "message": {"content": "Ollama says hi"}
            }).encode("utf-8")

    def fake_urlopen(req, timeout=45):
        seen["url"] = req.full_url
        seen["headers"] = dict(req.header_items())
        seen["method"] = req.get_method()
        seen["data"] = json.loads(req.data.decode("utf-8"))
        return FakeResponse()

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)

    import app.ai_service as ai_service

    result = ai_service.generate_chat_reply([
        {"role": "user", "content": "Explain photosynthesis"},
    ], system_prompt="You are Smarty")

    assert result == "Ollama says hi"
    assert seen["method"] == "POST"
    assert seen["url"].endswith("/api/chat")
    assert seen["data"]["model"] == "qwen2.5:7b"
    assert seen["data"]["messages"][0]["role"] == "system"
    assert seen["data"]["messages"][1]["role"] == "user"


def test_generate_image_returns_clear_error_for_non_image_model(monkeypatch):
    client, app = _client(monkeypatch)

    monkeypatch.setenv("AI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("AI_API_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
    monkeypatch.setenv("AI_MODEL", "gemini-2.5-flash")

    token = client.post(
        "/api/auth/register",
        json={"name": "Image User", "email": "image@example.com", "password": "strongpass"},
    ).get_json()["data"]["token"]

    response = client.post(
        "/api/ai/generate-image",
        json={"prompt": "A green classroom illustration"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400, response.get_data(as_text=True)
    payload = response.get_json()
    assert "image generation" in payload["error"].lower()
