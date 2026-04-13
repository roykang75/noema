# Initial Project Setup — Docker Compose + Backend + Data Models

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Docker Compose 인프라(PostgreSQL+pgvector, Neo4j, Redis) 구성, FastAPI 백엔드 프로젝트 초기화, CLAUDE.md 데이터 모델 기반 SQLAlchemy 모델 + Alembic 마이그레이션 + Neo4j 초기화 스크립트 작성

**Architecture:** 모노레포 루트에 `docker-compose.yml`로 인프라 서비스를 관리하고, `backend/` 디렉토리에 FastAPI 앱을 구성한다. SQLAlchemy 2.0 async 모델로 PostgreSQL 스키마를 정의하고, Alembic으로 마이그레이션을 관리한다. Neo4j는 Python 스크립트로 인덱스/제약조건을 초기화한다.

**Tech Stack:** Python 3.11, uv, FastAPI, SQLAlchemy 2.0 (asyncpg), Alembic, pgvector, neo4j (Python driver), Redis, Docker Compose

---

## File Structure

```
noema/
├── docker-compose.yml                  # PostgreSQL+pgvector, Neo4j, Redis
├── .env.example                        # 환경변수 템플릿
├── .gitignore                          # Python, Node, Docker, .env 등
├── nginx/
│   └── nginx.conf                      # 프로덕션용 Nginx 설정 (개발 시 미사용)
├── backend/
│   ├── pyproject.toml                  # uv 패키지 관리
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                     # FastAPI 앱 생성, 라우터 등록
│   │   ├── config.py                   # pydantic-settings 환경변수
│   │   ├── models/
│   │   │   ├── __init__.py             # Base + 전체 모델 re-export
│   │   │   ├── base.py                 # DeclarativeBase, 공통 믹스인
│   │   │   ├── user.py                 # User 모델
│   │   │   ├── workspace.py            # Workspace, WorkspaceMember 모델
│   │   │   ├── page.py                 # Page 모델
│   │   │   ├── block.py                # Block 모델 (pgvector 포함)
│   │   │   └── tag.py                  # Tag, PageTag 모델
│   │   ├── schemas/
│   │   │   └── __init__.py
│   │   ├── services/
│   │   │   └── __init__.py
│   │   ├── api/
│   │   │   └── __init__.py
│   │   └── db/
│   │       ├── __init__.py
│   │       ├── postgres.py             # async 엔진 + 세션 팩토리
│   │       └── neo4j.py                # Neo4j 드라이버 연결
│   ├── scripts/
│   │   └── init_neo4j.py               # Neo4j 인덱스/제약조건 초기화
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py                      # async 마이그레이션 설정
│   │   ├── script.py.mako
│   │   └── versions/                   # 마이그레이션 파일
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py                 # DB 픽스처
│       └── test_models.py              # 모델 테스트
└── frontend/                           # (이번 플랜 범위 밖 — 빈 디렉토리만 생성)
```

---

### Task 1: 프로젝트 루트 파일 생성 (docker-compose, .env, .gitignore)

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `nginx/nginx.conf`

- [ ] **Step 1: docker-compose.yml 작성**

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg15
    container_name: noema-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-noema}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-noema_dev}
      POSTGRES_DB: ${POSTGRES_DB:-knowledgebase}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-noema}"]
      interval: 5s
      timeout: 5s
      retries: 5

  neo4j:
    image: neo4j:5
    container_name: noema-neo4j
    environment:
      NEO4J_AUTH: neo4j/${NEO4J_PASSWORD:-neo4j_dev}
      NEO4J_PLUGINS: '["apoc"]'
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - neo4j_data:/data
    healthcheck:
      test: ["CMD", "neo4j", "status"]
      interval: 10s
      timeout: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: noema-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
  neo4j_data:
  redis_data:
