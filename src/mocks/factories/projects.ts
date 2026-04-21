import type {
  AdminFixedPriceSaleRow,
  LaunchAirdropPhasePublicRow,
  MilestoneProjectNode,
  OnChainDetail,
  ProjectStatus,
  RwaProject,
  ReconcileRevenueLogRow,
  WorkType,
} from '@/types/api';
import { getMilestoneTemplatesForWorkType } from './milestoneTemplates';

const now = Math.floor(Date.now() / 1000);
const CREATOR_UID = 'U-001';

function seedMilestones1001(): MilestoneProjectNode[] {
  const tpl = getMilestoneTemplatesForWorkType('Fiction');
  return tpl.map((t, i) => {
    if (i === 0) {
      return {
        node_index: t.node_index,
        title: t.title,
        bps: t.bps,
        status: 'public_display',
        public_display_until: now + 2 * 86400,
        description: 'Migrated',
        evidence: [],
      };
    }
    if (i === 1) {
      return {
        node_index: t.node_index,
        title: t.title,
        bps: t.bps,
        status: 'empty',
        evidence: [],
      };
    }
    return {
      node_index: t.node_index,
      title: t.title,
      bps: t.bps,
      status: 'empty',
    };
  });
}

function emptyMilestones(workType: WorkType): MilestoneProjectNode[] {
  return getMilestoneTemplatesForWorkType(workType).map((t) => ({
    node_index: t.node_index,
    title: t.title,
    bps: t.bps,
    status: 'empty' as const,
  }));
}

