"use client";

/**
 * 워크스페이스 선택기 컴포넌트
 * - 워크스페이스 목록 드롭다운
 * - 새 워크스페이스 생성
 * - 워크스페이스 전환
 */

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";

export default function WorkspaceSelector() {
  const { data: session } = useSession();
  const { workspaces, currentWorkspace, setWorkspaces, setCurrentWorkspace } =
    useWorkspaceStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const token = session?.accessToken;

  // 워크스페이스 목록 로드
  useEffect(() => {
    async function loadWorkspaces() {
      if (!token) return;
      try {
        const res = await fetch(`${apiUrl}/workspaces`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setWorkspaces(data.workspaces);
          // 선택된 워크스페이스가 없으면 첫 번째를 기본값으로 설정
          if (data.workspaces.length > 0 && !currentWorkspace) {
            setCurrentWorkspace(data.workspaces[0]);
          }
        }
      } catch (err) {
        console.error("워크스페이스 로드 실패:", err);
      }
    }
    loadWorkspaces();
  // currentWorkspace를 의존성에서 제외하여 무한 루프 방지
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, apiUrl, setWorkspaces, setCurrentWorkspace]);

  // 새 워크스페이스 생성
  const handleCreate = async () => {
    if (!token || !newName.trim()) return;
    try {
      const res = await fetch(`${apiUrl}/workspaces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        const ws = await res.json();
        setWorkspaces([...workspaces, ws]);
        setCurrentWorkspace(ws);
        setNewName("");
        setShowCreate(false);
      }
    } catch (err) {
      console.error("워크스페이스 생성 실패:", err);
    }
  };

  return (
    <div className="border-b p-3">
      {/* 워크스페이스 선택 드롭다운 */}
      <select
        value={currentWorkspace?.id || ""}
        onChange={(e) => {
          const ws = workspaces.find((w) => w.id === e.target.value);
          if (ws) setCurrentWorkspace(ws);
        }}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
      >
        {workspaces.length === 0 && (
          <option value="" disabled>
            워크스페이스 없음
          </option>
        )}
        {workspaces.map((ws) => (
          <option key={ws.id} value={ws.id}>
            {ws.name}
          </option>
        ))}
      </select>

      {/* 새 워크스페이스 생성 폼 */}
      {showCreate ? (
        <div className="mt-2 flex gap-1">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="워크스페이스 이름"
            className="flex-1 rounded-md border px-2 py-1 text-sm"
            autoFocus
          />
          <button
            onClick={handleCreate}
            className="rounded-md bg-gray-900 px-2 py-1 text-xs text-white"
          >
            생성
          </button>
          <button
            onClick={() => setShowCreate(false)}
            className="text-xs text-gray-400"
          >
            취소
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="mt-1 text-xs text-gray-400 hover:text-gray-600"
        >
          + 새 워크스페이스
        </button>
      )}
    </div>
  );
}
