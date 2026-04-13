"use client";

/**
 * 페이지 트리 항목 — Notion 스타일 폴더 UX
 * - 재귀적으로 중첩 페이지 렌더링
 * - 드래그 앤 드롭으로 계층 이동
 * - 호버 시 토글(chevron) + 하위 페이지 추가(+) 버튼 노출
 */

import { useState, DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/types";

interface PageTreeItemProps {
  page: Page;
  pages: Page[];
  currentPageId?: string;
  depth: number;
  onMove: (pageId: string, newParentId: string | null) => void;
  onAddChild: (parentId: string) => void;
}

export default function PageTreeItem({
  page,
  pages,
  currentPageId,
  depth,
  onMove,
  onAddChild,
}: PageTreeItemProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const children = pages.filter((p) => p.parent_page_id === page.id);
  const hasChildren = children.length > 0;
  const isActive = currentPageId === page.id;

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData("text/plain", page.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const draggedPageId = e.dataTransfer.getData("text/plain");
    if (draggedPageId && draggedPageId !== page.id) {
      onMove(draggedPageId, page.id);
      setExpanded(true);
    }
  };

  return (
    <li>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => router.push(`/workspace/${page.id}`)}
        className={`group/page flex cursor-pointer items-center gap-0.5 rounded-md py-1 pr-1 text-sm transition-colors ${
          isActive
            ? "bg-gray-200/70 text-gray-900"
            : dragOver
              ? "bg-blue-50 ring-1 ring-blue-200"
              : "text-gray-700 hover:bg-gray-200/50"
        }`}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        {/* 토글 chevron — 자식 있으면 항상, 없으면 호버 시 가이드 용도 빈 공간 */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-300/50 hover:text-gray-700"
            aria-label={expanded ? "접기" : "펼치기"}
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        ) : (
          <span className="h-5 w-5 flex-shrink-0" />
        )}

        {/* 아이콘 + 제목 */}
        <span className="mr-1.5 flex-shrink-0 text-sm leading-none">
          {page.icon || "📄"}
        </span>
        <span className="min-w-0 flex-1 truncate">
          {page.title || "제목 없음"}
        </span>

        {/* 호버 시 "+ 하위 페이지 추가" 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(page.id);
            setExpanded(true);
          }}
          className="ml-auto flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-gray-400 opacity-0 transition-opacity hover:bg-gray-300/60 hover:text-gray-700 group-hover/page:opacity-100"
          title="하위 페이지 추가"
          aria-label="하위 페이지 추가"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* 자식 페이지 재귀 */}
      {hasChildren && expanded && (
        <ul className="space-y-0.5">
          {children.map((child) => (
            <PageTreeItem
              key={child.id}
              page={child}
              pages={pages}
              currentPageId={currentPageId}
              depth={depth + 1}
              onMove={onMove}
              onAddChild={onAddChild}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
