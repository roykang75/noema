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

    page = relationship("Page", back_populates="blocks")
    parent = relationship("Block", remote_side="Block.id", backref="children")
