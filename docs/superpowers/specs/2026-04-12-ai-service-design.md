# FastAPI AI Service Design Spec

**Date:** 2026-04-12
**Scope:** FastAPI AI 서비스 레이어 — SSE 스트리밍, 임베딩 생성, Neo4j 유사도 엣지 저장
**GitHub:** https://github.com/roykang75/noema

---

## 1. 개요

Noema 백엔드의 AI 기능을 담당하는 서비스 레이어를 구현한다. Anthropic Claude API(claude-sonnet-4-5)로 텍스트 생성을 처리하고, Voyage AI(voyage-3)로 임베딩을 생성하며, pgvector 유사도 검색 결과를 Neo4j SIMILAR_TO 엣지로 저장한다.

모든 텍스트 생성 엔드포인트는 SSE(Server-Sent Events) 스트리밍으로 응답한다.

---

## 2. 모듈 구조

```
backend/app/
├── api/
│   └── ai.py                  # AI 라우터 — 7개 엔드포인트
├── services/
│   ├── ai_service.py          # Anthropic Claude API 호출 (텍스트 생성)
│   ├── embedding_service.py   # Voyage AI 임베딩 + pgvector 유사도 검색
│   └── graph_service.py       # Neo4j SIMILAR_TO 엣지 CRUD
├── schemas/
│   └── ai.py                  # AI 요청/응답 Pydantic 스키마
└── core/
    └── sse.py                 # SSE 스트리밍 유틸리티
```

---

## 3. API 엔드포인트

| 엔드포인트 | 메서드 | 입력 | 출력 | 설명 |
|---|---|---|---|---|
| `/ai/summarize` | POST | `page_id: UUID` | SSE stream | 페이지 전체 블록을 읽어 요약 |
| `/ai/improve` | POST | `block_id: UUID`, `instruction: str = ""` | SSE stream | 선택 블록 텍스트 개선 |
| `/ai/translate` | POST | `block_id: UUID`, `target_lang: str` | SSE stream | 선택 블록 번역 |
| `/ai/ask` | POST | `page_id: UUID`, `question: str` | SSE stream | 단일 문서 Q&A |
| `/ai/ask-graph` | POST | `page_id: UUID`, `question: str`, `depth: int = 1` (max 3) | SSE stream | 연결 문서 순회 Q&A |
| `/ai/complete` | POST | `page_id: UUID`, `block_id: UUID`, `cursor_context: str` | SSE stream | 커서 위치 기준 자동완성 |
| `/ai/extract-relations` | POST | `page_id: UUID` | JSON | 유사도 계산 → Neo4j 저장 (비스트리밍) |

### 인증

모든 `/ai/*` 엔드포인트는 `Authorization: Bearer <token>` 헤더 필수. FastAPI `Depends()`로 현재 유저를 주입하고, 해당 페이지/블록에 대한 워크스페이스 접근 권한을 검증.

---

## 4. SSE 스트리밍 프로토콜

### 이벤트 형식

```
event: token
data: {"text": "생성된 텍스트 조각"}

event: done
data: {"finish_reason": "end_turn"}

event: error
data: {"message": "API 호출 실패", "code": "anthropic_error"}
```

### 에러 처리 전략 (하이브리드)

- **입력 검증 실패**: HTTP 422 (Pydantic 자동) 또는 400 (커스텀) — 스트림 시작 전 반환
- **스트림 중 Anthropic API 에러**: SSE `event: error` 이벤트로 전송 후 스트림 종료
- **임베딩/유사도 백그라운드 에러**: 로그만 기록, 사용자 응답에 영향 없음

---

## 5. 서비스 레이어 상세

### 5.1 ai_service.py — Anthropic Claude 호출

- **클라이언트**: `anthropic.AsyncAnthropic` (비동기)
- **모델**: `claude-sonnet-4-5`
- **스트리밍**: `client.messages.stream()` → AsyncGenerator로 토큰 yield

```python
# 핵심 인터페이스
async def stream_response(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 4096,
) -> AsyncGenerator[str, None]:
    """Anthropic 스트리밍 호출 → 토큰 단위 yield"""
```

기능별 함수:
- `summarize(page_blocks: list[Block]) -> AsyncGenerator[str, None]`
- `improve(block_text: str, instruction: str) -> AsyncGenerator[str, None]`
- `translate(block_text: str, target_lang: str) -> AsyncGenerator[str, None]`
- `ask(page_blocks: list[Block], question: str) -> AsyncGenerator[str, None]`
- `ask_with_context(all_blocks: list[Block], question: str) -> AsyncGenerator[str, None]`
- `complete(context_before: str, context_after: str) -> AsyncGenerator[str, None]`

각 함수는 적절한 시스템 프롬프트를 구성한 후 `stream_response`를 호출.

### 5.2 embedding_service.py — Voyage AI + pgvector

