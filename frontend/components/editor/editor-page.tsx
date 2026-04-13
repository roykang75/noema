"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Block, PartialBlock } from "@blocknote/core";
import BlockEditor from "./block-editor";
import { YouTubePlayer } from "./youtube-embed";
import SummarizeButton from "@/components/ai/summarize-button";
import AIChatPanel from "@/components/ai/ai-chat-panel";

interface EditorPageProps {
  pageId: string;
  pageTitle: string;
}

/**
 * YouTube URL에서 video ID를 추출. 매칭 실패 시 null 반환.
 */
function extractYouTubeId(text: string): string | null {
  const trimmed = text.trim();
  const pattern =
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(pattern);
  return match ? match[1] : null;
}

/**
 * 백엔드 블록 응답 타입
 */
interface BackendBlock {
  id: string;
  type?: string;
  content?: {
    text?: Array<{ text?: string }>;
  } | null;
}

/**
 * 백엔드 블록 → BlockNote PartialBlock 변환
 * 저장된 content.text[].text를 합쳐서 하나의 텍스트 문자열로 복원합니다.
 */
function backendBlocksToPartial(blocks: BackendBlock[]): PartialBlock[] {
  return blocks.map((block) => {
    const text =
      block.content?.text?.map((t) => t.text ?? "").join("") ?? "";
    // BlockNote의 내장 블록 타입만 사용. 알 수 없는 타입은 paragraph로 폴백.
    const rawType = block.type ?? "paragraph";
    const supportedTypes = new Set([
      "paragraph",
      "heading",
      "bulletListItem",
      "numberedListItem",
      "checkListItem",
      "quote",
      "codeBlock",
    ]);
    const type = supportedTypes.has(rawType) ? rawType : "paragraph";
    return {
      type: type as PartialBlock["type"],
      content: text,
    } as PartialBlock;
  });
}

/**
 * 에디터 페이지 — 페이지/블록 로드 + 저장 관리
 */
export default function EditorPage({ pageId, pageTitle }: EditorPageProps) {
  const { data: session } = useSession();
  const [title, setTitle] = useState(pageTitle);
  const [initialBlocks, setInitialBlocks] = useState<PartialBlock[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [youtubeEmbeds, setYoutubeEmbeds] = useState<string[]>([]);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // YouTube URL 자동 감지 — document 레벨 capture로 ProseMirror보다 먼저 가로챔
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const container = editorContainerRef.current;
      if (!container) return;
      // 에디터 영역 내부에서 붙여넣은 경우만 처리
      const target = e.target as Node | null;
      if (!target || !container.contains(target)) return;

      const pasted = e.clipboardData?.getData("text/plain") ?? "";
      const videoId = extractYouTubeId(pasted);
      if (!videoId) return;

      // ProseMirror를 포함한 모든 리스너 차단
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      setYoutubeEmbeds((prev) => [
        ...prev,
        `https://www.youtube.com/embed/${videoId}`,
      ]);
    };

    // document + capture + 최우선 실행을 위해 stopImmediatePropagation 사용
    document.addEventListener("paste", handlePaste, { capture: true });
    return () => {
      document.removeEventListener("paste", handlePaste, { capture: true });
    };
  }, []);

  // 인증 헤더 생성 헬퍼
  const authHeaders = useCallback((): Record<string, string> => {
    const token = (session as { accessToken?: string } | null)?.accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [session]);

  // 페이지 데이터 + 블록 로드
  useEffect(() => {
    const token = (session as { accessToken?: string } | null)?.accessToken;
    if (!token) return;

    let cancelled = false;

    async function load() {
      try {
        // 페이지 정보 조회 (title, icon)
        const pageRes = await fetch(`${apiUrl}/pages/${pageId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled && pageRes.ok) {
          const page = await pageRes.json();
          setTitle(page.title || "");
        }

        // 블록 목록 조회
        const blocksRes = await fetch(`${apiUrl}/blocks?page_id=${pageId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (blocksRes.ok) {
          const data = (await blocksRes.json()) as { blocks: BackendBlock[] };
          setInitialBlocks(backendBlocksToPartial(data.blocks));
        } else {
          setInitialBlocks([]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("페이지 로드 실패:", err);
          setInitialBlocks([]);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [pageId, session, apiUrl]);

  // 블록 저장
  const handleSave = useCallback(
    async (editorBlocks: Block[]) => {
      if (!session) return;

      setSaving(true);
      setError(null);

      try {
        const blocksData = editorBlocks.map((block, index) => {
          const rawContent: unknown = block.content;
          let textItems: Array<{ text: string }>;

          if (Array.isArray(rawContent)) {
            textItems = rawContent.map((item: unknown) => ({
              text:
                typeof item === "string"
                  ? item
                  : (item as { text?: string })?.text ?? "",
            }));
          } else if (typeof rawContent === "string") {
            textItems = [{ text: rawContent }];
          } else {
            textItems = [{ text: "" }];
          }

          return {
            page_id: pageId,
            type: block.type,
            content: { text: textItems },
            order: index,
          };
        });

        await fetch(`${apiUrl}/blocks/batch`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ blocks: blocksData }),
        });
      } catch (err) {
        console.error("블록 저장 실패:", err);
        setError("저장에 실패했습니다");
      } finally {
        setSaving(false);
      }
    },
    [pageId, session, apiUrl, authHeaders],
  );

  // 타이틀 저장 (blur/enter 시)
  const handleTitleSave = useCallback(
    async (newTitle: string) => {
      if (!session) return;
      try {
        await fetch(`${apiUrl}/pages/${pageId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ title: newTitle }),
        });
      } catch (err) {
        console.error("타이틀 저장 실패:", err);
      }
    },
    [pageId, session, apiUrl, authHeaders],
  );

  // 로딩 중 — 세션 또는 블록이 아직 준비되지 않음
  if (session === undefined || initialBlocks === null) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="mx-auto flex-1 max-w-4xl p-6">
        {/* 페이지 타이틀 */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={(e) => handleTitleSave(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleTitleSave(title);
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="제목 없음"
          className="mb-4 w-full border-none bg-transparent text-3xl font-bold text-gray-900 placeholder-gray-300 outline-none"
        />

        {/* AI 툴바 */}
        <div className="mb-3 flex items-center gap-3">
          <SummarizeButton pageId={pageId} />
          <button
            onClick={() => setShowChat((v) => !v)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              showChat
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            💬 AI 질문
          </button>

          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            {saving && <span>저장 중...</span>}
            {error && <span className="text-red-500">{error}</span>}
          </div>
        </div>

        {/* BlockNote 에디터 — pageId가 바뀌면 재마운트하여 새 initialContent 적용
            ref 컨테이너에 capture phase로 paste 이벤트 가로채기 —
            ProseMirror가 처리하기 전에 YouTube URL 감지 */}
        <div ref={editorContainerRef}>
          <BlockEditor
            key={pageId}
            pageId={pageId}
            initialBlocks={initialBlocks.length > 0 ? initialBlocks : undefined}
            onSave={handleSave}
          />
        </div>

        {youtubeEmbeds.map((embedUrl, index) => (
          <YouTubePlayer key={index} embedUrl={embedUrl} />
        ))}
      </div>

      {showChat && (
        <AIChatPanel pageId={pageId} onClose={() => setShowChat(false)} />
      )}
    </div>
  );
}
