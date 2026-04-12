"""AI 기능 라우터 — 7개 엔드포인트"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.sse import create_sse_response
from app.models.block import Block
from app.models.page import Page
from app.schemas.ai import (
    AskGraphRequest,
    AskRequest,
    CompleteRequest,
    ExtractRelationsRequest,
    ExtractRelationsResponse,
    ImproveRequest,
    SimilarPageResponse,
    SummarizeRequest,
    TranslateRequest,
)
from app.services.ai_service import AIService
from app.services.embedding_service import EmbeddingService
from app.services.graph_service import GraphService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


def get_ai_service() -> AIService:
    """AI 서비스 인스턴스 반환"""
    settings = get_settings()
    return AIService(api_key=settings.ANTHROPIC_API_KEY)


def get_embedding_service() -> EmbeddingService:
    """임베딩 서비스 인스턴스 반환"""
    settings = get_settings()
    return EmbeddingService(api_key=settings.VOYAGE_API_KEY)


def get_graph_service() -> GraphService:
    """그래프 서비스 인스턴스 반환"""
    from app.db.neo4j import get_neo4j_driver
    return GraphService(driver=get_neo4j_driver())


async def get_db_session():  # type: ignore[misc]
    """비동기 DB 세션 의존성"""
    from app.db.postgres import async_session_factory
    async with async_session_factory() as session:
        yield session


async def get_page_text(page_id: UUID, db: AsyncSession) -> str:
    """페이지의 모든 블록 텍스트를 조합하여 반환"""
    result = await db.execute(
        select(Block).where(Block.page_id == page_id).order_by(Block.order)
    )
    blocks = result.scalars().all()
    if not blocks:
        raise HTTPException(status_code=404, detail="페이지에 블록이 없습니다")

    texts = []
    for block in blocks:
        if block.content is None:
            continue
        for item in block.content.get("text", []):
            if isinstance(item, dict) and "text" in item:
                texts.append(item["text"])
    return "\n".join(texts)


async def get_block_text(block_id: UUID, db: AsyncSession) -> str:
    """블록의 텍스트를 반환"""
    block = await db.get(Block, block_id)
    if block is None:
        raise HTTPException(status_code=404, detail="블록을 찾을 수 없습니다")
    if block.content is None:
        return ""
    texts = []
    for item in block.content.get("text", []):
        if isinstance(item, dict) and "text" in item:
            texts.append(item["text"])
    return "\n".join(texts)


async def get_connected_pages_text(
    page_id: UUID, depth: int, db: AsyncSession, graph_service: GraphService,
) -> str:
    """N-hop 연결 문서 텍스트를 조합하여 반환"""
    connected = graph_service.get_connected_pages(page_id, depth)
    if not connected:
        return ""

    all_texts = []
    for page_info in connected:
        result = await db.execute(
            select(Block).where(Block.page_id == page_info["page_id"]).order_by(Block.order)
        )
        blocks = result.scalars().all()
        texts = []
        for block in blocks:
            if block.content is None:
                continue
            for item in block.content.get("text", []):
                if isinstance(item, dict) and "text" in item:
                    texts.append(item["text"])
        if texts:
            all_texts.append(f"### {page_info['title']}\n" + "\n".join(texts))

    return "\n\n---\n\n".join(all_texts)


@router.post("/summarize")
async def summarize(
    req: SummarizeRequest,
    ai_service: AIService = Depends(get_ai_service),
    db: AsyncSession = Depends(get_db_session),
):
    """문서 요약 — SSE 스트리밍"""
    page_text = await get_page_text(req.page_id, db)
    return create_sse_response(ai_service.summarize(page_text))


@router.post("/improve")
async def improve(
    req: ImproveRequest,
    ai_service: AIService = Depends(get_ai_service),
    db: AsyncSession = Depends(get_db_session),
):
    """블록 텍스트 개선 — SSE 스트리밍"""
    block_text = await get_block_text(req.block_id, db)
    return create_sse_response(ai_service.improve(block_text, req.instruction))


@router.post("/translate")
async def translate(
    req: TranslateRequest,
    ai_service: AIService = Depends(get_ai_service),
    db: AsyncSession = Depends(get_db_session),
):
    """블록 번역 — SSE 스트리밍"""
    block_text = await get_block_text(req.block_id, db)
    return create_sse_response(ai_service.translate(block_text, req.target_lang))


@router.post("/ask")
async def ask(
    req: AskRequest,
    ai_service: AIService = Depends(get_ai_service),
    db: AsyncSession = Depends(get_db_session),
):
    """단일 문서 Q&A — SSE 스트리밍"""
    page_text = await get_page_text(req.page_id, db)
    return create_sse_response(ai_service.ask(page_text, req.question))


@router.post("/ask-graph")
async def ask_graph(
    req: AskGraphRequest,
    ai_service: AIService = Depends(get_ai_service),
    graph_service: GraphService = Depends(get_graph_service),
    db: AsyncSession = Depends(get_db_session),
):
    """멀티문서 Q&A — 연결 문서 순회 + SSE 스트리밍"""
    page_text = await get_page_text(req.page_id, db)
    connected_text = await get_connected_pages_text(req.page_id, req.depth, db, graph_service)
    full_context = page_text
    if connected_text:
        full_context += "\n\n---\n\n" + connected_text
    return create_sse_response(ai_service.ask_with_context(full_context, req.question))


@router.post("/complete")
async def complete(
    req: CompleteRequest,
    ai_service: AIService = Depends(get_ai_service),
    db: AsyncSession = Depends(get_db_session),
):
    """텍스트 자동완성 — SSE 스트리밍"""
    return create_sse_response(ai_service.complete(req.cursor_context))


@router.post("/extract-relations", response_model=ExtractRelationsResponse)
async def extract_relations(
    req: ExtractRelationsRequest,
    embedding_service: EmbeddingService = Depends(get_embedding_service),
    graph_service: GraphService = Depends(get_graph_service),
    db: AsyncSession = Depends(get_db_session),
):
    """유사도 관계 추출 — 임베딩 생성 + Neo4j 저장 (비스트리밍)"""
    page = await db.get(Page, req.page_id)
    if page is None:
        raise HTTPException(status_code=404, detail="페이지를 찾을 수 없습니다")

    embedding = await embedding_service.update_page_embedding(db, req.page_id)
    if embedding is None:
        return ExtractRelationsResponse(relations=[])

    await db.commit()

    similar = await embedding_service.find_similar_pages(db, req.page_id, page.workspace_id)

    if similar:
        graph_service.ensure_page_node(req.page_id, page.title, page.workspace_id)
        graph_service.upsert_similar_edges(req.page_id, similar)

    return ExtractRelationsResponse(
        relations=[
            SimilarPageResponse(page_id=s["page_id"], title=s["title"], score=s["score"])
            for s in similar
        ]
    )
