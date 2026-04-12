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
