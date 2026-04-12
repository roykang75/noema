import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate, MemberAdd


@pytest.fixture
def client():
    return TestClient(app)


class TestWorkspaceSchemas:
    def test_workspace_create(self):
        req = WorkspaceCreate(name="테스트 워크스페이스")
        assert req.name == "테스트 워크스페이스"

    def test_workspace_update_optional(self):
        req = WorkspaceUpdate()
        assert req.name is None

    def test_member_add_default_role(self):
        req = MemberAdd(email="test@example.com")
        assert req.role == "editor"


class TestWorkspaceEndpoints:
    def test_create_requires_auth(self, client):
        response = client.post("/workspaces", json={"name": "test"})
        assert response.status_code == 401

    def test_list_requires_auth(self, client):
        response = client.get("/workspaces")
        assert response.status_code == 401

    def test_get_requires_auth(self, client):
        response = client.get(f"/workspaces/{uuid.uuid4()}")
        assert response.status_code == 401

    def test_add_member_requires_auth(self, client):
        response = client.post(
            f"/workspaces/{uuid.uuid4()}/members",
            json={"email": "test@example.com"},
        )
        assert response.status_code == 401
