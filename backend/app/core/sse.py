"""SSE 스트리밍 유틸리티 — 이벤트 포맷팅 + EventSourceResponse 생성"""

import json
import logging
from collections.abc import AsyncGenerator

from sse_starlette.sse import EventSourceResponse

logger = logging.getLogger(__name__)


def format_token_event(text: str) -> str:
    """토큰 이벤트 데이터 생성"""
    return json.dumps({"text": text}, ensure_ascii=False)


def format_done_event(finish_reason: str = "end_turn") -> str:
    """완료 이벤트 데이터 생성"""
    return json.dumps({"finish_reason": finish_reason}, ensure_ascii=False)


def format_error_event(message: str, code: str = "unknown") -> str:
    """에러 이벤트 데이터 생성"""
    return json.dumps({"message": message, "code": code}, ensure_ascii=False)


async def sse_event_generator(
    token_generator: AsyncGenerator[str, None],
) -> AsyncGenerator[dict, None]:
    """토큰 생성기를 SSE 이벤트 스트림으로 변환"""
    try:
        async for token in token_generator:
            yield {"event": "token", "data": format_token_event(token)}
        yield {"event": "done", "data": format_done_event()}
    except Exception as e:
        logger.error("SSE 스트리밍 중 에러: %s", e)
        yield {"event": "error", "data": format_error_event(str(e), "stream_error")}


def create_sse_response(
    token_generator: AsyncGenerator[str, None],
) -> EventSourceResponse:
    """AsyncGenerator → SSE EventSourceResponse 변환"""
    return EventSourceResponse(
        sse_event_generator(token_generator),
        media_type="text/event-stream",
    )
