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
  removePage: (pageId) =>
    set((state) => ({ pages: state.pages.filter((p) => p.id !== pageId) })),
}));
