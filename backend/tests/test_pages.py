# backend/tests/test_pages.py
"""페이지 CRUD 테스트"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.page import PageCreate, PageUpdate, PageResponse


@pytest.fixture
def client():
    return TestClient(app)


class TestPageSchemas:
    def test_page_create_defaults(self):
        req = PageCreate(workspace_id=uuid.uuid4())
        assert req.title == ""
        assert req.icon is None
        assert req.parent_page_id is None

    def test_page_create_with_title(self):
        req = PageCreate(workspace_id=uuid.uuid4(), title="테스트 페이지")
        assert req.title == "테스트 페이지"

    def test_page_update_all_none(self):
        req = PageUpdate()
        assert req.title is None
        assert req.icon is None

    def test_page_response_from_attributes(self):
        """model_config from_attributes가 설정되어 있는지 확인"""
        assert PageResponse.model_config.get("from_attributes") is True


class TestPageEndpoints:
    def test_create_page_requires_auth(self, client):
        """인증 없이 페이지 생성 시 401"""
        response = client.post("/pages", json={"workspace_id": str(uuid.uuid4())})
        assert response.status_code == 401

    def test_get_page_requires_auth(self, client):
        """인증 없이 페이지 조회 시 401"""
        response = client.get(f"/pages/{uuid.uuid4()}")
        assert response.status_code == 401

    def test_list_pages_requires_auth(self, client):
        """인증 없이 페이지 목록 조회 시 401"""
        response = client.get(f"/pages?workspace_id={uuid.uuid4()}")
        assert response.status_code == 401

    def test_delete_page_requires_auth(self, client):
        """인증 없이 페이지 삭제 시 401"""
        response = client.delete(f"/pages/{uuid.uuid4()}")
        assert response.status_code == 401
