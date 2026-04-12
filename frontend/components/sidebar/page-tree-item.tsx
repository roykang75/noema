"use client";

/**
 * 페이지 트리 항목 컴포넌트
 * 재귀적으로 중첩 페이지를 렌더링
 * 드래그 앤 드롭으로 페이지 계층 이동 지원
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
}

export default function PageTreeItem({
  page,
  pages,
  currentPageId,
  depth,
  onMove,
}: PageTreeItemProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // 현재 페이지의 자식 페이지 필터링
  const children = pages.filter((p) => p.parent_page_id === page.id);
  const hasChildren = children.length > 0;
  const isActive = currentPageId === page.id;

  // 드래그 시작: 드래그되는 페이지 ID를 dataTransfer에 저장
  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData("text/plain", page.id);
    e.dataTransfer.effectAllowed = "move";
  };

  // 드래그 중 드롭 대상 위에 있을 때 하이라이트
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  // 드롭 대상을 벗어날 때 하이라이트 해제
  const handleDragLeave = () => {
    setDragOver(false);
  };

  // 드롭: 드래그된 페이지를 이 페이지의 자식으로 이동
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const draggedPageId = e.dataTransfer.getData("text/plain");
    // 자기 자신에게 드롭하는 경우 무시
    if (draggedPageId && draggedPageId !== page.id) {
      onMove(draggedPageId, page.id);
      setExpanded(true); // 자식이 추가되면 자동으로 펼치기
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
        className={`flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm transition-colors ${
          isActive
            ? "bg-gray-200 font-medium text-gray-900"
            : dragOver
              ? "bg-blue-50 ring-2 ring-blue-300"
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
              onMove={onMove}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
