"use client";

/**
 * 하단 고정 contextual 툴바 + 어시스턴트 버튼
 *
 * - 툴바: 페이지 하단 중앙 고정, 현재 커서 위치의 블록 타입에 따라 버튼 유동적 변경
 *   · 현재는 YouTube 블록만 전용 버튼 구현, 나머지는 placeholder
 * - 어시스턴트 버튼: 페이지 하단 우측 고정, 상시 노출
 *   · 클릭 시 AI 채팅 패널 토글
 */

import { useBlockSelectionStore } from "@/lib/stores/block-selection-store";
import { useAIChatStore } from "@/lib/stores/ai-chat-store";

/** 공통 아이콘 버튼 스타일 */
const iconBtn =
  "flex h-9 w-9 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100";
const activeIconBtn =
  "flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600";
const disabledIconBtn =
  "flex h-9 w-9 items-center justify-center rounded-md text-gray-300 cursor-not-allowed";

/** YouTube 블록 전용 툴바 */
function YouTubeToolbarContent({ videoId }: { videoId: string }) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <>
      {/* 1. 새 창에서 재생 */}
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={iconBtn}
        title="새 창에서 재생"
        aria-label="새 창에서 재생"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 3h6v6" />
          <path d="M10 14L21 3" />
          <path d="M21 14v7H3V3h7" />
        </svg>
      </a>

      {/* 2. 작은 상태 */}
      <button type="button" disabled className={disabledIconBtn} title="작은 상태 (추후 구현)">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="7" width="18" height="4" rx="1" />
          <rect x="3" y="13" width="18" height="4" rx="1" />
        </svg>
      </button>

      {/* 3. 보통 상태 */}
      <button type="button" disabled className={disabledIconBtn} title="보통 상태 (추후 구현)">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="5" width="16" height="14" rx="2" />
        </svg>
      </button>

      {/* 4. 카드 형태 */}
      <button type="button" disabled className={disabledIconBtn} title="카드 형태 (추후 구현)">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="7" width="14" height="10" rx="2" />
          <rect x="7" y="3" width="14" height="10" rx="2" />
        </svg>
      </button>

      {/* 5. 임베드 (현재 활성) */}
      <button type="button" className={activeIconBtn} title="임베드 (현재)">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
    </>
  );
}

/**
 * Contextual 툴바 — 화면 하단 중앙 고정
 * 선택 블록 타입에 따라 내용 변경. 현재는 YouTube만 전용 렌더링, 그 외는 hidden.
 */
function ContextualToolbar() {
  const blockType = useBlockSelectionStore((s) => s.blockType);
  const blockProps = useBlockSelectionStore((s) => s.blockProps);

  // YouTube 블록이 선택된 경우에만 표시
  if (blockType !== "youtube") return null;
  const videoId = (blockProps?.videoId as string) ?? "";
  if (!videoId) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <div className="flex items-center gap-0.5 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
        <YouTubeToolbarContent videoId={videoId} />
      </div>
    </div>
  );
}

/**
 * 어시스턴트 버튼 — 화면 하단 우측 상시 고정
 * 클릭 시 AI 채팅 패널 토글 (채팅 패널에서 요약/번역/질문 등 기능 제공 예정)
 */
function AssistantButton() {
  const toggleChat = useAIChatStore((s) => s.toggle);
  const isOpen = useAIChatStore((s) => s.isOpen);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        type="button"
        onClick={toggleChat}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-lg transition-colors ${
          isOpen
            ? "border-gray-900 bg-gray-900 text-white hover:bg-gray-800"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        }`}
        title="AI 어시스턴트"
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-xs font-bold text-white`}
        >
          A
        </span>
        어시스턴트
      </button>
    </div>
  );
}

/**
 * 페이지 하단 고정 레이어 — 툴바 + 어시스턴트 버튼
 */
export default function BottomToolbar() {
  return (
    <>
      <ContextualToolbar />
      <AssistantButton />
    </>
  );
}
