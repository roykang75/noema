"use client";

/**
 * 페이지 하단 고정 contextual 툴바 + 어시스턴트 버튼
 *
 * - 툴바: 하단 중앙 fixed. 커서 위치 블록 타입에 따라 버튼 변경
 *   · YouTube 블록 선택 시 5개 표시 모드 버튼 + 현재 모드 강조
 * - 어시스턴트 버튼: 하단 우측 fixed, 상시 노출, AI 채팅 패널 토글
 */

import { useBlockSelectionStore } from "@/lib/stores/block-selection-store";
import { useAIChatStore } from "@/lib/stores/ai-chat-store";
import { useEditorInstanceStore } from "@/lib/stores/editor-instance-store";
import type { YouTubeDisplayMode } from "./youtube-block";

/** 공통 아이콘 버튼 스타일 */
const BASE_BTN =
  "flex h-9 w-9 items-center justify-center rounded-md transition-colors";
const INACTIVE = `${BASE_BTN} text-gray-600 hover:bg-gray-100`;
const ACTIVE = `${BASE_BTN} bg-blue-50 text-blue-600`;

/** YouTube 블록 전용 툴바 */
function YouTubeToolbarContent({
  videoId,
  currentMode,
}: {
  videoId: string;
  currentMode: YouTubeDisplayMode;
}) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const editor = useEditorInstanceStore((s) => s.editor);

  // 현재 커서 블록의 displayMode 변경
  const setMode = (mode: YouTubeDisplayMode) => {
    if (!editor) return;
    try {
      const pos = editor.getTextCursorPosition?.();
      const block = pos?.block;
      if (!block) return;
      editor.updateBlock(block, {
        type: "youtube",
        props: { videoId, displayMode: mode },
      });
    } catch (err) {
      console.error("displayMode 변경 실패:", err);
    }
  };

  const modeBtn = (mode: YouTubeDisplayMode, title: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setMode(mode)}
      className={currentMode === mode ? ACTIVE : INACTIVE}
      title={title}
      aria-label={title}
    >
      {icon}
    </button>
  );

  return (
    <>
      {/* 1. 새 창에서 재생 */}
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={INACTIVE}
        title="새 창에서 재생"
        aria-label="새 창에서 재생"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 3h6v6" />
          <path d="M10 14L21 3" />
          <path d="M21 14v7H3V3h7" />
        </svg>
      </a>

      {/* 구분 */}
      <div className="mx-0.5 h-5 w-px bg-gray-200" />

      {/* 2. 작은 상태 */}
      {modeBtn(
        "small",
        "작은 상태",
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="9" width="18" height="6" rx="1" />
          <line x1="3" y1="12" x2="21" y2="12" />
        </svg>,
      )}

      {/* 3. 보통 상태 */}
      {modeBtn(
        "medium",
        "보통 상태",
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <line x1="3" y1="12" x2="10" y2="12" />
        </svg>,
      )}

      {/* 4. 카드 형태 */}
      {modeBtn(
        "card",
        "카드 형태",
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <line x1="5" y1="10" x2="19" y2="10" />
        </svg>,
      )}

      {/* 5. 임베드 */}
      {modeBtn(
        "embed",
        "임베드",
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>,
      )}
    </>
  );
}

/** Contextual 툴바 — 선택 블록 타입에 따라 분기 */
function ContextualToolbar() {
  const blockType = useBlockSelectionStore((s) => s.blockType);
  const blockProps = useBlockSelectionStore((s) => s.blockProps);

  if (blockType !== "youtube") return null;
  const videoId = (blockProps?.videoId as string) ?? "";
  if (!videoId) return null;
  const currentMode =
    (blockProps?.displayMode as YouTubeDisplayMode) || "embed";

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <div className="flex items-center gap-0.5 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
        <YouTubeToolbarContent videoId={videoId} currentMode={currentMode} />
      </div>
    </div>
  );
}

/** 어시스턴트 버튼 — 하단 우측 상시 고정 */
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
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-xs font-bold text-white">
          A
        </span>
        어시스턴트
      </button>
    </div>
  );
}

export default function BottomToolbar() {
  return (
    <>
      <ContextualToolbar />
      <AssistantButton />
    </>
  );
}
