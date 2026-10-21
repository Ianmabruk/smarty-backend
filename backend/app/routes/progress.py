from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app import db
from app.models import Progress
from app.utils import success, error, get_current_user

bp = Blueprint("progress", __name__)


@bp.route("/progress", methods=["GET"])
@jwt_required()
def list_progress():
    user = get_current_user()
    if not user:
        return error("Unauthorized", 401)
    progress = Progress.query.filter_by(user_id=user.id).all()
    return success([p.to_dict() for p in progress])


@bp.route("/progress/course/<int:course_id>", methods=["GET"])
@jwt_required()
def course_progress(course_id):
    user = get_current_user()
    if not user:
        return error("Unauthorized", 401)
    progress = Progress.query.filter_by(user_id=user.id, course_id=course_id).all()
    return success([p.to_dict() for p in progress])


@bp.route("/progress", methods=["POST"])
@jwt_required()
def mark_completed():
    user = get_current_user()
    if not user:
        return error("Unauthorized", 401)

    data = request.get_json() or {}
    course_id = data.get("course_id")
    lesson_id = data.get("lesson_id")
    completed = data.get("completed", True)

    if not course_id:
        return error("course_id is required", 400)

    progress = Progress.query.filter_by(
        user_id=user.id, course_id=course_id, lesson_id=lesson_id
    ).first()

    if not progress:
        progress = Progress(
            user_id=user.id,
            course_id=course_id,
            lesson_id=lesson_id,
            completed=completed,
        )
        db.session.add(progress)
    else:
        progress.completed = completed

    db.session.commit()
    return success("Progress updated", progress.to_dict())