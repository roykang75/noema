"use client";

/**
 * 페이지 트리 항목 — Notion 스타일 폴더 UX
 * - 재귀적으로 중첩 페이지 렌더링
 * - 드래그 앤 드롭으로 계층 이동
 * - 호버 시 토글(chevron) + 하위 페이지 추가(+) 버튼 노출
 * - 아이콘 클릭 시 아이콘 피커 팝업 (이모지/Lucide/Phosphor)
 */

import { useState, DragEvent } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Page } from "@/types";
import PageIcon from "./page-icon";
import IconPicker from "./icon-picker";

interface PageTreeItemProps {
  page: Page;
  pages: Page[];
  currentPageId?: string;
  depth: number;
  onMove: (pageId: string, newParentId: string | null) => void;
  onAddChild: (parentId: string) => void;
  onUpdateIcon: (pageId: string, icon: string) => void;
}

export default function PageTreeItem({
  page,
  pages,
  currentPageId,
  depth,
  onMove,
  onAddChild,
  onUpdateIcon,
}: PageTreeItemProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState<{
    x: number;
    y: number;
  } | null>(null);

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

  // 아이콘 클릭 — 팝업 위치 기록
  const openIconPicker = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setPickerAnchor({ x: r.left, y: r.bottom + 4 });
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
        {/* 토글 chevron */}
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

        {/* 아이콘 — 클릭 시 피커 팝업 */}
        <button
          onClick={openIconPicker}
          className="mr-1.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded hover:bg-gray-300/50"
          title="아이콘 변경"
          aria-label="아이콘 변경"
        >
          <PageIcon icon={page.icon} size={14} />
        </button>

        <span className="min-w-0 flex-1 truncate">
          {page.title || "제목 없음"}
        </span>

        {/* 하위 페이지 추가 */}
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
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
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
              onUpdateIcon={onUpdateIcon}
            />
          ))}
        </ul>
      )}

      {/* 아이콘 피커 팝업 — body에 portal */}
      {pickerAnchor &&
        typeof document !== "undefined" &&
        createPortal(
          <IconPicker
            anchor={pickerAnchor}
            onPick={(icon) => onUpdateIcon(page.id, icon)}
            onClose={() => setPickerAnchor(null)}
          />,
          document.body,
        )}
    </li>
  );
}
