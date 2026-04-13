# AI Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FastAPI AI 서비스 레이어 구현 — Anthropic Claude SSE 스트리밍, Voyage AI 임베딩, pgvector 유사도 검색, Neo4j SIMILAR_TO 엣지 저장

**Architecture:** `ai_service.py`가 Anthropic Claude API 스트리밍을 담당하고, `embedding_service.py`가 Voyage AI 임베딩 + pgvector 유사도를 처리하며, `graph_service.py`가 Neo4j 엣지를 관리한다. `core/sse.py`가 SSE 스트리밍을 표준화하고, `api/ai.py` 라우터가 7개 엔드포인트를 노출한다.

**Tech Stack:** Python 3.11, FastAPI, Anthropic SDK, Voyage AI SDK, sse-starlette, pgvector, neo4j, SQLAlchemy 2.0 async

**Spec:** `docs/superpowers/specs/2026-04-12-ai-service-design.md`

---

## Prerequisites

이 플랜은 `docs/superpowers/plans/2026-04-12-initial-project-setup.md`의 Task 1~12가 완료된 상태를 전제로 한다. 즉:
- Docker Compose로 PostgreSQL+pgvector, Neo4j, Redis 실행 중
- `backend/` 에 FastAPI 앱, SQLAlchemy 모델, Alembic, config.py가 구성됨
- `.env` 파일에 환경변수 설정 완료

---

## File Structure

```
backend/
├── app/
│   ├── config.py                      # 수정: VOYAGE_API_KEY 추가
│   ├── core/
│   │   ├── __init__.py
│   │   └── sse.py                     # 신규: SSE 스트리밍 유틸리티
│   ├── models/
│   │   └── page.py                    # 수정: embedding 컬럼 추가
│   ├── schemas/
│   │   └── ai.py                      # 신규: AI 요청/응답 Pydantic 스키마
│   ├── services/
│   │   ├── ai_service.py              # 신규: Anthropic Claude 텍스트 생성
│   │   ├── embedding_service.py       # 신규: Voyage AI 임베딩 + 유사도
│   │   └── graph_service.py           # 신규: Neo4j 관계 조작
│   └── api/
│       └── ai.py                      # 신규: AI 라우터 (7개 엔드포인트)
├── alembic/
│   └── versions/                      # 신규: pages.embedding 마이그레이션
└── tests/
    ├── test_sse.py                    # 신규
    ├── test_schemas_ai.py             # 신규
    ├── test_ai_service.py             # 신규
    ├── test_embedding_service.py      # 신규
    ├── test_graph_service.py          # 신규
    └── test_api_ai.py                 # 신규
```

---

### Task 1: 의존성 추가 + 환경변수 확장

**Files:**
- Modify: `backend/pyproject.toml`
- Modify: `backend/app/config.py`
- Modify: `.env.example`
- Modify: `.env`

- [ ] **Step 1: pyproject.toml에 의존성 추가**

`backend/pyproject.toml`의 `dependencies` 리스트에 추가:

```toml
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "sqlalchemy[asyncio]>=2.0.0",
    "asyncpg>=0.30.0",
    "alembic>=1.14.0",
    "pydantic-settings>=2.0.0",
    "pgvector>=0.3.0",
    "neo4j>=5.0.0",
    "redis>=5.0.0",
    "anthropic>=0.40.0",
    "voyageai>=0.3.0",
    "sse-starlette>=2.0.0",
]
```

- [ ] **Step 2: 의존성 설치**

```bash
cd backend
uv sync --all-extras
```

Expected: 신규 패키지 3개 설치 완료

- [ ] **Step 3: config.py에 VOYAGE_API_KEY 추가**

`backend/app/config.py`의 `Settings` 클래스에 추가:

```python
class Settings(BaseSettings):
    # PostgreSQL
    DATABASE_URL: str

    # Neo4j
    NEO4J_URI: str
    NEO4J_USER: str
    NEO4J_PASSWORD: str

    # Redis
    REDIS_URL: str

    # JWT
    JWT_SECRET: str

    # Anthropic
    ANTHROPIC_API_KEY: str

    # Voyage AI
    VOYAGE_API_KEY: str

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}
```

주의: `ANTHROPIC_API_KEY`의 기본값 `""` 을 제거하여 필수 값으로 변경.

- [ ] **Step 4: .env.example 과 .env에 VOYAGE_API_KEY 추가**

`.env.example`에 추가:

```env
# Voyage AI
VOYAGE_API_KEY=
```

`.env`에 실제 키 값 설정.

- [ ] **Step 5: 기존 테스트 수정 — Settings 필수 필드 반영**

`backend/tests/test_config.py`에서 테스트 인스턴스에 신규 필수 필드 추가:

```python
from app.config import Settings


def test_settings_default_values():
    """기본값으로 Settings 인스턴스가 생성되는지 확인"""
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://test:test@localhost:5432/test",
        NEO4J_URI="bolt://localhost:7687",
        NEO4J_USER="neo4j",
        NEO4J_PASSWORD="test",
        REDIS_URL="redis://localhost:6379",
        JWT_SECRET="test_secret",
        ANTHROPIC_API_KEY="sk-ant-test",
        VOYAGE_API_KEY="pa-test",
    )
    assert settings.DATABASE_URL == "postgresql+asyncpg://test:test@localhost:5432/test"
    assert settings.ANTHROPIC_API_KEY == "sk-ant-test"
    assert settings.VOYAGE_API_KEY == "pa-test"
```

- [ ] **Step 6: 테스트 실행**

```bash
cd backend
uv run pytest tests/test_config.py -v
```

Expected: PASS

- [ ] **Step 7: 커밋**

```bash
git add backend/pyproject.toml backend/uv.lock backend/app/config.py .env.example backend/tests/test_config.py
git commit -m "chore: AI 서비스 의존성 추가 (anthropic, voyageai, sse-starlette)"
```

