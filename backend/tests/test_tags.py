import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.tag import TagCreate, TagUpdate, PageTagRequest


@pytest.fixture
def client():
    return TestClient(app)


class TestTagSchemas:
    def test_tag_create(self):
        req = TagCreate(workspace_id=uuid.uuid4(), name="중요")
        assert req.name == "중요"
        assert req.color is None

    def test_tag_create_with_color(self):
        req = TagCreate(workspace_id=uuid.uuid4(), name="긴급", color="#FF0000")
        assert req.color == "#FF0000"

    def test_tag_update_optional(self):
        req = TagUpdate()
        assert req.name is None
        assert req.color is None

    def test_page_tag_request(self):
        req = PageTagRequest(page_id=uuid.uuid4(), tag_id=uuid.uuid4())
        assert req.page_id is not None


class TestTagEndpoints:
    @pytest.fixture(autouse=True)
    def setup_router(self):
        from app.api.tags import router as tags_router
        # 이미 등록된 경우 중복 등록 방지
        if not any(getattr(r, "prefix", None) == "/tags" for r in app.routes):
            app.include_router(tags_router)

    def test_create_requires_auth(self, client):
        response = client.post("/tags", json={"workspace_id": str(uuid.uuid4()), "name": "test"})
        assert response.status_code == 401

    def test_list_requires_auth(self, client):
        response = client.get(f"/tags?workspace_id={uuid.uuid4()}")
        assert response.status_code == 401

    def test_delete_requires_auth(self, client):
        response = client.delete(f"/tags/{uuid.uuid4()}")
        assert response.status_code == 401

    def test_add_page_tag_requires_auth(self, client):
        response = client.post(
            "/tags/page-tags",
            json={"page_id": str(uuid.uuid4()), "tag_id": str(uuid.uuid4())},
        )
        assert response.status_code == 401

    def test_get_page_tags_requires_auth(self, client):
        response = client.get(f"/tags/pages/{uuid.uuid4()}")
        assert response.status_code == 401
