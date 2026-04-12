# CLAUDE.md — Knowledge Base Project

이 파일은 Claude Code가 프로젝트 전반에 걸쳐 일관된 코드를 작성하기 위한 가이드입니다.
모든 코드 작성 전 이 파일을 먼저 참고하세요.

---

## 프로젝트 개요

Notion을 대체하는 팀용 지식 관리 도구입니다.
- 2~5명 소규모 팀
- 셀프호스팅 (Docker Compose)
- 문서 작성 + AI 기능 + 문서 관계 그래프 시각화

---

## 기술 스택

### 프론트엔드
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Editor**: BlockNote.js (Notion 스타일 블록 에디터)
- **Styling**: Tailwind CSS
- **Graph View**: Cytoscape.js (Obsidian 스타일 관계 시각화)
- **Auth**: NextAuth.js (Google OAuth 전용)
- **State**: Zustand

### 백엔드
- **Framework**: FastAPI (Python 3.11+)
- **ORM**: SQLAlchemy 2.0 + Alembic (마이그레이션)
- **Validation**: Pydantic v2

### 데이터베이스
- **PostgreSQL 15**: 문서, 블록, 유저, 워크스페이스 저장
  - pgvector 확장: 블록 단위 임베딩 벡터 저장 및 유사도 검색
- **Neo4j 5**: 문서 간 관계 그래프 저장
  - 명시적 관계: LINKS_TO (링크), TAGGED_WITH (태그)
  - 암묵적 관계: SIMILAR_TO (AI 유사도, 자동 계산)

### AI
- **Anthropic API**: claude-sonnet-4-5 모델 사용
  - 문서 요약
  - 문서 내 질문 답변 (Q&A)
  - 자동 관계 추출 (문서 간 SIMILAR_TO 엣지 생성)
  - 글쓰기 보조 (완성, 개선, 번역)
  - 멀티 문서 질의 (연결된 문서들을 따라가며 답변)
- **임베딩**: Voyage AI (voyage-3) → pgvector 저장

### 인프라
- **배포**: Docker Compose (셀프호스팅)
- **Reverse Proxy**: Nginx
- **Cache**: Redis (세션, AI 응답 캐시)

---

## 프로젝트 구조

```
/
├── frontend/                  # Next.js 앱
│   ├── app/
│   │   ├── (auth)/            # 로그인 페이지
│   │   ├── (app)/             # 인증 필요 페이지
│   │   │   ├── workspace/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx        # 문서 에디터
│   │   │   │   │   └── graph/          # 그래프 뷰
│   │   └── api/
│   │       └── auth/          # NextAuth 핸들러
│   ├── components/
│   │   ├── editor/            # BlockNote 에디터 래퍼
│   │   ├── sidebar/           # 폴더 트리 사이드패널
│   │   ├── graph/             # Cytoscape 그래프 컴포넌트
│   │   └── ai/                # AI 기능 UI (슬래시 커맨드 등)
│   └── lib/
│       ├── api.ts             # FastAPI 호출 클라이언트
│       └── auth.ts            # NextAuth 설정
│
├── backend/                   # FastAPI 앱
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   ├── pages.py       # 문서 CRUD
│   │   │   ├── blocks.py      # 블록 CRUD
│   │   │   ├── graph.py       # 관계 조회/생성
│   │   │   ├── ai.py          # AI 기능 엔드포인트
│   │   │   └── workspace.py   # 워크스페이스/유저
│   │   ├── services/
│   │   │   ├── page_service.py
│   │   │   ├── block_service.py
│   │   │   ├── graph_service.py   # Neo4j 조작
│   │   │   ├── ai_service.py      # Anthropic API 호출
│   │   │   └── embedding_service.py  # 임베딩 생성 + pgvector
│   │   ├── models/            # SQLAlchemy 모델
│   │   ├── schemas/           # Pydantic 스키마
│   │   └── db/
│   │       ├── postgres.py    # PostgreSQL 연결
│   │       └── neo4j.py       # Neo4j 연결
│   ├── alembic/               # DB 마이그레이션
│   └── requirements.txt
│
└── docker-compose.yml
```

---

## 데이터 모델

### PostgreSQL 스키마

```sql
-- 유저
users (
  id UUID PK,
  email TEXT UNIQUE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP
)

-- 워크스페이스
workspaces (
  id UUID PK,
  name TEXT,
  owner_id UUID FK → users,
  created_at TIMESTAMP
)

-- 워크스페이스 멤버
workspace_members (
  workspace_id UUID FK,
  user_id UUID FK,
  role TEXT  -- 'owner' | 'editor' | 'viewer'
)

-- 페이지 (문서)
pages (
  id UUID PK,
  workspace_id UUID FK,
  parent_page_id UUID FK NULLABLE,  -- 중첩 페이지
  title TEXT,
  icon TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_by UUID FK → users,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- 블록 (에디터 콘텐츠)
blocks (
  id UUID PK,
  page_id UUID FK → pages,
  parent_block_id UUID FK NULLABLE,  -- 중첩 블록
  type TEXT,        -- 'paragraph' | 'heading' | 'todo' | 'code' | 'image' ...
  content JSONB,    -- BlockNote 블록 JSON 그대로
  order FLOAT,      -- 순서 (1.0, 2.0, ... — 재정렬 시 중간값 삽입)
  embedding vector(1536),  -- pgvector: AI 유사도 검색용
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- 태그
tags (
  id UUID PK,
  workspace_id UUID FK,
  name TEXT,
  color TEXT
)

-- 페이지-태그 연결
page_tags (
  page_id UUID FK,
  tag_id UUID FK
)
```