---

### Task 2: Page 모델에 embedding 컬럼 추가 + Alembic 마이그레이션

**Files:**
- Modify: `backend/app/models/page.py`
- Create: `backend/alembic/versions/<auto>_add_page_embedding.py`

- [ ] **Step 1: 테스트 작성**

```python
# backend/tests/test_page_embedding.py
from app.models.page import Page


def test_page_has_embedding_column():
    """pages 테이블에 embedding 컬럼이 존재하는지 확인"""
    column_names = {c.name for c in Page.__table__.columns}
    assert "embedding" in column_names


def test_page_embedding_is_vector_type():
    """embedding 컬럼이 vector 타입인지 확인"""
    col = Page.__table__.columns["embedding"]
    assert "vector" in str(col.type).lower() or "VECTOR" in str(col.type)
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
uv run pytest tests/test_page_embedding.py -v
```

Expected: FAIL — `"embedding" not in column_names`

- [ ] **Step 3: page.py에 embedding 컬럼 추가**

`backend/app/models/page.py`에 import 추가 및 컬럼 추가:

```python
# backend/app/models/page.py
"""페이지(문서) 모델"""

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Page(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """페이지 — Notion 스타일 문서 단위"""
    __tablename__ = "pages"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_page_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pages.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    # 페이지 전체 텍스트 임베딩 — 유사도 검색용
    embedding = mapped_column(Vector(1536), nullable=True)

    # 관계
    workspace = relationship("Workspace", backref="pages")
    creator = relationship("User", backref="created_pages")
    parent = relationship("Page", remote_side="Page.id", backref="children")
    blocks = relationship("Block", back_populates="page", cascade="all, delete-orphan")
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd backend
uv run pytest tests/test_page_embedding.py -v
```

Expected: PASS

- [ ] **Step 5: Alembic 마이그레이션 생성**

```bash
cd backend
uv run alembic revision --autogenerate -m "pages 테이블에 embedding vector(1536) 컬럼 추가"
```

Expected: `alembic/versions/` 에 새 마이그레이션 파일 생성

- [ ] **Step 6: 마이그레이션 실행**

```bash
cd backend
uv run alembic upgrade head
```

Expected: 마이그레이션 적용 완료

- [ ] **Step 7: 컬럼 확인**

```bash
docker compose exec postgres psql -U noema -d knowledgebase -c "\d pages" | grep embedding
```

Expected: `embedding | USER-DEFINED |` (vector 타입) 표시

- [ ] **Step 8: 커밋**

```bash
git add backend/app/models/page.py backend/alembic/versions/ backend/tests/test_page_embedding.py
git commit -m "feat: Page 모델에 embedding vector(1536) 컬럼 추가"
```

---

### Task 3: SSE 스트리밍 유틸리티 (core/sse.py)

**Files:**
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/core/sse.py`
- Create: `backend/tests/test_sse.py`

- [ ] **Step 1: 테스트 작성**

```python
# backend/tests/test_sse.py
import json
from collections.abc import AsyncGenerator

import pytest

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
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
uv run pytest tests/test_sse.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.core'`

- [ ] **Step 3: core/sse.py 구현**

```python
# backend/app/core/__init__.py
# (빈 파일)

# backend/app/core/sse.py
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
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd backend
uv run pytest tests/test_sse.py -v
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/app/core/ backend/tests/test_sse.py
git commit -m "feat: SSE 스트리밍 유틸리티 (이벤트 포맷팅 + EventSourceResponse)"
```

---

### Task 4: AI Pydantic 스키마

**Files:**
- Create: `backend/app/schemas/ai.py`
- Create: `backend/tests/test_schemas_ai.py`

- [ ] **Step 1: 테스트 작성**

```python
# backend/tests/test_schemas_ai.py
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
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
uv run pytest tests/test_schemas_ai.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.schemas.ai'`

- [ ] **Step 3: schemas/ai.py 구현**

```python
# backend/app/schemas/ai.py
"""AI 기능 요청/응답 Pydantic 스키마"""

from uuid import UUID

from pydantic import BaseModel, Field


class SummarizeRequest(BaseModel):
    """문서 요약 요청"""
    page_id: UUID


class ImproveRequest(BaseModel):
    """블록 텍스트 개선 요청"""
    block_id: UUID
    instruction: str = ""


class TranslateRequest(BaseModel):
    """블록 번역 요청"""
    block_id: UUID
    target_lang: str


class AskRequest(BaseModel):
    """단일 문서 Q&A 요청"""
    page_id: UUID
    question: str


class AskGraphRequest(BaseModel):
    """멀티문서 Q&A 요청"""
    page_id: UUID
    question: str
    depth: int = Field(default=1, ge=1, le=3)


class CompleteRequest(BaseModel):
    """텍스트 자동완성 요청"""
    page_id: UUID
    block_id: UUID
    cursor_context: str


class ExtractRelationsRequest(BaseModel):
    """유사도 관계 추출 요청"""
    page_id: UUID


class SimilarPageResponse(BaseModel):
    """유사 페이지 응답 항목"""
    page_id: UUID
    title: str
    score: float


class ExtractRelationsResponse(BaseModel):
    """유사도 관계 추출 응답"""
    relations: list[SimilarPageResponse]
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd backend
uv run pytest tests/test_schemas_ai.py -v
```

Expected: PASS (11 tests)

- [ ] **Step 5: 커밋**

```bash
git add backend/app/schemas/ai.py backend/tests/test_schemas_ai.py
git commit -m "feat: AI 기능 Pydantic 요청/응답 스키마"
```

---

### Task 5: ai_service.py — Anthropic Claude 스트리밍

