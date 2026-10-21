import logging
import time

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix

from config import (
    Config,
    DEV_JWT_SECRET_KEY,
    DEV_SECRET_KEY,
    build_engine_options,
    is_production_environment,
    resolve_database_url,
)
from app.cors_config import build_cors_origins, contains_placeholder, describe_cors_origins
from app.rate_limit import FixedWindowRateLimiter

db = SQLAlchemy()
jwt = JWTManager()

logger = logging.getLogger("educore.api")

# Columns added after the first release of the schema. They are applied with
# additive ALTER TABLE statements so existing user records stay intact.
REQUIRED_USER_COLUMNS = {
    "age": "INTEGER",
    "education_group": "VARCHAR(50)",
    "grade_level": "VARCHAR(80)",
    "onboarding_completed": "BOOLEAN DEFAULT FALSE",
}


def _validate_production_secrets(app):
    """Refuse to start a production service with the development secrets."""
    if not is_production_environment():
        return

    missing = []
    if app.config.get("SECRET_KEY") in {None, "", DEV_SECRET_KEY}:
        missing.append("SECRET_KEY")
    if app.config.get("JWT_SECRET_KEY") in {None, "", DEV_JWT_SECRET_KEY}:
        missing.append("JWT_SECRET_KEY")

    if missing:
        raise RuntimeError(
            "Refusing to start in production with default or missing secrets: "
            + ", ".join(missing)
            + ". Set these environment variables in the Render dashboard to strong random values."
        )


def _ensure_user_columns(app):
    """Add missing `users` columns without touching existing rows."""
    try:
        inspector = inspect(db.engine)
        if "users" not in inspector.get_table_names():
            return

        existing = {column["name"] for column in inspector.get_columns("users")}
        missing = {
            name: ddl for name, ddl in REQUIRED_USER_COLUMNS.items() if name not in existing
        }
        if not missing:
            return

        dialect = db.engine.dialect.name
        with db.engine.begin() as connection:
            for name, ddl in missing.items():
                if dialect == "postgresql":
                    statement = f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {name} {ddl}"
                else:
                    statement = f"ALTER TABLE users ADD COLUMN {name} {ddl}"
                connection.execute(text(statement))

        logger.info("Applied additive users column upgrade: %s", sorted(missing))
    except SQLAlchemyError:
        logger.exception("Could not verify the users table columns")


def _initialize_database(app):
    """Create missing tables, retrying a few times for cold database starts."""
    if not app.config.get("AUTO_CREATE_TABLES", True):
        return False

    attempts = 3
    for attempt in range(1, attempts + 1):
        try:
            db.create_all()
            _ensure_user_columns(app)
            return True
        except SQLAlchemyError:
            logger.warning(
                "Database initialization attempt %s/%s failed", attempt, attempts, exc_info=True
            )
            if attempt < attempts:
                time.sleep(min(2 ** attempt, 5))

    logger.error("Database initialization failed after %s attempts", attempts)
    return False


def _register_error_handlers(app):
    @app.errorhandler(HTTPException)
    def handle_http_exception(exc):
        response = jsonify(
            {
                "success": False,
                "error": exc.description,
                "status": exc.code,
            }
        )
        response.status_code = exc.code or 500
        return response

    @app.errorhandler(SQLAlchemyError)
    def handle_database_error(exc):
        logger.exception("Database error while handling %s %s", request.method, request.path)
        db.session.rollback()
        return (
            jsonify(
                {
                    "success": False,
                    "error": "The database is temporarily unavailable. Please try again shortly.",
                    "status": 503,
                }
            ),
            503,
        )

    @app.errorhandler(Exception)
    def handle_unexpected_error(exc):
        logger.exception("Unhandled error while handling %s %s", request.method, request.path)
        db.session.rollback()
        return (
            jsonify(
                {
                    "success": False,
                    "error": "An unexpected server error occurred.",
                    "status": 500,
                }
            ),
            500,
        )


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    app.config["SQLALCHEMY_DATABASE_URI"] = resolve_database_url(
        app.config.get("SQLALCHEMY_DATABASE_URI")
    )
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = build_engine_options(
        app.config["SQLALCHEMY_DATABASE_URI"]
    )
    _validate_production_secrets(app)

    if app.config.get("TRUST_PROXY", True):
        # Render terminates TLS and forwards X-Forwarded-Proto / X-Forwarded-Host.
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    origins = build_cors_origins(app.config.get("CORS_ORIGINS"))
    if any(contains_placeholder(origin) for origin in describe_cors_origins(origins)):
        logger.warning(
            "CORS_ORIGINS still contains a placeholder value. Set CORS_ORIGINS to the exact "
            "Netlify origin of the deployed frontend."
        )
    logger.info("CORS allowed origins: %s", describe_cors_origins(origins))

    CORS(
        app,
        resources=[r"/api/*", r"/health", r"/health/*"],
        origins=origins,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With", "X-Request-ID"],
        expose_headers=["Content-Type", "X-Request-ID"],
        supports_credentials=app.config.get("CORS_SUPPORTS_CREDENTIALS", True),
        max_age=app.config.get("CORS_MAX_AGE", 600),
        automatic_options=True,
        send_wildcard=False,
    )

    @app.after_request
    def echo_request_id(response):
        """Echo the client correlation id so frontend and backend logs line up."""
        request_id = request.headers.get("X-Request-ID")
        if request_id:
            response.headers["X-Request-ID"] = request_id
        return response

    db.init_app(app)
    jwt.init_app(app)

    app.extensions["educore_login_limiter"] = FixedWindowRateLimiter(
        app.config.get("AUTH_RATE_LIMIT_ATTEMPTS", 10),
        app.config.get("AUTH_RATE_LIMIT_WINDOW_SECONDS", 300),
    )
    app.extensions["educore_register_limiter"] = FixedWindowRateLimiter(
        app.config.get("AUTH_REGISTER_RATE_LIMIT_ATTEMPTS", 60),
        app.config.get("AUTH_RATE_LIMIT_WINDOW_SECONDS", 300),
    )

    # Import model modules before creating tables so the full schema exists.
    from app import models  # noqa: F401

    with app.app_context():
        _initialize_database(app)

    from app.routes import auth, courses, lessons, quizzes, progress, users, ai, chat, notes
    app.register_blueprint(auth.bp, url_prefix="/api/auth")
    app.register_blueprint(courses.bp, url_prefix="/api")
    app.register_blueprint(lessons.bp, url_prefix="/api")
    app.register_blueprint(quizzes.bp, url_prefix="/api")
    app.register_blueprint(progress.bp, url_prefix="/api")
    app.register_blueprint(users.bp, url_prefix="/api")
    app.register_blueprint(ai.bp, url_prefix="/api")
    app.register_blueprint(chat.bp, url_prefix="/api")
    app.register_blueprint(notes.bp, url_prefix="/api")

    @app.route("/health")
    def health():
        return jsonify({"status": "ok", "service": "Educore API"})

    @app.route("/api/health")
    def api_health():
        return jsonify({"status": "ok", "service": "Educore API"})

    @app.route("/health/ready")
    def readiness():
        database_ok = True
        try:
            db.session.execute(text("SELECT 1"))
        except SQLAlchemyError:
            database_ok = False
        finally:
            db.session.rollback()

        payload = {
            "status": "ok" if database_ok else "degraded",
            "database": "ok" if database_ok else "unavailable",
        }
        return jsonify(payload), 200 if database_ok else 503

    @app.route("/")
    def root():
        return jsonify({"status": "ok", "service": "Educore API"})

    _register_error_handlers(app)

    return app
