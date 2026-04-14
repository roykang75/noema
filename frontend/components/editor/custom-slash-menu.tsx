"use client";

/**
 * 커스텀 슬래시(/) 메뉴 — 첨부 이미지(macOS 네이티브 컨텍스트 메뉴) 스타일
 *
 * 구성:
 *   · 그룹별(Headings / Basic blocks / Lists / Media / ...) 섹션 나눔
 *   · 섹션 제목은 상단에 얇은 라벨로
 *   · 각 항목: 아이콘 + 라벨 + (선택적) 부가 텍스트
 *   · 현재 선택된 인덱스는 배경색으로 강조 (키보드 네비)
 *   · hover / 클릭 시 onItemClick 호출
 */

import { SuggestionMenuProps } from "@blocknote/react";
import type { DefaultReactSuggestionItem } from "@blocknote/react";

type Item = DefaultReactSuggestionItem;

/** 그룹 키 → 한국어 라벨 매핑 (BlockNote 기본 group은 영어) */
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

export function CustomSlashMenu(props: SuggestionMenuProps<Item>) {
  const { items, selectedIndex, onItemClick, loadingState } = props;

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

  // items를 group 순서 유지하며 그룹핑 (입력된 순서를 보존)
  const sections: { group: string | undefined; items: Item[]; offset: number }[] = [];
  items.forEach((item, i) => {
    const g = item.group;
    const last = sections[sections.length - 1];
    if (last && last.group === g) {
      last.items.push(item);
    } else {
      sections.push({ group: g, items: [item], offset: i });
    }
  });

  let cursor = 0;

  return (
    <div className="noema-slash-menu">
      {sections.map((section, sIdx) => (
        <div key={sIdx} className="noema-slash-section">
          <div className="noema-slash-label">{groupLabel(section.group)}</div>
          {section.items.map((item) => {
            const globalIdx = cursor++;
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
      ))}
    </div>
  );
}