**Files:**
- Create: `backend/app/services/ai_service.py`
- Create: `backend/tests/test_ai_service.py`

- [ ] **Step 1: 테스트 작성**

```python
# backend/tests/test_ai_service.py
"""ai_service 테스트 — Anthropic API를 모킹하여 스트리밍 동작 검증"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.ai_service import AIService


@pytest.fixture
def ai_service():
    return AIService(api_key="sk-ant-test-key")


class TestAIServicePrompts:
    """시스템 프롬프트가 올바르게 구성되는지 검증"""

    def test_summarize_builds_correct_prompt(self, ai_service):
        """요약 기능의 시스템 프롬프트 확인"""
        prompt = ai_service._build_summarize_prompt()
        assert "요약" in prompt or "summarize" in prompt.lower()

    def test_improve_builds_correct_prompt(self, ai_service):
        """텍스트 개선 프롬프트 확인"""
        prompt = ai_service._build_improve_prompt("더 간결하게")
        assert "간결" in prompt or "improve" in prompt.lower()

    def test_improve_builds_prompt_without_instruction(self, ai_service):
        """instruction 없이도 개선 프롬프트가 동작"""
        prompt = ai_service._build_improve_prompt("")
        assert len(prompt) > 0

    def test_translate_builds_correct_prompt(self, ai_service):
        """번역 프롬프트에 target_lang이 포함되는지 확인"""
        prompt = ai_service._build_translate_prompt("en")
        assert "en" in prompt or "English" in prompt

    def test_ask_builds_correct_prompt(self, ai_service):
        """Q&A 프롬프트 확인"""
        prompt = ai_service._build_ask_prompt()
        assert len(prompt) > 0

    def test_complete_builds_correct_prompt(self, ai_service):
        """자동완성 프롬프트 확인"""
        prompt = ai_service._build_complete_prompt()
        assert len(prompt) > 0


class TestAIServiceStream:
    """스트리밍 동작 검증 (Anthropic API 모킹)"""

    @pytest.mark.asyncio
    async def test_stream_response_yields_tokens(self, ai_service):
        """stream_response가 토큰을 올바르게 yield하는지 확인"""
        # Anthropic 스트리밍 응답 모킹
        mock_text_stream = AsyncMock()
        mock_text_stream.__aiter__ = lambda self: self
        mock_text_stream.__anext__ = AsyncMock(
            side_effect=["안녕", "하세요", StopAsyncIteration]
        )
        mock_text_stream.__aenter__ = AsyncMock(return_value=mock_text_stream)
        mock_text_stream.__aexit__ = AsyncMock(return_value=False)

        with patch.object(
            ai_service.client.messages,
            "stream",
            return_value=mock_text_stream,
        ):
            mock_text_stream.text_stream = mock_text_stream
            tokens = []
            async for token in ai_service.stream_response("system", "user"):
                tokens.append(token)

            assert tokens == ["안녕", "하세요"]

    @pytest.mark.asyncio
    async def test_stream_response_handles_api_error(self, ai_service):
        """API 에러 시 예외가 전파되는지 확인"""
        import anthropic

        with patch.object(
            ai_service.client.messages,
            "stream",
            side_effect=anthropic.APIError(
                message="rate limit",
                request=MagicMock(),
                body=None,
            ),
        ):
            with pytest.raises(anthropic.APIError):
                async for _ in ai_service.stream_response("system", "user"):
                    pass
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
uv run pytest tests/test_ai_service.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.ai_service'`

- [ ] **Step 3: ai_service.py 구현**

```python
# backend/app/services/ai_service.py
"""AI 서비스 — Anthropic Claude API 스트리밍 호출"""

import logging
from collections.abc import AsyncGenerator

import anthropic

logger = logging.getLogger(__name__)

# 기본 모델
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

    # --- 기능별 스트리밍 함수 ---

    async def summarize(
        self, page_text: str,
    ) -> AsyncGenerator[str, None]:
        """페이지 전체 텍스트를 요약"""
        system = self._build_summarize_prompt()
        async for token in self.stream_response(system, page_text):
            yield token

    async def improve(
        self, block_text: str, instruction: str = "",
    ) -> AsyncGenerator[str, None]:
        """선택한 블록 텍스트 개선"""
        system = self._build_improve_prompt(instruction)
        async for token in self.stream_response(system, block_text):
            yield token

    async def translate(
        self, block_text: str, target_lang: str,
    ) -> AsyncGenerator[str, None]:
        """선택한 블록 텍스트 번역"""
        system = self._build_translate_prompt(target_lang)
        async for token in self.stream_response(system, block_text):
            yield token

    async def ask(
        self, page_text: str, question: str,
    ) -> AsyncGenerator[str, None]:
        """단일 문서 기반 Q&A"""
        system = self._build_ask_prompt()
        user_message = f"## 문서 내용\n\n{page_text}\n\n## 질문\n\n{question}"
        async for token in self.stream_response(system, user_message):
            yield token

    async def ask_with_context(
        self, all_pages_text: str, question: str,
    ) -> AsyncGenerator[str, None]:
        """멀티문서 컨텍스트 기반 Q&A"""
        system = self._build_ask_prompt()
        user_message = (
            f"## 연결된 문서들\n\n{all_pages_text}\n\n## 질문\n\n{question}"
        )
        async for token in self.stream_response(system, user_message):
            yield token

    async def complete(
        self, context_before: str, context_after: str = "",
    ) -> AsyncGenerator[str, None]:
        """커서 위치 기준 텍스트 자동완성"""
        system = self._build_complete_prompt()
        user_message = f"[앞 텍스트]\n{context_before}\n\n[뒤 텍스트]\n{context_after}"
        async for token in self.stream_response(system, user_message, max_tokens=1024):
            yield token

    # --- 시스템 프롬프트 빌더 ---

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
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd backend
uv run pytest tests/test_ai_service.py -v
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/app/services/ai_service.py backend/tests/test_ai_service.py
git commit -m "feat: AIService — Anthropic Claude 스트리밍 (요약/개선/번역/Q&A/자동완성)"
```

