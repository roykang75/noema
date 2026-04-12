"use client";

/**
 * 사이드바 컴포넌트
 * - 페이지 폴더 트리 표시
 * - 새 페이지 생성
 * - 그래프 뷰 전환
 * - 유저 정보 + 로그아웃
 */

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { usePageStore } from "@/lib/stores/page-store";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import PageTreeItem from "./page-tree-item";
import WorkspaceSelector from "./workspace-selector";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Sidebar() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const currentPageId = params?.id as string | undefined;
  const { pages, loading, setPages, setLoading, addPage } = usePageStore();
  const { currentWorkspace } = useWorkspaceStore();

  // session.accessToken은 types/next-auth.d.ts에서 타입 확장됨
  const token = session?.accessToken;

  // 현재 워크스페이스가 바뀔 때마다 페이지 목록 다시 로드
  useEffect(() => {
    async function loadPages() {
      if (!token || !currentWorkspace) return;
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/pages?workspace_id=${currentWorkspace.id}`,
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
  }, [token, currentWorkspace, setPages, setLoading]);

  // 새 페이지 생성 후 해당 페이지로 이동
  const handleCreatePage = async () => {
    if (!token || !currentWorkspace) return;
    try {
      const res = await fetch(`${API_BASE_URL}/pages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          title: "새 페이지",
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

  // 페이지를 다른 부모로 이동 (드래그 앤 드롭 핸들러)
  const handleMovePage = async (pageId: string, newParentId: string | null) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/pages/${pageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ parent_page_id: newParentId }),
      });
      // 페이지 목록 새로고침
      const res = await fetch(
        `${API_BASE_URL}/pages?workspace_id=${currentWorkspace?.id}`,
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

  // 현재 페이지의 그래프 뷰로 이동
  const handleGraphView = () => {
    if (currentPageId) {
      router.push(`/workspace/${currentPageId}/graph`);
    } else {
      router.push("/workspace/graph");
    }
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-gray-50">
      {/* 헤더 */}
      <div className="flex items-center border-b p-4">
        <span className="text-lg font-bold text-gray-900">Noema</span>
      </div>

      {/* 워크스페이스 선택기 */}
      <WorkspaceSelector />

      {/* 액션 버튼 */}
      <div className="flex gap-2 border-b p-3">
        <button
          onClick={handleCreatePage}
          className="flex-1 rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-700"
        >
          + 새 페이지
        </button>
        <button
          onClick={handleGraphView}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100"
          title="그래프 뷰"
          aria-label="그래프 뷰 열기"
        >
          🔗
        </button>
      </div>

      {/* 페이지 폴더 트리 */}
      <nav className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="p-3 text-sm text-gray-400">로딩 중...</div>
        ) : pages.length === 0 ? (
          <div className="p-3 text-sm text-gray-400">페이지가 없습니다</div>
        ) : (
          <>
            <ul className="space-y-0.5">
              {/* 최상위 페이지만 렌더링 (자식은 PageTreeItem 내부에서 재귀 처리) */}
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
                  />
                ))}
            </ul>
            {/* 최상위로 이동하기 위한 드롭존 */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const draggedPageId = e.dataTransfer.getData("text/plain");
                if (draggedPageId) handleMovePage(draggedPageId, null);
              }}
              className="border-t border-dashed border-gray-200 p-2 text-center text-xs text-gray-300"
            >
              여기에 드롭하여 최상위로 이동
            </div>
          </>
        )}
      </nav>

      {/* 유저 정보 + 로그아웃 */}
      {session?.user && (
        <div className="border-t p-3">
          <div className="flex items-center justify-between">
            <span className="truncate text-sm text-gray-600">
              {session.user.name || session.user.email}
            </span>
            <button
              onClick={() => signOut({ redirectTo: "/login" })}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              로그아웃
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
