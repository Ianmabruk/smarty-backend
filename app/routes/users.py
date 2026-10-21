from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app import db
from app.models import User
from app.schemas import UserProfileUpdateSchema
from app.utils import success, error, get_current_user

bp = Blueprint("users", __name__)


@bp.route("/users/me", methods=["GET"])
@jwt_required()
def me():
    user = get_current_user()
    if not user:
        return error("Unauthorized", 401)
    return success(user.to_dict())


@bp.route("/users/me", methods=["PUT", "PATCH"])
@jwt_required()
def update_me():
    user = get_current_user()
    if not user:
        return error("Unauthorized", 401)

    data = request.get_json() or {}
    schema = UserProfileUpdateSchema()
    try:
        data = schema.load(data)
    except Exception as exc:
        return error(str(exc), 400)

    if "age" in data:
        user.age = data["age"]
    if "education_group" in data:
        user.education_group = data["education_group"]
    if "grade_level" in data:
        user.grade_level = data["grade_level"]
    if "onboarding_completed" in data:
        user.onboarding_completed = data["onboarding_completed"]

    db.session.commit()
    return success("Profile updated", user.to_dict())


@bp.route("/users/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user(user_id):
    current = get_current_user()
    if not current:
        return error("Unauthorized", 401)
    if current.role != "admin" and current.id != user_id:
        return error("Forbidden", 403)
    user = db.get_or_404(User, user_id)
    return success(user.to_dict())


@bp.route("/users", methods=["GET"])
@jwt_required()
def list_users():
    current = get_current_user()
    if not current or current.role != "admin":
        return error("Forbidden", 403)
    users = User.query.all()
    return success([u.to_dict() for u in users])