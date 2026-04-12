"""워크스페이스 서비스"""
import logging
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.workspace import Workspace, WorkspaceMember
from app.models.user import User

logger = logging.getLogger(__name__)


class WorkspaceService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, name: str, owner_id: UUID) -> Workspace:
        ws = Workspace(name=name, owner_id=owner_id)
        self.db.add(ws)
        await self.db.flush()
        # 소유자를 멤버로 추가
        member = WorkspaceMember(workspace_id=ws.id, user_id=owner_id, role="owner")
        self.db.add(member)
        await self.db.flush()
        await self.db.refresh(ws)
        return ws

    async def get_by_id(self, ws_id: UUID) -> Workspace | None:
        return await self.db.get(Workspace, ws_id)

    async def list_by_user(self, user_id: UUID) -> list[Workspace]:
        result = await self.db.execute(
            select(Workspace)
            .join(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)
            .where(WorkspaceMember.user_id == user_id)
            .order_by(Workspace.created_at.desc())
        )
        return list(result.scalars().all())

    async def update(self, ws_id: UUID, **kwargs) -> Workspace | None:
        ws = await self.get_by_id(ws_id)
        if ws is None:
            return None
        for key, value in kwargs.items():
            if value is not None and hasattr(ws, key):
                setattr(ws, key, value)
        await self.db.flush()
        await self.db.refresh(ws)
        return ws

    async def add_member(self, ws_id: UUID, user_email: str, role: str = "editor") -> dict | None:
        result = await self.db.execute(select(User).where(User.email == user_email))
        user = result.scalar_one_or_none()
        if user is None:
            return None
        member = WorkspaceMember(workspace_id=ws_id, user_id=user.id, role=role)
        self.db.add(member)
        await self.db.flush()
        return {"user_id": user.id, "email": user.email, "name": user.name, "role": role}

    async def list_members(self, ws_id: UUID) -> list[dict]:
        result = await self.db.execute(
            select(WorkspaceMember, User)
            .join(User, WorkspaceMember.user_id == User.id)
            .where(WorkspaceMember.workspace_id == ws_id)
        )
        return [
            {"user_id": m.user_id, "email": u.email, "name": u.name, "role": m.role}
            for m, u in result.all()
        ]

    async def remove_member(self, ws_id: UUID, user_id: UUID) -> bool:
        result = await self.db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == ws_id,
                WorkspaceMember.user_id == user_id,
            )
        )
        member = result.scalar_one_or_none()
        if member is None:
            return False
        await self.db.delete(member)
        await self.db.flush()
        return True
