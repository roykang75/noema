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
      {/* 1. 새 창에서 재생 — 박스 + 외부로 나가는 화살표 */}
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={INACTIVE}
        title="새 창에서 재생"
        aria-label="새 창에서 재생"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 4h6v6" />
          <path d="M10 14 20 4" />
          <path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
        </svg>
      </a>

      {/* 구분 */}
      <div className="mx-0.5 h-5 w-px bg-gray-200" />

      {/* 2. 작은 상태 — 위아래로 쌓인 2개 막대 */}
      {modeBtn(
        "small",
        "작은 상태",
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        >
          <rect x="4" y="6" width="16" height="5" rx="1.2" />
          <rect x="4" y="13" width="16" height="5" rx="1.2" />
        </svg>,
      )}

      {/* 3. 보통 상태 — 단순 둥근 사각형 */}
      {modeBtn(
        "medium",
        "보통 상태",
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        >
          <rect x="4" y="6" width="16" height="12" rx="2" />
        </svg>,
      )}

      {/* 4. 카드 형태 — 겹쳐진 2개 둥근 사각형 */}
      {modeBtn(
        "card",
        "카드 형태",
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        >
          <rect x="8" y="3" width="13" height="13" rx="2" />
          <path d="M16 16v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2" />
        </svg>,
      )}

      {/* 5. 임베드 — 둥근 사각형 안의 재생 아이콘 */}
      {modeBtn(
        "embed",
        "임베드",
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path
            d="M11 9.5v5l4-2.5-4-2.5z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1"
          />
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
