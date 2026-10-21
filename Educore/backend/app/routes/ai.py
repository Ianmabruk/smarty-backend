from flask import Blueprint, request
from flask_jwt_extended import jwt_required
import app.ai_service as ai_service
from app.utils import success, error, get_current_user
from app.models import Lesson
from app.data_tools import route_data_query

bp = Blueprint("ai", __name__)


@bp.route("/ai/query", methods=["POST"])
@jwt_required()
def query_data():
    user = get_current_user()
    if not user:
        return error("Unauthorized", 401)

    data = request.get_json() or {}
    query = data.get("query") or data.get("question") or data.get("topic") or ""

    result = route_data_query(query)
    return success({
        "tool": result.get("tool", "general"),
        "status": result.get("status", "ok"),
        "answer": result.get("summary", "No answer available yet."),
        "data": result.get("data", {}),
    })


@bp.route("/ai/explain", methods=["POST"])
@jwt_required()
def explain():
    user = get_current_user()
    if not user:
        return error("Unauthorized", 401)

    data = request.get_json() or {}
    lesson_id = data.get("lesson_id")
    topic = data.get("topic", "")
    query = data.get("query") or data.get("question") or topic

    lesson = None
    if lesson_id:
        lesson = Lesson.query.get(lesson_id)

    if query:
        tool_result = route_data_query(query)
        if tool_result.get("tool") != "general":
            return success({
                "explanation": tool_result.get("summary", "No answer available yet."),
                "tool": tool_result.get("tool"),
                "data": tool_result.get("data", {}),
                "lesson": lesson.to_dict() if lesson else None,
            })

    explanation = build_explanation(lesson, topic)
    return success({"explanation": explanation, "lesson": lesson.to_dict() if lesson else None})


@bp.route("/ai/summarize", methods=["POST"])
@jwt_required()
def summarize():
    user = get_current_user()
    if not user:
        return error("Unauthorized", 401)

    data = request.get_json() or {}
    lesson_id = data.get("lesson_id")
    lesson = Lesson.query.get_or_404(lesson_id) if lesson_id else None

    if not lesson:
        return error("lesson_id is required", 400)

    summary = f"Summary of {lesson.title}: {lesson.content[:200]}"
    return success({"summary": summary})


@bp.route("/ai/generate-image", methods=["POST"])
@jwt_required()
def generate_image():
    user = get_current_user()
    if not user:
        return error("Unauthorized", 401)

    data = request.get_json() or {}
    prompt = (data.get("prompt") or data.get("query") or "").strip()
    if not prompt:
        return error("A prompt is required to generate an image.", 400)

    try:
        image = ai_service.generate_image_from_prompt(prompt)
        return success({"prompt": prompt, "image": image})
    except ValueError as exc:
        return error(str(exc), 400)
    except RuntimeError as exc:
        return error(str(exc), 400)
    except Exception as exc:
        return error(f"Image generation failed: {exc}", 500)


def build_explanation(lesson, topic):
    if lesson:
        return (
            f"Here is an overview of '{lesson.title}'. "
            f"Key points: {lesson.content[:300]}"
        )
    if topic:
        return f"An educational overview of '{topic}'."
    return "Provide a lesson_id or topic to get an explanation."