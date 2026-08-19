import { create } from "zustand";

/** Global Mirror state: the reflected target project. */
interface MirrorState {
  targetProjectId: string;
  setTarget: (id: string) => void;
}

export const useMirrorStore = create<MirrorState>((set) => ({
  targetProjectId: "p-blur",
  setTarget: (targetProjectId) => set({ targetProjectId }),
}));
