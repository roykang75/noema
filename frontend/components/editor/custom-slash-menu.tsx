"use client";

/**
 * 커스텀 슬래시(/) 메뉴 — 블록 메뉴와 동일한 패턴
 *
 * 구조:
 *   · 메인 팝오버(BlockNote 관리): 카테고리 목록만 표시 — 폭 고정(180px)
 *   · 하위 팝오버(React Portal로 document.body): 현재 카테고리의 항목들
 *     → 메인 메뉴의 우측에 절대 위치로 렌더링되어, 호버 시 메인 메뉴
 *       팝오버의 크기가 바뀌지 않음 → Floating UI 리포지션 방지 →
 *       본문 레이아웃이 흔들리지 않음.
 *
 *   · 키보드 네비게이션(selectedIndex)은 BlockNote가 flat 리스트로 관리 —
 *     현재 선택 항목이 속한 카테고리를 자동 오픈.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const mainRef = useRef<HTMLDivElement | null>(null);
  const [submenuPos, setSubmenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // 메인 메뉴 우측에 하위 메뉴를 포탈로 띄우기 위한 좌표 계산
  useLayoutEffect(() => {
    if (!mainRef.current) return;
    const update = () => {
      const r = mainRef.current?.getBoundingClientRect();
      if (!r) return;
      setSubmenuPos({ top: r.top, left: r.right + 6 });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(mainRef.current);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [openGroup]);

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
    <>
      {/* 메인 — 카테고리 목록만 */}
      <div ref={mainRef} className="noema-slash-menu noema-slash-menu--main">
        {sections.map((section) => (
          <button
            key={section.group ?? "none"}
            type="button"
            onMouseEnter={() => setHoveredGroup(section.group)}
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

      {/* 하위 — 선택된 카테고리의 항목들. Portal로 분리 → 메인 팝오버 크기 고정 */}
      {mounted &&
        openSection &&
        submenuPos &&
        createPortal(
          <div
            className="noema-slash-submenu"
            style={{
              position: "fixed",
              top: submenuPos.top,
              left: submenuPos.left,
              zIndex: 10000,
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
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
          </div>,
          document.body,
        )}
    </>
  );
}
