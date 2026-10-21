import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from flask import current_app
from flask_jwt_extended import get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash

# Werkzeug hash prefixes that are safe to verify with check_password_hash().
MODERN_HASH_PREFIXES = ("scrypt:", "pbkdf2:", "argon2:")


def _secret_key():
    return (
        current_app.config.get("SECRET_KEY")
        or os.environ.get("SECRET_KEY")
        or "dev-secret-key"
    )


def _legacy_password_hash(password, salt=None):
    """Reproduce the original salted SHA-256 hash so old accounts still work."""
    salt = salt if salt is not None else os.environ.get("SECRET_KEY", "dev-secret-key")
    return hashlib.sha256((password + salt).encode()).hexdigest()


def hash_password(password):
    """Hash a password with a memory-hard key derivation function."""
    return generate_password_hash(password, method="scrypt")


def is_legacy_password_hash(password_hash):
    return not (password_hash or "").startswith(MODERN_HASH_PREFIXES)


def verify_password(password, password_hash):
    """Verify a password against the current or the legacy hash format."""
    if not password or not password_hash:
        return False

    if not is_legacy_password_hash(password_hash):
        try:
            if check_password_hash(password_hash, password):
                return True
        except (ValueError, TypeError):
            return False
        return False

    candidates = {os.environ.get("SECRET_KEY", "dev-secret-key"), _secret_key()}
    for salt in candidates:
        if hmac.compare_digest(_legacy_password_hash(password, salt), password_hash):
            return True
    return False


def generate_access_token(user_id):
    secret = current_app.config["JWT_SECRET_KEY"]
    payload = {
        "sub": user_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_access_token(token):
    secret = current_app.config["JWT_SECRET_KEY"]
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_current_user():
    from app import db
    from app.models import User

    identity = get_jwt_identity()
    if identity is None:
        return None
    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return None
    return db.session.get(User, user_id)


def success(message="", data=None, status=200):
    body = {"success": True}
    # If message is a list/dict, treat it as data
    if isinstance(message, (list, dict)):
        body["data"] = message
    else:
        if message:
            body["message"] = message
        if data is not None:
            body["data"] = data
    return body, status


def error(message, status=400):
    return {"success": False, "error": message}, status
