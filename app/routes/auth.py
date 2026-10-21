from flask import Blueprint, current_app, request
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
)
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError
from app import db, jwt
from app.models import User
from app.schemas import UserRegisterSchema, UserLoginSchema
from app.utils import (
    hash_password,
    is_legacy_password_hash,
    verify_password,
    success,
    error,
)

bp = Blueprint("auth", __name__)


@jwt.expired_token_loader
def expired_token(jwt_header, jwt_payload):
    return error("Token has expired", 401)


@jwt.invalid_token_loader
def invalid_token(reason):
    return error("Invalid token", 401)


@jwt.unauthorized_loader
def unauthorized_loader(reason):
    return error("Missing authorization token", 401)


@jwt.revoked_token_loader
def revoked_token(jwt_header, jwt_payload):
    return error("Token has been revoked", 401)


def _client_key():
    """Identify the caller for rate limiting."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"


def _login_limiter():
    return current_app.extensions.get("educore_login_limiter")


def _register_limiter():
    return current_app.extensions.get("educore_register_limiter")


def _too_many_requests(retry_after):
    payload, status = error("Too many attempts. Please try again shortly.", 429)
    payload["retryAfter"] = retry_after
    return payload, status


def _format_validation_error(err):
    parts = []
    for field, field_messages in err.messages.items():
        if isinstance(field_messages, (list, tuple)):
            field_messages = ", ".join(str(item) for item in field_messages)
        parts.append(f"{field}: {field_messages}")
    return "; ".join(parts) or "Invalid request payload"


@bp.route("/register", methods=["POST"])
def register():
    client_key = _client_key()
    register_limiter = _register_limiter()
    if register_limiter is not None:
        allowed, retry_after = register_limiter.peek(client_key)
        if not allowed:
            return _too_many_requests(retry_after)
        register_limiter.record(client_key)

    schema = UserRegisterSchema()
    try:
        data = schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return error(_format_validation_error(err), 400)

    email = data["email"]
    if User.query.filter_by(email=email).first():
        return error("Email already registered", 409)

    user = User(
        name=data["name"],
        email=email,
        password_hash=hash_password(data["password"]),
        role="student",
        onboarding_completed=False,
    )
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        # Another request registered the same email between the check and the insert.
        db.session.rollback()
        return error("Email already registered", 409)
    except Exception:
        db.session.rollback()
        raise

    token = create_access_token(identity=user.id)
    return success("Registered successfully", {"token": token, "user": user.to_dict()}, 201)


@bp.route("/login", methods=["POST"])
def login():
    client_key = _client_key()
    login_limiter = _login_limiter()
    if login_limiter is not None:
        allowed, retry_after = login_limiter.peek(client_key)
        if not allowed:
            return _too_many_requests(retry_after)

    schema = UserLoginSchema()
    try:
        data = schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return error(_format_validation_error(err), 400)

    email = data["email"]
    user = User.query.filter_by(email=email).first()
    if not user or not verify_password(data["password"], user.password_hash):
        if login_limiter is not None:
            login_limiter.record(client_key)
        return error("Invalid email or password", 401)

    if is_legacy_password_hash(user.password_hash):
        # Transparently upgrade accounts that still use the old hash format.
        try:
            user.password_hash = hash_password(data["password"])
            db.session.commit()
        except Exception:
            db.session.rollback()

    if login_limiter is not None:
        login_limiter.reset(client_key)

    token = create_access_token(identity=user.id)
    return success("Logged in successfully", {"token": token, "user": user.to_dict()})
