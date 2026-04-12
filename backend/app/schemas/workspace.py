"""워크스페이스 요청/응답 Pydantic 스키마"""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class WorkspaceCreate(BaseModel):
    name: str


class WorkspaceUpdate(BaseModel):
    name: str | None = None


class WorkspaceResponse(BaseModel):
    id: UUID
    name: str
    owner_id: UUID
    created_at: datetime
    model_config = {"from_attributes": True}


class WorkspaceListResponse(BaseModel):
    workspaces: list[WorkspaceResponse]


class MemberAdd(BaseModel):
    email: str
    role: str = "editor"


class MemberResponse(BaseModel):
    user_id: UUID
    email: str
    name: str
    role: str
