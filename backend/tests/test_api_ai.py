"""AI API 엔드포인트 테스트 — 서비스 레이어 모킹"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


async def mock_token_generator(*tokens):
    for token in tokens:
        yield token


class TestSummarizeEndpoint:
    def test_summarize_returns_sse_content_type(self, client):
        page_id = str(uuid.uuid4())

        with patch("app.api.ai.get_ai_service") as mock_get_svc, \
             patch("app.api.ai.get_page_text", new_callable=AsyncMock) as mock_get_text:

            mock_svc = MagicMock()
            mock_svc.summarize = MagicMock(return_value=mock_token_generator("요약", " 결과"))
            mock_get_svc.return_value = mock_svc
            mock_get_text.return_value = "테스트 문서 내용"

            response = client.post("/ai/summarize", json={"page_id": page_id})
            assert response.status_code == 200
            assert "text/event-stream" in response.headers["content-type"]

    def test_summarize_rejects_invalid_page_id(self, client):
        response = client.post("/ai/summarize", json={"page_id": "not-a-uuid"})
        assert response.status_code == 422


class TestTranslateEndpoint:
    def test_translate_requires_target_lang(self, client):
        response = client.post("/ai/translate", json={"block_id": str(uuid.uuid4())})
        assert response.status_code == 422


class TestAskGraphEndpoint:
    def test_ask_graph_rejects_depth_over_3(self, client):
        response = client.post("/ai/ask-graph", json={
            "page_id": str(uuid.uuid4()), "question": "테스트", "depth": 4,
        })
        assert response.status_code == 422

    def test_ask_graph_accepts_valid_depth(self, client):
        page_id = str(uuid.uuid4())

        with patch("app.api.ai.get_ai_service") as mock_get_svc, \
             patch("app.api.ai.get_page_text", new_callable=AsyncMock) as mock_text, \
             patch("app.api.ai.get_graph_service") as mock_get_graph, \
             patch("app.api.ai.get_connected_pages_text", new_callable=AsyncMock) as mock_ctx:

            mock_svc = MagicMock()
            mock_svc.ask_with_context = MagicMock(return_value=mock_token_generator("답변"))
            mock_get_svc.return_value = mock_svc
            mock_text.return_value = "문서 내용"
            mock_get_graph.return_value = MagicMock()
            mock_ctx.return_value = "연결 문서 내용"

            response = client.post("/ai/ask-graph", json={
                "page_id": page_id, "question": "테스트 질문", "depth": 2,
            })
            assert response.status_code == 200


class TestExtractRelationsEndpoint:
    def test_extract_relations_returns_json(self, client):
        page_id = str(uuid.uuid4())

        # DB 세션 모킹
        mock_session = AsyncMock()
        mock_page = MagicMock()
        mock_page.workspace_id = uuid.uuid4()
        mock_page.title = "테스트"
        mock_session.get = AsyncMock(return_value=mock_page)
        mock_session.commit = AsyncMock()

        # 임베딩 서비스 모킹
        mock_emb = AsyncMock()
        mock_emb.update_page_embedding = AsyncMock(return_value=[0.1] * 1536)
        mock_emb.find_similar_pages = AsyncMock(
            return_value=[{"page_id": uuid.uuid4(), "title": "유사 문서", "score": 0.85}],
        )

        # 그래프 서비스 모킹
        mock_graph = MagicMock()
        mock_graph.ensure_page_node = MagicMock()
        mock_graph.upsert_similar_edges = MagicMock()

        # FastAPI dependency_overrides로 모든 의존성 교체
        async def override_db():
            yield mock_session

        def override_embedding():
            return mock_emb

        def override_graph():
            return mock_graph

        from app.api.ai import get_db_session, get_embedding_service, get_graph_service
        app.dependency_overrides[get_db_session] = override_db
        app.dependency_overrides[get_embedding_service] = override_embedding
        app.dependency_overrides[get_graph_service] = override_graph

        try:
            response = client.post("/ai/extract-relations", json={"page_id": page_id})
            assert response.status_code == 200
            data = response.json()
            assert "relations" in data
        finally:
            app.dependency_overrides.clear()
