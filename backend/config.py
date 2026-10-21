import os
from dotenv import load_dotenv

load_dotenv()


def _is_production_environment():
    return (
        (os.environ.get("FLASK_ENV") or "").lower() in {"production", "prod"}
        or (os.environ.get("APP_ENV") or "").lower() in {"production", "prod"}
        or bool(os.environ.get("RENDER"))
    )


def _resolve_database_url():
    url = os.environ.get("DATABASE_URL")
    if url:
        if url.startswith("sqlite://") and not url.startswith("sqlite:////"):
            relative_path = url.replace("sqlite:///", "", 1)
            if not os.path.isabs(relative_path):
                base_dir = os.path.abspath(os.path.dirname(__file__))
                resolved = os.path.join(base_dir, relative_path)
                directory = os.path.dirname(resolved)
                os.makedirs(directory, exist_ok=True)
                return f"sqlite:///{resolved}"
        return url

    if _is_production_environment():
        raise RuntimeError(
            "DATABASE_URL must be set in production. Configure your Render Postgres connection string before deployment."
        )

    base_dir = os.path.abspath(os.path.dirname(__file__))
    instance_dir = os.path.join(base_dir, "instance")
    os.makedirs(instance_dir, exist_ok=True)
    return f"sqlite:///{os.path.join(instance_dir, 'educcore.db')}"


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret")
    SQLALCHEMY_DATABASE_URI = _resolve_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False