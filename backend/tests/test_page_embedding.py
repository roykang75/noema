from app.models.page import Page


def test_page_has_embedding_column():
    """pages 테이블에 embedding 컬럼이 존재하는지 확인"""
    column_names = {c.name for c in Page.__table__.columns}
    assert "embedding" in column_names


def test_page_embedding_is_vector_type():
    """embedding 컬럼이 vector 타입인지 확인"""
    col = Page.__table__.columns["embedding"]
    assert "vector" in str(col.type).lower() or "VECTOR" in str(col.type)
