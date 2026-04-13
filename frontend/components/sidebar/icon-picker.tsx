"use client";

/**
 * 아이콘 피커 팝업
 * - 탭: 이모지 / Lucide / Phosphor
 * - 이모지: emoji-picker-react (전체)
 * - Lucide: 검색 + "전체 / 카테고리별" 필터 (카테고리 chip)
 * - Phosphor: 전체 아이콘 그리드 + 검색 (이름/태그)
 *
 * 저장 포맷:
 *   - "📄"                   → 이모지 그대로
 *   - "lucide:FileText"      → Lucide 아이콘 (PascalCase)
 *   - "phosphor:FileText"    → Phosphor 아이콘 (PascalCase)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  LUCIDE_ALL,
  LUCIDE_CATEGORIES,
  getLucideIconsByCategory,
} from "@/lib/icons/lucide-list";
import { PHOSPHOR_ALL } from "@/lib/icons/phosphor-list";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

type Tab = "emoji" | "lucide" | "phosphor";

interface IconPickerProps {
  onPick: (icon: string) => void;
  onClose: () => void;
  anchor?: { x: number; y: number };
}

const LUCIDE_CATEGORY_NAMES = Object.keys(LUCIDE_CATEGORIES);
/** "전체" + 카테고리들 */
const LUCIDE_FILTERS = ["전체", ...LUCIDE_CATEGORY_NAMES] as const;

export default function IconPicker({
  onPick,
  onClose,
  anchor,
}: IconPickerProps) {
  const [tab, setTab] = useState<Tab>("emoji");
  const [search, setSearch] = useState("");
  const [lucideFilter, setLucideFilter] =
    useState<(typeof LUCIDE_FILTERS)[number]>("전체");
  const ref = useRef<HTMLDivElement>(null);

  // 바깥 클릭 / Esc 로 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const t = setTimeout(() => {
      document.addEventListener("mousedown", handler);
      document.addEventListener("keydown", onEsc);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  const style: React.CSSProperties = anchor
    ? { position: "fixed", top: anchor.y, left: anchor.x, zIndex: 100 }
    : {};

  const searchLower = search.trim().toLowerCase();

  // Lucide — 카테고리/전체 → 검색 필터
  const lucideVisible = useMemo(() => {
    const base =
      lucideFilter === "전체"
        ? LUCIDE_ALL
        : getLucideIconsByCategory(lucideFilter);
    if (!searchLower) return base;
    return base.filter((e) => e.name.toLowerCase().includes(searchLower));
  }, [lucideFilter, searchLower]);

  // Phosphor — 전체 → 검색 필터 (이름 + 태그)
  const phosphorVisible = useMemo(() => {
    if (!searchLower) return PHOSPHOR_ALL;
    return PHOSPHOR_ALL.filter(
      (e) =>
        e.name.toLowerCase().includes(searchLower) ||
        e.kebab.toLowerCase().includes(searchLower) ||
        e.tags.some((t) => t.toLowerCase().includes(searchLower)),
    );
  }, [searchLower]);

  return (
    <div
      ref={ref}
      style={style}
      className="w-[360px] rounded-lg border border-gray-200 bg-white shadow-xl"
    >
      {/* 탭 */}
      <div className="flex border-b border-gray-200">
        {(["emoji", "lucide", "phosphor"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setSearch("");
            }}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              tab === t
                ? "border-b-2 border-gray-900 text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "emoji" ? "이모지" : t === "lucide" ? "Lucide" : "Phosphor"}
          </button>
        ))}
      </div>

      <div className="p-2">
        {/* 이모지 탭 */}
        {tab === "emoji" && (
          <EmojiPicker
            width="100%"
            height={380}
            onEmojiClick={(data) => {
              onPick(data.emoji);
              onClose();
            }}
            searchPlaceholder="이모지 검색..."
            lazyLoadEmojis
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
          />
        )}

        {/* Lucide 탭 */}
        {tab === "lucide" && (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Lucide 아이콘 검색... (${LUCIDE_ALL.length}개)`}
              className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-gray-400"
              autoFocus
            />
            {/* 카테고리 chip */}
            <div className="flex flex-wrap gap-1">
              {LUCIDE_FILTERS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setLucideFilter(cat)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    lucideFilter === cat
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <IconGrid
              items={lucideVisible}
              onPick={(name) => {
                onPick(`lucide:${name}`);
                onClose();
              }}
              totalLabel={`${lucideVisible.length}개 아이콘`}
            />
          </div>
        )}

        {/* Phosphor 탭 */}
        {tab === "phosphor" && (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Phosphor 아이콘 검색... (${PHOSPHOR_ALL.length}개)`}
              className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-gray-400"
              autoFocus
            />
            <IconGrid
              items={phosphorVisible}
              onPick={(name) => {
                onPick(`phosphor:${name}`);
                onClose();
              }}
              totalLabel={`${phosphorVisible.length}개 아이콘`}
            />
          </div>
        )}
      </div>

      {/* 하단 — 아이콘 제거 */}
      <div className="border-t border-gray-200 p-2">
        <button
          onClick={() => {
            onPick("");
            onClose();
          }}
          className="w-full rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          아이콘 제거 (기본 📄)
        </button>
      </div>
    </div>
  );
}

/** 아이콘 그리드 — 성능을 위해 최대 N개까지 표시 + "더 많은 결과" 안내 */
const MAX_RENDER = 600;

interface GridItem {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: any;
}

function IconGrid({
  items,
  onPick,
  totalLabel,
}: {
  items: GridItem[];
  onPick: (name: string) => void;
  totalLabel: string;
}) {
  const truncated = items.length > MAX_RENDER;
  const visible = truncated ? items.slice(0, MAX_RENDER) : items;

  return (
    <>
      <div className="flex items-center justify-between px-1 text-[10px] text-gray-400">
        <span>{totalLabel}</span>
        {truncated && <span>최대 {MAX_RENDER}개 표시 — 검색으로 좁혀보세요</span>}
      </div>
      <div className="grid max-h-[320px] grid-cols-8 gap-0.5 overflow-y-auto">
        {visible.map(({ name, Icon }) => (
          <button
            key={name}
            onClick={() => onPick(name)}
            className="flex h-8 w-8 items-center justify-center rounded text-gray-700 transition-colors hover:bg-gray-100"
            title={name}
          >
            <Icon size={16} strokeWidth={1.8} />
          </button>
        ))}
        {visible.length === 0 && (
          <div className="col-span-8 py-4 text-center text-xs text-gray-400">
            검색 결과 없음
          </div>
        )}
      </div>
    </>
  );
}
