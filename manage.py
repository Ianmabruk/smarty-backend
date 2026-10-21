#!/usr/bin/env python
"""Run API server and initialize database."""
import os

from app import create_app, db
from app.models import User, Course, Lesson, Quiz, Question, Progress, QuizAttempt

app = create_app()


def init_db():
    with app.app_context():
        db.create_all()
        if not User.query.filter_by(email="admin@educcore.com").first():
            from app.utils import hash_password
            admin = User(
                name="Admin",
                email="admin@educcore.com",
                password_hash=hash_password("admin123"),
                role="admin",
            )
            db.session.add(admin)

            teacher = User(
                name="Jane Teacher",
                email="teacher@educcore.com",
                password_hash=hash_password("teacher123"),
                role="teacher",
            )
            db.session.add(teacher)
            db.session.commit()

            course = Course(
                title="Introduction to Python",
                description="Learn Python basics.",
                level="beginner",
                teacher_id=teacher.id,
            )
            db.session.add(course)
            db.session.commit()

            lesson = Lesson(
                course_id=course.id,
                title="Variables",
                content="Variables store data in memory.",
                order=1,
            )
            db.session.add(lesson)
            db.session.commit()

            quiz = Quiz(course_id=course.id, title="Python Basics Quiz")
            db.session.add(quiz)
            db.session.commit()

            db.session.add(Question(
                quiz_id=quiz.id,
                text="What is a variable?",
                type="multiple_choice",
                options='["A container", "A function", "A loop"]',
                correct_answer="A container",
            ))
            db.session.commit()

    print("Database initialized.")


if __name__ == "__main__":
    init_db()
    port = int(os.getenv("PORT", "5000"))
    host = os.getenv("HOST", "0.0.0.0")
    debug = os.getenv("FLASK_DEBUG", "0").lower() in {"1", "true", "yes", "on"}
    app.run(host=host, port=port, debug=debug, use_reloader=debug)