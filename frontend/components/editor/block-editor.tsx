"use client";

import { useEffect } from "react";
import { Block, PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

interface BlockEditorProps {
  pageId: string;
  initialBlocks?: PartialBlock[];
  onSave?: (blocks: Block[]) => void;
  readOnly?: boolean;
}

/**
 * BlockNote 에디터 래퍼 컴포넌트
 * - 블록 데이터를 로드하여 에디터에 표시
 * - 변경 시 자동 저장 (1초 디바운스)
 */
export default function BlockEditor({
  pageId: _pageId,
  initialBlocks,
  onSave,
  readOnly = false,
}: BlockEditorProps) {
  const editor = useCreateBlockNote({
    initialContent:
      initialBlocks && initialBlocks.length > 0 ? initialBlocks : undefined,
  });

  // 디바운스 자동 저장
  useEffect(() => {
    if (readOnly || !onSave) return;

    let timeoutId: NodeJS.Timeout;

    const unsubscribe = editor.onChange(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        onSave(editor.document);
      }, 1000); // 1초 디바운스
    });

    return () => {
      clearTimeout(timeoutId);
      // onChange returns an unsubscribe function in some versions; call if available
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [editor, onSave, readOnly]);

  return (
    <div className="min-h-[500px]">
      <BlockNoteView editor={editor} editable={!readOnly} theme="light" />
    </div>
  );
}
