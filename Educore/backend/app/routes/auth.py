from flask import Blueprint, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
)
from marshmallow import ValidationError
from app import db, jwt
from app.models import User
from app.schemas import UserRegisterSchema, UserLoginSchema
from app.utils import hash_password, verify_password, success, error

bp = Blueprint("auth", __name__)


@jwt.expired_token_loader
def expired_token(jwt_header, jwt_payload):
    return error("Token has expired", 401)


@jwt.invalid_token_loader
def invalid_token(reason):
    return error("Invalid token", 401)


@jwt.unauthorized_loader
def unauthorized_loader(reason):
    return error("Missing authorization token", 401)


@bp.route("/register", methods=["POST"])
def register():
    schema = UserRegisterSchema()
    try:
        data = schema.load(request.get_json() or {})
    except ValidationError as err:
        return error(str(err.messages), 400)

    if User.query.filter_by(email=data["email"]).first():
        return error("Email already registered", 409)

    user = User(
        name=data["name"],
        email=data["email"],
        password_hash=hash_password(data["password"]),
        role="student",
        onboarding_completed=False,
    )
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=user.id)
    return success("Registered successfully", {"token": token, "user": user.to_dict()}, 201)


@bp.route("/login", methods=["POST"])
def login():
    schema = UserLoginSchema()
    try:
        data = schema.load(request.get_json() or {})
    except ValidationError as err:
        return error(str(err.messages), 400)

    user = User.query.filter_by(email=data["email"]).first()
    if not user or not verify_password(data["password"], user.password_hash):
        return error("Invalid email or password", 401)

    token = create_access_token(identity=user.id)
    return success("Logged in successfully", {"token": token, "user": user.to_dict()})