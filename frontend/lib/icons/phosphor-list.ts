/**
 * Phosphor 전체 아이콘 목록
 * - 메타데이터: @phosphor-icons/core (name, pascal_name, categories, tags)
 * - 컴포넌트: @phosphor-icons/react 에서 pascal_name으로 동적 조회
 */

import { icons as phosphorMeta } from "@phosphor-icons/core";
import * as PhosphorReact from "@phosphor-icons/react";
import type { Icon as PhosphorIconType } from "@phosphor-icons/react";

export interface PhosphorIconEntry {
  /** pascal_name — "FileText" 같은 형식, 저장 ID로도 사용 */
  name: string;
  /** 검색용 kebab-case 이름 */
  kebab: string;
  /** 검색용 태그들 */
  tags: readonly string[];
  Icon: PhosphorIconType;
}

const PhosphorReactAny = PhosphorReact as unknown as Record<
  string,
  PhosphorIconType | unknown
>;

const _raw: Array<PhosphorIconEntry | null> = phosphorMeta.map((meta) => {
  const Icon = PhosphorReactAny[meta.pascal_name];
  if (!Icon || typeof Icon !== "object") return null;
  return {
    name: meta.pascal_name,
    kebab: meta.name,
    tags: meta.tags,
    Icon: Icon as PhosphorIconType,
  };
});

export const PHOSPHOR_ALL: PhosphorIconEntry[] = _raw.filter(
  (e): e is PhosphorIconEntry => e !== null,
);

export const PHOSPHOR_ICONS_MAP = new Map(
  PHOSPHOR_ALL.map((e) => [e.name, e.Icon]),
);