---

### Task 6: embedding_service.py — Voyage AI 임베딩 + pgvector 유사도

**Files:**
- Create: `backend/app/services/embedding_service.py`
- Create: `backend/tests/test_embedding_service.py`

- [ ] **Step 1: 테스트 작성**

```python
# backend/tests/test_embedding_service.py
"""embedding_service 테스트 — Voyage AI API 모킹"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.embedding_service import EmbeddingService


@pytest.fixture
def embedding_service():
    return EmbeddingService(api_key="pa-test-key")


class TestGenerateEmbedding:

    @pytest.mark.asyncio
    async def test_generate_embedding_returns_vector(self, embedding_service):
        """임베딩 생성이 1536차원 벡터를 반환하는지 확인"""
        mock_result = MagicMock()
        mock_result.embeddings = [[0.1] * 1536]

        with patch.object(
            embedding_service.client,
            "embed",
            new_callable=AsyncMock,
            return_value=mock_result,
        ):
            result = await embedding_service.generate_embedding("테스트 텍스트")
            assert len(result) == 1536
            assert result[0] == 0.1

    @pytest.mark.asyncio
    async def test_generate_embedding_calls_voyage_with_correct_model(
        self, embedding_service
    ):
        """voyage-3 모델로 호출되는지 확인"""
        mock_result = MagicMock()
        mock_result.embeddings = [[0.0] * 1536]

        with patch.object(
            embedding_service.client,
            "embed",
            new_callable=AsyncMock,
            return_value=mock_result,
        ) as mock_embed:
            await embedding_service.generate_embedding("테스트")
            mock_embed.assert_called_once_with(
                texts=["테스트"],
                model="voyage-3",
            )


class TestExtractPageText:

    def test_extract_page_text_from_blocks(self, embedding_service):
        """블록 리스트에서 텍스트를 추출하는지 확인"""
        # JSONB content 구조를 시뮬레이션
        blocks = [
            MagicMock(
                type="paragraph",
                content={"text": [{"text": "첫 번째 문단"}]},
            ),
            MagicMock(
                type="heading",
                content={"text": [{"text": "제목입니다"}]},
            ),
        ]
        result = embedding_service.extract_text_from_blocks(blocks)
        assert "첫 번째 문단" in result
        assert "제목입니다" in result

    def test_extract_page_text_skips_empty_blocks(self, embedding_service):
        """content가 None인 블록은 건너뛰는지 확인"""
        blocks = [
            MagicMock(type="image", content=None),
            MagicMock(
                type="paragraph",
                content={"text": [{"text": "유효한 텍스트"}]},
            ),
        ]
        result = embedding_service.extract_text_from_blocks(blocks)
        assert "유효한 텍스트" in result
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
uv run pytest tests/test_embedding_service.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: embedding_service.py 구현**

```python
# backend/app/services/embedding_service.py
"""임베딩 서비스 — Voyage AI 임베딩 생성 + pgvector 유사도 검색"""

import logging
from uuid import UUID

import voyageai
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.block import Block
from app.models.page import Page

logger = logging.getLogger(__name__)

# Voyage AI 모델
EMBEDDING_MODEL = "voyage-3"
# 유사도 임계값
SIMILARITY_THRESHOLD = 0.7
# 최대 유사 페이지 수
TOP_K = 10


class EmbeddingService:
    """Voyage AI 임베딩 생성 + pgvector 유사도 검색"""

    def __init__(self, api_key: str) -> None:
        self.client = voyageai.AsyncClient(api_key=api_key)

    async def generate_embedding(self, text: str) -> list[float]:
        """텍스트 → 1536차원 벡터"""
        result = await self.client.embed(
            texts=[text],
            model=EMBEDDING_MODEL,
        )
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

    async def update_page_embedding(
        self,
        db: AsyncSession,
        page_id: UUID,
    ) -> list[float] | None:
        """페이지의 모든 블록 텍스트로 임베딩 생성 → pages.embedding 저장"""
        # 페이지 블록 조회
        result = await db.execute(
            select(Block)
            .where(Block.page_id == page_id)
            .order_by(Block.order)
        )
        blocks = result.scalars().all()

        if not blocks:
            return None

        page_text = self.extract_text_from_blocks(blocks)
        if not page_text.strip():
            return None

        # 임베딩 생성
        embedding = await self.generate_embedding(page_text)

        # pages.embedding 업데이트
        page = await db.get(Page, page_id)
        if page:
            page.embedding = embedding
            await db.flush()

        return embedding

    async def find_similar_pages(
        self,
        db: AsyncSession,
        page_id: UUID,
        workspace_id: UUID,
        top_k: int = TOP_K,
    ) -> list[dict]:
        """pgvector 코사인 유사도로 유사 페이지 검색

        Returns:
            [{"page_id": UUID, "title": str, "score": float}, ...]
        """
        # 현재 페이지 임베딩 조회
        page = await db.get(Page, page_id)
        if page is None or page.embedding is None:
            return []

        # pgvector 코사인 거리 연산자(<=>) 사용
        # 코사인 거리 = 1 - 코사인 유사도이므로 score = 1 - distance
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

        result = await db.execute(
            query,
            {
                "embedding": str(page.embedding),
                "workspace_id": str(workspace_id),
                "page_id": str(page_id),
                "threshold": SIMILARITY_THRESHOLD,
                "top_k": top_k,
            },
        )
        rows = result.fetchall()

        return [
            {"page_id": row.id, "title": row.title, "score": float(row.score)}
            for row in rows
        ]
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd backend
uv run pytest tests/test_embedding_service.py -v
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/app/services/embedding_service.py backend/tests/test_embedding_service.py
git commit -m "feat: EmbeddingService — Voyage AI 임베딩 + pgvector 유사도 검색"
```

---

### Task 7: graph_service.py — Neo4j 관계 조작

**Files:**
- Create: `backend/app/services/graph_service.py`
- Create: `backend/tests/test_graph_service.py`

- [ ] **Step 1: 테스트 작성**

```python
# backend/tests/test_graph_service.py
"""graph_service 테스트 — Neo4j 드라이버 모킹"""

