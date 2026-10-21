# Educore

Educore is an education platform with a Python Flask backend API and a frontend app.

## Project Structure

```text
Educore/
├── backend/           # Flask API
│   ├── app/
│   ├── config.py
│   ├── manage.py
│   ├── wsgi.py
│   ├── requirements.txt
│   ├── runtime.txt
│   └── .env.example
├── frontend/          # App frontend
│   ├── App.js
│   ├── package.json
│   └── screens/
├── .python-version
├── runtime.txt
├── README.md
└── .gitignore
```

## Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py
```

The server runs on `http://0.0.0.0:5000` with debug enabled for local development.
API endpoints are namespaced under `/api`.

## API summary

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

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
expo start
```

## Default Accounts

- Admin: `admin@educcore.com` / `admin123`
- Teacher: `teacher@educcore.com` / `teacher123`

## Deployment note

This project is pinned to Python 3.12 for Render compatibility. The runtime files at the repo root and backend root must stay aligned with the deployed Python version.

