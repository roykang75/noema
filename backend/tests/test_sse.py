import json

from app.core.sse import format_token_event, format_done_event, format_error_event


def test_format_token_event():
    """토큰 이벤트가 올바른 SSE 형식인지 확인"""
    result = format_token_event("안녕하세요")
    parsed = json.loads(result)
    assert parsed == {"text": "안녕하세요"}


def test_format_done_event():
    """완료 이벤트가 올바른 형식인지 확인"""
    result = format_done_event("end_turn")
    parsed = json.loads(result)
    assert parsed == {"finish_reason": "end_turn"}


def test_format_error_event():
    """에러 이벤트가 올바른 형식인지 확인"""
    result = format_error_event("API 호출 실패", "anthropic_error")
    parsed = json.loads(result)
    assert parsed == {"message": "API 호출 실패", "code": "anthropic_error"}
