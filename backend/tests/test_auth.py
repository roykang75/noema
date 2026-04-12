"""인증 테스트 — JWT 토큰 검증 + 유저 조회"""

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.core.auth import verify_token
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def _create_test_token(payload: dict) -> str:
    """테스트용 JWT 토큰 생성"""
    settings = get_settings()
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


class TestVerifyToken:
    def test_valid_token(self):
        token = _create_test_token({"email": "test@example.com", "name": "테스트"})
        payload = verify_token(token)
        assert payload["email"] == "test@example.com"

    def test_invalid_token(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            verify_token("invalid.token.here")
        assert exc_info.value.status_code == 401

    def test_expired_token(self):
        import time
        from fastapi import HTTPException
        token = _create_test_token({"email": "test@example.com", "exp": int(time.time()) - 100})
        with pytest.raises(HTTPException) as exc_info:
            verify_token(token)
        assert exc_info.value.status_code == 401


class TestAuthMeEndpoint:
    def test_me_without_token(self, client):
        """토큰 없이 /auth/me 호출 시 401 반환"""
        response = client.get("/auth/me")
        assert response.status_code == 401

    def test_me_with_invalid_token(self, client):
        """잘못된 토큰으로 /auth/me 호출 시 401 반환"""
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalid.token"},
        )
        assert response.status_code == 401
