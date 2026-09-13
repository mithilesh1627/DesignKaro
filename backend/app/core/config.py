from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore")

    PROJECT_NAME: str = "DesignKaro"
    VERSION: str = "0.1.0"
    TAGLINE: str = "Socho. Design Karo. Scale Karo."
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return ["*"]

    # Security
    SECRET_KEY: str = "super-secret-key-change-in-production-designkaro-2026"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str, info) -> str:
        env = info.data.get("ENVIRONMENT", "development")
        if env == "production" and ("change-in-production" in v or len(v) < 32):
            raise ValueError("Insecure SECRET_KEY detected in production environment. A strong >=32 char secret is required.")
        return v

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./designkaro.db"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "designkaro"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"


settings = Settings()
