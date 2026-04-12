"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Block } from "@blocknote/core";
import BlockEditor from "./block-editor";

interface EditorPageProps {
  pageId: string;
  pageTitle: string;
}

/**
 * 에디터 페이지 — 블록 로드/저장 관리
 * - 세션 토큰을 사용해 백엔드 API 인증
 * - 저장 시 BlockNote 형식 → 백엔드 형식 변환
 */
export default function EditorPage({ pageId, pageTitle }: EditorPageProps) {
  const { data: session } = useSession();
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState(pageTitle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // 인증 헤더 생성 헬퍼
  const authHeaders = useCallback((): Record<string, string> => {
    const token = (session as { accessToken?: string } | null)?.accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [session]);

  // 세션 준비 완료 시 에디터 표시
  useEffect(() => {
    if (session !== undefined) {
      setReady(true);
    }
  }, [session]);

  // 블록 저장
  const handleSave = useCallback(
    async (editorBlocks: Block[]) => {
      if (!session) return;

      setSaving(true);
      setError(null);

      try {
        // BlockNote Block → 백엔드 형식 변환
        const blocksData = editorBlocks.map((block, index) => {
          // block.content 타입이 블록 종류마다 다르므로 unknown으로 캐스팅 후 처리
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

  // 타이틀 저장 (디바운스 없이 blur/enter 시 저장)
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

  // 에디터 준비 중
  if (!ready) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
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

      {/* 저장 상태 표시 */}
      <div className="mb-2 flex items-center gap-2 text-xs text-gray-400">
        {saving && <span>저장 중...</span>}
        {error && <span className="text-red-500">{error}</span>}
      </div>

      {/* BlockNote 에디터 */}
      <BlockEditor
        pageId={pageId}
        onSave={handleSave}
      />
    </div>
  );
}
