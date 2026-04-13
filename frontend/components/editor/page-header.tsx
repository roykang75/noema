"use client";

/**
 * 페이지 상단 헤더 — Notion 스타일
 * - 왼쪽: 브레드크럼 (워크스페이스 → 상위 페이지들 → 현재 페이지)
 * - 오른쪽: 공유, 즐겨찾기(☆), 더보기(⋯) 액션
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePageStore } from "@/lib/stores/page-store";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import type { Page } from "@/types";

interface PageHeaderProps {
  pageId: string;
  pageTitle: string;
  pageIcon?: string;
}

export default function PageHeader({
  pageId,
  pageTitle,
  pageIcon,
}: PageHeaderProps) {
  const router = useRouter();
  const { pages } = usePageStore();
  const { currentWorkspace } = useWorkspaceStore();
  const [starred, setStarred] = useState(false);

  // 상위 페이지 체인 구성 (현재 → 루트)
  const trail: Page[] = [];
  let current: Page | undefined = pages.find((p) => p.id === pageId);
  while (current) {
    trail.unshift(current);
    const parentId = current.parent_page_id;
    current = parentId ? pages.find((p) => p.id === parentId) : undefined;
  }
  // trail의 마지막은 현재 페이지 — 나머지가 상위 체인
  const ancestors = trail.slice(0, -1);

  const actionBtn =
    "flex h-8 items-center justify-center gap-1 rounded-md px-2 text-sm text-gray-600 transition-colors hover:bg-gray-100";
  const iconBtn =
    "flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900";

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
      {/* 왼쪽 — 브레드크럼 */}
      <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm text-gray-500">
        {/* 워크스페이스 */}
        {currentWorkspace && (
          <>
            <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm bg-gradient-to-br from-orange-400 to-pink-400 text-[10px] font-semibold text-white">
              {currentWorkspace.name.charAt(0).toUpperCase()}
            </div>
            <span className="truncate text-gray-600">
              {currentWorkspace.name}
            </span>
          </>
        )}

        {/* 상위 페이지들 */}
        {ancestors.map((p) => (
          <div key={p.id} className="flex min-w-0 items-center gap-1">
            <span className="text-gray-300">/</span>
            <button
              onClick={() => router.push(`/workspace/${p.id}`)}
              className="flex min-w-0 items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-gray-100"
            >
              <span className="flex-shrink-0 text-xs leading-none">
                {p.icon || "📄"}
              </span>
              <span className="truncate text-gray-600 hover:text-gray-900">
                {p.title || "제목 없음"}
              </span>
            </button>
          </div>
        ))}

        {/* 현재 페이지 */}
        <span className="text-gray-300">/</span>
        <div className="flex min-w-0 items-center gap-1 px-1 py-0.5">
          <span className="flex-shrink-0 text-xs leading-none">
            {pageIcon || "📄"}
          </span>
          <span className="min-w-0 truncate font-medium text-gray-900">
            {pageTitle || "제목 없음"}
          </span>
        </div>
      </nav>

      {/* 오른쪽 — 액션 */}
      <div className="flex flex-shrink-0 items-center gap-0.5 pl-2">
        {/* 번역 태그 (예시) */}
        <button
          className={actionBtn}
          title="한국어로 번역 (추후 구현)"
        >
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-600">
            A文
          </span>
          <span className="text-xs text-gray-500">한국어로 번역</span>
          <svg viewBox="0 0 24 24" className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="mx-1 h-4 w-px bg-gray-200" />

        {/* 공유 */}
        <button
          className={actionBtn}
          title="공유 (추후 구현)"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <span>공유</span>
          <svg viewBox="0 0 24 24" className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* 즐겨찾기 */}
        <button
          onClick={() => setStarred((v) => !v)}
          className={iconBtn}
          title={starred ? "즐겨찾기 해제" : "즐겨찾기"}
          aria-label="즐겨찾기"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 ${starred ? "fill-yellow-400 text-yellow-400" : "fill-none"}`}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.1 8.3 22 9.3 17 14.2 18.2 21 12 17.8 5.8 21 7 14.2 2 9.3 8.9 8.3 12 2" />
          </svg>
        </button>

        {/* 더보기 */}
        <button
          className={iconBtn}
          title="더보기 (추후 구현)"
          aria-label="더보기"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
