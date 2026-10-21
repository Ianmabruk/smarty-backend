import os
import sys
import tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# The tests always run against a throwaway SQLite file. The environment
# variables are set before `config` is imported so that `load_dotenv()` inside
# config.py cannot replace them with the values from a local .env file.
TEST_DB_DIR = tempfile.mkdtemp(prefix="educore-tests-")
TEST_DB_PATH = os.path.join(TEST_DB_DIR, "test.db")

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"
os.environ["AUTO_CREATE_TABLES"] = "True"

import pytest  # noqa: E402

from app import create_app, db  # noqa: E402
from app.models import User  # noqa: E402


def pytest_report_header(config):
    return f"Educore test database: {TEST_DB_PATH}"


@pytest.fixture()
def app():
    """A Flask app bound to the throwaway test database."""
    application = create_app()
    application.config.update(TESTING=True)

    # Guard against ever pointing the test suite at a real database.
    uri = application.config["SQLALCHEMY_DATABASE_URI"]
    assert TEST_DB_DIR in uri, f"Refusing to run tests against {uri}"

    with application.app_context():
        db.drop_all()
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def registered_user(client):
    """Register a user and return (email, password, token, payload)."""
    payload = {"name": "Ada Lovelace", "email": "ada@example.com", "password": "correct-horse"}
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    body = response.get_json()
    return {
        "email": payload["email"],
        "password": payload["password"],
        "token": body["data"]["token"],
        "user": body["data"]["user"],
    }


@pytest.fixture()
def user_model(app):
    return User
