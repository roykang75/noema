from fastapi.testclient import TestClient

from app.main import app


def test_health_check():
    """헬스체크 엔드포인트가 200을 반환하는지 확인"""
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
