"""Rate limiting for the authentication endpoints."""

from app.rate_limit import FixedWindowRateLimiter


def test_failed_logins_are_throttled(client, app):
    limiter = app.extensions["educore_login_limiter"]
    limiter.limit = 3
    limiter.reset("127.0.0.1")

    for _ in range(3):
        response = client.post(
            "/api/auth/login",
            json={"email": "nobody@example.com", "password": "wrong"},
        )
        assert response.status_code == 401

    throttled = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "wrong"},
    )
    assert throttled.status_code == 429
    assert throttled.get_json()["success"] is False
    assert throttled.get_json()["retryAfter"] > 0


def test_a_successful_login_resets_the_counter(client, app, registered_user):
    limiter = app.extensions["educore_login_limiter"]
    limiter.limit = 3
    limiter.reset("127.0.0.1")

    for _ in range(2):
        client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "wrong"})

    success = client.post(
        "/api/auth/login",
        json={"email": registered_user["email"], "password": registered_user["password"]},
    )
    assert success.status_code == 200

    # The counter was reset, so two more failures are still allowed.
    for _ in range(2):
        response = client.post(
            "/api/auth/login", json={"email": "nobody@example.com", "password": "wrong"}
        )
        assert response.status_code == 401


def test_registration_attempts_are_throttled(client, app):
    limiter = app.extensions["educore_register_limiter"]
    limiter.limit = 2
    limiter.reset("127.0.0.1")

    for index in range(2):
        response = client.post(
            "/api/auth/register",
            json={
                "name": f"User {index}",
                "email": f"user{index}@example.com",
                "password": "password123",
            },
        )
        assert response.status_code == 201

    throttled = client.post(
        "/api/auth/register",
        json={"name": "User 3", "email": "user3@example.com", "password": "password123"},
    )
    assert throttled.status_code == 429


def test_limiter_peek_does_not_record_a_hit():
    limiter = FixedWindowRateLimiter(limit=2, window_seconds=60)

    assert limiter.peek("key") == (True, 0)
    assert limiter.peek("key") == (True, 0)

    limiter.record("key")
    limiter.record("key")

    allowed, retry_after = limiter.peek("key")
    assert allowed is False
    assert retry_after > 0


def test_disabled_limiter_never_blocks():
    limiter = FixedWindowRateLimiter(limit=0, window_seconds=60)

    for _ in range(100):
        assert limiter.peek("key") == (True, 0)
