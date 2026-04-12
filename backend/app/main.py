"""FastAPI 앱 엔트리포인트"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ai import router as ai_router
from app.api.auth import router as auth_router
from app.api.pages import router as pages_router
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


app.include_router(ai_router)
app.include_router(auth_router)
app.include_router(pages_router)


@app.get("/health")
async def health_check():
    """헬스체크 엔드포인트"""
    return {"status": "ok"}
