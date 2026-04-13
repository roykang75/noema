/**
 * 페이지 목록 전역 상태 관리 (Zustand)
 * 사이드바와 에디터 간 페이지 데이터 공유
 */

import { create } from "zustand";
import { Page } from "@/types";

interface PageStore {
  pages: Page[];
  loading: boolean;
  error: string | null;
  setPages: (pages: Page[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addPage: (page: Page) => void;
  /** 특정 페이지의 일부 필드 업데이트 (예: 제목, 아이콘) */
  updatePage: (pageId: string, patch: Partial<Page>) => void;
  removePage: (pageId: string) => void;
}

export const usePageStore = create<PageStore>((set) => ({
  pages: [],
  loading: false,
  error: null,
  setPages: (pages) => set({ pages }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  addPage: (page) => set((state) => ({ pages: [...state.pages, page] })),
  updatePage: (pageId, patch) =>
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId ? { ...p, ...patch } : p,
      ),
    })),
  removePage: (pageId) =>
    set((state) => ({ pages: state.pages.filter((p) => p.id !== pageId) })),
}));