import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.services.graph_service import GraphService


@pytest.fixture
def graph_service():
    mock_driver = MagicMock()
    return GraphService(driver=mock_driver)


class TestGetConnectedPages:

    def test_get_connected_pages_builds_correct_query_depth_1(self, graph_service):
        """depth=1일 때 올바른 Cypher 쿼리가 구성되는지 확인"""
        mock_session = MagicMock()
        mock_session.run.return_value = []
        graph_service.driver.session.return_value.__enter__ = MagicMock(
            return_value=mock_session
        )
        graph_service.driver.session.return_value.__exit__ = MagicMock(
            return_value=False
        )

        result = graph_service.get_connected_pages(
            page_id=uuid.uuid4(), depth=1,
        )
        assert isinstance(result, list)
        mock_session.run.assert_called_once()
        call_args = mock_session.run.call_args
        assert "*1" in call_args[0][0]

    def test_get_connected_pages_depth_clamped_to_max(self, graph_service):
        """depth > 3이면 3으로 제한되는지 확인"""
        mock_session = MagicMock()
        mock_session.run.return_value = []
        graph_service.driver.session.return_value.__enter__ = MagicMock(
            return_value=mock_session
        )
        graph_service.driver.session.return_value.__exit__ = MagicMock(
            return_value=False
        )

        graph_service.get_connected_pages(page_id=uuid.uuid4(), depth=5)
        call_args = mock_session.run.call_args
        assert "*3" in call_args[0][0] or "..3" in call_args[0][0]


class TestUpsertSimilarEdges:

    def test_upsert_similar_edges_runs_merge_query(self, graph_service):
        """SIMILAR_TO 엣지 upsert 시 MERGE 쿼리가 실행되는지 확인"""
        mock_session = MagicMock()
        graph_service.driver.session.return_value.__enter__ = MagicMock(
            return_value=mock_session
        )
        graph_service.driver.session.return_value.__exit__ = MagicMock(
            return_value=False
        )

        page_id = uuid.uuid4()
        similar_pages = [
            {"page_id": uuid.uuid4(), "title": "관련 문서", "score": 0.85},
        ]

        graph_service.upsert_similar_edges(page_id, similar_pages)
        mock_session.run.assert_called()
        call_args = mock_session.run.call_args
        assert "MERGE" in call_args[0][0]
        assert "SIMILAR_TO" in call_args[0][0]
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
uv run pytest tests/test_graph_service.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: graph_service.py 구현**

```python
# backend/app/services/graph_service.py
"""그래프 서비스 — Neo4j 관계 조작"""

import logging
from datetime import datetime, timezone
from uuid import UUID

from neo4j import Driver

logger = logging.getLogger(__name__)

MAX_DEPTH = 3


class GraphService:
    """Neo4j 그래프 관계 관리"""

    def __init__(self, driver: Driver) -> None:
        self.driver = driver

    def get_connected_pages(
        self,
        page_id: UUID,
        depth: int = 1,
    ) -> list[dict]:
        """N-hop 연결 문서 조회 (LINKS_TO + TAGGED_WITH + SIMILAR_TO)

        Returns:
            [{"page_id": str, "title": str, "relation": str, "score": float|None}, ...]
        """
        # depth 제한
        actual_depth = min(depth, MAX_DEPTH)

        query = f"""
            MATCH (start:Page {{id: $page_id}})
            MATCH (start)-[r*1..{actual_depth}]-(connected:Page)
            WHERE connected.id <> $page_id
            WITH DISTINCT connected, r
            RETURN connected.id AS page_id,
                   connected.title AS title
        """

        with self.driver.session() as session:
            result = session.run(query, {"page_id": str(page_id)})
            return [
                {
                    "page_id": record["page_id"],
                    "title": record["title"],
                }
                for record in result
            ]

    def upsert_similar_edges(
        self,
        page_id: UUID,
        similar_pages: list[dict],
    ) -> None:
        """SIMILAR_TO 엣지 upsert — 기존 엣지 score 업데이트

        Args:
            page_id: 기준 페이지 ID
            similar_pages: [{"page_id": UUID, "title": str, "score": float}, ...]
        """
        query = """
            MATCH (a:Page {id: $source_id})
            MATCH (b:Page {id: $target_id})
            MERGE (a)-[r:SIMILAR_TO]->(b)
            SET r.score = $score, r.updated_at = $updated_at
        """

        now = datetime.now(timezone.utc).isoformat()

        with self.driver.session() as session:
            for page in similar_pages:
                session.run(
                    query,
                    {
                        "source_id": str(page_id),
                        "target_id": str(page["page_id"]),
                        "score": page["score"],
                        "updated_at": now,
                    },
                )

        logger.info(
            "SIMILAR_TO 엣지 %d개 upsert 완료 (page_id=%s)",
            len(similar_pages),
            page_id,
        )

    def ensure_page_node(self, page_id: UUID, title: str, workspace_id: UUID) -> None:
        """Neo4j에 Page 노드가 없으면 생성"""
        query = """
            MERGE (p:Page {id: $id})
            SET p.title = $title, p.workspace_id = $workspace_id
        """
        with self.driver.session() as session:
            session.run(
                query,
                {
                    "id": str(page_id),
                    "title": title,
                    "workspace_id": str(workspace_id),
                },
            )
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd backend
uv run pytest tests/test_graph_service.py -v
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/app/services/graph_service.py backend/tests/test_graph_service.py
git commit -m "feat: GraphService — Neo4j 연결 문서 조회 + SIMILAR_TO 엣지 upsert"
```

