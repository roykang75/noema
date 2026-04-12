"""태그 서비스"""
import logging
from uuid import UUID
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.tag import Tag, PageTag

logger = logging.getLogger(__name__)


class TagService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, workspace_id: UUID, name: str, color: str | None = None) -> Tag:
        tag = Tag(workspace_id=workspace_id, name=name, color=color)
        self.db.add(tag)
        await self.db.flush()
        await self.db.refresh(tag)
        return tag

    async def get_by_id(self, tag_id: UUID) -> Tag | None:
        return await self.db.get(Tag, tag_id)

    async def list_by_workspace(self, workspace_id: UUID) -> list[Tag]:
        result = await self.db.execute(
            select(Tag).where(Tag.workspace_id == workspace_id).order_by(Tag.name)
        )
        return list(result.scalars().all())

    async def update(self, tag_id: UUID, **kwargs) -> Tag | None:
        tag = await self.get_by_id(tag_id)
        if tag is None:
            return None
        for key, value in kwargs.items():
            if value is not None and hasattr(tag, key):
                setattr(tag, key, value)
        await self.db.flush()
        await self.db.refresh(tag)
        return tag

    async def delete(self, tag_id: UUID) -> bool:
        tag = await self.get_by_id(tag_id)
        if tag is None:
            return False
        await self.db.delete(tag)
        await self.db.flush()
        return True

    async def add_tag_to_page(self, page_id: UUID, tag_id: UUID) -> bool:
        existing = await self.db.execute(
            select(PageTag).where(PageTag.page_id == page_id, PageTag.tag_id == tag_id)
        )
        if existing.scalar_one_or_none():
            return False
        pt = PageTag(page_id=page_id, tag_id=tag_id)
        self.db.add(pt)
        await self.db.flush()
        return True

    async def remove_tag_from_page(self, page_id: UUID, tag_id: UUID) -> bool:
        result = await self.db.execute(
            select(PageTag).where(PageTag.page_id == page_id, PageTag.tag_id == tag_id)
        )
        pt = result.scalar_one_or_none()
        if pt is None:
            return False
        await self.db.delete(pt)
        await self.db.flush()
        return True

    async def get_page_tags(self, page_id: UUID) -> list[Tag]:
        result = await self.db.execute(
            select(Tag)
            .join(PageTag, Tag.id == PageTag.tag_id)
            .where(PageTag.page_id == page_id)
            .order_by(Tag.name)
        )
        return list(result.scalars().all())
