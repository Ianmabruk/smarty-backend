import os
import sqlite3

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config

db = SQLAlchemy()
jwt = JWTManager()


def _reset_stale_sqlite_db_if_needed(db_path):
    if not os.path.exists(db_path):
        return

    try:
        with sqlite3.connect(db_path) as conn:
            columns = conn.execute("PRAGMA table_info(users)").fetchall()
    except sqlite3.DatabaseError:
        return

    existing_columns = {row[1] for row in columns}
    required_columns = {"age", "education_group", "grade_level", "onboarding_completed"}
    if not required_columns.issubset(existing_columns):
        os.remove(db_path)


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    allowed_origins = [
        origin.strip()
        for origin in os.environ.get("CORS_ORIGINS", "http://localhost:19006,http://localhost:3000,http://127.0.0.1:3000").split(",")
        if origin.strip()
    ]
    if not allowed_origins:
        allowed_origins = ["*"]
    CORS(app, resources={r"/*": {"origins": allowed_origins}}, supports_credentials=True)
    db.init_app(app)
    jwt.init_app(app)

    db_path = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    if db_path.startswith("sqlite:///"):
        sqlite_file = db_path.replace("sqlite:///", "", 1)
        if not sqlite_file.startswith("/"):
            sqlite_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), sqlite_file)
        _reset_stale_sqlite_db_if_needed(sqlite_file)

    # Import model modules before creating tables to ensure the full schema exists.
    from app import models  # noqa: F401

    with app.app_context():
        db.create_all()

    from app.routes import auth, courses, lessons, quizzes, progress, users, ai, chat, notes
    app.register_blueprint(auth.bp, url_prefix="/api/auth")
    app.register_blueprint(courses.bp, url_prefix="/api")
    app.register_blueprint(lessons.bp, url_prefix="/api")
    app.register_blueprint(quizzes.bp, url_prefix="/api")
    app.register_blueprint(progress.bp, url_prefix="/api")
    app.register_blueprint(users.bp, url_prefix="/api")
    app.register_blueprint(ai.bp, url_prefix="/api")
    app.register_blueprint(chat.bp, url_prefix="/api")
    app.register_blueprint(notes.bp, url_prefix="/api")

    @app.route("/")
    def health():
        return {"status": "ok", "app": "Educore API"}

    return app