export function createSeedProjects(): RwaProject[] {
  const start1002 = now + 7 * 86400;
  return [
    {
      id: 1001,
      work_id: 1001,
      name: 'Black Myth Wukong',
      symbol: 'HSHW',
      description: 'RWA demo project',
      cover_image_url: 'https://picsum.photos/seed/hshw/400/400',
      language: 'zh-CN',
      work_type: 'Fiction',
      status: 'curve_active',
      reject_reason: null,
      deposit_status: 'paid',
      deposit_amount_usdt_raw: '50000000000',
      target_financing_micro_usdt: '150000000000',
      ip_revenue_rights_valuation_micro_usdt: '1000000000000000',
      fundraising_fraction_bps: 6000,
      airdrop_fraction_bps: 1000,
      dev_fund_fraction_bps: 3000,
      curve_start_unix: now - 86400 * 3,
      curve_deadline_unix: now + 86400 * 30,
      meteora_pool: null,
      creator_uid: CREATOR_UID,
      current_price: '110000',
      total_sold_raw: '5000000000000',
      volume_24h_raw: '123000000000',
      holder_count: 99234,
      progress_bps: 7500,
      price_change_24h_bps: 1250,
      revenue_rights_percent_bps: 1200,
    },
    {
      id: 1002,
      work_id: 1002,
      name: 'Journey to the West',
      symbol: 'XYJE',
      description: 'Coming soon',
      cover_image_url: 'https://picsum.photos/seed/xyje/400/400',
      language: 'zh-CN',
      work_type: 'Cartoon',
      status: 'on_chain',
      reject_reason: null,
      deposit_status: 'paid',
      deposit_amount_usdt_raw: '50000000000',
      target_financing_micro_usdt: '120000000000',
      ip_revenue_rights_valuation_micro_usdt: '800000000000000',
      fundraising_fraction_bps: 6000,
      airdrop_fraction_bps: 1000,
      dev_fund_fraction_bps: 3000,
      curve_start_unix: start1002,
      curve_deadline_unix: start1002 + 86400 * 60,
      meteora_pool: null,
      creator_uid: 'U-999',
      current_price: '10000',
      total_sold_raw: '0',
      volume_24h_raw: '0',
      holder_count: 0,
      progress_bps: 0,
    },
    {
      id: 1003,
      work_id: 1003,
      name: 'Muse Album',
      symbol: 'MUSE',
      description: 'Music RWA',
      cover_image_url: 'https://picsum.photos/seed/muse/400/400',
      language: 'en-US',
      work_type: 'Music',
      status: 'curve_completed',
      reject_reason: null,
      deposit_status: 'paid',
      deposit_amount_usdt_raw: '50000000000',
      target_financing_micro_usdt: '90000000000',
      ip_revenue_rights_valuation_micro_usdt: '500000000000000',
      fundraising_fraction_bps: 6000,
      airdrop_fraction_bps: 1000,
      dev_fund_fraction_bps: 3000,
      curve_start_unix: now - 86400 * 40,
      curve_deadline_unix: now - 86400,
      meteora_pool: null,
      creator_uid: 'U-888',
      current_price: '220000',
      total_sold_raw: '8180000000000',
      volume_24h_raw: '45000000000',
      holder_count: 12000,
      progress_bps: 10000,
      price_change_24h_bps: -320,
      revenue_rights_percent_bps: 800,
    },
    {
      id: 1004,
      work_id: 1004,
      name: 'Starship VR',
      symbol: 'STAR',
      description: 'VR_AR',
      cover_image_url: 'https://picsum.photos/seed/star/400/400',
      language: 'en-US',
      work_type: 'VR_AR',
      status: 'migrated',
      reject_reason: null,
      deposit_status: 'paid',
      deposit_amount_usdt_raw: '50000000000',
      target_financing_micro_usdt: '200000000000',
      ip_revenue_rights_valuation_micro_usdt: '2000000000000000',
      fundraising_fraction_bps: 6000,
      airdrop_fraction_bps: 1000,
      dev_fund_fraction_bps: 3000,
      curve_start_unix: now - 86400 * 120,
      curve_deadline_unix: now - 86400 * 90,
      meteora_pool: 'STAR_METEORA_POOL_ADDR',
      creator_uid: 'U-777',
      current_price: '350000',
      total_sold_raw: '9000000000000',
      volume_24h_raw: '200000000000',
      holder_count: 50000,
      progress_bps: 10000,
      price_change_24h_bps: 580,
      revenue_rights_percent_bps: 1500,
    },
    {
      id: 1005,
      work_id: 1005,
      name: 'Dream City',
      symbol: 'DREAM',
      description: 'Movie',
      cover_image_url: 'https://picsum.photos/seed/dream/400/400',
      language: 'zh-CN',
      work_type: 'Movie',
      status: 'curve_active',
      reject_reason: null,
      deposit_status: 'paid',
      deposit_amount_usdt_raw: '50000000000',
      target_financing_micro_usdt: '80000000000',
      ip_revenue_rights_valuation_micro_usdt: '400000000000000',
      fundraising_fraction_bps: 6000,
      airdrop_fraction_bps: 1000,
      dev_fund_fraction_bps: 3000,
      curve_start_unix: now - 86400 * 2,
      curve_deadline_unix: now + 86400 * 20,
      meteora_pool: null,
      creator_uid: 'U-666',
      current_price: '95000',
      total_sold_raw: '2000000000000',
      volume_24h_raw: '30000000000',
      holder_count: 8000,
      progress_bps: 4000,
      price_change_24h_bps: -780,
      revenue_rights_percent_bps: 1000,
    },
    {
      id: 1006,
      work_id: 1006,
      name: 'Abandoned Alpha',
      symbol: 'ABND',
      description: 'Cancelled',
      cover_image_url: 'https://picsum.photos/seed/abnd/400/400',
      language: 'en-US',
      work_type: 'Film',
      status: 'cancelled',
      reject_reason: null,
      deposit_status: 'refunded',
      deposit_amount_usdt_raw: '0',
      target_financing_micro_usdt: '50000000000',
      ip_revenue_rights_valuation_micro_usdt: '300000000000000',
      fundraising_fraction_bps: 6000,
      airdrop_fraction_bps: 1000,
      dev_fund_fraction_bps: 3000,
      curve_start_unix: null,
      curve_deadline_unix: null,
      meteora_pool: null,
      creator_uid: 'U-555',
      current_price: '0',
      total_sold_raw: '0',
      volume_24h_raw: '0',
      holder_count: 0,
      progress_bps: 0,
    },
    {
      id: 1007,
      work_id: 8001,
      name: '未命名草稿',
      symbol: 'TBD',
      description: '',
      cover_image_url: '',
      language: 'zh-CN',
      work_type: 'Fiction',
      status: 'draft',
      reject_reason: null,
      deposit_status: 'unpaid',
      deposit_amount_usdt_raw: '0',
      target_financing_micro_usdt: '0',
      ip_revenue_rights_valuation_micro_usdt: '0',
      fundraising_fraction_bps: 6000,
      airdrop_fraction_bps: 1000,
      dev_fund_fraction_bps: 3000,
      curve_start_unix: null,
      curve_deadline_unix: null,
      meteora_pool: null,
      creator_uid: CREATOR_UID,
      current_price: '0',
      total_sold_raw: '0',
      volume_24h_raw: '0',
      holder_count: 0,
      progress_bps: 0,
    },
    {
      id: 1008,
      work_id: 1008,
      name: '测试项目2',
      symbol: 'PEND',
      description: 'Pending review',
      cover_image_url: 'https://picsum.photos/seed/pend/400/400',
      language: 'zh-CN',
      work_type: 'Music',
      status: 'pending_review',
      reject_reason: null,
      deposit_status: 'paid',
      deposit_amount_usdt_raw: '50000000000',
      target_financing_micro_usdt: '100000000000',
      ip_revenue_rights_valuation_micro_usdt: '500000000000000',
      fundraising_fraction_bps: 6000,
      airdrop_fraction_bps: 1000,
      dev_fund_fraction_bps: 3000,
      curve_start_unix: null,
      curve_deadline_unix: null,
      meteora_pool: null,
      creator_uid: CREATOR_UID,
      current_price: '0',
      total_sold_raw: '0',
      volume_24h_raw: '0',
      holder_count: 0,
      progress_bps: 0,
    },
  ];
}

