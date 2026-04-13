# backend/app/services/page_service.py
"""페이지 서비스 — CRUD 비즈니스 로직"""

import logging
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.page import Page

logger = logging.getLogger(__name__)


class PageService:
    """페이지 CRUD 서비스"""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self, workspace_id: UUID, title: str, created_by: UUID,
        icon: str | None = None, parent_page_id: UUID | None = None,
    ) -> Page:
        """페이지 생성"""
        page = Page(
            workspace_id=workspace_id,
            title=title,
            icon=icon,
            parent_page_id=parent_page_id,
            created_by=created_by,
        )
        self.db.add(page)
        await self.db.flush()
        await self.db.refresh(page)
        return page

    async def get_by_id(self, page_id: UUID) -> Page | None:
        """페이지 조회 (소프트 삭제 제외)"""
        result = await self.db.execute(
            select(Page).where(Page.id == page_id, Page.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def list_by_workspace(
        self,
        workspace_id: UUID,
        parent_page_id: UUID | None = None,
        root_only: bool = False,
    ) -> tuple[list[Page], int]:
        """워크스페이스의 페이지 목록 조회

        - parent_page_id 지정 시: 해당 부모의 자식 페이지만 반환
        - root_only=True: 최상위(parent_page_id=NULL) 페이지만 반환
        - 둘 다 지정 안 하면: 워크스페이스의 전체 페이지 반환 (사이드바 트리용)
        """
        query = select(Page).where(
            Page.workspace_id == workspace_id,
            Page.is_deleted == False,
        )
        if parent_page_id is not None:
            query = query.where(Page.parent_page_id == parent_page_id)
        elif root_only:
            query = query.where(Page.parent_page_id.is_(None))

        query = query.order_by(Page.created_at.desc())

        result = await self.db.execute(query)
        pages = list(result.scalars().all())

        # 전체 개수 (필터와 무관하게 워크스페이스 기준)
        count_query = select(func.count()).select_from(Page).where(
            Page.workspace_id == workspace_id,
            Page.is_deleted == False,
        )
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        return pages, total

    async def update(self, page_id: UUID, **kwargs) -> Page | None:
        """페이지 수정"""
        page = await self.get_by_id(page_id)
        if page is None:
            return None

        for key, value in kwargs.items():
            if value is not None and hasattr(page, key):
                setattr(page, key, value)

        await self.db.flush()
        await self.db.refresh(page)
        return page

    async def soft_delete(self, page_id: UUID) -> bool:
        """페이지 소프트 삭제"""
        page = await self.get_by_id(page_id)
        if page is None:
            return False

        page.is_deleted = True
        await self.db.flush()
        return True
