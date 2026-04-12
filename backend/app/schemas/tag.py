"""태그 요청/응답 Pydantic 스키마"""
from uuid import UUID
from pydantic import BaseModel


class TagCreate(BaseModel):
    workspace_id: UUID
    name: str
    color: str | None = None


class TagUpdate(BaseModel):
    name: str | None = None
    color: str | None = None


class TagResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    color: str | None
    model_config = {"from_attributes": True}


class TagListResponse(BaseModel):
    tags: list[TagResponse]


class PageTagRequest(BaseModel):
    page_id: UUID
    tag_id: UUID
