# backend/app/services/block_service.py
"""블록 서비스 — CRUD 비즈니스 로직"""

import logging
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.block import Block

logger = logging.getLogger(__name__)


class BlockService:
    """블록 CRUD 서비스"""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self, page_id: UUID, type: str = "paragraph",
        content: dict | None = None, order: float = 0.0,
        parent_block_id: UUID | None = None,
    ) -> Block:
        """블록 생성"""
        block = Block(
            page_id=page_id,
            type=type,
            content=content,
            order=order,
            parent_block_id=parent_block_id,
        )
        self.db.add(block)
        await self.db.flush()
        await self.db.refresh(block)
        return block

    async def get_by_id(self, block_id: UUID) -> Block | None:
        """블록 조회"""
        return await self.db.get(Block, block_id)

    async def list_by_page(self, page_id: UUID) -> list[Block]:
        """페이지의 블록 목록 조회 (order 순)"""
        result = await self.db.execute(
            select(Block)
            .where(Block.page_id == page_id)
            .order_by(Block.order)
        )
        return list(result.scalars().all())

    async def update(self, block_id: UUID, **kwargs) -> Block | None:
        """블록 수정"""
        block = await self.get_by_id(block_id)
        if block is None:
            return None

        for key, value in kwargs.items():
            if value is not None and hasattr(block, key):
                setattr(block, key, value)

        await self.db.flush()
        await self.db.refresh(block)
        return block

    async def delete(self, block_id: UUID) -> bool:
        """블록 삭제"""
        block = await self.get_by_id(block_id)
        if block is None:
            return False

        await self.db.delete(block)
        await self.db.flush()
        return True

    async def batch_save(self, page_id: UUID, blocks_data: list[dict]) -> list[Block]:
        """페이지의 블록 일괄 저장 (에디터 저장 시 사용)

        기존 블록을 모두 삭제하고 새로운 블록을 생성합니다.
        """
        # 기존 블록 삭제
        await self.db.execute(
            delete(Block).where(Block.page_id == page_id)
        )

        # 새 블록 생성
        new_blocks = []
        for i, data in enumerate(blocks_data):
            block = Block(
                page_id=page_id,
                type=data.get("type", "paragraph"),
                content=data.get("content"),
                order=data.get("order", float(i)),
                parent_block_id=data.get("parent_block_id"),
            )
            self.db.add(block)
            new_blocks.append(block)

        await self.db.flush()
        for block in new_blocks:
            await self.db.refresh(block)

        return new_blocks