### Neo4j 그래프 모델

```cypher
-- 노드
(:Page {id, title, workspace_id})
(:Tag  {id, name, color})

-- 명시적 관계 (사용자가 직접 생성)
(:Page)-[:LINKS_TO {created_at}]->(:Page)
(:Page)-[:TAGGED_WITH]->(:Tag)

-- 암묵적 관계 (AI 자동 생성)
(:Page)-[:SIMILAR_TO {score: float, updated_at}]->(:Page)
```

---

## AI 기능 명세

모든 AI 기능은 `/api/ai/` 하위 FastAPI 엔드포인트로 노출됩니다.

| 기능 | 엔드포인트 | 설명 |
|---|---|---|
| 문서 요약 | `POST /ai/summarize` | 페이지 전체 요약 |
| 블록 개선 | `POST /ai/improve` | 선택한 블록 텍스트 개선/재작성 |
| 번역 | `POST /ai/translate` | 선택 블록 번역 (target_lang 파라미터) |
| Q&A | `POST /ai/ask` | 문서 기반 질문 답변 |
| 멀티문서 Q&A | `POST /ai/ask-graph` | 연결된 문서들 순회하며 답변 |
| 자동완성 | `POST /ai/complete` | 커서 위치 기준 텍스트 자동완성 |
| 관계 추출 | `POST /ai/extract-relations` | 두 문서 간 유사도 계산 → Neo4j 저장 |
| 임베딩 생성 | 내부 호출 | 블록 저장 시 자동 트리거 |

AI 응답은 **SSE(Server-Sent Events)** 스트리밍으로 반환합니다.

---

## 인증 흐름

- **방식**: Google OAuth 2.0 (NextAuth.js)
- 소셜 로그인만 지원 (이메일/패스워드 없음)
- NextAuth 세션 토큰 → FastAPI 요청 시 `Authorization: Bearer <token>` 헤더로 전달
- FastAPI에서 토큰 검증 후 user_id 추출

---

## UI/UX 구조

### 사이드패널 (기본)
- 폴더 트리 구조로 페이지 계층 표시
- 드래그 앤 드롭으로 페이지 이동
- 태그 필터 기능
- 새 페이지 생성 버튼

### 에디터
- BlockNote.js 기반
- 슬래시(`/`) 커맨드로 AI 기능 접근
  - `/summarize`, `/improve`, `/translate`, `/ask` 등
- 텍스트 선택 시 AI 툴팁 메뉴 표시

### 그래프 뷰 (Obsidian 스타일)
- 사이드패널의 "Graph View" 버튼으로 전환
- Cytoscape.js로 렌더링
- 노드: 페이지 (크기 = 연결 수에 비례)
- 엣지 색상:
  - 파랑 = LINKS_TO
  - 초록 = TAGGED_WITH
  - 회색 점선 = SIMILAR_TO
- 클릭 시 해당 페이지로 이동
- 필터: 관계 종류별 토글

---

## Docker Compose 구성

```yaml
services:
  frontend:   # Next.js (port 3000)
  backend:    # FastAPI  (port 8000)
  postgres:   # PostgreSQL 15 + pgvector (port 5432)
  neo4j:      # Neo4j 5 (port 7474, 7687)
  redis:      # Redis 7 (port 6379)
  nginx:      # Reverse Proxy (port 80/443)
```

---

## 코드 작성 규칙

### 공통
- 모든 코드에 한국어 주석 작성
- 환경변수는 반드시 `.env` 파일에서 읽기 (하드코딩 금지)
- 에러 처리는 명시적으로 (빈 catch 블록 금지)

### FastAPI
- 모든 엔드포인트에 Pydantic 스키마 적용
- 비동기(`async def`) 우선 사용
- 서비스 레이어와 라우터 레이어 분리 유지
- AI 엔드포인트는 SSE 스트리밍 응답 사용

### Next.js
- Server Component 우선, 클라이언트 컴포넌트는 필요한 경우만
- API 호출은 `/lib/api.ts` 중앙화
- 타입은 `types/` 폴더에 집중 관리

### 데이터베이스
- PostgreSQL 직접 쿼리 금지 → SQLAlchemy ORM 사용
- Neo4j 쿼리는 `graph_service.py`에 집중
- 블록 저장 시 임베딩 생성은 백그라운드 태스크로 처리 (응답 지연 방지)

---

## 환경변수 목록

```env
# PostgreSQL
DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/knowledgebase

# Neo4j
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=

# Redis
REDIS_URL=redis://redis:6379

# Anthropic
ANTHROPIC_API_KEY=

# Voyage AI (임베딩)
VOYAGE_API_KEY=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# JWT
JWT_SECRET=
```

---

## MVP 개발 순서

1. **Docker Compose 기반 세팅** — 모든 서비스 컨테이너 구성
2. **PostgreSQL 스키마 + Alembic 마이그레이션**
3. **Neo4j 초기화 + 인덱스 설정**
4. **Google OAuth 인증** (NextAuth + FastAPI 토큰 검증)
5. **페이지/블록 CRUD API** (FastAPI)
6. **BlockNote 에디터 연동** (저장/불러오기)
7. **사이드패널 폴더 트리**
8. **AI 기능** (요약 → Q&A → 자동완성 순)
9. **임베딩 생성 + 유사도 계산 → Neo4j**
10. **Cytoscape.js 그래프 뷰**
