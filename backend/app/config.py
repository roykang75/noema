"""환경변수 설정 — pydantic-settings 기반"""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # PostgreSQL
    DATABASE_URL: str

    # Neo4j
    NEO4J_URI: str
    NEO4J_USER: str
    NEO4J_PASSWORD: str

    # Redis
    REDIS_URL: str

    # JWT
    JWT_SECRET: str

    # Anthropic (선택)
    ANTHROPIC_API_KEY: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    """싱글턴 Settings 인스턴스 반환"""
    return Settings()  # type: ignore[call-arg]
