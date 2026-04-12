"""인증 유틸리티 — JWT 토큰 검증 + 유저 조회/생성"""

import logging
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.postgres import async_session_factory
from app.models.user import User

logger = logging.getLogger(__name__)

security = HTTPBearer()


async def get_db() -> AsyncSession:  # type: ignore[misc]
    """인증용 DB 세션"""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def verify_token(token: str) -> dict:
    """JWT 토큰 검증 → 페이로드 반환"""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 만료되었습니다",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰입니다",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """현재 인증된 유저를 반환하는 FastAPI 의존성

    JWT에서 email을 추출하고, DB에서 유저를 조회합니다.
    유저가 없으면 자동 생성합니다 (첫 로그인).
    """
    payload = verify_token(credentials.credentials)

    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰에 이메일 정보가 없습니다",
        )

    # DB에서 유저 조회
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        # 첫 로그인 — 유저 자동 생성
        user = User(
            email=email,
            name=payload.get("name", email.split("@")[0]),
            avatar_url=payload.get("picture"),
        )
        db.add(user)
        await db.flush()
        logger.info("새 유저 생성: %s", email)

    return user
