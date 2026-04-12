"""graph_service 테스트 — Neo4j 드라이버 모킹"""

import uuid
from unittest.mock import MagicMock

import pytest

from app.services.graph_service import GraphService


@pytest.fixture
def graph_service():
    mock_driver = MagicMock()
    return GraphService(driver=mock_driver)


class TestGetConnectedPages:
    def test_get_connected_pages_builds_correct_query_depth_1(self, graph_service):
        mock_session = MagicMock()
        mock_session.run.return_value = []
        graph_service.driver.session.return_value.__enter__ = MagicMock(return_value=mock_session)
        graph_service.driver.session.return_value.__exit__ = MagicMock(return_value=False)

        result = graph_service.get_connected_pages(page_id=uuid.uuid4(), depth=1)
        assert isinstance(result, list)
        mock_session.run.assert_called_once()
        call_args = mock_session.run.call_args
        assert "*1" in call_args[0][0]

    def test_get_connected_pages_depth_clamped_to_max(self, graph_service):
        mock_session = MagicMock()
        mock_session.run.return_value = []
        graph_service.driver.session.return_value.__enter__ = MagicMock(return_value=mock_session)
        graph_service.driver.session.return_value.__exit__ = MagicMock(return_value=False)

        graph_service.get_connected_pages(page_id=uuid.uuid4(), depth=5)
        call_args = mock_session.run.call_args
        # depth 5 should be clamped to 3
        assert "*3" in call_args[0][0] or "..3" in call_args[0][0]


class TestUpsertSimilarEdges:
    def test_upsert_similar_edges_runs_merge_query(self, graph_service):
        mock_session = MagicMock()
        graph_service.driver.session.return_value.__enter__ = MagicMock(return_value=mock_session)
        graph_service.driver.session.return_value.__exit__ = MagicMock(return_value=False)

        page_id = uuid.uuid4()
        similar_pages = [{"page_id": uuid.uuid4(), "title": "관련 문서", "score": 0.85}]

        graph_service.upsert_similar_edges(page_id, similar_pages)
        mock_session.run.assert_called()
        call_args = mock_session.run.call_args
        assert "MERGE" in call_args[0][0]
        assert "SIMILAR_TO" in call_args[0][0]