export function projectToOnChain(p: RwaProject): OnChainDetail {
  return {
    ...p,
    public_cap_bps: 6000,
    airdrop_phase: null,
  };
}

export function seedPhases(): Record<number, LaunchAirdropPhasePublicRow[]> {
  return {
    1001: [
      {
        phase_id: 1,
        start_at: now - 86400 * 10,
        end_at: now + 86400 * 10,
        timeline_state: 'active',
        daily_sign_amount: 5,
        invite_per_day_amount: 10,
        invite_daily_cap: 10,
        team_per_day_amount: 1,
        team_daily_cap: 3,
        total_points_cap: 10_000_000,
        distributed_points: 4_200_000,
      },
    ],
  };
}

function seedMilestones1005(): MilestoneProjectNode[] {
  const tpl = getMilestoneTemplatesForWorkType('Movie');
  return tpl.map((t, i) => {
    if (i === 0) return { node_index: t.node_index, title: t.title, bps: t.bps, status: 'claimable' as const, description: '公募完成，平台资金已到账', evidence: [{ url: 'https://picsum.photos/seed/ev1/120/80', type: 'image', size: 102400 }] };
    if (i === 1) return { node_index: t.node_index, title: t.title, bps: t.bps, status: 'public_display' as const, public_display_until: now + 86400 * 2, description: '剧本第一稿完成', evidence: [{ url: 'https://picsum.photos/seed/ev2/120/80', type: 'image', size: 204800 }, { url: 'https://example.com/script.pdf', type: 'pdf', size: 512000 }] };
    if (i === 2) return { node_index: t.node_index, title: t.title, bps: t.bps, status: 'submitted' as const, description: '主演确认签约' };
    if (i === 3) return { node_index: t.node_index, title: t.title, bps: t.bps, status: 'rejected' as const, description: '需要补充合同扫描件' };
    return { node_index: t.node_index, title: t.title, bps: t.bps, status: 'empty' as const };
  });
}

export function seedMilestones(): Record<number, MilestoneProjectNode[]> {
  const m: Record<number, MilestoneProjectNode[]> = {};
  const projects = createSeedProjects();
  for (const p of projects) {
    if (p.id === 1001) m[1001] = seedMilestones1001();
    else if (p.id === 1005) m[1005] = seedMilestones1005();
    else m[p.id] = emptyMilestones(p.work_type);
  }
  return m;
}

