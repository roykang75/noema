"""AI 서비스 — Anthropic Claude API 스트리밍 호출"""

import logging
from collections.abc import AsyncGenerator

import anthropic

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-5-20250514"


class AIService:
    """Anthropic Claude API를 통한 텍스트 생성 서비스"""

    def __init__(self, api_key: str) -> None:
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    async def stream_response(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        """Anthropic 스트리밍 호출 → 토큰 단위 yield"""
        async with self.client.messages.stream(
            model=MODEL,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def summarize(self, page_text: str) -> AsyncGenerator[str, None]:
        """페이지 전체 텍스트를 요약"""
        system = self._build_summarize_prompt()
        async for token in self.stream_response(system, page_text):
            yield token

    async def improve(self, block_text: str, instruction: str = "") -> AsyncGenerator[str, None]:
        """선택한 블록 텍스트 개선"""
        system = self._build_improve_prompt(instruction)
        async for token in self.stream_response(system, block_text):
            yield token

    async def translate(self, block_text: str, target_lang: str) -> AsyncGenerator[str, None]:
        """선택한 블록 텍스트 번역"""
        system = self._build_translate_prompt(target_lang)
        async for token in self.stream_response(system, block_text):
            yield token

    async def ask(self, page_text: str, question: str) -> AsyncGenerator[str, None]:
        """단일 문서 기반 Q&A"""
        system = self._build_ask_prompt()
        user_message = f"## 문서 내용\n\n{page_text}\n\n## 질문\n\n{question}"
        async for token in self.stream_response(system, user_message):
            yield token

    async def ask_with_context(self, all_pages_text: str, question: str) -> AsyncGenerator[str, None]:
        """멀티문서 컨텍스트 기반 Q&A"""
        system = self._build_ask_prompt()
        user_message = f"## 연결된 문서들\n\n{all_pages_text}\n\n## 질문\n\n{question}"
        async for token in self.stream_response(system, user_message):
            yield token

    async def complete(self, context_before: str, context_after: str = "") -> AsyncGenerator[str, None]:
        """커서 위치 기준 텍스트 자동완성"""
        system = self._build_complete_prompt()
        user_message = f"[앞 텍스트]\n{context_before}\n\n[뒤 텍스트]\n{context_after}"
        async for token in self.stream_response(system, user_message, max_tokens=1024):
            yield token

    def _build_summarize_prompt(self) -> str:
        return (
            "당신은 문서 요약 전문가입니다. "
            "주어진 문서의 핵심 내용을 간결하고 명확하게 요약해주세요. "
            "중요한 포인트를 빠뜨리지 말고, 불필요한 세부사항은 생략하세요. "
            "한국어로 응답하세요."
        )

    def _build_improve_prompt(self, instruction: str) -> str:
        base = (
            "당신은 글쓰기 전문가입니다. "
            "주어진 텍스트를 더 명확하고 읽기 좋게 개선해주세요. "
            "원문의 의미를 유지하면서 문체와 표현을 다듬으세요."
        )
        if instruction:
            base += f"\n\n추가 지시사항: {instruction}"
        return base

    def _build_translate_prompt(self, target_lang: str) -> str:
        return (
            f"당신은 전문 번역가입니다. "
            f"주어진 텍스트를 {target_lang}로 정확하게 번역해주세요. "
            f"자연스러운 표현을 사용하고, 원문의 뉘앙스를 살려주세요. "
            f"번역 결과만 출력하세요."
        )

    def _build_ask_prompt(self) -> str:
        return (
            "당신은 지식 관리 도우미입니다. "
            "주어진 문서 내용을 기반으로 사용자의 질문에 정확하게 답변해주세요. "
            "문서에 없는 내용은 추측하지 말고, 문서에서 찾을 수 없다고 알려주세요. "
            "한국어로 응답하세요."
        )

    def _build_complete_prompt(self) -> str:
        return (
            "당신은 글쓰기 보조 도구입니다. "
            "[앞 텍스트]와 [뒤 텍스트] 사이에 들어갈 자연스러운 텍스트를 생성해주세요. "
            "앞뒤 맥락에 맞는 내용만 출력하세요. 설명이나 주석 없이 텍스트만 출력하세요."
        )
