"use client";

/**
 * 페이지 "..." 더보기 메뉴 드롭다운
 *
 * UI 및 아이콘은 첨부 이미지를 기준으로 구현. 기능은 모두 placeholder
 * (onClick 핸들러는 빈 상태) — 추후 기능 정리 예정.
 *
 * 애니메이션: open 직후 opacity/translateY 전환으로 슬라이드 다운.
 */

import { useEffect, useRef, useState } from "react";
import {
  AlignLeft,
  ArrowLeftRight,
  ArrowRight,
  Bell,
  Clock,
  Copy,
  Copyright,
  Download,
  FileDown,
  FilePlus,
  Grid3x3,
  History,
  Languages,
  Link as LinkIcon,
  Lock,
  MessageSquare,
  MoveRight,
  RefreshCw,
  Settings2,
  Sliders,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  WifiOff,
} from "lucide-react";

interface PageMoreMenuProps {
  onClose: () => void;
  wordCount?: number;
  lastEditor?: string;
  lastEditedAt?: string;
}

/** 메뉴 행 — 버튼 타입 (클릭 액션) */
function MenuItem({
  icon,
  label,
  shortcut,
  onClick,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-gray-800 transition-colors hover:bg-gray-100"
    >
      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-gray-500">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {shortcut && (
        <span className="flex-shrink-0 text-xs text-gray-400">{shortcut}</span>
      )}
      {trailing}
    </button>
  );
}

/**
 * 토글 메뉴 행 — 행 전체 클릭 또는 스위치 클릭으로 토글
 * <button> 중첩 방지를 위해 wrapper는 <div role="button">로 구현
 */
function ToggleMenuItem({
  icon,
  label,
  on,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  const toggle = () => onChange(!on);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-gray-800 transition-colors hover:bg-gray-100"
    >
      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-gray-500">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      <ToggleSwitch on={on} />
    </div>
  );
}

/** 시각적 토글 스위치 — 클릭은 상위 ToggleMenuItem에서 처리 */
function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <span
      role="switch"
      aria-checked={on}
      className={`relative inline-flex h-[18px] w-8 flex-shrink-0 items-center rounded-full transition-colors ${
        on ? "bg-blue-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform ${
          on ? "translate-x-[16px]" : "translate-x-[2px]"
        }`}
      />
    </span>
  );
}

/** 구분선 */
const Divider = () => <div className="my-1 h-px bg-gray-100" />;

