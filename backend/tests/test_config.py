from app.config import Settings


def test_settings_default_values():
    """기본값으로 Settings 인스턴스가 생성되는지 확인"""
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://test:test@localhost:5432/test",
        NEO4J_URI="bolt://localhost:7687",
        NEO4J_USER="neo4j",
        NEO4J_PASSWORD="test",
        REDIS_URL="redis://localhost:6379",
        JWT_SECRET="test_secret",
        ANTHROPIC_API_KEY="sk-ant-test",
        VOYAGE_API_KEY="pa-test",
    )
    assert settings.DATABASE_URL == "postgresql+asyncpg://test:test@localhost:5432/test"
    assert settings.ANTHROPIC_API_KEY == "sk-ant-test"
    assert settings.VOYAGE_API_KEY == "pa-test"
