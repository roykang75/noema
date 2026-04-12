from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.db.postgres import async_engine, async_session_factory


def test_async_engine_is_created():
    """async 엔진이 AsyncEngine 인스턴스인지 확인"""
    assert isinstance(async_engine, AsyncEngine)


def test_async_session_factory_returns_session():
    """세션 팩토리가 AsyncSession을 반환하는지 확인"""
    session = async_session_factory()
    assert isinstance(session, AsyncSession)
