/** Shared API / domain types for MSW + UI */

export type ApiResponse<T> = { code: number; msg: string; data: T };

export type WorkType =
  | 'Fiction'
  | 'Music'
  | 'Cartoon'
  | 'Movie'
  | 'Film'
  | 'VR_AR'
  | 'More';

export type ProjectStatus =
  | 'draft'
  | 'pending_review'
  | 'rejected'
  | 'approved'
  | 'on_chaining'
  | 'on_chain'
  | 'curve_active'
  | 'curve_completed'
  | 'migrating'
  | 'migrated'
  | 'cancelled'
  | 'abandoned';

export type DepositStatus =
  | 'unpaid'
  | 'paying_platform'
  | 'paying_wallet'
  | 'paid'
  | 'failed'
  | 'refunded';

export type PhaseTimelineState = 'pending' | 'active' | 'exhausted' | 'ended';

export type MilestoneNodeStatus =
  | 'empty'
  | 'submitted'
  | 'pending_review'
  | 'rejected'
  | 'approved'
  | 'public_display'
  | 'claimable'
  | 'unlocked';

export type ReconcileStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'public_display'
  | 'distributing'
  | 'distributed'
  | 'distribute_failed';

export interface RwaProject {
  id: number;
  work_id: number;
  name: string;
  symbol: string;
  description: string;
  cover_image_url: string;
  language: 'zh-CN' | 'en-US';
  work_type: WorkType;
  status: ProjectStatus;
  reject_reason: string | null;
  deposit_status: DepositStatus;
  deposit_amount_usdt_raw: string;
  target_financing_micro_usdt: string;
  ip_revenue_rights_valuation_micro_usdt: string;
  fundraising_fraction_bps: number;
  airdrop_fraction_bps: number;
  dev_fund_fraction_bps: number;
  curve_start_unix: number | null;
  curve_deadline_unix: number | null;
  meteora_pool: string | null;
  creator_uid: string;
  /** Derived for list cards */
  current_price?: string;
  total_sold_raw?: string;
  volume_24h_raw?: string;
  holder_count?: number;
  progress_bps?: number;
  /** 24h price change in basis points, can be negative */
  price_change_24h_bps?: number;
  /** Revenue rights percent (basis points) */
  revenue_rights_percent_bps?: number;
}

export interface OnChainDetail extends RwaProject {
  public_cap_bps: number;
  airdrop_phase?: LaunchAirdropPhasePublicRow | null;
}

export interface Candle {
  t: number;
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
}

export interface OnChainTradeRow {
  ts: number;
  side: 'buy' | 'sell';
  price_raw: string;
  amount_token_raw: string;
  wallet: string;
}

export interface OnChainHolderRow {
  rank: number;
  wallet: string;
  balance_raw: string;
  pct_bps: number;
  buy_count?: number;
  sell_count?: number;
  last_trade_time?: number;
  unrealized_pnl_usdt?: string;
}

export interface LaunchAirdropPhasePublicRow {
  phase_id: number;
  start_at: number;
  end_at: number;
  timeline_state: PhaseTimelineState;
  daily_sign_amount: number;
  invite_per_day_amount: number;
  invite_daily_cap: number;
  team_per_day_amount: number;
  team_daily_cap: number;
  total_points_cap: number;
  distributed_points: number;
}

export interface MilestoneProjectNode {
  node_index: number;
  title: string;
  bps: number;
  status: MilestoneNodeStatus;
  public_display_until?: number;
  evidence?: { url: string; type: string; size: number }[];
  description?: string;
}

export interface ReconcileRevenueLogRow {
  id: string;
  revenue_type: string;
  amount_usd: string;
  description: string;
  evidence_urls: string[];
  status: ReconcileStatus;
  created_at: number;
  distribute_status?: 'pending' | 'distributing' | 'distributed' | 'failed';
  public_time?: number;
}

export interface AdminFixedPriceSaleRow {
  id: string;
  work_id: number;
  project_id: number;
  symbol: string;
  status: string;
  price_usdt_per_token_raw: string;
  target_usdt_raw: string;
  raised_usdt_raw: string;
  sale_start_unix: number;
  sale_end_unix: number;
  vesting_num_slices: number;
  vesting_slice_period_sec: number;
  vesting_percentages_bps_csv: string;
  vesting_start_unix: number;
}

export interface FixedPriceOrderRow {
  order_id: string;
  usdt_raw: string;
  token_raw: string;
  created_at: number;
}

export interface UserVestingEntry {
  id: number;
  project_id: number;
  symbol: string;
  amount_raw: string;
  unlock_at: number;
  claimed: boolean;
  source: string;
}

export interface PositionSummary {
  project_id: number;
  symbol: string;
  work_id: number;
  token_balance_raw: string;
  usdt_spent_raw: string;
  pending_unlock_raw: string;
}

export interface BillRow {
  id: string;
  type: string;
  direction: 'in' | 'out';
  amount_raw: string;
  currency: string;
  title: string;
  created_at: number;
}

export interface Notification {
  id: string;
  category: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  created_at: number;
}

export interface MarkdownBlock {
  id: string;
  title: string;
  body_md: string;
}

export interface MilestoneTemplateNode {
  node_index: number;
  title: string;
  bps: number;
  required_attachments: ('image' | 'video' | 'pdf')[];
}

export interface PhaseDraft {
  phase_id?: number;
  start_at: number;
  end_at: number;
  daily_sign_amount: number;
  invite_per_day_amount: number;
  invite_daily_cap: number;
  team_per_day_amount: number;
  team_daily_cap: number;
  total_points_cap: number;
}

export interface NewProjectDraft {
  localId: string;
  work_id: number | null;
  /** Filled when a bound Work is selected (drives milestone template query). */
  work_type: WorkType | null;
  name: string;
  symbol: string;
  description: string;
  cover_image_url: string;
  language: 'zh-CN' | 'en-US';
  target_financing_micro_usdt: string;
  ip_revenue_rights_valuation_micro_usdt: string;
  fundraising_fraction_bps: number;
  airdrop_fraction_bps: number;
  initial_airdrop_phase?: PhaseDraft;
  step: 1 | 2 | 3 | 4 | 5;
  updatedAt: number;
}

export interface Work {
  id: number;
  title: string;
  work_type: WorkType;
  creator_uid: string;
  cover_image_url?: string;
}

export interface FixedPriceApplyRow {
  apply_id: string;
  project_id: number;
  status: string;
  created_at: number;
  note?: string;
}

/** Doc §13.7 */
export interface FixedPriceApplyBody {
  project_id: number;
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

/** Doc §13.3 #41 */
export interface DepositBody {
  method: 'platform' | 'wallet';
  amount_usdt_raw: string;
  currency: 'USDT' | 'ENT';
  tx_hash?: string;
}

/** Doc §13.3 progress */
export interface ProgressBody {
  title?: string;
  body: string;
  attachments: { url: string; type: string; size: number }[];
  is_draft: boolean;
}

/** Doc §13.3 reconcile */
export interface ReconcileBody {
  revenue_type: string;
  amount_usd: string;
  description: string;
  evidence_urls: string[];
  is_draft: boolean;
}
