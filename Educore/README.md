# Educore

Educore is an education platform with a **React Native (Expo)** mobile frontend and a **Python Flask** backend API.

## Project Structure

```
Educore/
├── frontend/          # React Native (Expo) app
│   ├── App.js
│   ├── app.json
│   ├── package.json
│   ├── services/      # API client + config
│   ├── context/       # Auth context
│   └── screens/       # Login, Register, Home, Course, Lesson, Quiz, Profile, Progress
└── backend/           # Flask API
    ├── app/           # Application package
    │   ├── __init__.py
    │   ├── models.py
    │   ├── schemas.py
    │   ├── utils.py
    │   └── routes/    # auth, courses, lessons, quizzes, progress, users, ai
    ├── config.py
    ├── manage.py
    ├── wsgi.py
    ├── requirements.txt
    └── .env.example
```

## Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py    # initializes DB with sample data and starts server on :5000
```

API base URL: `http://localhost:5000/api`

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