```

- [ ] **Step 2: .env.example 작성**

```env
# PostgreSQL
POSTGRES_USER=noema
POSTGRES_PASSWORD=noema_dev
POSTGRES_DB=knowledgebase
DATABASE_URL=postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j_dev

# Redis
REDIS_URL=redis://localhost:6379

# Anthropic
ANTHROPIC_API_KEY=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# JWT
JWT_SECRET=change_me_in_production
```

- [ ] **Step 3: .gitignore 작성**

```gitignore
# Python
__pycache__/
*.py[cod]
*.egg-info/
dist/
.venv/

# Node
node_modules/
.next/
out/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/

# Docker
postgres_data/
neo4j_data/

# OS
.DS_Store

# OMC
.omc/
```

- [ ] **Step 4: nginx/nginx.conf 작성 (프로덕션용 템플릿)**

```nginx
upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:8000;
}

server {
    listen 80;
    server_name localhost;

    # 프론트엔드
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 백엔드 API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE 지원
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }
}
```

- [ ] **Step 5: 인프라 서비스 시작 및 확인**

```bash
cp .env.example .env
docker compose up -d
docker compose ps  # 3개 서비스 모두 healthy 확인
```

Expected: postgres, neo4j, redis 모두 running/healthy

- [ ] **Step 6: 커밋**

```bash
git init
git add docker-compose.yml .env.example .gitignore nginx/nginx.conf
git commit -m "infra: Docker Compose 구성 (PostgreSQL+pgvector, Neo4j, Redis)"
```

---

### Task 2: uv 프로젝트 초기화 + 의존성 설치

**Files:**
- Create: `backend/pyproject.toml`

- [ ] **Step 1: backend 디렉토리 생성 및 uv 프로젝트 초기화**

```bash
mkdir -p backend
cd backend
uv init --no-readme
```

- [ ] **Step 2: pyproject.toml 작성**

```toml
[project]
name = "noema-backend"
version = "0.1.0"
description = "Noema — 팀용 지식 관리 도구 백엔드"
requires-python = ">=3.11"
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
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.24.0",
    "httpx>=0.27.0",
]
```

- [ ] **Step 3: 의존성 설치**

```bash
cd backend
uv sync --all-extras
```

Expected: `.venv` 생성, 모든 패키지 설치 완료

- [ ] **Step 4: 커밋**

```bash
git add backend/pyproject.toml backend/uv.lock
git commit -m "chore: uv 프로젝트 초기화 및 의존성 설치"
```

---

### Task 3: 환경변수 설정 (config.py)

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`

- [ ] **Step 1: 테스트 작성**

```python
# backend/tests/__init__.py
# (빈 파일)

# backend/tests/test_config.py
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
    )
    assert settings.DATABASE_URL == "postgresql+asyncpg://test:test@localhost:5432/test"
    assert settings.NEO4J_URI == "bolt://localhost:7687"
    assert settings.JWT_SECRET == "test_secret"
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
uv run pytest tests/test_config.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app'`

- [ ] **Step 3: config.py 구현**

```python
# backend/app/__init__.py
# (빈 파일)

# backend/app/config.py
"""환경변수 설정 — pydantic-settings 기반"""

from functools import lru_cache

from pydantic_settings import BaseSettings


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

    # Anthropic (선택)
    ANTHROPIC_API_KEY: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    """싱글턴 Settings 인스턴스 반환"""
    return Settings()  # type: ignore[call-arg]
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd backend
uv run pytest tests/test_config.py -v
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/app/__init__.py backend/app/config.py backend/tests/__init__.py backend/tests/test_config.py
git commit -m "feat: pydantic-settings 기반 환경변수 설정"
```

---

### Task 4: PostgreSQL 비동기 연결 설정

**Files:**
- Create: `backend/app/db/__init__.py`
- Create: `backend/app/db/postgres.py`

- [ ] **Step 1: 테스트 작성**

