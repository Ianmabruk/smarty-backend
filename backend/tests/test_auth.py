"""Authentication contract tests.

These cover the exact request/response contract that the Netlify frontend
relies on: `POST /api/auth/register` and `POST /api/auth/login` returning
`{ "data": { "token": ..., "user": ... } }`.
"""

import hashlib
import os

import pytest
from sqlalchemy.exc import OperationalError

from app import db
from app.models import User


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------


def test_register_success_returns_token_and_user(client):
    response = client.post(
        "/api/auth/register",
        json={"name": "Grace Hopper", "email": "grace@example.com", "password": "compiler123"},
    )

    assert response.status_code == 201
    body = response.get_json()
    assert body["success"] is True
    assert body["data"]["token"]
    assert body["data"]["user"]["email"] == "grace@example.com"
    assert body["data"]["user"]["name"] == "Grace Hopper"
    assert "password" not in body["data"]["user"]
    assert "password_hash" not in body["data"]["user"]


def test_register_persists_the_user(client, app):
    client.post(
        "/api/auth/register",
        json={"name": "Alan Turing", "email": "alan@example.com", "password": "enigma123"},
    )

    with app.app_context():
        user = User.query.filter_by(email="alan@example.com").first()
        assert user is not None
        assert user.name == "Alan Turing"
        assert user.role == "student"
        assert user.password_hash
        assert user.password_hash != "enigma123"


def test_register_rejects_duplicate_email(client):
    payload = {"name": "First", "email": "dup@example.com", "password": "first-pass"}
    assert client.post("/api/auth/register", json=payload).status_code == 201

    response = client.post(
        "/api/auth/register",
        json={"name": "Second", "email": "dup@example.com", "password": "second-pass"},
    )

    assert response.status_code == 409
    assert response.get_json()["success"] is False


def test_register_rejects_invalid_email(client):
    response = client.post(
        "/api/auth/register",
        json={"name": "Bad", "email": "not-an-email", "password": "somepass"},
    )

    assert response.status_code == 400
    assert response.get_json()["success"] is False


def test_register_rejects_missing_fields(client):
    response = client.post("/api/auth/register", json={"email": "partial@example.com"})

    assert response.status_code == 400
    body = response.get_json()
    assert body["success"] is False
    assert "name" in body["error"]
    assert "password" in body["error"]


def test_register_rejects_short_password(client):
    response = client.post(
        "/api/auth/register",
        json={"name": "Short", "email": "short@example.com", "password": "abc"},
    )

    assert response.status_code == 400


def test_register_rejects_empty_body(client):
    response = client.post("/api/auth/register", json={})

    assert response.status_code == 400
    assert response.get_json()["success"] is False


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


def test_login_success_returns_token_and_user(client, registered_user):
    response = client.post(
        "/api/auth/login",
        json={"email": registered_user["email"], "password": registered_user["password"]},
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["success"] is True
    assert body["data"]["token"]
    assert body["data"]["user"]["email"] == registered_user["email"]


def test_login_rejects_wrong_password(client, registered_user):
    response = client.post(
        "/api/auth/login",
        json={"email": registered_user["email"], "password": "wrong-password"},
    )

    assert response.status_code == 401
    body = response.get_json()
    assert body["success"] is False
    assert body["error"] == "Invalid email or password"


def test_login_rejects_unknown_email(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "whatever"},
    )

    assert response.status_code == 401
    # The error must not reveal whether the account exists.
    assert response.get_json()["error"] == "Invalid email or password"


def test_login_rejects_missing_fields(client):
    response = client.post("/api/auth/login", json={"email": "someone@example.com"})

    assert response.status_code == 400


def test_login_accepts_legacy_password_hashes(client, app):
    """Accounts created with the old salted-SHA256 hash must still sign in."""
    legacy = hashlib.sha256(
        ("legacy-pass" + os.environ.get("SECRET_KEY", "dev-secret-key")).encode()
    ).hexdigest()

    with app.app_context():
        db.session.add(
            User(name="Legacy", email="legacy@example.com", password_hash=legacy, role="student")
        )
        db.session.commit()

    response = client.post(
        "/api/auth/login",
        json={"email": "legacy@example.com", "password": "legacy-pass"},
    )
    assert response.status_code == 200

    # The stored hash is upgraded to a modern KDF on the next successful login.
    with app.app_context():
        user = User.query.filter_by(email="legacy@example.com").first()
        assert user.password_hash.startswith("scrypt:")


def test_login_upgrades_legacy_hash(client, app):
    legacy = hashlib.sha256(
        ("legacy-pass" + os.environ.get("SECRET_KEY", "dev-secret-key")).encode()
    ).hexdigest()

    with app.app_context():
        db.session.add(
            User(name="Legacy", email="legacy2@example.com", password_hash=legacy, role="student")
        )
        db.session.commit()

    assert (
        client.post(
            "/api/auth/login",
            json={"email": "legacy2@example.com", "password": "legacy-pass"},
        ).status_code
        == 200
    )

    with app.app_context():
        user = User.query.filter_by(email="legacy2@example.com").first()
        assert user.password_hash.startswith("scrypt:")


# ---------------------------------------------------------------------------
# Tokens and protected routes
# ---------------------------------------------------------------------------


def test_token_is_a_signed_jwt_with_an_expiry(client, registered_user):
    import jwt as pyjwt

    payload = pyjwt.decode(
        registered_user["token"],
        os.environ["JWT_SECRET_KEY"],
        algorithms=["HS256"],
        options={"verify_exp": False},
    )
    assert payload["sub"]
    assert payload["exp"] > payload["iat"]


def test_protected_route_requires_a_token(client):
    response = client.get("/api/users/me")

    assert response.status_code == 401
    assert response.get_json()["success"] is False


def test_protected_route_accepts_a_valid_token(client, registered_user):
    response = client.get(
        "/api/users/me", headers={"Authorization": f"Bearer {registered_user['token']}"}
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["data"]["email"] == registered_user["email"]


def test_protected_route_rejects_a_tampered_token(client, registered_user):
    tampered = registered_user["token"][:-4] + "aaaa"
    response = client.get("/api/users/me", headers={"Authorization": f"Bearer {tampered}"})

    assert response.status_code == 401


def test_protected_route_rejects_a_token_signed_with_another_secret(client, registered_user):
    import jwt as pyjwt

    forged = pyjwt.encode(
        {"sub": 1, "exp": 9999999999}, "not-the-real-secret", algorithm="HS256"
    )
    response = client.get("/api/users/me", headers={"Authorization": f"Bearer {forged}"})

    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Failure handling
# ---------------------------------------------------------------------------


def test_database_failure_returns_a_json_503(client, app, monkeypatch):
    def explode(*args, **kwargs):
        raise OperationalError("SELECT 1", {}, Exception("database is gone"))

    monkeypatch.setattr(db.session, "commit", explode)

    response = client.post(
        "/api/auth/register",
        json={"name": "Broken", "email": "broken@example.com", "password": "whatever"},
    )

    assert response.status_code == 503
    body = response.get_json()
    assert body["success"] is False
    assert "database" in body["error"].lower()


def test_unknown_route_returns_json(client):
    response = client.get("/api/does-not-exist")

    assert response.status_code == 404
    assert response.is_json
    assert response.get_json()["success"] is False


def test_wrong_method_returns_json(client):
    response = client.get("/api/auth/login")

    assert response.status_code == 405
    assert response.is_json


@pytest.mark.parametrize("path", ["/api/auth/register", "/api/auth/login"])
def test_auth_endpoints_only_accept_post(client, path):
    response = client.put(path, json={})

    assert response.status_code == 405
