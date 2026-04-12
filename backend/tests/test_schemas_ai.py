import uuid

import pytest
from pydantic import ValidationError

from app.schemas.ai import (
    SummarizeRequest,
    ImproveRequest,
    TranslateRequest,
    AskRequest,
    AskGraphRequest,
    CompleteRequest,
    ExtractRelationsRequest,
)


def test_summarize_request_valid():
    req = SummarizeRequest(page_id=uuid.uuid4())
    assert req.page_id is not None


def test_improve_request_default_instruction():
    req = ImproveRequest(block_id=uuid.uuid4())
    assert req.instruction == ""


def test_improve_request_with_instruction():
    req = ImproveRequest(block_id=uuid.uuid4(), instruction="더 간결하게")
    assert req.instruction == "더 간결하게"


def test_translate_request_valid():
    req = TranslateRequest(block_id=uuid.uuid4(), target_lang="en")
    assert req.target_lang == "en"


def test_translate_request_missing_target_lang():
    with pytest.raises(ValidationError):
        TranslateRequest(block_id=uuid.uuid4())


def test_ask_request_valid():
    req = AskRequest(page_id=uuid.uuid4(), question="이 문서의 핵심은?")
    assert req.question == "이 문서의 핵심은?"


def test_ask_graph_request_default_depth():
    req = AskGraphRequest(page_id=uuid.uuid4(), question="연결 문서 요약")
    assert req.depth == 1


def test_ask_graph_request_max_depth():
    with pytest.raises(ValidationError):
        AskGraphRequest(page_id=uuid.uuid4(), question="test", depth=4)


def test_ask_graph_request_min_depth():
    with pytest.raises(ValidationError):
        AskGraphRequest(page_id=uuid.uuid4(), question="test", depth=0)


def test_complete_request_valid():
    req = CompleteRequest(
        page_id=uuid.uuid4(),
        block_id=uuid.uuid4(),
        cursor_context="이 프로젝트는",
    )
    assert req.cursor_context == "이 프로젝트는"


def test_extract_relations_request_valid():
    req = ExtractRelationsRequest(page_id=uuid.uuid4())
    assert req.page_id is not None
