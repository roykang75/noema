"use client";

/**
 * 커스텀 슬래시(/) 메뉴 — 블록 메뉴와 동일한 카테고리 + 하위 메뉴 패턴
 *
 * 구성:
 *   · 좌측 컬럼: 카테고리 (제목 / 기본 블록 / 목록 / 미디어 / 고급 …)
 *   · 우측 컬럼: 현재 호버/선택된 카테고리의 항목들
 *   · 키보드 네비게이션(selectedIndex)은 BlockNote가 flat 리스트로 관리 —
 *     현재 선택된 항목의 그룹을 자동으로 열어 보여줌
 *   · 마우스 호버 시에도 해당 카테고리가 열림
 */

import { useMemo, useState } from "react";
import type { DefaultReactSuggestionItem, SuggestionMenuProps } from "@blocknote/react";

type Item = DefaultReactSuggestionItem;

const GROUP_LABELS: Record<string, string> = {
  Headings: "제목",
  "Basic blocks": "기본 블록",
  Lists: "목록",
  Media: "미디어",
  Advanced: "고급",
  "Page Break": "페이지 나누기",
};

function groupLabel(key: string | undefined): string {
  if (!key) return "기타";
  return GROUP_LABELS[key] ?? key;
}

interface Section {
  group: string | undefined;
  items: Item[];
}

export function CustomSlashMenu(props: SuggestionMenuProps<Item>) {
  const { items, selectedIndex, onItemClick, loadingState } = props;
  const [hoveredGroup, setHoveredGroup] = useState<string | undefined>(undefined);

  // 그룹별 섹션 (입력 순서 보존)
  const sections: Section[] = useMemo(() => {
    const result: Section[] = [];
    items.forEach((item) => {
      const g = item.group;
      const last = result[result.length - 1];
      if (last && last.group === g) {
        last.items.push(item);
      } else {
        result.push({ group: g, items: [item] });
      }
    });
    return result;
  }, [items]);

  // 현재 선택된 항목의 그룹 — 자동 오픈
  const selectedGroup =
    selectedIndex !== undefined ? items[selectedIndex]?.group : undefined;
  const openGroup = hoveredGroup ?? selectedGroup ?? sections[0]?.group;
  const openSection = sections.find((s) => s.group === openGroup);

  if (loadingState === "loading-initial") {
    return (
      <div className="noema-slash-menu">
        <div className="noema-slash-empty">불러오는 중...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="noema-slash-menu">
        <div className="noema-slash-empty">결과 없음</div>
      </div>
    );
  }

  return (
    <div className="noema-slash-menu noema-slash-menu--split">
      {/* 좌측 — 카테고리 */}
      <div className="noema-slash-categories">
        {sections.map((section) => (
          <button
            key={section.group ?? "none"}
            type="button"
            onMouseEnter={() => setHoveredGroup(section.group)}
            onClick={() => setHoveredGroup(section.group)}
            onMouseDown={(e) => e.preventDefault()}
            data-active={openGroup === section.group || undefined}
            className="noema-slash-category"
          >
            <span className="noema-slash-category-label">
              {groupLabel(section.group)}
            </span>
            <span className="noema-slash-chevron">›</span>
          </button>
        ))}
      </div>

      {/* 우측 — 해당 카테고리의 항목들 */}
      {openSection && (
        <div className="noema-slash-items">
          {openSection.items.map((item) => {
            const globalIdx = items.indexOf(item);
            const active = globalIdx === selectedIndex;
            return (
              <button
                key={item.title + globalIdx}
                type="button"
                onClick={() => onItemClick?.(item)}
                onMouseDown={(e) => e.preventDefault()}
                data-active={active || undefined}
                className="noema-slash-item"
              >
                <span className="noema-slash-icon">{item.icon}</span>
                <span className="noema-slash-text">
                  <span className="noema-slash-title">{item.title}</span>
                  {item.subtext && (
                    <span className="noema-slash-subtext">{item.subtext}</span>
                  )}
                </span>
                {item.badge && (
                  <span className="noema-slash-badge">{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
