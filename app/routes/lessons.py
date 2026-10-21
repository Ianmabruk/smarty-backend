from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app import db
from app.models import Lesson
from app.schemas import LessonSchema
from app.utils import success, error, get_current_user

bp = Blueprint("lessons", __name__)
schema = LessonSchema()


@bp.route("/lessons/course/<int:course_id>", methods=["GET"])
def list_lessons(course_id):
    lessons = Lesson.query.filter_by(course_id=course_id).order_by(Lesson.order).all()
    return success([l.to_dict() for l in lessons])


@bp.route("/lessons/<int:lesson_id>", methods=["GET"])
def get_lesson(lesson_id):
    lesson = Lesson.query.get_or_404(lesson_id)
    return success(lesson.to_dict())


@bp.route("/lessons", methods=["POST"])
@jwt_required()
def create_lesson():
    user = get_current_user()
    if not user or user.role not in ("teacher", "admin"):
        return error("Forbidden", 403)

    data = request.get_json() or {}
    try:
        data = schema.load(data)
    except Exception as err:
        return error(str(err), 400)

    lesson = Lesson(
        course_id=data["course_id"],
        title=data["title"],
        content=data.get("content", ""),
        order=data.get("order", 0),
        video_url=data.get("video_url"),
    )
    db.session.add(lesson)
    db.session.commit()
    return success("Lesson created", lesson.to_dict(), 201)


@bp.route("/lessons/<int:lesson_id>", methods=["PUT"])
@jwt_required()
def update_lesson(lesson_id):
    user = get_current_user()
    lesson = Lesson.query.get_or_404(lesson_id)
    if not user or user.role not in ("teacher", "admin"):
        return error("Forbidden", 403)

    data = request.get_json() or {}
    lesson.title = data.get("title", lesson.title)
    lesson.content = data.get("content", lesson.content)
    lesson.order = data.get("order", lesson.order)
    lesson.video_url = data.get("video_url", lesson.video_url)
    db.session.commit()
    return success("Lesson updated", lesson.to_dict())


@bp.route("/lessons/<int:lesson_id>", methods=["DELETE"])
@jwt_required()
def delete_lesson(lesson_id):
    user = get_current_user()
    lesson = Lesson.query.get_or_404(lesson_id)
    if not user or user.role not in ("teacher", "admin"):
        return error("Forbidden", 403)
    db.session.delete(lesson)
    db.session.commit()
    return success("Lesson deleted")