---

### Task 8: 백그라운드 임베딩 파이프라인 통합

**Files:**
- Create: `backend/app/services/background.py`
- Create: `backend/tests/test_background.py`

- [ ] **Step 1: 테스트 작성**

```python
# backend/tests/test_background.py
"""백그라운드 임베딩 파이프라인 통합 테스트 (모킹)"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

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
    mock_embedding_svc.update_page_embedding = AsyncMock(
        return_value=[0.1] * 1536,
    )
    mock_embedding_svc.find_similar_pages = AsyncMock(
        return_value=[
            {"page_id": uuid.uuid4(), "title": "유사 문서", "score": 0.85},
        ],
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

    # 호출 순서 확인
    mock_embedding_svc.update_page_embedding.assert_called_once_with(
        mock_db, page_id,
    )
    mock_embedding_svc.find_similar_pages.assert_called_once_with(
        mock_db, page_id, workspace_id,
    )
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
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
uv run pytest tests/test_background.py -v
```

Expected: FAIL

- [ ] **Step 3: background.py 구현**

```python
# backend/app/services/background.py
"""백그라운드 임베딩 파이프라인 — 블록 저장 후 트리거"""

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.embedding_service import EmbeddingService
from app.services.graph_service import GraphService

logger = logging.getLogger(__name__)


async def update_embeddings_and_relations(
    page_id: UUID,
    db: AsyncSession,
    embedding_service: EmbeddingService,
    graph_service: GraphService,
) -> None:
    """백그라운드: 임베딩 생성 → 유사도 검색 → Neo4j 엣지 업데이트

    블록 CRUD API에서 BackgroundTasks로 호출됨.
    """
    try:
        # 1. 페이지 정보 조회
        from app.models.page import Page
        page = await db.get(Page, page_id)
        if page is None:
            logger.warning("페이지를 찾을 수 없음: %s", page_id)
            return

        # 2. 페이지 임베딩 생성 + 저장
        embedding = await embedding_service.update_page_embedding(db, page_id)
        if embedding is None:
            logger.info("임베딩 생성 스킵 (빈 텍스트): page_id=%s", page_id)
            return

        await db.commit()

        # 3. Neo4j에 Page 노드 보장
        graph_service.ensure_page_node(page_id, page.title, page.workspace_id)

        # 4. pgvector 유사도 검색
        similar_pages = await embedding_service.find_similar_pages(
            db, page_id, page.workspace_id,
        )

        if not similar_pages:
            logger.info("유사 페이지 없음: page_id=%s", page_id)
            return

        # 5. Neo4j SIMILAR_TO 엣지 upsert
        graph_service.upsert_similar_edges(page_id, similar_pages)

        logger.info(
            "임베딩 파이프라인 완료: page_id=%s, 유사 페이지 %d개",
            page_id,
            len(similar_pages),
        )

    except Exception:
        logger.exception("임베딩 파이프라인 에러: page_id=%s", page_id)
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd backend
uv run pytest tests/test_background.py -v
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/app/services/background.py backend/tests/test_background.py
git commit -m "feat: 백그라운드 임베딩 파이프라인 (임베딩 → 유사도 → Neo4j)"
```

---

### Task 9: AI 라우터 (api/ai.py) — 7개 엔드포인트

**Files:**
- Create: `backend/app/api/ai.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_api_ai.py`

- [ ] **Step 1: 테스트 작성**

