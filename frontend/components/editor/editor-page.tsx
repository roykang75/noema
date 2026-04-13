"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import BlockEditor, { type NoemaEditor } from "./block-editor";
import BottomToolbar from "./bottom-toolbar";
import AIChatPanel from "@/components/ai/ai-chat-panel";
import { useAIChatStore } from "@/lib/stores/ai-chat-store";

interface EditorPageProps {
  pageId: string;
  pageTitle: string;
}

/**
 * YouTube URL에서 video ID 추출. 매칭 실패 시 null.
 */
function extractYouTubeId(text: string): string | null {
  const trimmed = text.trim();
  const pattern =
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(pattern);
  return match ? match[1] : null;
}

// 저장/로드 시 videoId 유효성 검증
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * 백엔드 블록 응답 타입
 */
interface BackendBlock {
  id: string;
  type?: string;
  content?:
    | {
        text?: Array<{ text?: string }>;
        props?: Record<string, unknown>;
        videoId?: string;
      }
    | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SchemaBlock = any;

/**
 * 백엔드 블록 → BlockNote PartialBlock 변환
 */
function backendBlocksToPartial(blocks: BackendBlock[]): SchemaBlock[] {
  // 미디어 블록은 content 없이 props로만 렌더링됨
  const mediaTypes = new Set(["image", "video", "audio", "file"]);
  // 지원하는 텍스트 블록
  const textTypes = new Set([
    "paragraph",
    "heading",
    "bulletListItem",
    "numberedListItem",
    "checkListItem",
    "quote",
    "codeBlock",
  ]);

  return blocks.map((block) => {
    const rawType = block.type ?? "paragraph";

    // YouTube 커스텀 블록 — videoId 유효성 검증
    if (rawType === "youtube") {
      const videoId = block.content?.videoId ?? "";
      if (!VIDEO_ID_RE.test(videoId)) {
        // 손상된 videoId는 paragraph로 폴백하여 데이터 유실 방지
        return { type: "paragraph", content: "" } as SchemaBlock;
      }
      return {
        type: "youtube",
        props: { videoId },
      } as SchemaBlock;
    }

    // 이미지/비디오/오디오/파일 블록 — props 복원
    if (mediaTypes.has(rawType)) {
      return {
        type: rawType,
        props: block.content?.props ?? {},
      } as SchemaBlock;
    }

    // 텍스트 블록
    const type = textTypes.has(rawType) ? rawType : "paragraph";
    const text =
      block.content?.text?.map((t) => t.text ?? "").join("") ?? "";

    return {
      type,
      content: text,
    } as SchemaBlock;
  });
}

export default function EditorPage({ pageId, pageTitle }: EditorPageProps) {
  const { data: session } = useSession();
  const [title, setTitle] = useState(pageTitle);
  const [initialBlocks, setInitialBlocks] = useState<SchemaBlock[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showChat = useAIChatStore((s) => s.isOpen);
  const closeChat = useAIChatStore((s) => s.close);
  const editorRef = useRef<NoemaEditor | null>(null);
  const [editorReady, setEditorReady] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const authHeaders = useCallback((): Record<string, string> => {
    const token = (session as { accessToken?: string } | null)?.accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [session]);

  // 페이지/블록 로드
  useEffect(() => {
    const token = (session as { accessToken?: string } | null)?.accessToken;
    if (!token) return;

    let cancelled = false;
    async function load() {
      try {
        const pageRes = await fetch(`${apiUrl}/pages/${pageId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled && pageRes.ok) {
          const page = await pageRes.json();
          setTitle(page.title || "");
        }

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

  // YouTube URL 자동 감지 — document 레벨 capture로 ProseMirror보다 먼저 실행
  // 커서 위치에 이미지 블록(YouTube 썸네일 + 원본 URL 캡션)을 삽입
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const editor = editorRef.current;
      if (!editor) return;

      const pasted = e.clipboardData?.getData("text/plain") ?? "";
      const videoId = extractYouTubeId(pasted);
      if (!videoId) return;

      // 에디터 내부에서 붙여넣은 경우만 처리
      const target = e.target as HTMLElement | null;
      const editorDom = document.querySelector(".bn-container");
      if (!editorDom || !target || !editorDom.contains(target)) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // 커스텀 YouTube 블록 삽입 (썸네일 + 재생 버튼 + 메타데이터 카드)
      const youtubeBlock = {
        type: "youtube",
        props: { videoId },
      };

      const cursor = editor.getTextCursorPosition();
      const currentBlock = cursor.block;

      // 현재 블록이 빈 paragraph이면 교체, 내용이 있으면 아래에 삽입
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blockContent = (currentBlock as any).content;
      const isEmptyParagraph =
        currentBlock.type === "paragraph" &&
        (Array.isArray(blockContent)
          ? blockContent.length === 0
          : !blockContent);

      if (isEmptyParagraph) {
        editor.replaceBlocks(
          [currentBlock.id],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [youtubeBlock] as any,
        );
      } else {
        editor.insertBlocks(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [youtubeBlock] as any,
          currentBlock,
          "after",
        );
      }
    };

    document.addEventListener("paste", handlePaste, { capture: true });
    return () => {
      document.removeEventListener("paste", handlePaste, { capture: true });
    };
    // editorReady가 true가 된 후에만 리스너 등록 — null race 방지
  }, [editorReady]);

  // 블록 저장 — 기본 블록은 text, YouTube 블록은 videoId 저장
  const handleSave = useCallback(
    async (editorBlocks: unknown[]) => {
      if (!session) return;

      setSaving(true);
      setError(null);

      try {
        const mediaTypes = new Set(["image", "video", "audio", "file"]);

        const blocksData = (editorBlocks as Array<{
          type: string;
          content?: unknown;
          props?: Record<string, unknown>;
        }>).map((block, index) => {
          // YouTube 블록 — videoId 검증 후 저장
          if (block.type === "youtube") {
            const vid = String(block.props?.videoId ?? "");
            // 손상된 videoId는 빈 paragraph로 저장 (원본 데이터 유실 방지는 프론트 렌더에서)
            if (!VIDEO_ID_RE.test(vid)) {
              return {
                page_id: pageId,
                type: "paragraph",
                content: { text: [{ text: "" }] },
                order: index,
              };
            }
            return {
              page_id: pageId,
              type: "youtube",
              content: { videoId: vid },
              order: index,
            };
          }

          // 미디어 블록 — props만 저장 (url, caption 등)
          if (mediaTypes.has(block.type)) {
            return {
              page_id: pageId,
              type: block.type,
              content: { props: block.props ?? {} },
              order: index,
            };
          }

          // 텍스트 블록 — content 문자열 추출
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

        {/* 저장 상태 표시 */}
        <div className="mb-3 flex h-5 items-center justify-end gap-2 text-xs text-gray-400">
          {saving && <span>저장 중...</span>}
          {error && <span className="text-red-500">{error}</span>}
        </div>

        <BlockEditor
          key={pageId}
          pageId={pageId}
          initialBlocks={initialBlocks.length > 0 ? initialBlocks : undefined}
          onSave={handleSave}
          onEditorReady={(editor) => {
            editorRef.current = editor;
            setEditorReady(true);
          }}
        />
      </div>

      {showChat && (
        <AIChatPanel pageId={pageId} onClose={closeChat} />
      )}

      {/* 하단 고정 툴바 + 어시스턴트 버튼 */}
      <BottomToolbar />
    </div>
  );
}
