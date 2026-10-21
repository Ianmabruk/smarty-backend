from app import create_app, db
from app.models import User, Course, Lesson, Quiz, Question, Progress, QuizAttempt

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)