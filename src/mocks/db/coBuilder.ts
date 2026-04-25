/**
 * 共建者计划专用的内存 mock 数据库。
 *
 * 用 localStorage 持久化最易变的两个状态：
 *   - sold_total（用于动态加价 ticker 跨刷新保持一致）
 *   - orders / claims（让"购买后会员中心立刻可见"的体验跨刷新生效）
 *
 * 其余偏静态的内容（5 档配置、IP 案例 fixture、团队示例）每次加载从代码常量重建。
 */

import type {
  CoBuilderClaimResult,
  CoBuilderOrder,
  CommunitySummary,
  FloatRule,
  InvitedWorkItem,
  MemberLevel,
  TeamMember,
  TierCardData,
} from '@/types/coBuilder';

const STORAGE_KEY = 'mirror-co-builder-db-v1';

interface PersistShape {
  sold_total: number;
  orders: CoBuilderOrder[];
  claims: CoBuilderClaimResult[];
  /** 当前会员中心展示的等级覆盖（Debug 切换；优先级高于由购买推算的等级） */
  level_override: MemberLevel | null;
}

const SEED_SOLD = 425_000;

const POOL_TOTAL = 6_000_000_000;
const FIRST_YEAR_RELEASE_PCT = 0.2;

const TIERS: TierCardData[] = [
  {
    level: 'base',
    base_contribution: 100,
    rebate_direct_pct: 8,
    rebate_indirect_pct: 2,
    has_floating: false,
    identity_pct: 0,
    can_view_team: false,
  },
  {
    level: 'active',
    base_contribution: 1500,
    rebate_direct_pct: 13,
    rebate_indirect_pct: 2,
    has_floating: true,
    identity_pct: 0,
    can_view_team: false,
  },
  {
    level: 'regional',
    base_contribution: 1500,
    rebate_direct_pct: 15,
    rebate_indirect_pct: 2,
    has_floating: true,
    identity_pct: 1,
    can_view_team: true,
  },
  {
    level: 'ecosystem',
    base_contribution: 1500,
    rebate_direct_pct: 15,
    rebate_indirect_pct: 4,
    has_floating: true,
    identity_pct: 3,
    can_view_team: true,
  },
  {
    level: 'global',
    base_contribution: 88500,
    rebate_direct_pct: 15,
    rebate_indirect_pct: 5,
    has_floating: true,
    identity_pct: 6,
    can_view_team: true,
  },
];

/** PRD 5.1.6 三个典型 IP 作为 fixture，前端可对账后端实现。 */
const INVITED_WORK_FIXTURES: InvitedWorkItem[] = [
  {
    work_id: 9001,
    cover_url: null,
    total_score: 75.513,
    rank: 4,
    rank_bucket: 'top1',
    float_contribution: 72_000,
    metrics: {
      market_cap_ratio: 0.1,
      market_cap_score: 65.517,
      active_user_count: 8000,
      active_user_score: 79.798,
      business_flow: 40,
      business_flow_score: 79.798,
    },
  },
  {
    work_id: 9002,
    cover_url: null,
    total_score: 18.607,
    rank: 38,
    rank_bucket: 'top1_5',
    float_contribution: 13_500,
    metrics: {
      market_cap_ratio: 0.03,
      market_cap_score: 17.241,
      active_user_count: 2000,
      active_user_score: 19.192,
      business_flow: 10,
      business_flow_score: 19.192,
    },
  },
  {
    work_id: 9003,
    cover_url: null,
    total_score: 3.559,
    rank: 220,
    rank_bucket: 'top15_30',
    float_contribution: 1_200,
    metrics: {
      market_cap_ratio: 0.01,
      market_cap_score: 3.448,
      active_user_count: 500,
      active_user_score: 4.04,
      business_flow: 2,
      business_flow_score: 3.03,
    },
  },
];

const FLOAT_RULE: FloatRule = {
  current_stage: 'stage1',
  weights: {
    stage1: { market_cap: 0.3, active_user: 0.4, business_flow: 0.3 },
    stage2: { market_cap: 0.35, active_user: 0.35, business_flow: 0.3 },
    stage3: { market_cap: 0.4, active_user: 0.3, business_flow: 0.3 },
  },
  rank_buckets: [
    { key: 'top1', pool_pct: 0.4 },
    { key: 'top1_5', pool_pct: 0.3 },
    { key: 'top5_15', pool_pct: 0.2 },
    { key: 'top15_30', pool_pct: 0.1 },
    { key: 'rest', pool_pct: 0 },
  ],
  pool_size: 1_800_000,
  total_works: 1000,
};