```python
# backend/tests/test_api_ai.py
"""AI API 엔드포인트 테스트 — 서비스 레이어 모킹"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


# 헬퍼: 비동기 제너레이터 모킹
async def mock_token_generator(*tokens):
    for token in tokens:
        yield token


class TestSummarizeEndpoint:

    def test_summarize_returns_sse_content_type(self, client):
        """요약 엔드포인트가 text/event-stream을 반환하는지 확인"""
        page_id = str(uuid.uuid4())

        with patch("app.api.ai.get_ai_service") as mock_get_svc, \
             patch("app.api.ai.get_page_text", new_callable=AsyncMock) as mock_get_text:

            mock_svc = MagicMock()
            mock_svc.summarize = MagicMock(
                return_value=mock_token_generator("요약", " 결과")
            )
            mock_get_svc.return_value = mock_svc
            mock_get_text.return_value = "테스트 문서 내용"

            response = client.post(
                "/ai/summarize",
                json={"page_id": page_id},
            )
            assert response.status_code == 200
            assert "text/event-stream" in response.headers["content-type"]

    def test_summarize_rejects_invalid_page_id(self, client):
        """잘못된 page_id 형식이면 422를 반환하는지 확인"""
        response = client.post(
            "/ai/summarize",
            json={"page_id": "not-a-uuid"},
        )
        assert response.status_code == 422


class TestTranslateEndpoint:

    def test_translate_requires_target_lang(self, client):
        """target_lang이 없으면 422를 반환하는지 확인"""
        response = client.post(
            "/ai/translate",
            json={"block_id": str(uuid.uuid4())},
        )
        assert response.status_code == 422


class TestAskGraphEndpoint:

    def test_ask_graph_rejects_depth_over_3(self, client):
        """depth > 3이면 422를 반환하는지 확인"""
        response = client.post(
            "/ai/ask-graph",
            json={
                "page_id": str(uuid.uuid4()),
                "question": "테스트",
                "depth": 4,
            },
        )
        assert response.status_code == 422

    def test_ask_graph_accepts_valid_depth(self, client):
        """depth 1~3이면 정상 처리되는지 확인"""
        page_id = str(uuid.uuid4())

        with patch("app.api.ai.get_ai_service") as mock_get_svc, \
             patch("app.api.ai.get_page_text", new_callable=AsyncMock) as mock_text, \
             patch("app.api.ai.get_graph_service") as mock_get_graph, \
             patch("app.api.ai.get_connected_pages_text", new_callable=AsyncMock) as mock_ctx:

            mock_svc = MagicMock()
            mock_svc.ask_with_context = MagicMock(
                return_value=mock_token_generator("답변")
            )
            mock_get_svc.return_value = mock_svc
            mock_text.return_value = "문서 내용"
            mock_get_graph.return_value = MagicMock()
            mock_ctx.return_value = "연결 문서 내용"

            response = client.post(
                "/ai/ask-graph",
                json={
                    "page_id": page_id,
                    "question": "테스트 질문",
                    "depth": 2,
                },
            )
            assert response.status_code == 200


class TestExtractRelationsEndpoint:

    def test_extract_relations_returns_json(self, client):
        """유사도 추출이 JSON 응답을 반환하는지 확인"""
        page_id = str(uuid.uuid4())

        with patch("app.api.ai.get_embedding_service") as mock_get_emb, \
             patch("app.api.ai.get_graph_service") as mock_get_graph, \
             patch("app.api.ai.get_db_session", new_callable=AsyncMock) as mock_db:

            mock_emb = AsyncMock()
            mock_emb.update_page_embedding = AsyncMock(return_value=[0.1] * 1536)
            mock_emb.find_similar_pages = AsyncMock(
                return_value=[
                    {"page_id": uuid.uuid4(), "title": "유사 문서", "score": 0.85},
                ],
            )
            mock_get_emb.return_value = mock_emb

            mock_graph = MagicMock()
            mock_get_graph.return_value = mock_graph

            mock_session = AsyncMock()
            mock_page = MagicMock()
            mock_page.workspace_id = uuid.uuid4()
            mock_page.title = "테스트"
            mock_session.get = AsyncMock(return_value=mock_page)
            mock_db.return_value = mock_session

            response = client.post(
                "/ai/extract-relations",
                json={"page_id": page_id},
            )
            assert response.status_code == 200
            data = response.json()
            assert "relations" in data
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
uv run pytest tests/test_api_ai.py -v
```

Expected: FAIL

- [ ] **Step 3: api/ai.py 구현**

