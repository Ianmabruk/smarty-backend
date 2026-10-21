from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app import db
import app.ai_service as ai_service
from app.models import Conversation, Message
from app.utils import success, error, get_current_user

bp = Blueprint("chat", __name__)


@bp.route("/chat", methods=["GET"])
@jwt_required()
def list_conversations():
    user = get_current_user()
    if not user:
        return error("Unauthorized", 401)

    conversations = Conversation.query.filter_by(user_id=user.id).order_by(Conversation.updated_at.desc()).all()
    return success([c.to_dict() for c in conversations])


@bp.route("/chat", methods=["POST"])
@jwt_required()
def create_conversation():
    user = get_current_user()
    if not user:
        return error("Unauthorized", 401)

    data = request.get_json() or {}
    title = (data.get("title") or "New chat").strip() or "New chat"
    conversation = Conversation(user_id=user.id, title=title)
    db.session.add(conversation)
    db.session.commit()
    return success("Conversation created", conversation.to_dict(), 201)


@bp.route("/chat/<int:conversation_id>", methods=["GET"])
@jwt_required()
def get_conversation(conversation_id):
    user = get_current_user()
    if not user:
        return error("Unauthorized", 401)

    conversation = Conversation.query.filter_by(id=conversation_id, user_id=user.id).first()
    if not conversation:
        return error("Conversation not found", 404)

    return success({
        "conversation": conversation.to_dict(),
        "messages": [m.to_dict() for m in conversation.messages],
    })


@bp.route("/chat/<int:conversation_id>/message", methods=["POST"])
@jwt_required()
def send_message(conversation_id):
    user = get_current_user()
    if not user:
        return error("Unauthorized", 401)

    conversation = Conversation.query.filter_by(id=conversation_id, user_id=user.id).first()
    if not conversation:
        return error("Conversation not found", 404)

    data = request.get_json() or {}
    role = (data.get("role") or "user").strip()
    content = (data.get("content") or "").strip()
    if not content:
        return error("content is required", 400)

    user_message = Message(conversation_id=conversation.id, role="user", content=content)
    db.session.add(user_message)

    if not conversation.title or conversation.title == "New chat":
        title = content[:30].strip() or "New chat"
        if len(title) >= 30 and title.endswith(" ") is False:
            title = title[:27].rstrip() + "..."
        conversation.title = title

    db.session.commit()

    history = [
        {"role": "user", "content": item.content}
        for item in conversation.messages
        if item.role == "user"
    ]
    for item in conversation.messages:
        if item.role == "assistant":
            history.append({"role": "assistant", "content": item.content})

    try:
        reply_text = ai_service.generate_chat_reply(history, system_prompt="You are Smarty, a helpful academic tutor and study assistant.")
    except RuntimeError as exc:
        return error(str(exc), 503)
    except Exception as exc:
        return error(f"AI request failed: {exc}", 502)

    assistant_message = Message(conversation_id=conversation.id, role="assistant", content=reply_text)
    db.session.add(assistant_message)
    db.session.commit()

    return success("Message saved", {
        "user_message": user_message.to_dict(),
        "assistant_message": assistant_message.to_dict(),
        "conversation": conversation.to_dict(),
    }, 201)