```python
# backend/tests/test_db_postgres.py
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.db.postgres import async_engine, async_session_factory


def test_async_engine_is_created():
    """async 엔진이 AsyncEngine 인스턴스인지 확인"""
    assert isinstance(async_engine, AsyncEngine)


def test_async_session_factory_returns_session():
    """세션 팩토리가 AsyncSession을 반환하는지 확인"""
    session = async_session_factory()
    assert isinstance(session, AsyncSession)
    # 세션 닫기 (이벤트 루프 없이 동기적으로 처리)
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run pytest tests/test_db_postgres.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.db'`

- [ ] **Step 3: postgres.py 구현**

```python
# backend/app/db/__init__.py
# (빈 파일)

# backend/app/db/postgres.py
"""PostgreSQL 비동기 연결 — SQLAlchemy 2.0 async"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings

settings = get_settings()

# 비동기 엔진 생성
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
)

# 세션 팩토리
async_session_factory = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:  # type: ignore[misc]
    """FastAPI 의존성 주입용 DB 세션 제너레이터"""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run pytest tests/test_db_postgres.py -v
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/app/db/
git add backend/tests/test_db_postgres.py
git commit -m "feat: PostgreSQL 비동기 연결 설정 (SQLAlchemy async)"
```

---

### Task 5: SQLAlchemy 모델 — Base + User

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/base.py`
- Create: `backend/app/models/user.py`

- [ ] **Step 1: 테스트 작성**

```python
# backend/tests/test_models.py
import uuid
from datetime import datetime

from app.models.user import User


def test_user_model_table_name():
    """User 모델의 테이블명이 'users'인지 확인"""
    assert User.__tablename__ == "users"


def test_user_model_columns():
    """User 모델에 필수 컬럼이 존재하는지 확인"""
    column_names = {c.name for c in User.__table__.columns}
    assert column_names == {"id", "email", "name", "avatar_url", "created_at"}


def test_user_model_instantiation():
    """User 모델 인스턴스 생성 확인"""
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        name="테스트 유저",
    )
    assert user.email == "test@example.com"
    assert user.name == "테스트 유저"
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run pytest tests/test_models.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.models'`

- [ ] **Step 3: base.py 구현**

```python
# backend/app/models/__init__.py
# (빈 파일 — Task 7에서 re-export 추가)

# backend/app/models/base.py
"""SQLAlchemy 선언적 베이스 + 공통 믹스인"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """모든 모델의 기본 클래스"""
    pass


class TimestampMixin:
    """created_at 자동 설정 믹스인"""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class UUIDPrimaryKeyMixin:
    """UUID 기본키 믹스인"""
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
```

- [ ] **Step 4: user.py 구현**

```python
# backend/app/models/user.py
"""유저 모델"""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """유저 테이블 — Google OAuth로 인증된 사용자"""
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run pytest tests/test_models.py -v
```

Expected: PASS (3 tests)

- [ ] **Step 6: 커밋**

```bash
git add backend/app/models/
git add backend/tests/test_models.py
git commit -m "feat: SQLAlchemy Base 믹스인 + User 모델"
```

---

### Task 6: SQLAlchemy 모델 — Workspace + WorkspaceMember

**Files:**
- Create: `backend/app/models/workspace.py`
- Modify: `backend/tests/test_models.py`

- [ ] **Step 1: 테스트 추가 (test_models.py에 append)**

```python
# backend/tests/test_models.py 에 추가
import uuid

from app.models.workspace import Workspace, WorkspaceMember


def test_workspace_model_table_name():
    assert Workspace.__tablename__ == "workspaces"


def test_workspace_model_columns():
    column_names = {c.name for c in Workspace.__table__.columns}
    assert column_names == {"id", "name", "owner_id", "created_at"}


def test_workspace_member_model_table_name():
    assert WorkspaceMember.__tablename__ == "workspace_members"


def test_workspace_member_model_columns():
    column_names = {c.name for c in WorkspaceMember.__table__.columns}
    assert column_names == {"workspace_id", "user_id", "role"}


def test_workspace_member_instantiation():
    wm = WorkspaceMember(
        workspace_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        role="editor",
    )
    assert wm.role == "editor"
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run pytest tests/test_models.py -v -k "workspace"
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.models.workspace'`

