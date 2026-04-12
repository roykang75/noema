# backend/app/api/blocks.py
"""블록 CRUD 라우터"""

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.auth import get_current_user
from app.db.postgres import get_db
from app.models.user import User
from app.schemas.block import (
    BlockBatchUpdate,
    BlockCreate,
    BlockListResponse,
    BlockResponse,
    BlockUpdate,
)
from app.services.block_service import BlockService

router = APIRouter(prefix="/blocks", tags=["blocks"])


def get_block_service(db: AsyncSession = Depends(get_db)) -> BlockService:
    return BlockService(db)


@router.post("", response_model=BlockResponse, status_code=201)
async def create_block(
    req: BlockCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    service: BlockService = Depends(get_block_service),
):
    """블록 생성"""
    block = await service.create(
        page_id=req.page_id,
        type=req.type,
        content=req.content,
        order=req.order,
        parent_block_id=req.parent_block_id,
    )
    # 백그라운드 임베딩 파이프라인 트리거
    _trigger_embedding(background_tasks, req.page_id)
    return block


@router.get("/{block_id}", response_model=BlockResponse)
async def get_block(
    block_id: UUID,
    user: User = Depends(get_current_user),
    service: BlockService = Depends(get_block_service),
):
    """블록 조회"""
    block = await service.get_by_id(block_id)
    if block is None:
        raise HTTPException(status_code=404, detail="블록을 찾을 수 없습니다")
    return block


@router.get("", response_model=BlockListResponse)
async def list_blocks(
    page_id: UUID = Query(...),
    user: User = Depends(get_current_user),
    service: BlockService = Depends(get_block_service),
):
    """페이지의 블록 목록 조회"""
    blocks = await service.list_by_page(page_id)
    return BlockListResponse(blocks=blocks)


@router.patch("/{block_id}", response_model=BlockResponse)
async def update_block(
    block_id: UUID,
    req: BlockUpdate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    service: BlockService = Depends(get_block_service),
):
    """블록 수정"""
    block = await service.update(
        block_id,
        type=req.type,
        content=req.content,
        order=req.order,
        parent_block_id=req.parent_block_id,
    )
    if block is None:
        raise HTTPException(status_code=404, detail="블록을 찾을 수 없습니다")
    # 콘텐츠가 변경된 경우에만 임베딩 재생성
    if req.content is not None:
        _trigger_embedding(background_tasks, block.page_id)
    return block


@router.delete("/{block_id}", status_code=204)
async def delete_block(
    block_id: UUID,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    service: BlockService = Depends(get_block_service),
    db: AsyncSession = Depends(get_db),
):
    """블록 삭제"""
    block = await service.get_by_id(block_id)
    if block is None:
        raise HTTPException(status_code=404, detail="블록을 찾을 수 없습니다")
    page_id = block.page_id
    await service.delete(block_id)
    _trigger_embedding(background_tasks, page_id)


@router.put("/batch", response_model=BlockListResponse)
async def batch_save_blocks(
    req: BlockBatchUpdate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    service: BlockService = Depends(get_block_service),
):
    """블록 일괄 저장 (에디터 저장 시 사용)"""
    if not req.blocks:
        raise HTTPException(status_code=400, detail="블록 목록이 비어있습니다")

    page_id = req.blocks[0].page_id
    blocks = await service.batch_save(
        page_id,
        [b.model_dump() for b in req.blocks],
    )
    _trigger_embedding(background_tasks, page_id)
    return BlockListResponse(blocks=blocks)


def _trigger_embedding(background_tasks: BackgroundTasks, page_id: UUID) -> None:
    """백그라운드 임베딩 파이프라인 트리거"""
    from app.db.neo4j import get_neo4j_driver
    from app.db.postgres import async_session_factory
    from app.services.background import update_embeddings_and_relations
    from app.services.embedding_service import EmbeddingService
    from app.services.graph_service import GraphService

    async def run_pipeline():
        settings = get_settings()
        async with async_session_factory() as db:
            embedding_svc = EmbeddingService(api_key=settings.VOYAGE_API_KEY)
            graph_svc = GraphService(driver=get_neo4j_driver())
            await update_embeddings_and_relations(
                page_id=page_id, db=db,
                embedding_service=embedding_svc, graph_service=graph_svc,
            )

    background_tasks.add_task(run_pipeline)
