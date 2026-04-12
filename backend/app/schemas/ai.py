"""AI 기능 요청/응답 Pydantic 스키마"""

from uuid import UUID

from pydantic import BaseModel, Field


class SummarizeRequest(BaseModel):
    """문서 요약 요청"""
    page_id: UUID


class ImproveRequest(BaseModel):
    """블록 텍스트 개선 요청"""
    block_id: UUID
    instruction: str = ""


class TranslateRequest(BaseModel):
    """블록 번역 요청"""
    block_id: UUID
    target_lang: str


class AskRequest(BaseModel):
    """단일 문서 Q&A 요청"""
    page_id: UUID
    question: str


class AskGraphRequest(BaseModel):
    """멀티문서 Q&A 요청"""
    page_id: UUID
    question: str
    depth: int = Field(default=1, ge=1, le=3)


class CompleteRequest(BaseModel):
    """텍스트 자동완성 요청"""
    page_id: UUID
    block_id: UUID
    cursor_context: str


class ExtractRelationsRequest(BaseModel):
    """유사도 관계 추출 요청"""
    page_id: UUID


class SimilarPageResponse(BaseModel):
    """유사 페이지 응답 항목"""
    page_id: UUID
    title: str
    score: float


class ExtractRelationsResponse(BaseModel):
    """유사도 관계 추출 응답"""
    relations: list[SimilarPageResponse]
