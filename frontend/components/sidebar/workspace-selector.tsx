"use client";

/**
 * 워크스페이스 선택기 — Notion 스타일
 * - 현재 워크스페이스 이름을 버튼으로 표시, 클릭 시 드롭다운
 * - 드롭다운에서 다른 워크스페이스 선택 또는 신규 생성
 */

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function WorkspaceSelector() {
  const { data: session } = useSession();
  const { workspaces, currentWorkspace, setWorkspaces, setCurrentWorkspace } =
    useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const token = session?.accessToken;

  // 워크스페이스 목록 로드
  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/workspaces`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setWorkspaces(data.workspaces);
          if (data.workspaces.length > 0 && !currentWorkspace) {
            setCurrentWorkspace(data.workspaces[0]);
          }
        }
      } catch (err) {
        console.error("워크스페이스 로드 실패:", err);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, setWorkspaces, setCurrentWorkspace]);

  // 드롭다운 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleCreate = async () => {
    if (!token || !newName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/workspaces`, {
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
        setOpen(false);
      }
    } catch (err) {
      console.error("워크스페이스 생성 실패:", err);
    }
  };

  const currentInitial = currentWorkspace?.name.charAt(0).toUpperCase() || "?";

  return (
    <div ref={dropdownRef} className="relative px-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-200/50"
      >
        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm bg-gradient-to-br from-orange-400 to-pink-400 text-[10px] font-semibold text-white">
          {currentInitial}
        </div>
        <span className="min-w-0 flex-1 truncate font-medium">
          {currentWorkspace?.name || "워크스페이스 선택"}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 flex-shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* 드롭다운 */}
      {open && (
        <div className="absolute left-2 right-2 top-full z-20 mt-1 rounded-md border border-gray-200 bg-white py-1 shadow-md">
          {workspaces.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">
              워크스페이스 없음
            </div>
          ) : (
            workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  setCurrentWorkspace(ws);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-gray-100 ${
                  currentWorkspace?.id === ws.id ? "bg-gray-50" : ""
                }`}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-gradient-to-br from-orange-400 to-pink-400 text-[10px] font-semibold text-white">
                  {ws.name.charAt(0).toUpperCase()}
                </div>
                <span className="min-w-0 flex-1 truncate text-gray-700">
                  {ws.name}
                </span>
                {currentWorkspace?.id === ws.id && (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))
          )}

          <div className="my-1 border-t border-gray-100" />

          {showCreate ? (
            <div className="flex items-center gap-1 px-2 py-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") {
                    setShowCreate(false);
                    setNewName("");
                  }
                }}
                placeholder="워크스페이스 이름"
                autoFocus
                className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-gray-400"
              />
              <button
                onClick={handleCreate}
                className="rounded bg-gray-900 px-2 py-1 text-xs text-white hover:bg-gray-700"
              >
                생성
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-600 transition-colors hover:bg-gray-100"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              새 워크스페이스
            </button>
          )}
        </div>
      )}
    </div>
  );
}