```python
# backend/app/api/ai.py
"""AI 기능 라우터 — 7개 엔드포인트"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.sse import create_sse_response
from app.models.block import Block
from app.models.page import Page
from app.schemas.ai import (
    AskGraphRequest,
    AskRequest,
    CompleteRequest,
    ExtractRelationsRequest,
    ExtractRelationsResponse,
    ImproveRequest,
    SimilarPageResponse,
    SummarizeRequest,
    TranslateRequest,
)
from app.services.ai_service import AIService
from app.services.embedding_service import EmbeddingService
from app.services.graph_service import GraphService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


# --- 의존성 주입 헬퍼 ---

def get_ai_service() -> AIService:
    settings = get_settings()
    return AIService(api_key=settings.ANTHROPIC_API_KEY)


def get_embedding_service() -> EmbeddingService:
    settings = get_settings()
    return EmbeddingService(api_key=settings.VOYAGE_API_KEY)


def get_graph_service() -> GraphService:
    from app.db.neo4j import get_neo4j_driver
    return GraphService(driver=get_neo4j_driver())


async def get_db_session() -> AsyncSession:  # type: ignore[misc]
    from app.db.postgres import async_session_factory
    async with async_session_factory() as session:
        yield session


async def get_page_text(page_id: UUID, db: AsyncSession) -> str:
    """페이지의 모든 블록 텍스트를 조합하여 반환"""
    result = await db.execute(
        select(Block).where(Block.page_id == page_id).order_by(Block.order)
    )
    blocks = result.scalars().all()
    if not blocks:
        raise HTTPException(status_code=404, detail="페이지에 블록이 없습니다")

    texts = []
    for block in blocks:
        if block.content is None:
            continue
        for item in block.content.get("text", []):
            if isinstance(item, dict) and "text" in item:
                texts.append(item["text"])
    return "\n".join(texts)


async def get_block_text(block_id: UUID, db: AsyncSession) -> str:
    """블록의 텍스트를 반환"""
    block = await db.get(Block, block_id)
    if block is None:
        raise HTTPException(status_code=404, detail="블록을 찾을 수 없습니다")
    if block.content is None:
        return ""
    texts = []
    for item in block.content.get("text", []):
        if isinstance(item, dict) and "text" in item:
            texts.append(item["text"])
    return "\n".join(texts)


async def get_connected_pages_text(
    page_id: UUID,
    depth: int,
    db: AsyncSession,
    graph_service: GraphService,
) -> str:
    """N-hop 연결 문서 텍스트를 조합하여 반환"""
    connected = graph_service.get_connected_pages(page_id, depth)
    if not connected:
        return ""

    all_texts = []
    for page_info in connected:
        result = await db.execute(
            select(Block)
            .where(Block.page_id == page_info["page_id"])
            .order_by(Block.order)
        )
        blocks = result.scalars().all()
        texts = []
        for block in blocks:
            if block.content is None:
                continue
            for item in block.content.get("text", []):
                if isinstance(item, dict) and "text" in item:
                    texts.append(item["text"])
        if texts:
            all_texts.append(f"### {page_info['title']}\n" + "\n".join(texts))

    return "\n\n---\n\n".join(all_texts)


# --- 엔드포인트 ---


@router.post("/summarize")
async def summarize(
    req: SummarizeRequest,
    ai_service: AIService = Depends(get_ai_service),
    db: AsyncSession = Depends(get_db_session),
):
    """문서 요약 — SSE 스트리밍"""
    page_text = await get_page_text(req.page_id, db)
    return create_sse_response(ai_service.summarize(page_text))


@router.post("/improve")
async def improve(
    req: ImproveRequest,
    ai_service: AIService = Depends(get_ai_service),
    db: AsyncSession = Depends(get_db_session),
):
    """블록 텍스트 개선 — SSE 스트리밍"""
    block_text = await get_block_text(req.block_id, db)
    return create_sse_response(ai_service.improve(block_text, req.instruction))


@router.post("/translate")
async def translate(
    req: TranslateRequest,
    ai_service: AIService = Depends(get_ai_service),
    db: AsyncSession = Depends(get_db_session),
):
    """블록 번역 — SSE 스트리밍"""
    block_text = await get_block_text(req.block_id, db)
    return create_sse_response(ai_service.translate(block_text, req.target_lang))


@router.post("/ask")
async def ask(
    req: AskRequest,
    ai_service: AIService = Depends(get_ai_service),
    db: AsyncSession = Depends(get_db_session),
):
    """단일 문서 Q&A — SSE 스트리밍"""
    page_text = await get_page_text(req.page_id, db)
    return create_sse_response(ai_service.ask(page_text, req.question))


@router.post("/ask-graph")
async def ask_graph(
    req: AskGraphRequest,
    ai_service: AIService = Depends(get_ai_service),
    graph_service: GraphService = Depends(get_graph_service),
    db: AsyncSession = Depends(get_db_session),
):
    """멀티문서 Q&A — 연결 문서 순회 + SSE 스트리밍"""
    page_text = await get_page_text(req.page_id, db)
    connected_text = await get_connected_pages_text(
        req.page_id, req.depth, db, graph_service,
    )
    full_context = page_text
    if connected_text:
        full_context += "\n\n---\n\n" + connected_text
    return create_sse_response(
        ai_service.ask_with_context(full_context, req.question)
    )


@router.post("/complete")
async def complete(
    req: CompleteRequest,
    ai_service: AIService = Depends(get_ai_service),
    db: AsyncSession = Depends(get_db_session),
):
    """텍스트 자동완성 — SSE 스트리밍"""
    # cursor_context를 앞/뒤 맥락으로 사용
    return create_sse_response(ai_service.complete(req.cursor_context))


@router.post("/extract-relations", response_model=ExtractRelationsResponse)
async def extract_relations(
    req: ExtractRelationsRequest,
    embedding_service: EmbeddingService = Depends(get_embedding_service),
    graph_service: GraphService = Depends(get_graph_service),
    db: AsyncSession = Depends(get_db_session),
):
    """유사도 관계 추출 — 임베딩 생성 + Neo4j 저장 (비스트리밍)"""
    page = await db.get(Page, req.page_id)
    if page is None:
        raise HTTPException(status_code=404, detail="페이지를 찾을 수 없습니다")

    # 임베딩 갱신
    embedding = await embedding_service.update_page_embedding(db, req.page_id)
    if embedding is None:
        return ExtractRelationsResponse(relations=[])

    await db.commit()

    # 유사도 검색
    similar = await embedding_service.find_similar_pages(
        db, req.page_id, page.workspace_id,
    )

    # Neo4j 엣지 업데이트
    if similar:
        graph_service.ensure_page_node(req.page_id, page.title, page.workspace_id)
        graph_service.upsert_similar_edges(req.page_id, similar)

    return ExtractRelationsResponse(
        relations=[
            SimilarPageResponse(
                page_id=s["page_id"],
                title=s["title"],
                score=s["score"],
            )
            for s in similar
        ]
    )
```

- [ ] **Step 4: main.py에 AI 라우터 등록**

`backend/app/main.py`에 라우터 추가:

```python
# backend/app/main.py
"""FastAPI 앱 엔트리포인트"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ai import router as ai_router
from app.db.postgres import async_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 DB 연결 관리"""
    yield
    await async_engine.dispose()


app = FastAPI(
    title="Noema API",
    description="팀용 지식 관리 도구 API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS 설정 — 개발 환경
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(ai_router)


@app.get("/health")
async def health_check():
    """헬스체크 엔드포인트"""
    return {"status": "ok"}
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

```bash
cd backend
uv run pytest tests/test_api_ai.py -v
```

Expected: PASS

- [ ] **Step 6: 전체 테스트 실행**

```bash
cd backend
uv run pytest -v
```

Expected: ALL PASS

- [ ] **Step 7: 커밋**

```bash
git add backend/app/api/ai.py backend/app/main.py backend/tests/test_api_ai.py
git commit -m "feat: AI 라우터 — 7개 엔드포인트 (요약/개선/번역/Q&A/그래프Q&A/자동완성/관계추출)"
```

---

## Summary

| Task | 내용 | 핵심 파일 |
|------|------|-----------|
| 1 | 의존성 + 환경변수 확장 | `pyproject.toml`, `config.py` |
| 2 | Page embedding 컬럼 + 마이그레이션 | `page.py`, `alembic/` |
| 3 | SSE 스트리밍 유틸리티 | `core/sse.py` |
| 4 | AI Pydantic 스키마 | `schemas/ai.py` |
| 5 | AIService (Anthropic 스트리밍) | `services/ai_service.py` |
| 6 | EmbeddingService (Voyage AI + pgvector) | `services/embedding_service.py` |
| 7 | GraphService (Neo4j 관계) | `services/graph_service.py` |
| 8 | 백그라운드 파이프라인 통합 | `services/background.py` |
| 9 | AI 라우터 (7개 엔드포인트) | `api/ai.py`, `main.py` |

**총 9개 태스크, 약 15개 파일 생성/수정**
