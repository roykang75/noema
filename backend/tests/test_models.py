"""SQLAlchemy 모델 단위 테스트"""

import uuid

from app.models.block import Block
from app.models.page import Page
from app.models.tag import PageTag, Tag
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember


# ── Task 5: User ──────────────────────────────────────────────────────────────

def test_user_model_table_name():
    assert User.__tablename__ == "users"


def test_user_model_columns():
    column_names = {c.name for c in User.__table__.columns}
    assert column_names == {"id", "email", "name", "avatar_url", "created_at"}


def test_user_model_instantiation():
    user = User(id=uuid.uuid4(), email="test@example.com", name="테스트 유저")
    assert user.email == "test@example.com"
    assert user.name == "테스트 유저"


# ── Task 6: Workspace + WorkspaceMember ───────────────────────────────────────

def test_workspace_model_table_name():
    assert Workspace.__tablename__ == "workspaces"


def test_workspace_model_columns():
    column_names = {c.name for c in Workspace.__table__.columns}
    assert column_names == {"id", "name", "owner_id", "created_at"}


def test_workspace_member_model_table_name():
    assert WorkspaceMember.__tablename__ == "workspace_members"


def test_workspace_member_model_columns():
    column_names = {c.name for c in WorkspaceMember.__table__.columns}
    assert column_names == {"workspace_id", "user_id", "role"}


def test_workspace_member_instantiation():
    wm = WorkspaceMember(workspace_id=uuid.uuid4(), user_id=uuid.uuid4(), role="editor")
    assert wm.role == "editor"


# ── Task 7: Page ──────────────────────────────────────────────────────────────

def test_page_model_table_name():
    assert Page.__tablename__ == "pages"


def test_page_model_columns():
    column_names = {c.name for c in Page.__table__.columns}
    expected = {
        "id", "workspace_id", "parent_page_id", "title", "icon",
        "is_deleted", "created_by", "created_at", "updated_at",
    }
    assert column_names == expected


def test_page_self_referential_fk():
    fk_targets = set()
    for c in Page.__table__.columns:
        for fk in c.foreign_keys:
            fk_targets.add(fk.target_fullname)
    assert "pages.id" in fk_targets


# ── Task 8: Block ─────────────────────────────────────────────────────────────

def test_block_model_table_name():
    assert Block.__tablename__ == "blocks"


def test_block_model_columns():
    column_names = {c.name for c in Block.__table__.columns}
    expected = {
        "id", "page_id", "parent_block_id", "type", "content",
        "order", "embedding", "created_at", "updated_at",
    }
    assert column_names == expected


def test_block_has_embedding_column():
    col = Block.__table__.columns["embedding"]
    assert "vector" in str(col.type).lower() or "VECTOR" in str(col.type)


# ── Task 9: Tag + PageTag ─────────────────────────────────────────────────────

def test_tag_model_table_name():
    assert Tag.__tablename__ == "tags"


def test_tag_model_columns():
    column_names = {c.name for c in Tag.__table__.columns}
    assert column_names == {"id", "workspace_id", "name", "color"}


def test_page_tag_model_table_name():
    assert PageTag.__tablename__ == "page_tags"


def test_page_tag_composite_pk():
    pk_cols = {c.name for c in PageTag.__table__.primary_key.columns}
    assert pk_cols == {"page_id", "tag_id"}
