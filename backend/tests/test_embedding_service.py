"""embedding_service 테스트 — Voyage AI API 모킹"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.embedding_service import EmbeddingService


@pytest.fixture
def embedding_service():
    return EmbeddingService(api_key="pa-test-key")


class TestGenerateEmbedding:
    @pytest.mark.asyncio
    async def test_generate_embedding_returns_vector(self, embedding_service):
        mock_result = MagicMock()
        mock_result.embeddings = [[0.1] * 1536]

        with patch.object(
            embedding_service.client, "embed",
            new_callable=AsyncMock, return_value=mock_result,
        ):
            result = await embedding_service.generate_embedding("테스트 텍스트")
            assert len(result) == 1536
            assert result[0] == 0.1

    @pytest.mark.asyncio
    async def test_generate_embedding_calls_voyage_with_correct_model(self, embedding_service):
        mock_result = MagicMock()
        mock_result.embeddings = [[0.0] * 1536]

        with patch.object(
            embedding_service.client, "embed",
            new_callable=AsyncMock, return_value=mock_result,
        ) as mock_embed:
            await embedding_service.generate_embedding("테스트")
            mock_embed.assert_called_once_with(texts=["테스트"], model="voyage-3")


class TestExtractPageText:
    def test_extract_page_text_from_blocks(self, embedding_service):
        blocks = [
            MagicMock(type="paragraph", content={"text": [{"text": "첫 번째 문단"}]}),
            MagicMock(type="heading", content={"text": [{"text": "제목입니다"}]}),
        ]
        result = embedding_service.extract_text_from_blocks(blocks)
        assert "첫 번째 문단" in result
        assert "제목입니다" in result

    def test_extract_page_text_skips_empty_blocks(self, embedding_service):
        blocks = [
            MagicMock(type="image", content=None),
            MagicMock(type="paragraph", content={"text": [{"text": "유효한 텍스트"}]}),
        ]
        result = embedding_service.extract_text_from_blocks(blocks)
        assert "유효한 텍스트" in result
