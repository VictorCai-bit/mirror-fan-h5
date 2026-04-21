import type { NewProjectDraft, PhaseDraft } from '@/types/api';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MilestoneDraft {
  title?: string;
  description: string;
  attachments: { url: string; type: string; size: number }[];
}

export interface ReconcileDraft {
  revenue_type: string;
  amount_usd: string;
  description: string;
  evidence_urls: string[];
  is_draft: boolean;
}

export interface FixedPriceApplyDraft {
  price_usdt_per_token_raw: string;
  target_usdt_raw: string;
  sale_start_unix: number;
  sale_end_unix: number;
  vesting_num_slices: number;
  vesting_slice_period_sec: number;
  vesting_percentages_bps_csv: string;
  vesting_start_unix: number;
  note?: string;
}

export interface StudioState {
  drafts: Record<string, NewProjectDraft>;
  currentDraftId: string | null;
  wizardStep: 1 | 2 | 3 | 4 | 5;
  milestoneDrafts: Record<number, Record<number, MilestoneDraft>>;
  reconcileDrafts: Record<number, ReconcileDraft[]>;
  phaseDrafts: Record<number, PhaseDraft[]>;
  fixedPriceApplyDrafts: Record<number, FixedPriceApplyDraft[]>;
  upsertDraft: (d: NewProjectDraft) => void;
  dropDraft: (id: string) => void;
  setStep: (n: 1 | 2 | 3 | 4 | 5) => void;
  setCurrentDraftId: (id: string | null) => void;
  saveMilestoneDraft: (pid: number, step: number, draft: MilestoneDraft) => void;
  saveReconcileDraft: (pid: number, draft: ReconcileDraft) => void;
  savePhaseDrafts: (pid: number, drafts: PhaseDraft[]) => void;
  clearByProject: (pid: number) => void;
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set) => ({
      drafts: {},
      currentDraftId: null,
      wizardStep: 1,
      milestoneDrafts: {},
      reconcileDrafts: {},
      phaseDrafts: {},
      fixedPriceApplyDrafts: {},
      upsertDraft: (d) =>
        set((s) => ({
          drafts: { ...s.drafts, [d.localId]: { ...d, updatedAt: Date.now() } },
        })),
      dropDraft: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.drafts;
          return { drafts: rest };
        }),
      setStep: (n) => set({ wizardStep: n }),
      setCurrentDraftId: (id) => set({ currentDraftId: id }),
      saveMilestoneDraft: (pid, step, draft) =>
        set((s) => ({
          milestoneDrafts: {
            ...s.milestoneDrafts,
            [pid]: { ...(s.milestoneDrafts[pid] ?? {}), [step]: draft },
          },
        })),
      saveReconcileDraft: (pid, draft) =>
        set((s) => ({
          reconcileDrafts: {
            ...s.reconcileDrafts,
            [pid]: [...(s.reconcileDrafts[pid] ?? []), draft],
          },
        })),
      savePhaseDrafts: (pid, drafts) =>
        set((s) => ({
          phaseDrafts: { ...s.phaseDrafts, [pid]: drafts },
        })),
      clearByProject: (pid) =>
        set((s) => {
          const { [pid]: _m, ...md } = s.milestoneDrafts;
          const { [pid]: _r, ...rd } = s.reconcileDrafts;
          const { [pid]: _p, ...pd } = s.phaseDrafts;
          const { [pid]: _f, ...fd } = s.fixedPriceApplyDrafts;
          return {
            milestoneDrafts: md,
            reconcileDrafts: rd,
            phaseDrafts: pd,
            fixedPriceApplyDrafts: fd,
          };
        }),
    }),
    {
      name: 'mirror.studio',
      version: 2,
      migrate: (persisted, fromVersion) => {
        const s = persisted as StudioState;
        if (fromVersion < 2 && s?.drafts) {
          const drafts = { ...s.drafts };
          for (const k of Object.keys(drafts)) {
            const d = drafts[k];
            if (d && d.work_type === undefined) {
              drafts[k] = { ...d, work_type: null };
            }
          }
          return { ...s, drafts };
        }
        return s;
      },
    },
  ),
);
