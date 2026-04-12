# Noema

> Notion을 대체하는 소규모 팀용 지식 관리 도구. AI 기능과 문서 관계 그래프를 내장한 셀프호스팅 솔루션.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

<!-- 스크린샷 플레이스홀더 -->
<!-- ![Noema 에디터 화면](docs/screenshot-editor.png) -->

## 목차

- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [시작하기](#시작하기)
- [프로덕션 배포](#프로덕션-배포)
- [API 엔드포인트](#api-엔드포인트)
- [환경변수](#환경변수)
- [라이선스](#라이선스)

---

## 주요 기능

**문서 에디터**
- BlockNote.js 기반 Notion 스타일 블록 에디터
- 슬래시(`/`) 커맨드로 블록 타입 변경 및 AI 기능 호출
- 중첩 페이지와 폴더 트리 구조의 사이드패널
- 드래그 앤 드롭으로 페이지 이동

**AI 기능** (Anthropic claude-sonnet-4-5)
- 문서 요약 및 Q&A
- 선택 텍스트 개선 및 번역
- 커서 위치 기준 자동완성
- 연결된 문서를 따라가며 답변하는 멀티 문서 Q&A
- 임베딩 기반 유사 문서 자동 탐색 (Voyage AI voyage-3)
- 모든 AI 응답은 SSE(Server-Sent Events) 스트리밍

**그래프 뷰** (Obsidian 스타일)
- Cytoscape.js로 문서 간 관계를 시각화
- 관계 종류별 색상 구분: 파랑(LINKS_TO), 초록(TAGGED_WITH), 회색 점선(SIMILAR_TO)
- 노드 크기는 연결 수에 비례
- 관계 종류별 필터 토글

**인증 및 팀 협업**
- Google OAuth 2.0 (NextAuth.js)
- 워크스페이스 멤버 역할: `owner` / `editor` / `viewer`
- 태그 기반 문서 분류 및 필터

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| 에디터 | BlockNote.js |
| 그래프 | Cytoscape.js |
| 상태 관리 | Zustand |
| 인증 | NextAuth.js (Google OAuth) |
| 백엔드 | FastAPI, Python 3.11+, Pydantic v2 |
| ORM | SQLAlchemy 2.0 + Alembic |
| 주 데이터베이스 | PostgreSQL 15 + pgvector |
| 그래프 데이터베이스 | Neo4j 5 |
| 캐시 | Redis 7 |
| AI | Anthropic API (claude-sonnet-4-5) |
| 임베딩 | Voyage AI (voyage-3) |
| 인프라 | Docker Compose, Nginx |

---

## 프로젝트 구조

```
noema/
├── frontend/                  # Next.js 앱
│   ├── app/
│   │   ├── (auth)/            # 로그인 페이지
│   │   ├── (app)/             # 인증 필요 페이지
│   │   │   └── workspace/[id]/
│   │   │       ├── page.tsx   # 문서 에디터
│   │   │       └── graph/     # 그래프 뷰
│   │   └── api/auth/          # NextAuth 핸들러
│   ├── components/
│   │   ├── editor/            # BlockNote 에디터 래퍼
│   │   ├── sidebar/           # 폴더 트리 사이드패널
│   │   ├── graph/             # Cytoscape 그래프 컴포넌트
│   │   └── ai/                # AI 기능 UI (슬래시 커맨드 등)
│   ├── lib/
│   │   ├── api.ts             # FastAPI 호출 클라이언트
│   │   └── auth.ts            # NextAuth 설정
│   └── types/                 # TypeScript 타입 정의
│
├── backend/                   # FastAPI 앱
│   ├── app/
│   │   ├── api/               # 라우터 (pages, blocks, ai, graph ...)
│   │   ├── services/          # 비즈니스 로직
│   │   ├── models/            # SQLAlchemy 모델
│   │   ├── schemas/           # Pydantic 스키마
│   │   └── db/                # PostgreSQL / Neo4j 연결
│   ├── alembic/               # DB 마이그레이션
│   ├── scripts/
│   │   └── init_neo4j.py      # Neo4j 인덱스 초기화
│   └── pyproject.toml
│
├── nginx/nginx.conf           # Reverse Proxy 설정
├── docker-compose.yml         # 인프라 (postgres, neo4j, redis)
└── docker-compose.prod.yml    # 프로덕션 전체 스택
```

---

## 시작하기

### 사전 요구사항

- [Docker](https://docs.docker.com/get-docker/) 및 Docker Compose
- [Node.js](https://nodejs.org/) 22 이상
- [Python](https://www.python.org/) 3.11 이상
- [uv](https://docs.astral.sh/uv/) (Python 패키지 매니저)

### 1. 저장소 클론

```bash
git clone https://github.com/roykang75/noema.git
cd noema
```

### 2. 환경변수 설정

**백엔드**

```bash
cp backend/.env.example backend/.env
```

`backend/.env`를 열어 아래 값을 채웁니다.

```env
ANTHROPIC_API_KEY=sk-ant-...
VOYAGE_API_KEY=pa-...
NEO4J_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
```

**프론트엔드**

```bash
cp frontend/.env.local.example frontend/.env.local
```

`frontend/.env.local`을 열어 아래 값을 채웁니다.

```env
NEXTAUTH_SECRET=your_nextauth_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 3. 인프라 시작 (PostgreSQL, Neo4j, Redis)

```bash
docker compose up -d
```

컨테이너 상태 확인:

```bash
docker compose ps
```

### 4. 백엔드 실행

```bash
cd backend

# 의존성 설치
uv sync

# DB 마이그레이션
uv run alembic upgrade head

# Neo4j 인덱스 초기화
uv run python -m scripts.init_neo4j

# 개발 서버 시작
uv run uvicorn app.main:app --reload --port 8000
```

API 문서: http://localhost:8000/docs

### 5. 프론트엔드 실행

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

앱: http://localhost:3000

---

## 프로덕션 배포

`docker-compose.prod.yml`은 백엔드, 프론트엔드, Nginx를 컨테이너로 함께 실행합니다. 인프라(`docker-compose.yml`)와 오버레이 방식으로 사용합니다.

```bash
# 환경변수 파일 준비 (백엔드, 프론트엔드 각각)
# backend/.env, frontend/.env.local 설정 완료 후

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

| 서비스 | 포트 |
|---|---|
| Nginx (진입점) | 80 |
| Frontend (Next.js) | 3000 (Nginx 경유) |
| Backend (FastAPI) | 8000 (Nginx 경유) |
| PostgreSQL | 5432 |
| Neo4j Browser | 7474 |
| Neo4j Bolt | 7687 |
| Redis | 6379 |

---

## API 엔드포인트

베이스 URL: `http://localhost:8000`

모든 엔드포인트는 `Authorization: Bearer <token>` 헤더가 필요합니다.

자동 생성 API 문서: http://localhost:8000/docs

### Pages

| 메서드 | 경로 | 설명 |
|---|---|---|
| `POST` | `/pages` | 페이지 생성 |
| `GET` | `/pages` | 페이지 목록 조회 |
| `GET` | `/pages/{page_id}` | 페이지 상세 조회 |
| `PATCH` | `/pages/{page_id}` | 페이지 수정 |
| `DELETE` | `/pages/{page_id}` | 페이지 삭제 (소프트 삭제) |

### Blocks

| 메서드 | 경로 | 설명 |
|---|---|---|
| `POST` | `/blocks` | 블록 생성 |
| `GET` | `/blocks` | 블록 목록 조회 |
| `GET` | `/blocks/{block_id}` | 블록 상세 조회 |
| `PATCH` | `/blocks/{block_id}` | 블록 수정 |
| `DELETE` | `/blocks/{block_id}` | 블록 삭제 |
| `PUT` | `/blocks/batch` | 블록 일괄 저장 |

### Tags

| 메서드 | 경로 | 설명 |
|---|---|---|
| `POST` | `/tags` | 태그 생성 |
| `GET` | `/tags` | 태그 목록 조회 |
| `PATCH` | `/tags/{tag_id}` | 태그 수정 |
| `DELETE` | `/tags/{tag_id}` | 태그 삭제 |
| `POST` | `/tags/page-tags` | 페이지에 태그 추가 |
| `DELETE` | `/tags/page-tags` | 페이지에서 태그 제거 |
| `GET` | `/tags/pages/{page_id}` | 페이지의 태그 목록 |

### Workspaces

| 메서드 | 경로 | 설명 |
|---|---|---|
| `POST` | `/workspaces` | 워크스페이스 생성 |
| `GET` | `/workspaces` | 워크스페이스 목록 조회 |
| `GET` | `/workspaces/{ws_id}` | 워크스페이스 상세 조회 |
| `PATCH` | `/workspaces/{ws_id}` | 워크스페이스 수정 |
| `POST` | `/workspaces/{ws_id}/members` | 멤버 추가 |
| `GET` | `/workspaces/{ws_id}/members` | 멤버 목록 조회 |
| `DELETE` | `/workspaces/{ws_id}/members/{member_id}` | 멤버 제거 |

### AI (SSE 스트리밍)

| 메서드 | 경로 | 설명 |
|---|---|---|
| `POST` | `/ai/summarize` | 페이지 전체 요약 |
| `POST` | `/ai/improve` | 선택 블록 텍스트 개선 |
| `POST` | `/ai/translate` | 선택 블록 번역 |
| `POST` | `/ai/ask` | 문서 기반 Q&A |
| `POST` | `/ai/ask-graph` | 연결 문서 순회 멀티 Q&A |
| `POST` | `/ai/complete` | 커서 위치 자동완성 |
| `POST` | `/ai/extract-relations` | 문서 간 유사도 계산 → Neo4j 저장 |

### 기타

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/auth/me` | 현재 유저 정보 |
| `GET` | `/graph/pages` | 그래프 노드/엣지 조회 |
| `POST` | `/uploads` | 파일 업로드 |
| `GET` | `/uploads/{filename}` | 파일 다운로드 |
| `GET` | `/health` | 헬스체크 |

---

## 환경변수

### 백엔드 (`backend/.env`)

| 변수 | 설명 | 예시 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | `postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase` |
| `NEO4J_URI` | Neo4j Bolt 주소 | `bolt://localhost:7687` |
| `NEO4J_USER` | Neo4j 사용자 | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j 비밀번호 | |
| `REDIS_URL` | Redis 연결 문자열 | `redis://localhost:6379` |
| `ANTHROPIC_API_KEY` | Anthropic API 키 | `sk-ant-...` |
| `VOYAGE_API_KEY` | Voyage AI API 키 (임베딩) | `pa-...` |
| `JWT_SECRET` | JWT 서명 비밀키 | |

### 프론트엔드 (`frontend/.env.local`)

| 변수 | 설명 | 예시 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | FastAPI 백엔드 URL | `http://localhost:8000` |
| `NEXTAUTH_URL` | NextAuth 콜백 URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | NextAuth 서명 비밀키 | |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 | |

---

## 라이선스

[MIT](LICENSE)
