"use client";

/**
 * BlockNote 드래그 핸들(⋮⋮) 메뉴 커스터마이징
 * - 기본: 삭제(RemoveBlockItem), 색상(BlockColorsItem)
 * - 추가: "서식 변경" — 하위 팝오버로 타입 전환 옵션 제공 (BlockColorsItem과 동일 패턴)
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

/**
 * "서식 변경" 하위 메뉴 아이템 — BlockColorsItem과 동일한 sub-menu 패턴 사용
 */
function TurnIntoItem(props: { children: React.ReactNode }) {
  const Components = useComponentsContext()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editor = useBlockNoteEditor<any, any, any>();
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  });

  if (!block) return null;

  return (
    <Components.Generic.Menu.Root position="right" sub={true}>
      <Components.Generic.Menu.Trigger sub={true}>
        <Components.Generic.Menu.Item
          className="bn-menu-item"
          subTrigger={true}
        >
          {props.children}
        </Components.Generic.Menu.Item>
      </Components.Generic.Menu.Trigger>

      <Components.Generic.Menu.Dropdown
        sub={true}
        className="bn-menu-dropdown"
      >
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
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  );
}

export function CustomDragHandleMenu() {
  return (
    <DragHandleMenu>
      <RemoveBlockItem>삭제</RemoveBlockItem>
      <BlockColorsItem>색상</BlockColorsItem>
      <TurnIntoItem>서식 변경</TurnIntoItem>
    </DragHandleMenu>
  );
}
