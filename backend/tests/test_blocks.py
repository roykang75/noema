# backend/tests/test_blocks.py
"""블록 CRUD 테스트"""

import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.schemas.block import BlockBatchUpdate, BlockCreate, BlockResponse, BlockUpdate


@pytest.fixture
def client():
    """블록 라우터가 등록된 테스트 앱 클라이언트"""
    from app.api.blocks import router as blocks_router

    test_app = FastAPI()
    test_app.include_router(blocks_router)
    return TestClient(test_app)


class TestBlockSchemas:
    def test_block_create_defaults(self):
        req = BlockCreate(page_id=uuid.uuid4())
        assert req.type == "paragraph"
        assert req.content is None
        assert req.order == 0.0

    def test_block_create_with_content(self):
        content = {"text": [{"text": "테스트"}]}
        req = BlockCreate(page_id=uuid.uuid4(), type="heading", content=content, order=1.0)
        assert req.type == "heading"
        assert req.content == content
        assert req.order == 1.0

    def test_block_update_all_none(self):
        req = BlockUpdate()
        assert req.type is None
        assert req.content is None

    def test_block_response_from_attributes(self):
        assert BlockResponse.model_config.get("from_attributes") is True

    def test_block_batch_update(self):
        blocks = [
            BlockCreate(page_id=uuid.uuid4(), type="paragraph", order=0.0),
            BlockCreate(page_id=uuid.uuid4(), type="heading", order=1.0),
        ]
        batch = BlockBatchUpdate(blocks=blocks)
        assert len(batch.blocks) == 2


class TestBlockEndpoints:
    def test_create_block_requires_auth(self, client):
        response = client.post("/blocks", json={"page_id": str(uuid.uuid4())})
        assert response.status_code == 401

    def test_get_block_requires_auth(self, client):
        response = client.get(f"/blocks/{uuid.uuid4()}")
        assert response.status_code == 401

    def test_list_blocks_requires_auth(self, client):
        response = client.get(f"/blocks?page_id={uuid.uuid4()}")
        assert response.status_code == 401

    def test_delete_block_requires_auth(self, client):
        response = client.delete(f"/blocks/{uuid.uuid4()}")
        assert response.status_code == 401

    def test_batch_save_requires_auth(self, client):
        response = client.put("/blocks/batch", json={"blocks": []})
        assert response.status_code == 401
