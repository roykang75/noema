import { create } from "zustand";

/**
 * AI 질문 채팅 패널 전역 상태
 * YouTube 블록 등 에디터 내부 컴포넌트에서도 채팅 패널을 열 수 있도록 전역화
 */
interface AIChatStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useAIChatStore = create<AIChatStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