- [ ] **Step 3: workspace.py 구현**

```python
# backend/app/models/workspace.py
"""워크스페이스 모델"""

import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Workspace(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """워크스페이스 — 팀 단위 문서 관리 공간"""
    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # 관계
    owner = relationship("User", backref="owned_workspaces")
    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")


class WorkspaceMember(Base):
    """워크스페이스 멤버 — 역할 기반 접근 제어"""
    __tablename__ = "workspace_members"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="viewer",
    )

    # 관계
    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", backref="workspace_memberships")
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run pytest tests/test_models.py -v
```

Expected: PASS (all tests)

- [ ] **Step 5: 커밋**

```bash
git add backend/app/models/workspace.py backend/tests/test_models.py
git commit -m "feat: Workspace + WorkspaceMember 모델"
```

---

### Task 7: SQLAlchemy 모델 — Page

**Files:**
- Create: `backend/app/models/page.py`
- Modify: `backend/tests/test_models.py`

- [ ] **Step 1: 테스트 추가**

```python
# backend/tests/test_models.py 에 추가
from app.models.page import Page


def test_page_model_table_name():
    assert Page.__tablename__ == "pages"


def test_page_model_columns():
    column_names = {c.name for c in Page.__table__.columns}
    expected = {
        "id", "workspace_id", "parent_page_id", "title",
        "icon", "is_deleted", "created_by", "created_at", "updated_at",
    }
    assert column_names == expected


def test_page_self_referential_fk():
    """parent_page_id가 pages.id를 참조하는지 확인"""
    fk_targets = set()
    for c in Page.__table__.columns:
        for fk in c.foreign_keys:
            fk_targets.add(fk.target_fullname)
    assert "pages.id" in fk_targets
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run pytest tests/test_models.py -v -k "page"
```

Expected: FAIL

- [ ] **Step 3: page.py 구현**

```python
# backend/app/models/page.py
"""페이지(문서) 모델"""

import uuid
from datetime import datetime

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

    # 관계
    workspace = relationship("Workspace", backref="pages")
    creator = relationship("User", backref="created_pages")
    parent = relationship("Page", remote_side="Page.id", backref="children")
    blocks = relationship("Block", back_populates="page", cascade="all, delete-orphan")
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run pytest tests/test_models.py -v
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/app/models/page.py backend/tests/test_models.py
git commit -m "feat: Page 모델 (자기참조 중첩 페이지 지원)"
```

---

### Task 8: SQLAlchemy 모델 — Block (pgvector 포함)

**Files:**
- Create: `backend/app/models/block.py`
- Modify: `backend/tests/test_models.py`

- [ ] **Step 1: 테스트 추가**

```python
# backend/tests/test_models.py 에 추가
from app.models.block import Block


def test_block_model_table_name():
    assert Block.__tablename__ == "blocks"


def test_block_model_columns():
    column_names = {c.name for c in Block.__table__.columns}
    expected = {
        "id", "page_id", "parent_block_id", "type",
        "content", "order", "embedding", "created_at", "updated_at",
    }
    assert column_names == expected


def test_block_has_embedding_column():
    """embedding 컬럼이 vector 타입인지 확인"""
    col = Block.__table__.columns["embedding"]
    assert "vector" in str(col.type).lower() or "VECTOR" in str(col.type)
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run pytest tests/test_models.py -v -k "block"
```

Expected: FAIL

- [ ] **Step 3: block.py 구현**

