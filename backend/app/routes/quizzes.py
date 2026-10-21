from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app import db
from app.models import Quiz, Question, QuizAttempt
from app.schemas import QuizSchema, QuestionSchema
from app.utils import success, error, get_current_user

bp = Blueprint("quizzes", __name__)
quiz_schema = QuizSchema()
question_schema = QuestionSchema()


@bp.route("/quizzes/course/<int:course_id>", methods=["GET"])
def list_quizzes(course_id):
    quizzes = Quiz.query.filter_by(course_id=course_id).all()
    return success([q.to_dict() for q in quizzes])


@bp.route("/quizzes/<int:quiz_id>", methods=["GET"])
def get_quiz(quiz_id):
    quiz = Quiz.query.get_or_404(quiz_id)
    return success(quiz.to_dict())


@bp.route("/quizzes", methods=["POST"])
@jwt_required()
def create_quiz():
    user = get_current_user()
    if not user or user.role not in ("teacher", "admin"):
        return error("Forbidden", 403)

    data = request.get_json() or {}
    try:
        data = quiz_schema.load(data)
    except Exception as err:
        return error(str(err), 400)

    quiz = Quiz(course_id=data["course_id"], title=data["title"])
    db.session.add(quiz)
    db.session.commit()
    return success("Quiz created", quiz.to_dict(), 201)


@bp.route("/quizzes/<int:quiz_id>/questions", methods=["POST"])
@jwt_required()
def add_question(quiz_id):
    user = get_current_user()
    if not user or user.role not in ("teacher", "admin"):
        return error("Forbidden", 403)

    data = request.get_json() or {}
    try:
        data = question_schema.load(data)
    except Exception as err:
        return error(str(err), 400)

    import json
    question = Question(
        quiz_id=data["quiz_id"],
        text=data["text"],
        type=data.get("type", "multiple_choice"),
        options=json.dumps(data.get("options", [])),
        correct_answer=data["correct_answer"],
    )
    db.session.add(question)
    db.session.commit()
    return success("Question added", question.to_dict(), 201)


@bp.route("/quizzes/<int:quiz_id>/submit", methods=["POST"])
@jwt_required()
def submit_quiz(quiz_id):
    user = get_current_user()
    if not user:
        return error("Unauthorized", 401)

    quiz = Quiz.query.get_or_404(quiz_id)
    data = request.get_json() or {}
    answers = data.get("answers", [])

    total = len(quiz.questions)
    score = 0
    for ans in answers:
        qid = ans.get("question_id")
        answer = ans.get("answer")
        q = Question.query.filter_by(id=qid, quiz_id=quiz.id).first()
        if q and str(q.correct_answer) == str(answer):
            score += 1

    attempt = QuizAttempt(
        user_id=user.id,
        quiz_id=quiz.id,
        score=score,
        total=total,
    )
    db.session.add(attempt)
    db.session.commit()
    return success("Quiz submitted", attempt.to_dict())