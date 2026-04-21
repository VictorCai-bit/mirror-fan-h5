import type { PositionSummary } from '@/types/api';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MockWalletProfile = 'rich' | 'poor' | 'new';

const PROFILES: Record<
  MockWalletProfile,
  {
    uid: string;
    wallet_address: string;
    usdt_raw: string;
    ent_raw: string;
    points_by_work: Record<number, number>;
    creator_of: number[];
    positions: Record<number, PositionSummary>;
  }
> = {
  rich: {
    uid: 'U-001',
    wallet_address: '0x71C7E4E1A2B3C4D5E6F7E420',
    usdt_raw: '128469000000',
    ent_raw: '15750000000000000000000',
    points_by_work: { 1001: 12345, 1007: 200 },
    creator_of: [1001, 1007, 1008],
    positions: {
      1001: {
        project_id: 1001,
        symbol: 'HSHW',
        work_id: 1001,
        token_balance_raw: '9090900000',
        usdt_spent_raw: '100000000',
        pending_unlock_raw: '500000000',
      },
      1003: {
        project_id: 1003,
        symbol: 'MUSE',
        work_id: 1003,
        token_balance_raw: '1000000000',
        usdt_spent_raw: '50000000',
        pending_unlock_raw: '0',
      },
      1005: {
        project_id: 1005,
        symbol: 'DREAM',
        work_id: 1005,
        token_balance_raw: '200000000',
        usdt_spent_raw: '20000000',
        pending_unlock_raw: '100000000',
      },
    },
  },
  poor: {
    uid: 'U-002',
    wallet_address: '0x42B2A1A2B3C4D5E6F7A3F1',
    usdt_raw: '50000000',
    ent_raw: '0',
    points_by_work: {},
    creator_of: [],
    positions: {},
  },
  new: {
    uid: 'U-003',
    wallet_address: '0x9A1CA1A2B3C4D5E6F7C1D4',
    usdt_raw: '0',
    ent_raw: '0',
    points_by_work: {},
    creator_of: [],
    positions: {},
  },
};

export interface UserState {
  uid: string | null;
  wallet_address: string | null;
  usdt_raw: string;
  ent_raw: string;
  points_by_work: Record<number, number>;
  creator_of: number[];
  positions: Record<number, PositionSummary>;
  mockRole: 'investor' | 'admin';
  connect: (profile: MockWalletProfile) => void;
  disconnect: () => void;
  is_logged_in: () => boolean;
  is_creator_of: (projectId: number) => boolean;
  set_mock_role: (role: 'investor' | 'admin') => void;
  set_creator_of: (ids: number[]) => void;
  patchBalances: (patch: Partial<Pick<UserState, 'usdt_raw' | 'ent_raw' | 'points_by_work' | 'positions'>>) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      uid: null,
      wallet_address: null,
      usdt_raw: '0',
      ent_raw: '0',
      points_by_work: {},
      creator_of: [],
      positions: {},
      mockRole: 'investor',
      connect: (profile) => {
        const p = PROFILES[profile];
        set({
          uid: p.uid,
          wallet_address: p.wallet_address,
          usdt_raw: p.usdt_raw,
          ent_raw: p.ent_raw,
          points_by_work: { ...p.points_by_work },
          creator_of: [...p.creator_of],
          positions: { ...p.positions },
        });
      },
      disconnect: () =>
        set({
          uid: null,
          wallet_address: null,
          usdt_raw: '0',
          ent_raw: '0',
          points_by_work: {},
          creator_of: [],
          positions: {},
          mockRole: 'investor',
        }),
      is_logged_in: () => !!get().uid && !!get().wallet_address,
      is_creator_of: (projectId) => get().creator_of.includes(projectId),
      set_mock_role: (role) => set({ mockRole: role }),
      set_creator_of: (ids) => set({ creator_of: ids }),
      patchBalances: (patch) => set((s) => ({ ...s, ...patch })),
    }),
    { name: 'mirror-user' },
  ),
);