```python
# backend/app/models/block.py
"""블록 모델 — 에디터 콘텐츠 단위, pgvector 임베딩 포함"""

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Float, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Block(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """블록 — BlockNote.js 에디터의 개별 콘텐츠 블록"""
    __tablename__ = "blocks"

    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pages.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_block_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("blocks.id", ondelete="SET NULL"),
        nullable=True,
    )
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="paragraph",
    )
    content: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    order: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    embedding = mapped_column(Vector(1536), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # 관계
    page = relationship("Page", back_populates="blocks")
    parent = relationship("Block", remote_side="Block.id", backref="children")
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run pytest tests/test_models.py -v
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/app/models/block.py backend/tests/test_models.py
git commit -m "feat: Block 모델 (JSONB content + pgvector embedding)"
```

---

### Task 9: SQLAlchemy 모델 — Tag + PageTag

**Files:**
- Create: `backend/app/models/tag.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/tests/test_models.py`

- [ ] **Step 1: 테스트 추가**

```python
# backend/tests/test_models.py 에 추가
from app.models.tag import Tag, PageTag


def test_tag_model_table_name():
    assert Tag.__tablename__ == "tags"


def test_tag_model_columns():
    column_names = {c.name for c in Tag.__table__.columns}
    assert column_names == {"id", "workspace_id", "name", "color"}


def test_page_tag_model_table_name():
    assert PageTag.__tablename__ == "page_tags"


def test_page_tag_composite_pk():
    """page_tags가 복합 기본키를 사용하는지 확인"""
    pk_cols = {c.name for c in PageTag.__table__.primary_key.columns}
    assert pk_cols == {"page_id", "tag_id"}
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run pytest tests/test_models.py -v -k "tag"
```

Expected: FAIL

- [ ] **Step 3: tag.py 구현**

```python
# backend/app/models/tag.py
"""태그 모델"""

import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin


class Tag(UUIDPrimaryKeyMixin, Base):
    """태그 — 페이지 분류용"""
    __tablename__ = "tags"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # 관계
    workspace = relationship("Workspace", backref="tags")
    pages = relationship("Page", secondary="page_tags", backref="tags")


class PageTag(Base):
    """페이지-태그 연결 테이블"""
    __tablename__ = "page_tags"

    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pages.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    )
```

- [ ] **Step 4: models/__init__.py에 전체 모델 re-export**

```python
# backend/app/models/__init__.py
"""SQLAlchemy 모델 — Alembic이 모든 모델을 인식하도록 여기서 임포트"""

from app.models.base import Base
from app.models.block import Block
from app.models.page import Page
from app.models.tag import PageTag, Tag
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember

__all__ = [
    "Base",
    "User",
    "Workspace",
    "WorkspaceMember",
    "Page",
    "Block",
    "Tag",
    "PageTag",
]
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run pytest tests/test_models.py -v
```

Expected: PASS (all tests)

- [ ] **Step 6: 커밋**

```bash
git add backend/app/models/
git add backend/tests/test_models.py
git commit -m "feat: Tag + PageTag 모델, models __init__ re-export"
```

---

### Task 10: Alembic 설정 + 초기 마이그레이션

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/` (자동 생성)

- [ ] **Step 1: Alembic 초기화**

```bash
cd backend
uv run alembic init alembic
```

- [ ] **Step 2: alembic.ini 수정 — sqlalchemy.url 제거 (env.py에서 동적으로 설정)**

`alembic.ini`에서 `sqlalchemy.url` 줄을 비움:

```ini
sqlalchemy.url =
```

나머지는 기본값 유지.

- [ ] **Step 3: alembic/env.py 재작성 (async 지원)**

```python
# backend/alembic/env.py
"""Alembic 비동기 마이그레이션 환경 설정"""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import get_settings
from app.models import Base  # 모든 모델 임포트 (자동 감지용)

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """오프라인 모드 — SQL 파일 생성"""
    settings = get_settings()
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """온라인 모드 — 비동기 엔진으로 직접 실행"""
    settings = get_settings()
    connectable = create_async_engine(settings.DATABASE_URL)

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 4: pgvector 확장 활성화 — PostgreSQL에서 직접 실행**

