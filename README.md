# Educore Backend

Flask API for the Educore education platform.

## Quick Start

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py
```

The server runs on `http://0.0.0.0:5000` with debug enabled.
API endpoints are namespaced under `/api`.

## Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET  /api/courses`
- `POST /api/courses`
- `GET  /api/courses/:id`
- `PUT  /api/courses/:id`
- `DELETE /api/courses/:id`
- `GET  /api/lessons/course/:courseId`
- `POST /api/lessons`
- `GET  /api/lessons/:id`
- `PUT  /api/lessons/:id`
- `DELETE /api/lessons/:id`
- `GET  /api/quizzes/course/:courseId`
- `POST /api/quizzes`
- `POST /api/quizzes/:id/questions`
- `POST /api/quizzes/:id/submit`
- `GET  /api/progress`
- `GET  /api/progress/course/:courseId`
- `POST /api/progress`
- `GET  /api/users/me`
- `GET  /api/users`
- `POST /api/ai/explain`
- `POST /api/ai/summarize`