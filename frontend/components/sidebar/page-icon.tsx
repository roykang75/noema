"use client";

/**
 * 페이지 아이콘 렌더러
 * icon 문자열 형식:
 *   - "lucide:FileText"    → Lucide 아이콘
 *   - "phosphor:FileText"  → Phosphor 아이콘
 *   - 그 외 (또는 빈 값)   → 이모지/문자 또는 기본 📄
 */

import { LUCIDE_ICONS_MAP } from "@/lib/icons/lucide-list";
import { PHOSPHOR_ICONS_MAP } from "@/lib/icons/phosphor-list";

interface PageIconProps {
  icon?: string | null;
  size?: number;
  className?: string;
}

export default function PageIcon({
  icon,
  size = 16,
  className,
}: PageIconProps) {
  if (!icon) {
    return (
      <span
        className={className}
        style={{ fontSize: size, lineHeight: 1 }}
        aria-hidden
      >
        📄
      </span>
    );
  }

  if (icon.startsWith("lucide:")) {
    const name = icon.slice(7);
    const Icon = LUCIDE_ICONS_MAP.get(name);
    if (Icon) {
      return (
        <Icon
          size={size}
          strokeWidth={1.8}
          className={className}
          aria-hidden
        />
      );
    }
  }

  if (icon.startsWith("phosphor:")) {
    const name = icon.slice(9);
    const Icon = PHOSPHOR_ICONS_MAP.get(name);
    if (Icon) {
      return <Icon size={size} className={className} aria-hidden />;
    }
  }

  // 이모지/일반 문자
  return (
    <span
      className={className}
      style={{ fontSize: size, lineHeight: 1 }}
      aria-hidden
    >
      {icon}
    </span>
  );
}