- **클라이언트**: `voyageai.AsyncClient`
- **모델**: `voyage-3` (1536차원)
- **유사도 검색**: pgvector 코사인 distance 연산자(`<=>`)
- **임계값**: `score >= 0.7`인 페이지만 SIMILAR_TO 엣지 생성
- **상한**: 워크스페이스 내 상위 10개 유사 페이지

```python
# 핵심 인터페이스
async def generate_embedding(text: str) -> list[float]:
    """텍스트 → 1536차원 벡터"""

async def find_similar_pages(
    page_id: UUID, workspace_id: UUID, top_k: int = 10,
) -> list[SimilarPage]:
    """pgvector 코사인 유사도 검색"""

async def update_embeddings_and_relations(page_id: UUID) -> None:
    """백그라운드: 임베딩 생성 → 유사도 검색 → Neo4j 엣지 업데이트"""
```

### 5.3 graph_service.py — Neo4j 관계 조작

```python
# 핵심 인터페이스
async def get_connected_pages(
    page_id: UUID, depth: int = 1, max_depth: int = 3,
) -> list[ConnectedPage]:
    """N-hop 연결 문서 조회 (LINKS_TO + TAGGED_WITH + SIMILAR_TO)"""

async def upsert_similar_edges(
    page_id: UUID, similar_pages: list[SimilarPage],
) -> None:
    """SIMILAR_TO 엣지 upsert (기존 엣지 score 업데이트)"""
```

### 5.4 core/sse.py — SSE 유틸리티

`sse-starlette` 패키지 사용. AsyncGenerator를 SSE EventSourceResponse로 변환하며, 토큰/완료/에러 이벤트를 표준화.

```python
async def create_sse_response(
    generator: AsyncGenerator[str, None],
) -> EventSourceResponse:
    """AsyncGenerator → SSE EventSourceResponse 변환"""
```

---

## 6. 백그라운드 임베딩 파이프라인

### 트리거

블록 CRUD API에서 블록 생성/수정 시 FastAPI `BackgroundTasks`에 등록:

```python
background_tasks.add_task(
    embedding_service.update_embeddings_and_relations,
    page_id=block.page_id,
)
```

### 파이프라인 흐름

1. 해당 페이지의 모든 블록 텍스트를 합침 (페이지 단위 임베딩)
2. Voyage AI로 페이지 임베딩 생성 → `pages.embedding` 컬럼 저장
3. 블록별 개별 임베딩 → `blocks.embedding` 컬럼 저장
4. 페이지 단위 임베딩으로 pgvector 코사인 유사도 검색 (같은 워크스페이스)
5. `score >= 0.7` & 상위 10개 → Neo4j `SIMILAR_TO` 엣지 upsert

### 중복 실행 방지

마지막 임베딩 시점과 현재 `updated_at`을 비교. 임베딩이 이미 최신이면 스킵.

### 데이터 모델 변경

`pages` 테이블에 `embedding vector(1536)` 컬럼 추가 (Alembic 마이그레이션 필요):

```sql
ALTER TABLE pages ADD COLUMN embedding vector(1536);
```

---

## 7. 데이터 흐름 요약

### 텍스트 생성 (요약/개선/번역/Q&A/자동완성)

```
클라이언트 → ai.py 라우터 (Pydantic 입력 검증)
  → ai_service.py (시스템 프롬프트 조합 + Anthropic 스트리밍 호출)
  → sse.py (EventSourceResponse로 변환)
  → 클라이언트 (SSE 이벤트 수신)
```

### 멀티문서 Q&A

```
클라이언트 → ai.py 라우터
  → graph_service.py (Neo4j에서 N-hop 연결 문서 조회)
  → PostgreSQL에서 연결된 페이지 블록 로딩
  → ai_service.py (전체 컨텍스트 + 질문으로 Anthropic 호출)
  → SSE 스트리밍 응답
```

### 임베딩 + 유사도 (백그라운드)

```
블록 저장 API → BackgroundTask 트리거
  → embedding_service.py (Voyage AI 임베딩 → pgvector 저장)
  → pgvector 유사도 검색 (상위 10개)
  → graph_service.py (Neo4j SIMILAR_TO 엣지 upsert)
```

---

## 8. 의존성

### 추가 Python 패키지

- `anthropic` — Claude API 클라이언트
- `voyageai` — Voyage AI 임베딩 클라이언트
- `sse-starlette` — FastAPI SSE 응답
- `httpx` — (anthropic SDK 내부 의존)

### 추가 환경변수

`config.py`의 `Settings` 클래스와 `.env.example`에 아래 항목을 추가해야 한다:

```env
ANTHROPIC_API_KEY=       # Anthropic API 키 (기존 — 값 필수로 변경)
VOYAGE_API_KEY=          # Voyage AI API 키 (신규 추가)
```

### 필수 인프라 (기존)

- PostgreSQL + pgvector — 임베딩 저장 + 유사도 검색
- Neo4j — SIMILAR_TO 엣지 저장
- Redis — AI 응답 캐시 (MVP 이후 적용)
