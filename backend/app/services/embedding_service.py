"""임베딩 서비스 — Voyage AI 임베딩 생성 + pgvector 유사도 검색"""

import logging
from uuid import UUID

import voyageai
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.block import Block
from app.models.page import Page

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "voyage-3"
SIMILARITY_THRESHOLD = 0.7
TOP_K = 10


class EmbeddingService:
    """Voyage AI 임베딩 생성 + pgvector 유사도 검색"""

    def __init__(self, api_key: str) -> None:
        self.client = voyageai.AsyncClient(api_key=api_key)

    async def generate_embedding(self, text: str) -> list[float]:
        """텍스트 → 1536차원 벡터"""
        result = await self.client.embed(texts=[text], model=EMBEDDING_MODEL)
        return result.embeddings[0]

    def extract_text_from_blocks(self, blocks: list) -> str:
        """블록 리스트에서 텍스트 추출 (BlockNote JSONB 구조)"""
        texts = []
        for block in blocks:
            if block.content is None:
                continue
            text_items = block.content.get("text", [])
            for item in text_items:
                if isinstance(item, dict) and "text" in item:
                    texts.append(item["text"])
        return "\n".join(texts)

    async def update_page_embedding(self, db: AsyncSession, page_id: UUID) -> list[float] | None:
        """페이지의 모든 블록 텍스트로 임베딩 생성 → pages.embedding 저장"""
        result = await db.execute(
            select(Block).where(Block.page_id == page_id).order_by(Block.order)
        )
        blocks = result.scalars().all()
        if not blocks:
            return None

        page_text = self.extract_text_from_blocks(blocks)
        if not page_text.strip():
            return None

        embedding = await self.generate_embedding(page_text)

        page = await db.get(Page, page_id)
        if page:
            page.embedding = embedding
            await db.flush()

        return embedding

    async def find_similar_pages(
        self, db: AsyncSession, page_id: UUID, workspace_id: UUID, top_k: int = TOP_K,
    ) -> list[dict]:
        """pgvector 코사인 유사도로 유사 페이지 검색"""
        page = await db.get(Page, page_id)
        if page is None or page.embedding is None:
            return []

        query = text("""
            SELECT id, title, 1 - (embedding <=> :embedding) AS score
            FROM pages
            WHERE workspace_id = :workspace_id
              AND id != :page_id
              AND embedding IS NOT NULL
              AND is_deleted = false
              AND 1 - (embedding <=> :embedding) >= :threshold
            ORDER BY embedding <=> :embedding
            LIMIT :top_k
        """)

        result = await db.execute(query, {
            "embedding": str(page.embedding),
            "workspace_id": str(workspace_id),
            "page_id": str(page_id),
            "threshold": SIMILARITY_THRESHOLD,
            "top_k": top_k,
        })
        rows = result.fetchall()

        return [
            {"page_id": row.id, "title": row.title, "score": float(row.score)}
            for row in rows
        ]