const TEAM_FIXTURE: TeamMember[] = [
  {
    uid: 'U-2001',
    nickname: 'JaneCreator',
    level: 'active',
    team_contribution: 18_400,
    rebate_relation: 'direct',
    joined_at: Date.now() / 1000 - 86400 * 12,
  },
  {
    uid: 'U-2002',
    nickname: 'GalacticDeer',
    level: 'base',
    team_contribution: 6_300,
    rebate_relation: 'direct',
    joined_at: Date.now() / 1000 - 86400 * 7,
  },
  {
    uid: 'U-2003',
    nickname: 'crypto.luna',
    level: 'regional',
    team_contribution: 51_200,
    rebate_relation: 'indirect',
    joined_at: Date.now() / 1000 - 86400 * 23,
  },
  {
    uid: 'U-2004',
    nickname: '@oilpainter',
    level: 'base',
    team_contribution: 1_800,
    rebate_relation: 'indirect',
    joined_at: Date.now() / 1000 - 86400 * 3,
  },
  {
    uid: 'U-2005',
    nickname: 'NebulaWei',
    level: 'active',
    team_contribution: 9_900,
    rebate_relation: 'indirect',
    joined_at: Date.now() / 1000 - 86400 * 30,
  },
];

interface CoBuilderState {
  sold_total: number;
  orders: CoBuilderOrder[];
  claims: CoBuilderClaimResult[];
  level_override: MemberLevel | null;
}

function loadPersist(): PersistShape {
  if (typeof window === 'undefined') {
    return { sold_total: SEED_SOLD, orders: [], claims: [], level_override: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sold_total: SEED_SOLD, orders: [], claims: [], level_override: null };
    const parsed = JSON.parse(raw) as Partial<PersistShape>;
    return {
      sold_total: parsed.sold_total ?? SEED_SOLD,
      orders: parsed.orders ?? [],
      claims: parsed.claims ?? [],
      level_override: parsed.level_override ?? null,
    };
  } catch {
    return { sold_total: SEED_SOLD, orders: [], claims: [], level_override: null };
  }
}

function savePersist(s: CoBuilderState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sold_total: s.sold_total,
        orders: s.orders,
        claims: s.claims,
        level_override: s.level_override,
      } satisfies PersistShape),
    );
  } catch {
    /* swallow quota errors */
  }
}

const state: CoBuilderState = loadPersist();

export function getCoBuilderState() {
  return state;
}

export function getTiers(): TierCardData[] {
  return TIERS;
}

export function getInvitedWorks(): InvitedWorkItem[] {
  return INVITED_WORK_FIXTURES;
}

export function getFloatRule(): FloatRule {
  return FLOAT_RULE;
}

export function getTeamMembers(): TeamMember[] {
  return TEAM_FIXTURE;
}

/** 按 PRD 3.3 计算实时单价：每 150,000A 上涨 1%。 */
export function calcUnitPrice(soldTotal: number): number {
  const steps = Math.floor(soldTotal / 150_000);
  const raw = 100 * 1.01 ** steps;
  return Math.round(raw * 100) / 100;
}

export function getNextThreshold(soldTotal: number): number {
  const steps = Math.floor(soldTotal / 150_000);
  return (steps + 1) * 150_000;
}

export function bumpSoldTotal(qty: number) {
  state.sold_total += qty;
  savePersist(state);
}

export function pushOrder(o: CoBuilderOrder) {
  state.orders = [o, ...state.orders].slice(0, 50);
  savePersist(state);
}

export function getOrder(orderNo: string): CoBuilderOrder | undefined {
  return state.orders.find((o) => o.order_no === orderNo);
}

export function patchOrder(orderNo: string, patch: Partial<CoBuilderOrder>) {
  state.orders = state.orders.map((o) => (o.order_no === orderNo ? { ...o, ...patch } : o));
  savePersist(state);
}

export function pushClaim(c: CoBuilderClaimResult) {
  state.claims = [c, ...state.claims].slice(0, 50);
  savePersist(state);
}

/** 由 DebugSheet 切换；优先级高于"由 orders 推断的等级"。 */
export function setLevelOverride(level: MemberLevel | null) {
  state.level_override = level;
  savePersist(state);
}

const LEVEL_ORDER: MemberLevel[] = ['none', 'base', 'active', 'regional', 'ecosystem', 'global'];

/** 由订单累计金额推断等级（mock 简化策略） */
export function inferLevel(uid: string): MemberLevel {
  if (state.level_override) return state.level_override;
  const myOrders = state.orders.filter((o) => o.uid === uid && o.status === 'paid');
  if (myOrders.length === 0) return 'none';
  const totalUsdt = myOrders.reduce((s, o) => s + o.total_amount, 0);
  if (totalUsdt >= 50_000) return 'global';
  if (totalUsdt >= 5_000) return 'ecosystem';
  if (totalUsdt >= 1_000) return 'regional';
  if (totalUsdt >= 300) return 'active';
  return 'base';
}

export function nextLevelOf(level: MemberLevel): MemberLevel | null {
  const idx = LEVEL_ORDER.indexOf(level);
  if (idx === -1 || idx >= LEVEL_ORDER.length - 1) return null;
  if (level === 'none') return 'base';
  return LEVEL_ORDER[idx + 1] ?? null;
}

