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

    # Anthropic
    ANTHROPIC_API_KEY: str

    # Voyage AI
    VOYAGE_API_KEY: str

    # YouTube Data API v3 (선택) — 설정 시 조회수/좋아요/재생시간 등 풍부한 메타데이터
    YOUTUBE_API_KEY: str = ""

    # 프로젝트 루트의 .env를 공유 — 프론트엔드 전용 변수(NEXTAUTH_*, GOOGLE_*, NEXT_PUBLIC_* 등)는 무시
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    """싱글턴 Settings 인스턴스 반환"""
    return Settings()  # type: ignore[call-arg]
