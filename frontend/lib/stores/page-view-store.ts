import { create } from "zustand";

export type PageFont = "default" | "serif" | "mono";

/**
 * 페이지 뷰 설정 — 더보기 메뉴의 토글/선택 상태를 공유
 * (페이지 전환 시 기본값 유지. 추후 페이지별 저장이 필요해지면 Map 구조로 확장)
 */
interface PageViewStore {
  fullWidth: boolean;
  smallText: boolean;
  font: PageFont;
  setFullWidth: (v: boolean) => void;
  setSmallText: (v: boolean) => void;
  setFont: (f: PageFont) => void;
}

export const usePageViewStore = create<PageViewStore>((set) => ({
  fullWidth: false,
  smallText: false,
  font: "default",
  setFullWidth: (v) => set({ fullWidth: v }),
  setSmallText: (v) => set({ smallText: v }),
  setFont: (f) => set({ font: f }),
}));
