"use client";

/**
 * BlockNote 드래그 핸들(⋮⋮) 메뉴 — 아이콘 포함 리치 메뉴
 *
 * 메뉴 구성:
 *   · 복사 / 링크 복사 / 복제
 *   ─ 구분선 ─
 *   · 서식 변경 ▸ (텍스트/제목/리스트/인용/코드, 각 아이콘)
 *   · 색상 ▸ (BlockNote 기본)
 *   ─ 구분선 ─
 *   · 삭제
 *
 * 모든 메뉴는 BlockNote의 Components.Generic.Menu.*를 사용해
 * 팝오버/스타일/위치 모두 기본 UI와 일관되게 유지.
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
import {
  Code2,
  Copy,
  CopyPlus,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Palette,
  Quote,
  Text as TextIcon,
  Trash2,
  Type,
} from "lucide-react";

/** 아이콘 + 라벨을 가로로 배치한 메뉴 항목 내부 레이아웃 */
function ItemRow({
  icon,
  label,
  shortcut,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
      <span
        style={{
          display: "inline-flex",
          width: 16,
          height: 16,
          flexShrink: 0,
          color: "#6b7280",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {shortcut && (
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>
          {shortcut}
        </span>
      )}
    </span>
  );
}

interface BlockTypeOption {
  label: string;
  type: string;
  icon: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: Record<string, any>;
}

const BLOCK_TYPES: BlockTypeOption[] = [
  { label: "텍스트", type: "paragraph", icon: <TextIcon size={14} /> },
  {
    label: "제목 1",
    type: "heading",
    props: { level: 1 },
    icon: <Heading1 size={14} />,
  },
  {
    label: "제목 2",
    type: "heading",
    props: { level: 2 },
    icon: <Heading2 size={14} />,
  },
  {
    label: "제목 3",
    type: "heading",
    props: { level: 3 },
    icon: <Heading3 size={14} />,
  },
  { label: "글머리 기호", type: "bulletListItem", icon: <List size={14} /> },
  {
    label: "번호 매기기",
    type: "numberedListItem",
    icon: <ListOrdered size={14} />,
  },
  {
    label: "체크리스트",
    type: "checkListItem",
    icon: <ListChecks size={14} />,
  },
  { label: "인용", type: "quote", icon: <Quote size={14} /> },
  { label: "코드", type: "codeBlock", icon: <Code2 size={14} /> },
];

/** "서식 변경" 하위 메뉴 — 색상과 동일한 sub-menu 패턴 */
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

      <Components.Generic.Menu.Dropdown sub={true} className="bn-menu-dropdown">
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
              <ItemRow
                icon={t.icon}
                label={(isActive ? "✓ " : "") + t.label}
              />
            </Components.Generic.Menu.Item>
          );
        })}
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  );
}

/** 현재 블록의 텍스트 콘텐츠를 추출 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBlockText(block: any): string {
  const content = block?.content;
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item: unknown) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item && "text" in item) {
          return String((item as { text: string }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return "";
}

/** 블록 텍스트를 클립보드로 복사 */
function CopyItem() {
  const Components = useComponentsContext()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editor = useBlockNoteEditor<any, any, any>();
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (s) => s?.block,
  });
  if (!block) return null;
  return (
    <Components.Generic.Menu.Item
      className="bn-menu-item"
      onClick={() => {
        const text = extractBlockText(block);
        if (text) navigator.clipboard?.writeText(text).catch(() => {});
      }}
    >
      <ItemRow icon={<Copy size={14} />} label="복사" shortcut="⌘C" />
    </Components.Generic.Menu.Item>
  );
}

/** 현재 페이지 URL + 블록 id 해시를 클립보드로 복사 */
function CopyLinkItem() {
  const Components = useComponentsContext()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editor = useBlockNoteEditor<any, any, any>();
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (s) => s?.block,
  });
  if (!block) return null;
  return (
    <Components.Generic.Menu.Item
      className="bn-menu-item"
      onClick={() => {
        if (typeof window === "undefined") return;
        const url = `${window.location.origin}${window.location.pathname}#${block.id}`;
        navigator.clipboard?.writeText(url).catch(() => {});
      }}
    >
      <ItemRow icon={<LinkIcon size={14} />} label="링크 복사" />
    </Components.Generic.Menu.Item>
  );
}

/** 블록을 바로 아래에 복제 */
function DuplicateItem() {
  const Components = useComponentsContext()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editor = useBlockNoteEditor<any, any, any>();
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (s) => s?.block,
  });
  if (!block) return null;
  return (
    <Components.Generic.Menu.Item
      className="bn-menu-item"
      onClick={() => {
        // 블록 복사 — id만 제외하고 복제
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { id: _id, ...rest } = block as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editor.insertBlocks([rest] as any, block, "after");
      }}
    >
      <ItemRow icon={<CopyPlus size={14} />} label="복제" shortcut="⌘D" />
    </Components.Generic.Menu.Item>
  );
}

/**
 * 메인 드래그 핸들 메뉴 — 아이콘과 구분선을 포함한 리치 구성
 * BlockNote 기본 항목(RemoveBlock, BlockColors)은 라벨만 바꾸고 유지.
 * 우리 커스텀 항목은 아이콘+라벨+단축키를 일관된 레이아웃으로 표시.
 */
export function CustomDragHandleMenu() {
  return (
    <DragHandleMenu>
      <CopyItem />
      <CopyLinkItem />
      <DuplicateItem />

      <TurnIntoItem>
        <ItemRow icon={<Type size={14} />} label="서식 변경" />
      </TurnIntoItem>
      <BlockColorsItem>
        <ItemRow icon={<Palette size={14} />} label="색상" />
      </BlockColorsItem>

      <RemoveBlockItem>
        <ItemRow icon={<Trash2 size={14} />} label="삭제" shortcut="Delete" />
      </RemoveBlockItem>
    </DragHandleMenu>
  );
}
