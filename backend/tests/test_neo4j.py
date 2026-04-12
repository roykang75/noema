from app.db.neo4j import get_neo4j_driver


def test_neo4j_driver_is_created():
    """Neo4j 드라이버가 정상 생성되는지 확인"""
    driver = get_neo4j_driver()
    assert driver is not None
    driver.close()
