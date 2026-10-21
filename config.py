import os

from dotenv import load_dotenv

load_dotenv()

DEV_SECRET_KEY = "dev-secret-key"
DEV_JWT_SECRET_KEY = "dev-jwt-secret"

# Origins that are only ever used by local development servers.
DEFAULT_DEV_ORIGINS = (
    "http://localhost:19006",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
)


def is_production_environment():
    return (
        (os.environ.get("FLASK_ENV") or "").lower() in {"production", "prod"}
        or (os.environ.get("APP_ENV") or "").lower() in {"production", "prod"}
        or bool(os.environ.get("RENDER"))
    )


def _env_bool(name, default=False):
    value = (os.environ.get(name) or "").strip().lower()
    if not value:
        return default
    return value in {"1", "true", "yes", "on"}


def _env_int(name, default):
    raw = (os.environ.get(name) or "").strip()
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


def resolve_database_url(raw_url=None):
    """Return the SQLAlchemy database URI, or fail loudly in production.

    In production a missing DATABASE_URL is fatal on purpose: silently
    falling back to a local SQLite file would start a service that loses
    every user record on the next deploy.
    """
    url = (raw_url if raw_url is not None else os.environ.get("DATABASE_URL") or "").strip()

    if url:
        if url.startswith("sqlite://") and not url.startswith("sqlite:////"):
            relative_path = url.replace("sqlite:///", "", 1)
            if not os.path.isabs(relative_path):
                base_dir = os.path.abspath(os.path.dirname(__file__))
                resolved = os.path.join(base_dir, relative_path)
                os.makedirs(os.path.dirname(resolved), exist_ok=True)
                return f"sqlite:///{resolved}"
        return url

    if is_production_environment():
        raise RuntimeError(
            "DATABASE_URL is not configured. The API cannot start without a database. "
            "Set DATABASE_URL in the Render dashboard to the connection string of the "
            "existing database (for example postgres://user:password@host:5432/dbname)."
        )

    base_dir = os.path.abspath(os.path.dirname(__file__))
    instance_dir = os.path.join(base_dir, "instance")
    os.makedirs(instance_dir, exist_ok=True)
    return f"sqlite:///{os.path.join(instance_dir, 'educcore.db')}"


# Backwards compatible alias kept for the existing test suite.
_resolve_database_url = resolve_database_url


def build_engine_options(database_uri):
    """Engine options that keep connections healthy but never block startup."""
    options = {"pool_pre_ping": True}

    if database_uri.startswith("sqlite"):
        options["connect_args"] = {"check_same_thread": False, "timeout": 30}
    else:
        options.update(
            {
                "pool_size": 5,
                "max_overflow": 10,
                "pool_timeout": 30,
                "pool_recycle": 280,
                "connect_args": {"connect_timeout": 10},
            }
        )

    return options


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY") or DEV_SECRET_KEY
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or DEV_JWT_SECRET_KEY

    # Access token lifetime (seconds). Frontend never needs to refresh a token.
    JWT_ACCESS_TOKEN_EXPIRES = _env_int("JWT_ACCESS_TOKEN_EXPIRES_SECONDS", 60 * 60 * 24)

    # Resolved in create_app() so a missing production value fails with a clear message.
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or ""
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    CORS_ORIGINS = os.environ.get("CORS_ORIGINS") or ""
    CORS_SUPPORTS_CREDENTIALS = _env_bool("CORS_SUPPORTS_CREDENTIALS", True)
    CORS_MAX_AGE = _env_int("CORS_MAX_AGE_SECONDS", 600)

    # Render terminates TLS and forwards the original scheme/host.
    TRUST_PROXY = _env_bool("TRUST_PROXY", True)

    AUTO_CREATE_TABLES = _env_bool("AUTO_CREATE_TABLES", True)
    # Never delete an existing database file; use the additive column upgrade instead.
    RESET_STALE_SQLITE_DB = _env_bool("RESET_STALE_SQLITE_DB", False)

    AUTH_RATE_LIMIT_ATTEMPTS = _env_int("AUTH_RATE_LIMIT_ATTEMPTS", 10)
    AUTH_RATE_LIMIT_WINDOW_SECONDS = _env_int("AUTH_RATE_LIMIT_WINDOW_SECONDS", 300)
    AUTH_REGISTER_RATE_LIMIT_ATTEMPTS = _env_int("AUTH_REGISTER_RATE_LIMIT_ATTEMPTS", 20)
