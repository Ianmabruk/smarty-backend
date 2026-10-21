from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app import db
from app.models import Course
from app.schemas import CourseSchema
from app.utils import success, error, get_current_user

bp = Blueprint("courses", __name__)
schema = CourseSchema()


@bp.route("/courses", methods=["GET"])
def list_courses():
    courses = Course.query.order_by(Course.created_at.desc()).all()
    return success([c.to_dict() for c in courses])


@bp.route("/courses/<int:course_id>", methods=["GET"])
def get_course(course_id):
    course = Course.query.get_or_404(course_id)
    return success(course.to_dict())


@bp.route("/courses", methods=["POST"])
@jwt_required()
def create_course():
    user = get_current_user()
    if not user or user.role not in ("teacher", "admin"):
        return error("Forbidden", 403)

    data = request.get_json() or {}
    try:
        data = schema.load(data)
    except Exception as err:
        return error(str(err), 400)

    course = Course(
        title=data["title"],
        description=data.get("description", ""),
        level=data.get("level", "beginner"),
        teacher_id=user.id,
    )
    db.session.add(course)
    db.session.commit()
    return success("Course created", course.to_dict(), 201)


@bp.route("/courses/<int:course_id>", methods=["PUT"])
@jwt_required()
def update_course(course_id):
    user = get_current_user()
    course = Course.query.get_or_404(course_id)
    if not user or (user.role != "admin" and course.teacher_id != user.id):
        return error("Forbidden", 403)

    data = request.get_json() or {}
    course.title = data.get("title", course.title)
    course.description = data.get("description", course.description)
    course.level = data.get("level", course.level)
    db.session.commit()
    return success("Course updated", course.to_dict())


@bp.route("/courses/<int:course_id>", methods=["DELETE"])
@jwt_required()
def delete_course(course_id):
    user = get_current_user()
    course = Course.query.get_or_404(course_id)
    if not user or (user.role != "admin" and course.teacher_id != user.id):
        return error("Forbidden", 403)
    db.session.delete(course)
    db.session.commit()
    return success("Course deleted")