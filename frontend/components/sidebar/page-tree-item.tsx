"use client";

/**
 * 페이지 트리 항목 컴포넌트
 * 재귀적으로 중첩 페이지를 렌더링
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/types";

interface PageTreeItemProps {
  page: Page;
  pages: Page[];
  currentPageId?: string;
  depth: number;
}

export default function PageTreeItem({
  page,
  pages,
  currentPageId,
  depth,
}: PageTreeItemProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  // 현재 페이지의 자식 페이지 필터링
  const children = pages.filter((p) => p.parent_page_id === page.id);
  const hasChildren = children.length > 0;
  const isActive = currentPageId === page.id;

  return (
    <li>
      <div
        className={`flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm transition-colors ${
          isActive
            ? "bg-gray-200 font-medium text-gray-900"
            : "text-gray-700 hover:bg-gray-100"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => router.push(`/workspace/${page.id}`)}
      >
        {/* 펼침/접기 토글 버튼 */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="mr-1 text-gray-400 hover:text-gray-600"
            aria-label={expanded ? "접기" : "펼치기"}
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="mr-1 w-3" />
        )}

        {/* 페이지 아이콘 + 제목 */}
        <span className="mr-2">{page.icon || "📄"}</span>
        <span className="truncate">{page.title || "제목 없음"}</span>
      </div>

      {/* 자식 페이지 재귀 렌더링 */}
      {hasChildren && expanded && (
        <ul>
          {children.map((child) => (
            <PageTreeItem
              key={child.id}
              page={child}
              pages={pages}
              currentPageId={currentPageId}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
