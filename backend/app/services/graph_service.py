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

    def get_connected_pages(self, page_id: UUID, depth: int = 1) -> list[dict]:
        """N-hop 연결 문서 조회"""
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
                {"page_id": record["page_id"], "title": record["title"]}
                for record in result
            ]

    def upsert_similar_edges(self, page_id: UUID, similar_pages: list[dict]) -> None:
        """SIMILAR_TO 엣지 upsert"""
        query = """
            MATCH (a:Page {id: $source_id})
            MATCH (b:Page {id: $target_id})
            MERGE (a)-[r:SIMILAR_TO]->(b)
            SET r.score = $score, r.updated_at = $updated_at
        """

        now = datetime.now(timezone.utc).isoformat()

        with self.driver.session() as session:
            for page in similar_pages:
                session.run(query, {
                    "source_id": str(page_id),
                    "target_id": str(page["page_id"]),
                    "score": page["score"],
                    "updated_at": now,
                })

        logger.info("SIMILAR_TO 엣지 %d개 upsert 완료 (page_id=%s)", len(similar_pages), page_id)

    def ensure_page_node(self, page_id: UUID, title: str, workspace_id: UUID) -> None:
        """Neo4j에 Page 노드가 없으면 생성"""
        query = """
            MERGE (p:Page {id: $id})
            SET p.title = $title, p.workspace_id = $workspace_id
        """
        with self.driver.session() as session:
            session.run(query, {"id": str(page_id), "title": title, "workspace_id": str(workspace_id)})
