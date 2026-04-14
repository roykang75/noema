"use client";

/**
 * 커스텀 슬래시(/) 메뉴 — 블록 메뉴와 동일한 2-단계 키보드 네비게이션
 *
 * 구조:
 *   · 메인 팝오버(BlockNote 관리): 카테고리 목록만 — 폭 200px 고정
 *   · 하위 팝오버(React Portal): 현재 카테고리의 항목들 — 메인 메뉴 우측
 *
 * 키보드 동작(블록 메뉴와 동일):
 *   · 메뉴가 열리면 focus는 카테고리에 있고, 하위 항목은 선택되지 않음
 *   · ↑/↓  : 현재 focus(카테고리/항목) 내에서 이동
 *   · →/Enter : 카테고리 focus일 때 → 하위 항목 focus로 진입 (첫 항목 하이라이트)
 *   · ←  : 항목 focus일 때 → 카테고리 focus로 복귀 (메뉴 닫지 않음)
 *   · Enter : 항목 focus일 때 → 항목 삽입
 *
 * BlockNote의 기본 키보드 처리는 window capture 단계에서 차단.
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
  const { items, onItemClick, loadingState } = props;

  const mainRef = useRef<HTMLDivElement | null>(null);
  const [submenuPos, setSubmenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);

  const [focus, setFocus] = useState<"cat" | "item">("cat");
  const [catIdx, setCatIdx] = useState(0);
  const [itemIdx, setItemIdx] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 그룹별 섹션
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

  const currentSection = sections[catIdx];
  const currentItems = currentSection?.items ?? [];

  // 쿼리가 실제로 바뀌어 항목 구성이 달라진 경우에만 리셋.
  // items 배열 참조만 새로워지는 "무의미한" 변경(부모 리렌더로 인한
  // useMemo 재계산 등)에는 상태를 건드리지 않음 → 네비 도중 점프 방지.
  const prevSigRef = useRef<string>("");
  useLayoutEffect(() => {
    const sig =
      items.length +
      "|" +
      (items[0]?.title ?? "") +
      "|" +
      (items[items.length - 1]?.title ?? "");
    if (prevSigRef.current !== sig) {
      prevSigRef.current = sig;
      setFocus("cat");
      setCatIdx(0);
      setItemIdx(0);
    }
  }, [items]);

  // catIdx 변경 시 itemIdx 범위 보정
  useEffect(() => {
    setItemIdx(0);
  }, [catIdx]);

  // 키보드 — window capture로 BlockNote보다 먼저 가로채기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key;
      if (
        key !== "ArrowUp" &&
        key !== "ArrowDown" &&
        key !== "ArrowLeft" &&
        key !== "ArrowRight" &&
        key !== "Enter"
      ) {
        return;
      }
      // 에디터 커서 이동 / 메뉴 닫힘 방지
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (focus === "cat") {
        if (key === "ArrowDown") {
          setCatIdx((i) => Math.min(i + 1, sections.length - 1));
        } else if (key === "ArrowUp") {
          setCatIdx((i) => Math.max(i - 1, 0));
        } else if (key === "ArrowRight" || key === "Enter") {
          if (currentItems.length > 0) {
            setFocus("item");
            setItemIdx(0);
          }
        }
        // ArrowLeft는 카테고리 focus에서는 무시(메뉴 유지)
      } else {
        if (key === "ArrowDown") {
          setItemIdx((i) => Math.min(i + 1, currentItems.length - 1));
        } else if (key === "ArrowUp") {
          setItemIdx((i) => Math.max(i - 1, 0));
        } else if (key === "ArrowLeft") {
          setFocus("cat");
        } else if (key === "Enter") {
          const item = currentItems[itemIdx];
          if (item) onItemClick?.(item);
        }
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [focus, sections, currentItems, itemIdx, onItemClick]);

  // 하위 팝오버 위치 계산
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
  }, [catIdx]);

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
      <div ref={mainRef} className="noema-slash-menu noema-slash-menu--main">
        {sections.map((section, idx) => (
          <button
            key={section.group ?? `none-${idx}`}
            type="button"
            onMouseEnter={() => {
              setFocus("cat");
              setCatIdx(idx);
            }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (section.items.length > 0) {
                setFocus("item");
                setCatIdx(idx);
                setItemIdx(0);
              }
            }}
            data-active={catIdx === idx || undefined}
            className="noema-slash-category"
          >
            <span className="noema-slash-category-label">
              {groupLabel(section.group)}
            </span>
            <span className="noema-slash-chevron">›</span>
          </button>
        ))}
      </div>

      {mounted &&
        currentSection &&
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
            {currentItems.map((item, idx) => {
              const active = focus === "item" && idx === itemIdx;
              return (
                <button
                  key={item.title + idx}
                  type="button"
                  onMouseEnter={() => {
                    setFocus("item");
                    setItemIdx(idx);
                  }}
                  onMouseLeave={() => {
                    // 마우스가 항목 밖으로 나가면 카테고리 focus로 복귀
                    setFocus("cat");
                  }}
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
