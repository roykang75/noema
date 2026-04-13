# backend/app/api/pages.py
"""페이지 CRUD 라우터"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.postgres import get_db
from app.models.user import User
from app.schemas.page import PageCreate, PageListResponse, PageResponse, PageUpdate
from app.services.page_service import PageService

router = APIRouter(prefix="/pages", tags=["pages"])


def get_page_service(db: AsyncSession = Depends(get_db)) -> PageService:
    return PageService(db)


@router.post("", response_model=PageResponse, status_code=201)
async def create_page(
    req: PageCreate,
    user: User = Depends(get_current_user),
    service: PageService = Depends(get_page_service),
):
    """페이지 생성"""
    page = await service.create(
        workspace_id=req.workspace_id,
        title=req.title,
        icon=req.icon,
        parent_page_id=req.parent_page_id,
        created_by=user.id,
    )
    return page


@router.get("/{page_id}", response_model=PageResponse)
async def get_page(
    page_id: UUID,
    user: User = Depends(get_current_user),
    service: PageService = Depends(get_page_service),
):
    """페이지 조회"""
    page = await service.get_by_id(page_id)
    if page is None:
        raise HTTPException(status_code=404, detail="페이지를 찾을 수 없습니다")
    return page


@router.get("", response_model=PageListResponse)
async def list_pages(
    workspace_id: UUID = Query(...),
    parent_page_id: UUID | None = Query(None),
    root_only: bool = Query(False),
    user: User = Depends(get_current_user),
    service: PageService = Depends(get_page_service),
):
    """워크스페이스의 페이지 목록 조회

    - parent_page_id 지정: 해당 부모의 자식만
    - root_only=true: 최상위 페이지만
    - 둘 다 없으면: 워크스페이스의 모든 페이지 (사이드바 트리용)
    """
    pages, total = await service.list_by_workspace(
        workspace_id, parent_page_id, root_only,
    )
    return PageListResponse(pages=pages, total=total)


@router.patch("/{page_id}", response_model=PageResponse)
async def update_page(
    page_id: UUID,
    req: PageUpdate,
    user: User = Depends(get_current_user),
    service: PageService = Depends(get_page_service),
):
    """페이지 수정"""
    page = await service.update(
        page_id,
        title=req.title,
        icon=req.icon,
        parent_page_id=req.parent_page_id,
    )
    if page is None:
        raise HTTPException(status_code=404, detail="페이지를 찾을 수 없습니다")
    return page


@router.delete("/{page_id}", status_code=204)
async def delete_page(
    page_id: UUID,
    user: User = Depends(get_current_user),
    service: PageService = Depends(get_page_service),
):
    """페이지 소프트 삭제"""
    deleted = await service.soft_delete(page_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="페이지를 찾을 수 없습니다")
