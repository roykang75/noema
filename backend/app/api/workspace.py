"""워크스페이스 CRUD 라우터"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.auth import get_current_user
from app.db.postgres import get_db
from app.models.user import User
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceUpdate,
    WorkspaceResponse,
    WorkspaceListResponse,
    MemberAdd,
    MemberResponse,
)
from app.services.workspace_service import WorkspaceService

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def get_ws_service(db: AsyncSession = Depends(get_db)) -> WorkspaceService:
    return WorkspaceService(db)


@router.post("", response_model=WorkspaceResponse, status_code=201)
async def create_workspace(
    req: WorkspaceCreate,
    user: User = Depends(get_current_user),
    service: WorkspaceService = Depends(get_ws_service),
):
    return await service.create(name=req.name, owner_id=user.id)


@router.get("", response_model=WorkspaceListResponse)
async def list_workspaces(
    user: User = Depends(get_current_user),
    service: WorkspaceService = Depends(get_ws_service),
):
    workspaces = await service.list_by_user(user.id)
    return WorkspaceListResponse(workspaces=workspaces)


@router.get("/{ws_id}", response_model=WorkspaceResponse)
async def get_workspace(
    ws_id: UUID,
    user: User = Depends(get_current_user),
    service: WorkspaceService = Depends(get_ws_service),
):
    ws = await service.get_by_id(ws_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="워크스페이스를 찾을 수 없습니다")
    return ws


@router.patch("/{ws_id}", response_model=WorkspaceResponse)
async def update_workspace(
    ws_id: UUID,
    req: WorkspaceUpdate,
    user: User = Depends(get_current_user),
    service: WorkspaceService = Depends(get_ws_service),
):
    ws = await service.update(ws_id, name=req.name)
    if ws is None:
        raise HTTPException(status_code=404, detail="워크스페이스를 찾을 수 없습니다")
    return ws


@router.post("/{ws_id}/members", response_model=MemberResponse)
async def add_member(
    ws_id: UUID,
    req: MemberAdd,
    user: User = Depends(get_current_user),
    service: WorkspaceService = Depends(get_ws_service),
):
    result = await service.add_member(ws_id, req.email, req.role)
    if result is None:
        raise HTTPException(status_code=404, detail="해당 이메일의 유저를 찾을 수 없습니다")
    return result


@router.get("/{ws_id}/members")
async def list_members(
    ws_id: UUID,
    user: User = Depends(get_current_user),
    service: WorkspaceService = Depends(get_ws_service),
):
    return await service.list_members(ws_id)


@router.delete("/{ws_id}/members/{member_id}", status_code=204)
async def remove_member(
    ws_id: UUID,
    member_id: UUID,
    user: User = Depends(get_current_user),
    service: WorkspaceService = Depends(get_ws_service),
):
    removed = await service.remove_member(ws_id, member_id)
    if not removed:
        raise HTTPException(status_code=404, detail="멤버를 찾을 수 없습니다")
