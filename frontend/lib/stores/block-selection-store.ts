import { create } from "zustand";

/**
 * 현재 에디터에서 선택(커서 위치)된 블록 정보
 * 하단 contextual 툴바가 이 값을 읽어 블록 타입별 버튼을 렌더링
 */
interface BlockSelectionStore {
  blockType: string | null;
  blockProps: Record<string, unknown> | null;
  setSelection: (
    type: string | null,
    props: Record<string, unknown> | null,
  ) => void;
  clear: () => void;
}

export const useBlockSelectionStore = create<BlockSelectionStore>((set) => ({
  blockType: null,
  blockProps: null,
  setSelection: (type, props) => set({ blockType: type, blockProps: props }),
  clear: () => set({ blockType: null, blockProps: null }),
}));