export function seedReconciles(): Record<number, ReconcileRevenueLogRow[]> {
  return {
    1001: [
      { id: 'r1', revenue_type: 'copyright', amount_usd: '12000', description: '2026 Q1 版权授权费（日本区域）', evidence_urls: ['https://example.com/contract-jp.pdf'], status: 'distributed', distribute_status: 'distributed', public_time: now - 86400 * 4, created_at: now - 86400 * 5 },
      { id: 'r2', revenue_type: 'platform_split', amount_usd: '3000', description: '抖音平台分账 2026-03', evidence_urls: [], status: 'pending_review', distribute_status: 'pending', created_at: now - 86400 * 2 },
      { id: 'r3', revenue_type: 'commercial', amount_usd: '8500', description: '品牌联名授权—可口可乐', evidence_urls: ['https://example.com/brand-deal.pdf', 'https://picsum.photos/seed/brand/120/80'], status: 'distributed', distribute_status: 'distributing', public_time: now - 86400, created_at: now - 86400 * 8 },
    ],
    1005: [
      { id: 'r10', revenue_type: 'ticket', amount_usd: '25000', description: '首映式票房收入', evidence_urls: ['https://example.com/ticket-report.pdf'], status: 'distributed', distribute_status: 'distributed', public_time: now - 86400 * 3, created_at: now - 86400 * 10 },
      { id: 'r11', revenue_type: 'commercial', amount_usd: '5000', description: '植入广告收入', evidence_urls: [], status: 'pending_review', distribute_status: 'pending', created_at: now - 86400 },
    ],
  };
}

export function seedFixedPriceSales(): AdminFixedPriceSaleRow[] {
  return [
    {
      id: 'sale-1',
      work_id: 1001,
      project_id: 1001,
      symbol: 'HSHW',
      status: 'done',
      price_usdt_per_token_raw: '120000',
      target_usdt_raw: '500000000000',
      raised_usdt_raw: '500000000000',
      sale_start_unix: now - 86400 * 90,
      sale_end_unix: now - 86400 * 80,
      vesting_num_slices: 4,
      vesting_slice_period_sec: 86400 * 30,
      vesting_percentages_bps_csv: '2500,2500,2500,2500',
      vesting_start_unix: now - 86400 * 70,
    },
    {
      id: 'sale-2',
      work_id: 1001,
      project_id: 1001,
      symbol: 'HSHW',
      status: 'vesting',
      price_usdt_per_token_raw: '150000',
      target_usdt_raw: '800000000000',
      raised_usdt_raw: '800000000000',
      sale_start_unix: now - 86400 * 40,
      sale_end_unix: now - 86400 * 30,
      vesting_num_slices: 4,
      vesting_slice_period_sec: 86400 * 30,
      vesting_percentages_bps_csv: '2500,2500,2500,2500',
      vesting_start_unix: now - 86400 * 25,
    },
    {
      id: 'sale-3',
      work_id: 1001,
      project_id: 1001,
      symbol: 'HSHW',
      status: 'subscribing',
      price_usdt_per_token_raw: '180000',
      target_usdt_raw: '1000000000000',
      raised_usdt_raw: '225000000000',
      sale_start_unix: now - 86400,
      sale_end_unix: now + 86400 * 7,
      vesting_num_slices: 4,
      vesting_slice_period_sec: 86400 * 30,
      vesting_percentages_bps_csv: '2500,2500,2500,2500',
      vesting_start_unix: now + 86400 * 8,
    },
    {
      id: 'sale-d1',
      work_id: 1005,
      project_id: 1005,
      symbol: 'DREAM',
      status: 'subscribing',
      price_usdt_per_token_raw: '150000',
      target_usdt_raw: '500000000000',
      raised_usdt_raw: '100000000000',
      sale_start_unix: now - 86400 * 2,
      sale_end_unix: now + 86400 * 14,
      vesting_num_slices: 3,
      vesting_slice_period_sec: 86400 * 30,
      vesting_percentages_bps_csv: '3334,3333,3333',
      vesting_start_unix: now + 86400 * 15,
    },
  ];
}

export function displayStatus(p: RwaProject): ProjectStatus | 'coming' {
  if (p.status === 'on_chain' && p.curve_start_unix && now < p.curve_start_unix) {
    return 'on_chain'; // UI maps to Coming badge
  }
  return p.status;
}
