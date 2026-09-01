import os
from datetime import timedelta

from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, "..", ".env"))
load_dotenv()


def _db_uri(env_key, default):
    uri = os.getenv(env_key, default)
    if uri and uri.startswith("postgres://"):
        uri = uri.replace("postgres://", "postgresql+psycopg://", 1)
    elif uri and uri.startswith("postgresql://"):
        uri = uri.replace("postgresql://", "postgresql+psycopg://", 1)
    return uri


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me-in-production")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "development-only-jwt-secret-change-me-please")

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100 MB cap
    _upload_folder_env = os.getenv("UPLOAD_FOLDER", "uploads")
    UPLOAD_FOLDER = (
        _upload_folder_env
        if os.path.isabs(_upload_folder_env)
        else os.path.abspath(os.path.join(basedir, "..", _upload_folder_env))
    )
    ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
    ALLOWED_VIDEO_EXTENSIONS = {"mp4", "mov", "avi", "webm"}

    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    ]

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = _db_uri(
        "DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/ajali_dev"
    )

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = _db_uri(
        "TEST_DATABASE_URL", "sqlite://"
    )

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = _db_uri("DATABASE_URL", "")

config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
