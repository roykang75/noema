"""태그 CRUD 라우터"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.auth import get_current_user
from app.db.postgres import get_db
from app.models.user import User
from app.schemas.tag import TagCreate, TagUpdate, TagResponse, TagListResponse, PageTagRequest
from app.services.tag_service import TagService

router = APIRouter(prefix="/tags", tags=["tags"])


def get_tag_service(db: AsyncSession = Depends(get_db)) -> TagService:
    return TagService(db)


@router.post("", response_model=TagResponse, status_code=201)
async def create_tag(
    req: TagCreate,
    user: User = Depends(get_current_user),
    service: TagService = Depends(get_tag_service),
):
    return await service.create(workspace_id=req.workspace_id, name=req.name, color=req.color)


@router.get("", response_model=TagListResponse)
async def list_tags(
    workspace_id: UUID = Query(...),
    user: User = Depends(get_current_user),
    service: TagService = Depends(get_tag_service),
):
    tags = await service.list_by_workspace(workspace_id)
    return TagListResponse(tags=tags)


@router.patch("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: UUID,
    req: TagUpdate,
    user: User = Depends(get_current_user),
    service: TagService = Depends(get_tag_service),
):
    tag = await service.update(tag_id, name=req.name, color=req.color)
    if tag is None:
        raise HTTPException(status_code=404, detail="태그를 찾을 수 없습니다")
    return tag


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: UUID,
    user: User = Depends(get_current_user),
    service: TagService = Depends(get_tag_service),
):
    if not await service.delete(tag_id):
        raise HTTPException(status_code=404, detail="태그를 찾을 수 없습니다")


@router.post("/page-tags", status_code=201)
async def add_tag_to_page(
    req: PageTagRequest,
    user: User = Depends(get_current_user),
    service: TagService = Depends(get_tag_service),
):
    added = await service.add_tag_to_page(req.page_id, req.tag_id)
    if not added:
        raise HTTPException(status_code=409, detail="이미 태그가 연결되어 있습니다")
    return {"status": "ok"}


@router.delete("/page-tags", status_code=204)
async def remove_tag_from_page(
    req: PageTagRequest,
    user: User = Depends(get_current_user),
    service: TagService = Depends(get_tag_service),
):
    if not await service.remove_tag_from_page(req.page_id, req.tag_id):
        raise HTTPException(status_code=404, detail="태그 연결을 찾을 수 없습니다")


@router.get("/pages/{page_id}", response_model=TagListResponse)
async def get_page_tags(
    page_id: UUID,
    user: User = Depends(get_current_user),
    service: TagService = Depends(get_tag_service),
):
    tags = await service.get_page_tags(page_id)
    return TagListResponse(tags=tags)
