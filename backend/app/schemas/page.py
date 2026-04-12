# backend/app/schemas/page.py
"""페이지 요청/응답 Pydantic 스키마"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PageCreate(BaseModel):
    """페이지 생성 요청"""
    workspace_id: UUID
    title: str = ""
    icon: str | None = None
    parent_page_id: UUID | None = None


class PageUpdate(BaseModel):
    """페이지 수정 요청"""
    title: str | None = None
    icon: str | None = None
    parent_page_id: UUID | None = None


class PageResponse(BaseModel):
    """페이지 응답"""
    id: UUID
    workspace_id: UUID
    parent_page_id: UUID | None
    title: str
    icon: str | None
    is_deleted: bool
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PageListResponse(BaseModel):
    """페이지 목록 응답"""
    pages: list[PageResponse]
    total: int
