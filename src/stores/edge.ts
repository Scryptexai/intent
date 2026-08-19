import { create } from "zustand";

/** Edge sandbox state: selected project + active variable. */
interface EdgeState {
  projectId: string;
  variableId: string;
  setProject: (id: string) => void;
  setVariable: (id: string) => void;
}

export const useEdgeStore = create<EdgeState>((set) => ({
  projectId: "p-blur",
  variableId: "vesting_period",
  setProject: (projectId) => set({ projectId }),
  setVariable: (variableId) => set({ variableId }),
}));
