"""그래프 데이터 라우터"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.postgres import get_db
from app.models.page import Page
from app.models.user import User

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/pages")
async def get_graph_data(
    workspace_id: UUID = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """워크스페이스의 그래프 데이터 반환 (노드 + 엣지)

    현재는 PostgreSQL 기반 페이지 목록만 반환.
    Neo4j 관계는 추후 연동.
    """
    result = await db.execute(
        select(Page).where(
            Page.workspace_id == workspace_id,
            Page.is_deleted == False,
        )
    )
    pages = result.scalars().all()

    # 노드 생성
    nodes = [
        {
            "data": {
                "id": str(p.id),
                "label": p.title or "제목 없음",
                "parent_page_id": str(p.parent_page_id) if p.parent_page_id else None,
            }
        }
        for p in pages
    ]

    # 부모-자식 엣지 (LINKS_TO로 표현)
    edges = []
    for p in pages:
        if p.parent_page_id:
            edges.append({
                "data": {
                    "id": f"edge-{p.parent_page_id}-{p.id}",
                    "source": str(p.parent_page_id),
                    "target": str(p.id),
                    "type": "LINKS_TO",
                }
            })

    return {"nodes": nodes, "edges": edges}
