"use client";

/**
 * 사이드바 — Notion 스타일
 * 구성:
 *   1. 유저 헤더: 아바타 + 이름 + 로그아웃
 *   2. 기본 네비: 검색 / 홈 / 그래프 뷰
 *   3. 워크스페이스 섹션: 현재 워크스페이스 + 전환
 *   4. 페이지 섹션: 페이지 트리 + 새 페이지 생성
 */

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { usePageStore } from "@/lib/stores/page-store";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import WorkspaceSelector from "./workspace-selector";
import PageTreeItem from "./page-tree-item";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** SVG 아이콘 */
const icons = {
  search: (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2V10z" />
    </svg>
  ),
  graph: (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="2.3" />
      <circle cx="18" cy="6" r="2.3" />
      <circle cx="6" cy="18" r="2.3" />
      <circle cx="18" cy="18" r="2.3" />
      <path d="M8.3 6h7.4M6 8.3v7.4M18 8.3v7.4M8.3 18h7.4" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
};

/** 기본 네비 아이템 */
function NavItem({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
        active
          ? "bg-gray-200/70 text-gray-900"
          : "text-gray-700 hover:bg-gray-200/50"
      }`}
    >
      <span className="flex-shrink-0 text-gray-500">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function Sidebar() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const currentPageId = params?.id as string | undefined;
  const { pages, loading, setPages, setLoading, addPage } = usePageStore();
  const { currentWorkspace } = useWorkspaceStore();

  const token = session?.accessToken;
  const workspaceId = currentWorkspace?.id;

  useEffect(() => {
    async function loadPages() {
      if (!token || !workspaceId) {
        setPages([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/pages?workspace_id=${workspaceId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          const data = await res.json();
          setPages(data.pages);
        }
      } catch (err) {
        console.error("페이지 목록 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPages();
  }, [token, workspaceId, setPages, setLoading]);

  const createPage = async (parentPageId: string | null) => {
    if (!token || !workspaceId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/pages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          title: "새 페이지",
          ...(parentPageId ? { parent_page_id: parentPageId } : {}),
        }),
      });
      if (res.ok) {
        const page = await res.json();
        addPage(page);
        router.push(`/workspace/${page.id}`);
      }
    } catch (err) {
      console.error("페이지 생성 실패:", err);
    }
  };

  const handleCreatePage = () => createPage(null);
  const handleAddChildPage = (parentId: string) => createPage(parentId);

  const handleMovePage = async (pageId: string, newParentId: string | null) => {
    if (!token || !workspaceId) return;
    try {
      await fetch(`${API_BASE_URL}/pages/${pageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ parent_page_id: newParentId }),
      });
      const res = await fetch(
        `${API_BASE_URL}/pages?workspace_id=${workspaceId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        setPages(data.pages);
      }
    } catch (err) {
      console.error("페이지 이동 실패:", err);
    }
  };

  const handleGraphView = () => {
    if (currentPageId) {
      router.push(`/workspace/${currentPageId}/graph`);
    }
  };

  const userName =
    session?.user?.name || session?.user?.email?.split("@")[0] || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <aside className="flex h-full w-[260px] flex-col border-r border-gray-200 bg-[#fbfbfa]">
      {/* 유저 헤더 */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-500 text-xs font-semibold text-white">
          {userInitial}
        </div>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
          {userName}
        </span>
        <button
          onClick={() => signOut({ redirectTo: "/login" })}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-200/60 hover:text-gray-700"
          title="로그아웃"
          aria-label="로그아웃"
        >
          {icons.logout}
        </button>
      </div>

      {/* 기본 네비 */}
      <nav className="px-2 pb-2">
        <NavItem icon={icons.search} label="검색" />
        <NavItem
          icon={icons.home}
          label="홈"
          onClick={() => router.push("/")}
          active={!currentPageId}
        />
        <NavItem
          icon={icons.graph}
          label="그래프 뷰"
          onClick={handleGraphView}
        />
      </nav>

      {/* 워크스페이스 섹션 */}
      <div className="mt-1 px-3">
        <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          워크스페이스
        </div>
      </div>
      <WorkspaceSelector />

      {/* 페이지 섹션 */}
      <div className="mt-3 flex min-h-0 flex-1 flex-col px-2">
        <div className="mb-1 flex items-center justify-between px-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            페이지
          </span>
          <button
            onClick={handleCreatePage}
            className="flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-200/60 hover:text-gray-700"
            title="새 페이지"
            aria-label="새 페이지"
          >
            {icons.plus}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-2 py-1 text-xs text-gray-400">로딩 중...</div>
          ) : pages.length === 0 ? (
            <div className="px-2 py-1 text-xs text-gray-400">
              페이지가 없습니다
            </div>
          ) : (
            <ul className="space-y-0.5">
              {pages
                .filter((p) => !p.parent_page_id)
                .map((page) => (
                  <PageTreeItem
                    key={page.id}
                    page={page}
                    pages={pages}
                    currentPageId={currentPageId}
                    depth={0}
                    onMove={handleMovePage}
                    onAddChild={handleAddChildPage}
                  />
                ))}
            </ul>
          )}
        </nav>

        {/* 최상위 드롭 존 */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const draggedPageId = e.dataTransfer.getData("text/plain");
            if (draggedPageId) handleMovePage(draggedPageId, null);
          }}
          className="mt-1 rounded-md border border-dashed border-gray-200 px-2 py-1.5 text-center text-[11px] text-gray-300"
        >
          여기로 드롭 → 최상위로 이동
        </div>
      </div>
    </aside>
  );
}