export default function PageMoreMenu({
  onClose,
  wordCount = 0,
  lastEditor,
  lastEditedAt,
}: PageMoreMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false); // 애니메이션 트리거

  // 폰트 선택 (기본/세리프/모노)
  const [font, setFont] = useState<"default" | "serif" | "mono">("default");

  // 토글 로컬 state (placeholder)
  const [offline, setOffline] = useState(false);
  const [smallText, setSmallText] = useState(false);
  const [fullWidth, setFullWidth] = useState(false);
  const [locked, setLocked] = useState(false);

  // 다음 tick 에 visible=true → transition 발동
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 0);
    return () => clearTimeout(t);
  }, []);

  // 바깥 클릭/ESC 로 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // 다음 tick에 등록 — 현재 클릭(열 때)으로 바로 닫히지 않도록
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

  return (
    <div
      ref={ref}
      className={`w-[260px] origin-top rounded-lg border border-gray-200 bg-white p-1 shadow-lg transition-all duration-150 ease-out ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
    >
      {/* 검색 */}
      <div className="p-1">
        <div className="relative">
          <svg viewBox="0 0 24 24" className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="text"
            placeholder="작업 검색..."
            className="w-full rounded-md border border-blue-400 bg-white px-7 py-1.5 text-sm outline-none ring-2 ring-blue-100"
          />
        </div>
      </div>

      {/* 폰트 선택 */}
      <div className="grid grid-cols-3 gap-1 p-2">
        {([
          { key: "default", label: "기본", cls: "font-sans" },
          { key: "serif", label: "세리프", cls: "font-serif" },
          { key: "mono", label: "모노", cls: "font-mono" },
        ] as const).map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFont(f.key)}
            className={`flex flex-col items-center gap-1 rounded-md p-2 transition-colors hover:bg-gray-100 ${
              font === f.key ? "text-blue-600" : "text-gray-800"
            }`}
          >
            <span className={`text-2xl font-semibold ${f.cls}`}>Ag</span>
            <span className="text-xs">{f.label}</span>
          </button>
        ))}
      </div>

      <Divider />

      {/* 액션 그룹 1 */}
      <MenuItem icon={<LinkIcon size={14} />} label="링크 복사" shortcut="⌘L" />
      <MenuItem icon={<Copy size={14} />} label="페이지 내용 복사하기" />
      <MenuItem icon={<FilePlus size={14} />} label="복제" shortcut="⌘D" />
      <MenuItem icon={<MoveRight size={14} />} label="옮기기" shortcut="⌘⇧P" />
      <MenuItem icon={<Trash2 size={14} />} label="휴지통으로 이동" />

      <Divider />

      {/* 토글 그룹 */}
      <ToggleMenuItem
        icon={<WifiOff size={14} />}
        label="오프라인에서 사용 가능"
        on={offline}
        onChange={setOffline}
      />
      <ToggleMenuItem
        icon={<AlignLeft size={14} />}
        label="작은 텍스트"
        on={smallText}
        onChange={setSmallText}
      />
      <ToggleMenuItem
        icon={<ArrowLeftRight size={14} />}
        label="전체 너비"
        on={fullWidth}
        onChange={setFullWidth}
      />
      <MenuItem icon={<Sliders size={14} />} label="페이지 사용자 지정" />

      <Divider />

      {/* 페이지 잠금 / AI / 번역 / 실행취소 */}
      <ToggleMenuItem
        icon={<Lock size={14} />}
        label="페이지 잠금"
        on={locked}
        onChange={setLocked}
      />
      <MenuItem
        icon={<Sparkles size={14} />}
        label="AI로 사용"
        trailing={<ArrowRight size={12} className="text-gray-400" />}
      />
      <MenuItem icon={<MessageSquare size={14} />} label="편집 제안" />
      <MenuItem
        icon={<Languages size={14} />}
        label="번역"
        trailing={<ArrowRight size={12} className="text-gray-400" />}
      />
      <MenuItem icon={<Undo2 size={14} />} label="실행 취소" shortcut="⌘Z" />

      <Divider />

      {/* 가져오기/내보내기/위키 */}
      <MenuItem icon={<Download size={14} />} label="가져오기" />
      <MenuItem icon={<Upload size={14} />} label="내보내기" />
      <MenuItem icon={<RefreshCw size={14} />} label="위키로 전환" />

      <Divider />

      {/* 정보 */}
      <MenuItem icon={<Clock size={14} />} label="업데이트와 애널리틱스" />
      <MenuItem icon={<History size={14} />} label="버전 기록" />

      <Divider />

      {/* 알림 / 연결 */}
      <MenuItem
        icon={<Bell size={14} />}
        label="알림 받기"
        trailing={
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>댓글</span>
            <ArrowRight size={12} />
          </div>
        }
      />
      <MenuItem
        icon={<Grid3x3 size={14} />}
        label="연결"
        trailing={
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>없음</span>
            <ArrowRight size={12} />
          </div>
        }
      />

      {/* 하단 정보 */}
      <div className="mt-1 border-t border-gray-100 px-2 py-2 text-[11px] leading-tight text-gray-400">
        <div>단어 수 {wordCount}개의 단어</div>
        {lastEditor && <div>{lastEditor} 최종 편집</div>}
        {lastEditedAt && <div>{lastEditedAt}</div>}
      </div>

      {/* 사용하지 않는 import 제거 방지 — 일부 아이콘은 차후 사용 예정 */}
      <span className="hidden">
        <Settings2 size={1} />
        <Copyright size={1} />
        <FileDown size={1} />
      </span>
    </div>
  );
}
