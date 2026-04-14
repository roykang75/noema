"use client";

import { useCallback, useEffect } from "react";
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
} from "@blocknote/core";
import { ko } from "@blocknote/core/locales";
import {
  SideMenu,
  SideMenuController,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { youtubeBlockSpec } from "./youtube-block";
import { CustomDragHandleMenu } from "./custom-drag-handle-menu";
import { CustomSlashMenu } from "./custom-slash-menu";
import { useBlockSelectionStore } from "@/lib/stores/block-selection-store";
import { useEditorInstanceStore } from "@/lib/stores/editor-instance-store";

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
    dictionary: ko,
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

  // 슬래시 메뉴 items 함수 — 참조 안정화해 items 재로드에 따른
  // 커스텀 메뉴 상태 리셋 방지
  const getSlashItems = useCallback(
    async (query: string) =>
      filterSuggestionItems(getDefaultReactSlashMenuItems(editor), query),
    [editor],
  );

  useEffect(() => {
    onEditorReady?.(editor);
    // 하단 툴바가 editor.updateBlock을 호출할 수 있도록 전역 스토어에도 등록
    useEditorInstanceStore.getState().setEditor(editor);
    return () => {
      useEditorInstanceStore.getState().setEditor(null);
    };
  }, [editor, onEditorReady]);

  // 커서가 위치한 블록을 추적 — 하단 contextual 툴바에서 활용
  useEffect(() => {
    const setSelection = useBlockSelectionStore.getState().setSelection;
    const clear = useBlockSelectionStore.getState().clear;

    const updateSelection = () => {
      try {
        const pos = editor.getTextCursorPosition();
        const block = pos?.block;
        if (block) {
          setSelection(
            String(block.type),
            (block.props as Record<string, unknown>) ?? {},
          );
        } else {
          clear();
        }
      } catch {
        clear();
      }
    };

    updateSelection();
    const unsub = editor.onSelectionChange(updateSelection);
    return () => {
      unsub?.();
      clear();
    };
  }, [editor]);

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
      {/* sideMenu={false} 로 기본 SideMenu 비활성 후 커스텀 버전 주입 */}
      <BlockNoteView
        editor={editor}
        editable={!readOnly}
        theme="light"
        sideMenu={false}
        slashMenu={false}
      >
        <SideMenuController
          sideMenu={(props) => (
            <SideMenu {...props} dragHandleMenu={CustomDragHandleMenu} />
          )}
        />
        {/* 커스텀 슬래시 메뉴 — 그룹별 섹션 + 아이콘 */}
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={getSlashItems}
          suggestionMenuComponent={CustomSlashMenu}
        />
      </BlockNoteView>
    </div>
  );
}
