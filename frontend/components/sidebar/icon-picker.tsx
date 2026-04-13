"use client";

/**
 * 아이콘 피커 팝업
 * - 탭: 이모지 / Lucide / Phosphor
 * - 이모지 탭: emoji-picker-react 사용
 * - Lucide/Phosphor 탭: 큐레이션된 아이콘 그리드 + 검색
 * - 선택 시 onPick(iconString) 호출 후 자동 닫힘
 *
 * 저장 포맷:
 *   - "📄" (이모지 그대로)
 *   - "lucide:FileText"
 *   - "phosphor:FileText"
 */

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LUCIDE_ICONS } from "@/lib/icons/lucide-list";
import { PHOSPHOR_ICONS } from "@/lib/icons/phosphor-list";

// emoji-picker-react는 SSR 불가 — 클라이언트 전용 동적 로드
const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
});

type Tab = "emoji" | "lucide" | "phosphor";

interface IconPickerProps {
  onPick: (icon: string) => void;
  onClose: () => void;
  /** 팝업 앵커 기준 위치 계산을 위한 위치 정보 */
  anchor?: { x: number; y: number };
}

export default function IconPicker({
  onPick,
  onClose,
  anchor,
}: IconPickerProps) {
  const [tab, setTab] = useState<Tab>("emoji");
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // 바깥 클릭으로 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // 다음 tick에 등록 — 현재 클릭 이벤트로 즉시 닫히는 것 방지
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

  const filter = (name: string) =>
    !search || name.toLowerCase().includes(search.toLowerCase());

  const lucideFiltered = LUCIDE_ICONS.filter((e) => filter(e.name));
  const phosphorFiltered = PHOSPHOR_ICONS.filter((e) => filter(e.name));

  return (
    <div
      ref={ref}
      style={style}
      className="w-[340px] rounded-lg border border-gray-200 bg-white shadow-xl"
    >
      {/* 탭 */}
      <div className="flex border-b border-gray-200">
        {(["emoji", "lucide", "phosphor"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2 text-xs font-medium capitalize transition-colors ${
              tab === t
                ? "border-b-2 border-gray-900 text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "emoji" ? "이모지" : t === "lucide" ? "Lucide" : "Phosphor"}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="p-2">
        {tab === "emoji" && (
          <div className="emoji-picker-wrapper">
            <EmojiPicker
              width="100%"
              height={360}
              onEmojiClick={(data) => {
                onPick(data.emoji);
                onClose();
              }}
              searchPlaceholder="이모지 검색..."
              lazyLoadEmojis
              skinTonesDisabled
              previewConfig={{ showPreview: false }}
            />
          </div>
        )}

        {tab !== "emoji" && (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="아이콘 검색..."
              className="mb-2 w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-gray-400"
              autoFocus
            />
            <div className="grid max-h-[320px] grid-cols-8 gap-1 overflow-y-auto">
              {tab === "lucide" &&
                lucideFiltered.map(({ name, Icon }) => (
                  <button
                    key={name}
                    onClick={() => {
                      onPick(`lucide:${name}`);
                      onClose();
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded text-gray-700 transition-colors hover:bg-gray-100"
                    title={name}
                  >
                    <Icon size={16} strokeWidth={1.8} />
                  </button>
                ))}
              {tab === "phosphor" &&
                phosphorFiltered.map(({ name, Icon }) => (
                  <button
                    key={name}
                    onClick={() => {
                      onPick(`phosphor:${name}`);
                      onClose();
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded text-gray-700 transition-colors hover:bg-gray-100"
                    title={name}
                  >
                    <Icon size={16} />
                  </button>
                ))}
              {tab === "lucide" && lucideFiltered.length === 0 && (
                <div className="col-span-8 py-4 text-center text-xs text-gray-400">
                  검색 결과 없음
                </div>
              )}
              {tab === "phosphor" && phosphorFiltered.length === 0 && (
                <div className="col-span-8 py-4 text-center text-xs text-gray-400">
                  검색 결과 없음
                </div>
              )}
            </div>
          </>
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
          아이콘 제거 (기본 📄로 복원)
        </button>
      </div>
    </div>
  );
}
