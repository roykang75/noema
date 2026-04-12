"""그래프 API 엔드포인트 테스트"""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestGraphEndpoint:
    def test_graph_requires_auth(self, client):
        """인증 없이 그래프 데이터 요청 시 401 반환"""
        response = client.get(f"/graph/pages?workspace_id={uuid.uuid4()}")
        assert response.status_code == 401

    def test_graph_missing_workspace_id(self, client):
        """workspace_id 없이 요청 시 422 반환"""
        response = client.get("/graph/pages")
        assert response.status_code in (401, 422)
