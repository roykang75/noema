"use client";

/**
 * BlockNote 드래그 핸들(⋮⋮) 메뉴 커스터마이징
 * - 기본: Delete, Colors
 * - 추가: "서식 변경" — 블록 타입(텍스트/제목/리스트/인용 등) 전환
 *
 * 기존 블록의 서식을 변경하려면 "+" 메뉴 외엔 경로가 없었으므로
 * 드래그 핸들 메뉴에서 바로 바꿀 수 있도록 확장.
 */

import {
  BlockColorsItem,
  DragHandleMenu,
  RemoveBlockItem,
  useBlockNoteEditor,
  useComponentsContext,
} from "@blocknote/react";
import { useExtensionState } from "@blocknote/react";
import { SideMenuExtension } from "@blocknote/core/extensions";

interface BlockTypeOption {
  label: string;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: Record<string, any>;
}

const BLOCK_TYPES: BlockTypeOption[] = [
  { label: "텍스트", type: "paragraph" },
  { label: "제목 1", type: "heading", props: { level: 1 } },
  { label: "제목 2", type: "heading", props: { level: 2 } },
  { label: "제목 3", type: "heading", props: { level: 3 } },
  { label: "글머리 기호", type: "bulletListItem" },
  { label: "번호 매기기", type: "numberedListItem" },
  { label: "체크리스트", type: "checkListItem" },
  { label: "인용", type: "quote" },
  { label: "코드", type: "codeBlock" },
];

/** 블록 타입 전환 아이템들 — DragHandleMenu 내부에 배치 */
function TurnIntoItems() {
  const Components = useComponentsContext()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editor = useBlockNoteEditor<any, any, any>();
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  });

  if (!block) return null;

  return (
    <>
      <Components.Generic.Menu.Label>서식 변경</Components.Generic.Menu.Label>
      {BLOCK_TYPES.map((t) => {
        const isActive =
          block.type === t.type &&
          (!t.props ||
            Object.entries(t.props).every(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ([k, v]) => (block.props as any)?.[k] === v,
            ));
        return (
          <Components.Generic.Menu.Item
            key={t.label}
            className="bn-menu-item"
            onClick={() =>
              editor.updateBlock(block, {
                type: t.type,
                props: t.props ?? {},
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any)
            }
          >
            <span style={{ fontWeight: isActive ? 600 : 400 }}>
              {isActive ? "✓ " : ""}
              {t.label}
            </span>
          </Components.Generic.Menu.Item>
        );
      })}
    </>
  );
}

export function CustomDragHandleMenu() {
  return (
    <DragHandleMenu>
      <RemoveBlockItem>삭제</RemoveBlockItem>
      <BlockColorsItem>색상</BlockColorsItem>
      <TurnIntoItems />
    </DragHandleMenu>
  );
}
