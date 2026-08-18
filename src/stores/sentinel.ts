import { create } from "zustand";

/** Sentinel UI state: which exception's deep-dive panel is open. */
interface SentinelState {
  selectedAlertId: string | null;
  openDetail: (id: string) => void;
  closeDetail: () => void;
}

export const useSentinelStore = create<SentinelState>((set) => ({
  selectedAlertId: null,
  openDetail: (selectedAlertId) => set({ selectedAlertId }),
  closeDetail: () => set({ selectedAlertId: null }),
}));
