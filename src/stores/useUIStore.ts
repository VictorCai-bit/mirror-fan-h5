import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BottomSheetKey =
  | null
  | 'connect'
  | 'language'
  | 'trade'
  | 'debug'
  | 'phase'
  | 'reconcile'
  | 'apply'
  | 'profile'
  | 'draftChoice';

export interface UIState {
  bottomSheet: BottomSheetKey;
  debugOpen: boolean;
  always500: boolean;
  setBottomSheet: (k: BottomSheetKey) => void;
  setDebugOpen: (v: boolean) => void;
  setAlways500: (v: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      bottomSheet: null,
      debugOpen: false,
      always500: false,
      setBottomSheet: (k) => set({ bottomSheet: k }),
      setDebugOpen: (v) => set({ debugOpen: v }),
      setAlways500: (v) => set({ always500: v }),
    }),
    {
      name: 'mirror-ui',
      version: 2,
      partialize: (s) => ({ always500: s.always500 }),
      // Older prototype builds accidentally persisted always500=true for some
      // users. Always reset it on load so the dev UI doesn't silently force
      // every mock response to 500.
      migrate: () => ({ always500: false }),
    },
  ),
);
