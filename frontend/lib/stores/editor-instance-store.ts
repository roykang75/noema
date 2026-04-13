import { create } from "zustand";

/**
 * BlockNote 에디터 인스턴스 전역 참조
 * 하단 툴바 등에서 editor.updateBlock() 호출을 위해 사용
 */
interface EditorInstanceStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setEditor: (editor: any | null) => void;
}

export const useEditorInstanceStore = create<EditorInstanceStore>((set) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
}));
