"""YouTube 메타데이터 엔드포인트 테스트"""

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core.auth import get_current_user
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def authed_client():
    """get_current_user를 모킹하여 인증 통과시킨 클라이언트"""
    mock_user = MagicMock(email="test@example.com", name="테스트")
    app.dependency_overrides[get_current_user] = lambda: mock_user
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_current_user, None)


class TestYouTubeAuth:
    def test_requires_auth(self, client):
        """인증 없이 호출 시 401 (익명 프록시 차단)"""
        response = client.get("/youtube/metadata?video_id=dQw4w9WgXcQ")
        assert response.status_code == 401


class TestYouTubeVideoIdValidation:
    """인증 통과 후 video_id 정규식 검증"""

    def test_rejects_too_short(self, authed_client):
        response = authed_client.get("/youtube/metadata?video_id=abc")
        assert response.status_code == 422

    def test_rejects_too_long(self, authed_client):
        response = authed_client.get(
            "/youtube/metadata?video_id=abcdefghijklmnop",
        )
        assert response.status_code == 422

    def test_rejects_special_chars(self, authed_client):
        """특수문자 주입 시도 차단 (11자이지만 패턴 불일치)"""
        response = authed_client.get(
            "/youtube/metadata?video_id=abcd!efghij",
        )
        assert response.status_code == 422

    def test_rejects_missing(self, authed_client):
        response = authed_client.get("/youtube/metadata")
        assert response.status_code == 422
