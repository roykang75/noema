"use client";

import { useEffect } from "react";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { youtubeBlockSpec } from "./youtube-block";

/**
 * 커스텀 스키마 — 기본 블록 + YouTube 블록
 * createReactBlockSpec 반환값은 factory이므로 호출(`()`)해서 BlockSpec을 얻어야 함
 */
export const noemaSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    youtube: youtubeBlockSpec(),
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NoemaEditor = any;

interface BlockEditorProps {
  pageId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialBlocks?: any[];
  onSave?: (blocks: unknown[]) => void;
  onEditorReady?: (editor: NoemaEditor) => void;
  readOnly?: boolean;
}

/**
 * BlockNote 에디터 래퍼 — 커스텀 스키마 (YouTube 포함)
 * - 부모에게 editor 인스턴스 노출 (onEditorReady)
 * - 파일 업로드는 /uploads 엔드포인트로
 * - 1초 디바운스 자동 저장
 */
export default function BlockEditor({
  pageId: _pageId,
  initialBlocks,
  onSave,
  onEditorReady,
  readOnly = false,
}: BlockEditorProps) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const editor = useCreateBlockNote({
    schema: noemaSchema,
    initialContent:
      initialBlocks && initialBlocks.length > 0 ? initialBlocks : undefined,
    uploadFile: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${apiUrl}/uploads`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("파일 업로드 실패");
      const data = (await res.json()) as { url: string };
      return `${apiUrl}${data.url}`;
    },
  });

  useEffect(() => {
    onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (readOnly || !onSave) return;
    let timeoutId: NodeJS.Timeout;
    const unsubscribe = editor.onChange(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        onSave(editor.document);
      }, 1000);
    });
    return () => {
      clearTimeout(timeoutId);
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [editor, onSave, readOnly]);

  return (
    <div className="min-h-[500px]">
      <BlockNoteView editor={editor} editable={!readOnly} theme="light" />
    </div>
  );
}
