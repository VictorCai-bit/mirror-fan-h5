/**
 * Mirror.fan V2 共建者计划 — 前端类型定义。
 * 与 PRD §7 数据结构对齐，命名采用 snake_case 以保持与现有 ApiResponse 风格一致。
 */

export type MemberLevel = 'none' | 'base' | 'active' | 'regional' | 'ecosystem' | 'global';

/** 5 档会员的能力卡（页面 1 TierShowcase / PRD 3.1 节点等级总表；长文案见 i18n coBuilder.tierDetail.*） */
export interface TierCardData {
  level: Exclude<MemberLevel, 'none'>;
  /** 默认入驻贡献力（仅 base 用 100A 起步价；其他档保留以备运营展示） */
  base_contribution: number;
  /** 直推 / 间推会员推荐入驻奖励 */
  rebate_direct_pct: number;
  rebate_indirect_pct: number;
  /** 是否可获得浮动贡献力 */
  has_floating: boolean;
  /** 季度身份贡献力加权比例（0 表示无） */
  identity_pct: number;
  /** 是否可查看团队完整数据 */
  can_view_team: boolean;
}

/** 页面 1 顶部 EcosystemStats / DynamicPriceTicker 数据 */
export interface CoBuilderIndexData {
  pool_total: number; // 60_0000_0000
  first_year_release_pct: number; // 0.2
  first_year_release: number;
  total_contribution_platform: number;
  weights: { base: number; floating: number; identity: number };
  unit_price: number;
  sold_total: number;
  next_threshold_at: number;
  step_increase_pct: number;
  threshold_step: number; // 150_000
  tiers: TierCardData[];
}

export interface CoBuilderLivePrice {
  unit_price: number;
  sold_total: number;
  next_threshold_at: number;
  step_increase_pct: number;
  threshold_step: number;
}

/** 页面 1 预下单 / 锁价 */
export interface CoBuilderQuote {
  order_no: string;
  quantity: number;
  lock_price: number;
  lock_expires_at: number; // unix seconds
  total_amount: number;
}

export type CoBuilderOrderStatus = 'pending' | 'paying' | 'paid' | 'failed';

export interface CoBuilderOrder {
  order_no: string;
  uid: string;
  level: Exclude<MemberLevel, 'none'>;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: CoBuilderOrderStatus;
  tx_hash: string | null;
  created_at: number;
  paid_at: number | null;
}

/** 页面 2 我的会员核心数据 */
export interface MemberSummary {
  level: MemberLevel;
  next_level: MemberLevel | null;
  /** 直推 / 团队 KPI 双进度（取最低当作总进度） */
  upgrade_progress: {
    direct_invite: { current: number; target: number };
    team_kpi: { current: number; target: number };
  };
  contribution: {
    base: number;
    floating: number;
    identity: number;
    total: number;
  };
  ent: {
    accumulated: number;
    claimable: number;
    today_produced: number;
    last_day_produced: number;
    monthly_produced: number;
  };
  wallet_address: string | null;
  member_since: number | null;
}

export type CoBuilderClaimType = 'platform' | 'onchain';

export interface CoBuilderClaimResult {
  claim_no: string;
  amount: number;
  service_fee_ratio: number;
  service_fee_amount: number;
  actual_amount: number;
  claim_type: CoBuilderClaimType;
  to_address: string | null;
  tx_hash: string | null;
  created_at: number;
}

/** 浮动贡献力 — 单个邀请作品（展示标题/分类由 i18n coBuilder.fixture.works.w{id} 提供） */
export interface InvitedWorkItem {
  work_id: number;
  cover_url: string | null;
  total_score: number;
  rank: number;
  rank_bucket: 'top1' | 'top1_5' | 'top5_15' | 'top15_30' | 'rest';
  float_contribution: number;
  metrics: {
    market_cap_ratio: number; // 原始值
    market_cap_score: number;
    active_user_count: number;
    active_user_score: number;
    business_flow: number;
    business_flow_score: number;
  };
}

export type FloatStage = 'stage1' | 'stage2' | 'stage3';

export interface FloatRule {
  current_stage: FloatStage;
  weights: Record<FloatStage, { market_cap: number; active_user: number; business_flow: number }>;
  rank_buckets: { key: InvitedWorkItem['rank_bucket']; pool_pct: number }[];
  pool_size: number;
  total_works: number;
}

export interface CommunitySummary {
  level: MemberLevel;
  /** 下一档等级，用于与 i18n 组合展示升级提示 */
  next_level: MemberLevel | null;
  rebate_direct_pct: number;
  rebate_indirect_pct: number;
  /** 升级到下一档时的返佣比例（用作 RebateRuleCard 升级提示） */
  next_rebate_direct_pct: number | null;
  next_rebate_indirect_pct: number | null;
  today_commission: number;
  total_commission: number;
  direct_invite_count: number;
  team_kpi_total: number;
  /** 是否允许查看 team_list（Regional+） */
  can_view_team: boolean;
  team_list: TeamMember[];
  invite_link: string;
}

export interface TeamMember {
  uid: string;
  nickname: string;
  level: MemberLevel;
  team_contribution: number;
  rebate_relation: 'direct' | 'indirect';
  joined_at: number;
}
