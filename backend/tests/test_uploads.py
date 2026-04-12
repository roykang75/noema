"""파일 업로드 엔드포인트 테스트"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestUploadEndpoint:
    def test_upload_requires_auth(self, client):
        """인증 없이 업로드 시 401"""
        response = client.post(
            "/uploads",
            files={"file": ("test.txt", b"hello", "text/plain")},
        )
        assert response.status_code == 401

    def test_get_file_nonexistent(self, client):
        """존재하지 않는 파일 조회 시 404"""
        response = client.get("/uploads/nonexistent.txt")
        assert response.status_code == 404
