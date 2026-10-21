from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app import db
from app.models import Note
from app.utils import success, error, get_current_user

bp = Blueprint("notes", __name__)


@bp.route("/notes", methods=["GET"])
@jwt_required()
def list_notes():
    user = get_current_user()
    if not user:
        return error("Unauthorized", 401)

    notes = Note.query.filter_by(user_id=user.id).order_by(Note.updated_at.desc()).all()
    return success([n.to_dict() for n in notes])


@bp.route("/notes", methods=["POST"])
@jwt_required()
def create_note():
    user = get_current_user()
    if not user:
        return error("Unauthorized", 401)

    data = request.get_json() or {}
    title = (data.get("title") or "Untitled note").strip() or "Untitled note"
    content = data.get("content") or ""

    note = Note(user_id=user.id, title=title, content=content)
    db.session.add(note)
    db.session.commit()
    return success("Note created", note.to_dict(), 201)


@bp.route("/notes/<int:note_id>", methods=["PUT", "PATCH"])
@jwt_required()
def update_note(note_id):
    user = get_current_user()
    if not user:
        return error("Unauthorized", 401)

    note = Note.query.filter_by(id=note_id, user_id=user.id).first()
    if not note:
        return error("Note not found", 404)

    data = request.get_json() or {}
    if "title" in data:
        note.title = (data.get("title") or "Untitled note").strip() or "Untitled note"
    if "content" in data:
        note.content = data.get("content") or ""

    db.session.commit()
    return success("Note updated", note.to_dict())


@bp.route("/notes/<int:note_id>", methods=["DELETE"])
@jwt_required()
def delete_note(note_id):
    user = get_current_user()
    if not user:
        return error("Unauthorized", 401)

    note = Note.query.filter_by(id=note_id, user_id=user.id).first()
    if not note:
        return error("Note not found", 404)

    db.session.delete(note)
    db.session.commit()
    return success("Note deleted")
