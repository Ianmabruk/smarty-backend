"""Guard against the two copies of the backend drifting apart.

The repository contains the Flask application twice: once at the repository
root (`app/`, `config.py`, ...) and once under `backend/`. Render can be
configured with either root directory, so the two copies must stay identical.
"""

import filecmp
import os

import pytest

SHARED_FILES = [
    "config.py",
    "wsgi.py",
    "manage.py",
    "requirements.txt",
    "runtime.txt",
    "app/__init__.py",
    "app/utils.py",
    "app/models.py",
    "app/schemas.py",
    "app/ai_service.py",
    "app/data_tools.py",
    "app/cors_config.py",
    "app/rate_limit.py",
    "app/routes/auth.py",
    "app/routes/ai.py",
    "app/routes/chat.py",
    "app/routes/courses.py",
    "app/routes/lessons.py",
    "app/routes/notes.py",
    "app/routes/progress.py",
    "app/routes/quizzes.py",
    "app/routes/users.py",
]


def _repository_root():
    path = os.path.abspath(os.path.dirname(__file__))
    while True:
        if os.path.isdir(os.path.join(path, "app")) and os.path.isdir(
            os.path.join(path, "backend", "app")
        ):
            return path
        parent = os.path.dirname(path)
        if parent == path:
            return None
        path = parent


@pytest.mark.parametrize("relative_path", SHARED_FILES)
def test_backend_copies_are_identical(relative_path):
    root = _repository_root()
    if root is None:
        pytest.skip("Repository root with both backend copies not found")

    top_level = os.path.join(root, relative_path)
    nested = os.path.join(root, "backend", relative_path)

    assert os.path.exists(top_level), f"{relative_path} is missing at the repository root"
    assert os.path.exists(nested), f"{relative_path} is missing under backend/"
    assert filecmp.cmp(top_level, nested, shallow=False), (
        f"{relative_path} differs between the repository root and backend/. "
        "Copy the newer version over the other one before deploying."
    )