```bash
docker compose exec postgres psql -U noema -d knowledgebase -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Expected: `CREATE EXTENSION`

- [ ] **Step 5: 초기 마이그레이션 생성**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run alembic revision --autogenerate -m "초기 스키마 — users, workspaces, pages, blocks, tags"
```

Expected: `alembic/versions/` 에 마이그레이션 파일 생성

- [ ] **Step 6: 마이그레이션 실행**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run alembic upgrade head
```

Expected: 모든 테이블 생성 완료

- [ ] **Step 7: 테이블 생성 확인**

```bash
docker compose exec postgres psql -U noema -d knowledgebase -c "\dt"
```

Expected: `users`, `workspaces`, `workspace_members`, `pages`, `blocks`, `tags`, `page_tags`, `alembic_version` 테이블 표시

- [ ] **Step 8: 커밋**

```bash
git add backend/alembic.ini backend/alembic/
git commit -m "feat: Alembic 비동기 설정 + 초기 마이그레이션"
```

---

### Task 11: Neo4j 연결 + 초기화 스크립트

**Files:**
- Create: `backend/app/db/neo4j.py`
- Create: `backend/scripts/init_neo4j.py`

- [ ] **Step 1: 테스트 작성**

```python
# backend/tests/test_neo4j.py
from app.db.neo4j import get_neo4j_driver


def test_neo4j_driver_is_created():
    """Neo4j 드라이버가 정상 생성되는지 확인"""
    driver = get_neo4j_driver()
    assert driver is not None
    driver.close()
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run pytest tests/test_neo4j.py -v
```

Expected: FAIL

- [ ] **Step 3: neo4j.py 구현**

```python
# backend/app/db/neo4j.py
"""Neo4j 드라이버 연결 관리"""

from neo4j import GraphDatabase

from app.config import get_settings


def get_neo4j_driver():
    """Neo4j 드라이버 인스턴스 반환"""
    settings = get_settings()
    return GraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
    )
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run pytest tests/test_neo4j.py -v
```

Expected: PASS

- [ ] **Step 5: init_neo4j.py 작성**

```python
# backend/scripts/init_neo4j.py
"""Neo4j 인덱스 및 제약조건 초기화 스크립트

사용법:
    cd backend && uv run python -m scripts.init_neo4j
"""

import sys

from app.db.neo4j import get_neo4j_driver

# 실행할 Cypher 쿼리 목록
INIT_QUERIES = [
    # 유니크 제약조건 (인덱스 자동 생성됨)
    "CREATE CONSTRAINT page_id_unique IF NOT EXISTS FOR (p:Page) REQUIRE p.id IS UNIQUE",
    "CREATE CONSTRAINT tag_id_unique IF NOT EXISTS FOR (t:Tag) REQUIRE t.id IS UNIQUE",

    # 검색용 인덱스
    "CREATE INDEX page_workspace_idx IF NOT EXISTS FOR (p:Page) ON (p.workspace_id)",
    "CREATE INDEX page_title_idx IF NOT EXISTS FOR (p:Page) ON (p.title)",
    "CREATE INDEX tag_name_idx IF NOT EXISTS FOR (t:Tag) ON (t.name)",

    # 관계 인덱스 (SIMILAR_TO score 기반 정렬 최적화)
    "CREATE INDEX similar_score_idx IF NOT EXISTS FOR ()-[r:SIMILAR_TO]-() ON (r.score)",
]


def init_neo4j() -> None:
    """Neo4j 인덱스/제약조건 생성"""
    driver = get_neo4j_driver()
    try:
        with driver.session() as session:
            for query in INIT_QUERIES:
                session.run(query)
                print(f"  ✓ {query[:60]}...")
        print("\nNeo4j 초기화 완료")
    finally:
        driver.close()


