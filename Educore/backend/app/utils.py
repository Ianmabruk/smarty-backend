import os
import jwt
from datetime import datetime, timedelta, timezone
from flask import current_app
from flask_jwt_extended import get_jwt_identity


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
    from app.models import User

    identity = get_jwt_identity()
    if not identity:
        return None
    return User.query.get(int(identity))


def hash_password(password):
    import hashlib
    salt = os.environ.get("SECRET_KEY", "dev-secret-key")
    return hashlib.sha256((password + salt).encode()).hexdigest()


def verify_password(password, password_hash):
    return hash_password(password) == password_hash


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