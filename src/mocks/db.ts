import type {
  AdminFixedPriceSaleRow,
  BillRow,
  CreatorFixedPriceSaleRow,
  FixedPriceApplyRow,
  FixedPriceOrderRow,
  LaunchAirdropPhasePublicRow,
  MilestoneProjectNode,
  Notification,
  PhaseDraft,
  RwaProject,
  ReconcileRevenueLogRow,
  UserVestingEntry,
  Work,
} from '@/types/api';
import { makeBills } from './factories/bills';
import { makeNotifications } from './factories/notifications';
import {
  createSeedProjects,
  seedFixedPriceSales,
  seedMilestones,
  seedPhases,
  seedReconciles,
} from './factories/projects';
import { MOCK_WORKS } from './factories/user';

export const MOCK_DB_KEY = 'mockDb@v3';

export interface ProgressPost {
  progress_id: string;
  project_id: number;
  title?: string;
  body: string;
  attachments: { url: string; type: string; size: number }[];
  is_draft: boolean;
  created_at: number;
}

export interface MockDb {
  version: 1;
  projects: RwaProject[];
  phases: Record<number, LaunchAirdropPhasePublicRow[]>;
  phasesCreator: Record<number, PhaseDraft[]>; // full edit copy for S07
  milestones: Record<number, MilestoneProjectNode[]>;
  reconciles: Record<number, ReconcileRevenueLogRow[]>;
  fixedPriceSales: AdminFixedPriceSaleRow[];
  fixedPriceOrders: Record<string, FixedPriceOrderRow[]>; // key saleId_uid
  fixedPriceApplies: FixedPriceApplyRow[];
  /** Creator-side draft/submitted fixed-price sales (S11 wizard) */
  creatorFpSales: CreatorFixedPriceSaleRow[];
  vestingByUid: Record<string, UserVestingEntry[]>;
  billsByUid: Record<string, BillRow[]>;
  creatorBillsByUid: Record<string, BillRow[]>;
  notificationsByUid: Record<string, Notification[]>;
  airdropDaily: Record<string, boolean>; // `${uid}:${work_id}:${day}`
  nextProjectId: number;
  nextPhaseId: number;
  nextVestingId: number;
  works: Work[];
  progressByProject: Record<number, ProgressPost[]>;
  /** `${uid}:${work_id}` → points balance */
  userPoints: Record<string, number>;
}

let memory: MockDb | null = null;

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

export function createInitialDb(): MockDb {
  const projects = createSeedProjects();
  const uidRich = 'U-001';
  return {
    version: 1,
    projects: clone(projects),
    phases: seedPhases(),
    phasesCreator: {},
    milestones: seedMilestones(),
    reconciles: seedReconciles(),
    fixedPriceSales: seedFixedPriceSales(),
    fixedPriceOrders: {},
    fixedPriceApplies: [],
    creatorFpSales: [],
    vestingByUid: {
      [uidRich]: seedVestingRich(),
    },
    billsByUid: {
      'U-001': makeBills('U-001'),
      'U-002': makeBills('U-002'),
      'U-003': makeBills('U-003'),
    },
    creatorBillsByUid: {
      'U-001': makeBills('U-001').filter((b) =>
        [
          'deposit',
          'deposit_refund',
          'fee_settle',
          'milestone_claim',
          'reconcile_distribute',
          'vault_a_claim',
          'vault_b_claim',
          'fixed_price_creator_fee',
        ].includes(b.type),
      ),
    },
    notificationsByUid: {
      'U-001': makeNotifications(true),
      'U-002': makeNotifications(false),
      'U-003': makeNotifications(false),
    },
    airdropDaily: {},
    nextProjectId: 1009,
    nextPhaseId: 100,
    nextVestingId: 5000,
    works: clone(MOCK_WORKS),
    progressByProject: {},
    userPoints: {
      'U-001:1001': 12345,
      'U-001:8001': 200,
    },
  };
}

function seedVestingRich(): UserVestingEntry[] {
  const now = Math.floor(Date.now() / 1000);
  return [
    {
      id: 1,
      project_id: 1001,
      symbol: 'HSHW',
      amount_raw: '1000000000',
      unlock_at: now - 100,
      claimed: false,
      source: 'utility',
    },
    {
      id: 2,
      project_id: 1001,
      symbol: 'HSHW',
      amount_raw: '2000000000',
      unlock_at: now - 50,
      claimed: false,
      source: 'utility',
    },
    {
      id: 3,
      project_id: 1001,
      symbol: 'HSHW',
      amount_raw: '500000000',
      unlock_at: now + 86400,
      claimed: false,
      source: 'fixed_price',
    },
  ];
}

export function loadDb(): MockDb {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(MOCK_DB_KEY);
    if (raw) {
      memory = JSON.parse(raw) as MockDb;
      return memory;
    }
  } catch {
    /* fallthrough */
  }
  memory = createInitialDb();
  persistDb();
  return memory;
}

export function persistDb(): void {
  if (!memory) return;
  try {
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(memory));
  } catch {
    /* ignore quota */
  }
}

export function getDb(): MockDb {
  return loadDb();
}

export function mutateDb(fn: (db: MockDb) => void): MockDb {
  const db = loadDb();
  fn(db);
  persistDb();
  return db;
}

export function resetDb(): MockDb {
  memory = createInitialDb();
  persistDb();
  return memory;
}
