"""CORS behaviour tests.

The frontend is served from a different origin than the API, so a missing or
misconfigured CORS rule makes a healthy API look broken in the browser.
"""

ALLOWED_ORIGIN = "http://localhost:5173"
DENIED_ORIGIN = "https://not-allowed.example.com"


def test_health_endpoint_is_reachable_without_cors(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"


def test_api_health_endpoint_exists(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"


def test_allowed_origin_receives_the_cors_header(client):
    response = client.get("/api/health", headers={"Origin": ALLOWED_ORIGIN})

    assert response.headers.get("Access-Control-Allow-Origin") == ALLOWED_ORIGIN


def test_unknown_origin_does_not_receive_the_cors_header(client):
    response = client.get("/api/health", headers={"Origin": DENIED_ORIGIN})

    assert "Access-Control-Allow-Origin" not in response.headers


def test_wildcard_origin_is_never_used_with_credentials(client):
    response = client.get("/api/health", headers={"Origin": DENIED_ORIGIN})

    assert response.headers.get("Access-Control-Allow-Origin") != "*"


def test_options_preflight_for_registration(client):
    response = client.options(
        "/api/auth/register",
        headers={
            "Origin": ALLOWED_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,authorization",
        },
    )

    assert response.status_code in (200, 204)
    assert response.headers.get("Access-Control-Allow-Origin") == ALLOWED_ORIGIN
    allowed_methods = response.headers.get("Access-Control-Allow-Methods", "")
    for method in ("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"):
        assert method in allowed_methods
    allowed_headers = response.headers.get("Access-Control-Allow-Headers", "").lower()
    assert "content-type" in allowed_headers
    assert "authorization" in allowed_headers


def test_options_preflight_for_login(client):
    response = client.options(
        "/api/auth/login",
        headers={
            "Origin": ALLOWED_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code in (200, 204)
    assert response.headers.get("Access-Control-Allow-Origin") == ALLOWED_ORIGIN


def test_error_responses_carry_the_cors_header(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "nope"},
        headers={"Origin": ALLOWED_ORIGIN},
    )

    assert response.status_code == 401
    assert response.headers.get("Access-Control-Allow-Origin") == ALLOWED_ORIGIN


def test_not_found_responses_carry_the_cors_header(client):
    response = client.get("/api/nope", headers={"Origin": ALLOWED_ORIGIN})

    assert response.status_code == 404
    assert response.headers.get("Access-Control-Allow-Origin") == ALLOWED_ORIGIN


def test_wildcard_netlify_origin_pattern_matches_real_sites():
    from app.cors_config import build_cors_origins, parse_origin_entry

    pattern = parse_origin_entry("https://*.netlify.app")
    assert pattern.match("https://smarty-educore.netlify.app")
    assert pattern.match("https://deploy-preview--smarty.netlify.app")
    assert not pattern.match("https://smarty.example.com")
    assert not pattern.match("http://smarty-educore.netlify.app")


def test_build_cors_origins_prefers_the_explicit_configuration():
    from app.cors_config import build_cors_origins

    origins = build_cors_origins("https://one.example.com, https://*.netlify.app")
    described = [getattr(origin, "pattern", origin) for origin in origins]

    assert "https://one.example.com" in described
    assert any("netlify" in str(item) for item in described)


def test_build_cors_origins_falls_back_to_dev_and_netlify():
    from app.cors_config import build_cors_origins

    origins = build_cors_origins("")
    described = [getattr(origin, "pattern", origin) for origin in origins]

    assert "http://localhost:5173" in described
    assert any("netlify" in str(item) for item in described)


def test_the_request_id_is_echoed_back(client):
    response = client.get("/api/health", headers={"X-Request-ID": "correlation-123"})

    assert response.headers.get("X-Request-ID") == "correlation-123"


def test_the_request_id_header_is_allowed_by_the_preflight(client):
    response = client.options(
        "/api/auth/login",
        headers={
            "Origin": ALLOWED_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-request-id",
        },
    )

    allowed_headers = response.headers.get("Access-Control-Allow-Headers", "").lower()
    assert "x-request-id" in allowed_headers
