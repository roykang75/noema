# backend/app/schemas/block.py
"""블록 요청/응답 Pydantic 스키마"""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class BlockCreate(BaseModel):
    """블록 생성 요청"""
    page_id: UUID
    type: str = "paragraph"
    content: dict[str, Any] | None = None
    order: float = 0.0
    parent_block_id: UUID | None = None


class BlockUpdate(BaseModel):
    """블록 수정 요청"""
    type: str | None = None
    content: dict[str, Any] | None = None
    order: float | None = None
    parent_block_id: UUID | None = None


class BlockResponse(BaseModel):
    """블록 응답"""
    id: UUID
    page_id: UUID
    parent_block_id: UUID | None
    type: str
    content: dict[str, Any] | None
    order: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BlockListResponse(BaseModel):
    """블록 목록 응답"""
    blocks: list[BlockResponse]


class BlockBatchUpdate(BaseModel):
    """블록 일괄 업데이트 요청 (에디터 저장 시 사용)"""
    blocks: list[BlockCreate]
