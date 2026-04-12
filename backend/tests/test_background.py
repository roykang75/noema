"""백그라운드 임베딩 파이프라인 통합 테스트 (모킹)"""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.background import update_embeddings_and_relations


@pytest.mark.asyncio
async def test_pipeline_calls_embedding_then_graph():
    """파이프라인이 임베딩 → 유사도 검색 → Neo4j 순서로 실행되는지 확인"""
    page_id = uuid.uuid4()
    workspace_id = uuid.uuid4()

    mock_db = AsyncMock()
    mock_page = MagicMock()
    mock_page.workspace_id = workspace_id
    mock_page.title = "테스트 페이지"
    mock_db.get = AsyncMock(return_value=mock_page)

    mock_embedding_svc = AsyncMock()
    mock_embedding_svc.update_page_embedding = AsyncMock(return_value=[0.1] * 1536)
    mock_embedding_svc.find_similar_pages = AsyncMock(
        return_value=[{"page_id": uuid.uuid4(), "title": "유사 문서", "score": 0.85}],
    )

    mock_graph_svc = MagicMock()
    mock_graph_svc.ensure_page_node = MagicMock()
    mock_graph_svc.upsert_similar_edges = MagicMock()

    await update_embeddings_and_relations(
        page_id=page_id,
        db=mock_db,
        embedding_service=mock_embedding_svc,
        graph_service=mock_graph_svc,
    )

    mock_embedding_svc.update_page_embedding.assert_called_once_with(mock_db, page_id)
    mock_embedding_svc.find_similar_pages.assert_called_once_with(mock_db, page_id, workspace_id)
    mock_graph_svc.upsert_similar_edges.assert_called_once()


@pytest.mark.asyncio
async def test_pipeline_skips_graph_when_no_embedding():
    """임베딩이 None이면 유사도 검색을 건너뛰는지 확인"""
    page_id = uuid.uuid4()

    mock_db = AsyncMock()
    mock_page = MagicMock()
    mock_page.workspace_id = uuid.uuid4()
    mock_db.get = AsyncMock(return_value=mock_page)

    mock_embedding_svc = AsyncMock()
    mock_embedding_svc.update_page_embedding = AsyncMock(return_value=None)

    mock_graph_svc = MagicMock()

    await update_embeddings_and_relations(
        page_id=page_id,
        db=mock_db,
        embedding_service=mock_embedding_svc,
        graph_service=mock_graph_svc,
    )

    mock_embedding_svc.find_similar_pages.assert_not_called()
    mock_graph_svc.upsert_similar_edges.assert_not_called()