export function getLastClaim(uid: string): CoBuilderClaimResult | undefined {
  return state.claims.find((c) => c.claim_no.includes(uid.slice(-3)));
}

export function communityFor(uid: string): CommunitySummary {
  const level = inferLevel(uid);
  const tier = TIERS.find((t) => t.level === (level === 'none' ? 'base' : level));
  const nextLevel = nextLevelOf(level);
  const nextTier = nextLevel ? TIERS.find((t) => t.level === (nextLevel === 'none' ? 'base' : nextLevel)) : null;
  const teamFull = TEAM_FIXTURE;

  return {
    level,
    next_level: nextLevel,
    rebate_direct_pct: tier?.rebate_direct_pct ?? 8,
    rebate_indirect_pct: tier?.rebate_indirect_pct ?? 2,
    next_rebate_direct_pct: nextTier?.rebate_direct_pct ?? null,
    next_rebate_indirect_pct: nextTier?.rebate_indirect_pct ?? null,
    today_commission: level === 'none' ? 0 : 36.42,
    total_commission: level === 'none' ? 0 : 1284.96,
    direct_invite_count: level === 'none' ? 0 : 4,
    team_kpi_total: level === 'none' ? 0 : 38_500,
    can_view_team: tier?.can_view_team ?? false,
    team_list: tier?.can_view_team ? teamFull : [],
    invite_link: `https://mirror.fan/co-builder/invite?ref=${uid}`,
  };
}

export function memberSummaryFor(uid: string, walletAddress: string | null) {
  const level = inferLevel(uid);
  const myOrders = state.orders.filter((o) => o.uid === uid && o.status === 'paid');
  const baseContribution = myOrders.reduce((s, o) => s + o.quantity, 0);
  const tier = TIERS.find((t) => t.level === (level === 'none' ? 'base' : level));

  // mock 浮动 / 身份贡献力：与等级强相关，方便回归视角切换。
  const floating = level === 'none' || level === 'base' ? 0 : Math.round(baseContribution * 0.18);
  const identity =
    level === 'regional'
      ? Math.round((baseContribution + floating) * 0.01)
      : level === 'ecosystem'
        ? Math.round((baseContribution + floating) * 0.03)
        : level === 'global'
          ? Math.round((baseContribution + floating) * 0.06)
          : 0;

  const totalContribution = baseContribution + floating + identity;
  const accumulatedEnt = totalContribution * 0.0042;
  const claimableEnt =
    state.claims
      .filter((c) => c.claim_no.startsWith('CLM-'))
      .reduce((sum, c) => sum + c.amount, 0) > 0
      ? Math.max(0, accumulatedEnt - 0.5)
      : accumulatedEnt;

  // 升级目标依据 PRD 3.1 阈值
  const directTargets: Record<Exclude<MemberLevel, 'none' | 'global'>, number> = {
    base: 3,
    active: 3,
    regional: 5,
    ecosystem: 3,
  };
  const kpiTargets: Record<Exclude<MemberLevel, 'none' | 'global'>, number> = {
    base: 0,
    active: 10_000,
    regional: 50_000,
    ecosystem: 200_000,
  };
  const directCurrent = level === 'none' ? 0 : 2;
  const kpiCurrent = level === 'none' ? 0 : 8_400;
  const nextLevel = nextLevelOf(level);
  const isUpgradable =
    nextLevel === 'base' ||
    nextLevel === 'active' ||
    nextLevel === 'regional' ||
    nextLevel === 'ecosystem';
  const directTarget = isUpgradable ? directTargets[nextLevel] : 2;
  const kpiTarget = isUpgradable ? kpiTargets[nextLevel] : 500_000;

  return {
    level,
    next_level: nextLevel,
    upgrade_progress: {
      direct_invite: { current: directCurrent, target: directTarget },
      team_kpi: { current: kpiCurrent, target: kpiTarget },
    },
    contribution: {
      base: baseContribution,
      floating,
      identity,
      total: totalContribution,
    },
    ent: {
      accumulated: accumulatedEnt,
      claimable: claimableEnt,
      today_produced: claimableEnt > 0 ? claimableEnt * 0.06 : 0,
      last_day_produced: claimableEnt > 0 ? claimableEnt * 0.058 : 0,
      monthly_produced: claimableEnt > 0 ? claimableEnt * 1.7 : 0,
    },
    wallet_address: walletAddress,
    member_since: myOrders.at(-1)?.paid_at ?? null,
    has_floating: tier?.has_floating ?? false,
    has_identity: (tier?.identity_pct ?? 0) > 0,
  };
}

export function poolSize() {
  return POOL_TOTAL;
}

export function firstYearReleasePct() {
  return FIRST_YEAR_RELEASE_PCT;
}

export const DEFAULT_PLATFORM_CONTRIBUTION = 6_000_000;
