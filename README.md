# Educore / Smarty

Educore is an education platform with a Python Flask backend API and a React/Vite
frontend.

## Project Structure

```text
Educore/
├── app/                 # Flask API (copy A of the backend)
├── config.py
├── manage.py
├── wsgi.py
├── backend/             # Flask API (copy B of the backend, used by Render)
│   ├── app/
│   ├── config.py
│   ├── manage.py
│   ├── wsgi.py
│   ├── requirements.txt
│   ├── runtime.txt
│   ├── tests/
│   └── .env.example
├── frontend/            # Netlify site (React/Vite) + Expo mobile client
│   ├── src/             # Vite web app that Netlify publishes
│   ├── services/        # Expo/React Native API client
│   ├── screens/
│   ├── netlify.toml
│   └── package.json
├── render.yaml          # Render blueprint (optional, mirrors the dashboard)
├── requirements.txt
├── runtime.txt
└── README.md
```

> **The backend exists twice** (`app/` at the repository root and `backend/app/`).
> Render can be configured with either root directory, so both copies are kept
> byte-identical and `tests/test_backend_sync.py` fails the build if they drift.

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

- `GET  /health`            – liveness probe (no database, no Ollama)
- `GET  /health/ready`      – readiness probe (reports database availability)
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

### Authentication contract

`POST /api/auth/register` and `POST /api/auth/login` both answer with:

```json
{
  "success": true,
  "message": "...",
  "data": { "token": "<jwt>", "user": { "id": 1, "name": "...", "email": "..." } }
}
```

Errors answer with `{ "success": false, "error": "<message>" }` and the status
codes `400` (validation), `401` (invalid credentials), `409` (email already
registered), `429` (rate limited) and `503` (database unavailable).

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The Netlify site is built from `frontend/` with `vite build` and published from
`frontend/dist`.

---

# Deployment

## Render (backend)

| Setting | Value |
| --- | --- |
| Root directory | `backend` (or the repository root – both work) |
| Build command | `pip install -r requirements.txt` |
| Start command | `gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --threads 2 --timeout 120` |
| Health check path | `/health` |
| Python | `3.12.3` (`runtime.txt` and `.python-version` agree) |

Required environment variables:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | **yes in production** | Connection string of the existing database, e.g. `postgres://user:pass@host:5432/db`. The API refuses to start in production without it. |
| `SECRET_KEY` | **yes in production** | Random application secret. |
| `JWT_SECRET_KEY` | **yes in production** | Random JWT signing secret. |
| `CORS_ORIGINS` | **yes** | Exact origin of the deployed Netlify site, comma separated, e.g. `https://my-site.netlify.app`. A `https://*.netlify.app` entry is expanded into a matching pattern. |
| `OLLAMA_BASE_URL` | for AI features | Server-side Ollama origin. |
| `OLLAMA_MODEL` | for AI features | e.g. `qwen2.5:7b`. |
| `AI_API_KEY` / `AI_API_BASE_URL` / `AI_MODEL` | optional | Alternative AI provider. |
| `JWT_ACCESS_TOKEN_EXPIRES_SECONDS` | optional | Defaults to `86400`. |
| `AUTH_RATE_LIMIT_ATTEMPTS` | optional | Failed sign-ins per IP per window. Default `10`. |
| `AUTH_REGISTER_RATE_LIMIT_ATTEMPTS` | optional | Default `60`. |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | optional | Default `300`. |
| `TRUST_PROXY` | optional | Defaults to `true` (Render terminates TLS). |

**A suspended service cannot be repaired from the repository.** If Render reports
`x-render-routing: suspend-by-user`, resume the service in the dashboard
(Settings → Resume, or upgrade the instance) before redeploying.

## Netlify (frontend)

| Setting | Value |
| --- | --- |
| Base directory | `frontend` |
| Build command | `npm install && npm run check:config -- --strict && npm run build` |
| Publish directory | `frontend/dist` |

Required environment variable:

| Variable | Description |
| --- | --- |
| `VITE_API_BASE_URL` | The deployed API origin, e.g. `https://my-render-service.onrender.com/api`. The value is normalised so it always ends in exactly one `/api` segment. |
| `VITE_API_TIMEOUT_MS` | Optional request timeout, default `20000`. |

**Changing `VITE_API_BASE_URL` requires a new Netlify deployment** – Vite
inlines the value into the bundle at build time.

The build fails when `VITE_API_BASE_URL` is missing, malformed or points at
localhost, so a broken bundle can never reach production.

Never put `SECRET_KEY`, `JWT_SECRET_KEY`, database credentials or the Ollama
credentials in a Netlify variable: everything prefixed with `VITE_` is shipped
to the browser.

## Production checklist

1. Resume the Render service and set the environment variables above.
2. Redeploy the Render service; confirm `https://<service>.onrender.com/health`
   returns `{"status": "ok", "service": "Educore API"}`.
3. Confirm `https://<service>.onrender.com/health/ready` reports
   `"database": "ok"`.
4. Set `CORS_ORIGINS` to the exact Netlify origin and redeploy.
5. Set `VITE_API_BASE_URL` in Netlify and trigger a new Netlify deploy.
6. Open the deployed site, register an account and sign in again.

## Tests

```bash
# Backend (80+ tests, uses a throwaway SQLite database)
cd backend && python -m pytest tests/ -q

# Frontend (API client + authentication flow)
cd frontend && npm install && npm test
```

## Default Accounts

- Admin: `admin@educcore.com` / `admin123`
- Teacher: `teacher@educcore.com` / `teacher123`
