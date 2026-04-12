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
