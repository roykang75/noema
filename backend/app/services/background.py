"""백그라운드 임베딩 파이프라인 — 블록 저장 후 트리거"""

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.embedding_service import EmbeddingService
from app.services.graph_service import GraphService

logger = logging.getLogger(__name__)


async def update_embeddings_and_relations(
    page_id: UUID,
    db: AsyncSession,
    embedding_service: EmbeddingService,
    graph_service: GraphService,
) -> None:
    """백그라운드: 임베딩 생성 → 유사도 검색 → Neo4j 엣지 업데이트"""
    try:
        from app.models.page import Page
        page = await db.get(Page, page_id)
        if page is None:
            logger.warning("페이지를 찾을 수 없음: %s", page_id)
            return

        embedding = await embedding_service.update_page_embedding(db, page_id)
        if embedding is None:
            logger.info("임베딩 생성 스킵 (빈 텍스트): page_id=%s", page_id)
            return

        await db.commit()

        graph_service.ensure_page_node(page_id, page.title, page.workspace_id)

        similar_pages = await embedding_service.find_similar_pages(
            db, page_id, page.workspace_id,
        )

        if not similar_pages:
            logger.info("유사 페이지 없음: page_id=%s", page_id)
            return

        graph_service.upsert_similar_edges(page_id, similar_pages)

        logger.info(
            "임베딩 파이프라인 완료: page_id=%s, 유사 페이지 %d개",
            page_id, len(similar_pages),
        )

    except Exception:
        logger.exception("임베딩 파이프라인 에러: page_id=%s", page_id)
