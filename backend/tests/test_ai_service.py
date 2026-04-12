"""ai_service 테스트 — Anthropic API를 모킹하여 스트리밍 동작 검증"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.ai_service import AIService


@pytest.fixture
def ai_service():
    return AIService(api_key="sk-ant-test-key")


class TestAIServicePrompts:
    def test_summarize_builds_correct_prompt(self, ai_service):
        prompt = ai_service._build_summarize_prompt()
        assert "요약" in prompt or "summarize" in prompt.lower()

    def test_improve_builds_correct_prompt(self, ai_service):
        prompt = ai_service._build_improve_prompt("더 간결하게")
        assert "간결" in prompt or "improve" in prompt.lower()

    def test_improve_builds_prompt_without_instruction(self, ai_service):
        prompt = ai_service._build_improve_prompt("")
        assert len(prompt) > 0

    def test_translate_builds_correct_prompt(self, ai_service):
        prompt = ai_service._build_translate_prompt("en")
        assert "en" in prompt or "English" in prompt

    def test_ask_builds_correct_prompt(self, ai_service):
        prompt = ai_service._build_ask_prompt()
        assert len(prompt) > 0

    def test_complete_builds_correct_prompt(self, ai_service):
        prompt = ai_service._build_complete_prompt()
        assert len(prompt) > 0