if __name__ == "__main__":
    print("Neo4j 인덱스/제약조건 초기화 시작...\n")
    try:
        init_neo4j()
    except Exception as e:
        print(f"\n✗ Neo4j 초기화 실패: {e}", file=sys.stderr)
        sys.exit(1)
```

- [ ] **Step 6: Neo4j 초기화 실행**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run python -m scripts.init_neo4j
```

Expected: 모든 인덱스/제약조건 생성 완료 메시지

- [ ] **Step 7: Neo4j 브라우저에서 확인**

```bash
docker compose exec neo4j cypher-shell -u neo4j -p neo4j_dev "SHOW INDEXES"
```

Expected: 생성한 인덱스/제약조건 목록 표시

- [ ] **Step 8: 커밋**

```bash
git add backend/app/db/neo4j.py backend/scripts/ backend/tests/test_neo4j.py
git commit -m "feat: Neo4j 연결 + 인덱스/제약조건 초기화 스크립트"
```

---

### Task 12: FastAPI 앱 엔트리포인트 + 빈 디렉토리 구조

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/schemas/__init__.py`
- Create: `frontend/.gitkeep`

- [ ] **Step 1: 테스트 작성**

```python
# backend/tests/test_main.py
from fastapi.testclient import TestClient

from app.main import app


def test_health_check():
    """헬스체크 엔드포인트가 200을 반환하는지 확인"""
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run pytest tests/test_main.py -v
```

Expected: FAIL

- [ ] **Step 3: main.py 구현**

```python
# backend/app/main.py
"""FastAPI 앱 엔트리포인트"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/health")
async def health_check():
    """헬스체크 엔드포인트"""
    return {"status": "ok"}
```

- [ ] **Step 4: 빈 패키지 디렉토리 생성**

```bash
mkdir -p backend/app/api backend/app/services backend/app/schemas
touch backend/app/api/__init__.py backend/app/services/__init__.py backend/app/schemas/__init__.py
mkdir -p frontend
touch frontend/.gitkeep
mkdir -p backend/scripts
touch backend/scripts/__init__.py
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run pytest tests/test_main.py -v
```

Expected: PASS

- [ ] **Step 6: 전체 테스트 실행**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://noema:noema_dev@localhost:5432/knowledgebase" \
NEO4J_URI="bolt://localhost:7687" NEO4J_USER="neo4j" NEO4J_PASSWORD="neo4j_dev" \
REDIS_URL="redis://localhost:6379" JWT_SECRET="test" \
uv run pytest -v
```

Expected: ALL PASS

- [ ] **Step 7: 커밋**

```bash
git add backend/app/main.py backend/app/api/ backend/app/services/ backend/app/schemas/ backend/scripts/__init__.py
git add backend/tests/test_main.py frontend/.gitkeep
git commit -m "feat: FastAPI 앱 엔트리포인트 + 프로젝트 디렉토리 구조"
```

---

## Summary

| Task | 내용 | 예상 파일 수 |
|------|------|-------------|
| 1 | Docker Compose + .env + .gitignore + nginx | 4 |
| 2 | uv 프로젝트 초기화 | 1 |
| 3 | config.py (환경변수) | 2 |
| 4 | PostgreSQL async 연결 | 2 |
| 5 | Base + User 모델 | 3 |
| 6 | Workspace + WorkspaceMember 모델 | 1 |
| 7 | Page 모델 | 1 |
| 8 | Block 모델 (pgvector) | 1 |
| 9 | Tag + PageTag 모델 + __init__ | 2 |
| 10 | Alembic 설정 + 초기 마이그레이션 | 3 |
| 11 | Neo4j 연결 + 초기화 스크립트 | 3 |
| 12 | FastAPI main.py + 디렉토리 구조 | 5 |

**총 12개 태스크, 약 28개 파일 생성**
