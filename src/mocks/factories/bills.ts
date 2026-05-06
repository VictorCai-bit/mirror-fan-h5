import type { BillRow } from '@/types/api';
import { nanoid } from 'nanoid';

const TYPES = [
  'swap',
  'deposit',
  'deposit_refund',
  'fee_settle',
  'milestone_claim',
  'reconcile_distribute',
  'vault_a_claim',
  'vault_b_claim',
  'fixed_price_creator_fee',
  'recharge',
  'withdraw',
];

export function makeBills(_uid: string, count = 50): BillRow[] {
  const rows: BillRow[] = [];
  const now = Math.floor(Date.now() / 1000);
  for (let i = 0; i < count; i++) {
    const t = TYPES[i % TYPES.length] ?? 'swap';
    rows.push({
      id: nanoid(),
      type: t,
      direction: i % 3 === 0 ? 'out' : 'in',
      amount_raw: String((i + 1) * 1_000_000),
      currency: 'USDT',
      title: `${t} #${i + 1}`,
      created_at: now - i * 3600 * 5,
    });
  }
  return rows;
}

/* ── Creator-specific bills with realistic amounts & titles ── */
export function makeCreatorBills(): BillRow[] {
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;

  const entries: Array<Omit<BillRow, 'id'>> = [
    // Vault A — USDT locked pool release (x5 batches)
    { type: 'vault_a_claim', direction: 'in', amount_raw: '18750000000', currency: 'USDT', title: 'HSHW · 融资池 A 解锁 #5', created_at: now - day * 1 },
    { type: 'vault_a_claim', direction: 'in', amount_raw: '18750000000', currency: 'USDT', title: 'HSHW · 融资池 A 解锁 #4', created_at: now - day * 8 },
    { type: 'vault_a_claim', direction: 'in', amount_raw: '18750000000', currency: 'USDT', title: 'HSHW · 融资池 A 解锁 #3', created_at: now - day * 16 },
    { type: 'vault_a_claim', direction: 'in', amount_raw: '18750000000', currency: 'USDT', title: 'HSHW · 融资池 A 解锁 #2', created_at: now - day * 24 },
    { type: 'vault_a_claim', direction: 'in', amount_raw: '18750000000', currency: 'USDT', title: 'HSHW · 融资池 A 解锁 #1', created_at: now - day * 32 },
    // Vault B — Node mining
    { type: 'vault_b_claim', direction: 'in', amount_raw: '4200000000', currency: 'USDT', title: 'HSHW · 节点挖矿收益 #3', created_at: now - day * 3 },
    { type: 'vault_b_claim', direction: 'in', amount_raw: '3800000000', currency: 'USDT', title: 'HSHW · 节点挖矿收益 #2', created_at: now - day * 18 },
    { type: 'vault_b_claim', direction: 'in', amount_raw: '3500000000', currency: 'USDT', title: 'HSHW · 节点挖矿收益 #1', created_at: now - day * 35 },
    // Milestone claim
    { type: 'milestone_claim', direction: 'in', amount_raw: '25000000000', currency: 'USDT', title: 'HSHW · 里程碑 M3 完成奖励', created_at: now - day * 12 },
    { type: 'milestone_claim', direction: 'in', amount_raw: '20000000000', currency: 'USDT', title: 'HSHW · 里程碑 M2 完成奖励', created_at: now - day * 45 },
    { type: 'milestone_claim', direction: 'in', amount_raw: '15000000000', currency: 'USDT', title: 'HSHW · 里程碑 M1 完成奖励', created_at: now - day * 90 },
    // Fixed-price sale creator fee
    { type: 'fixed_price_creator_fee', direction: 'in', amount_raw: '12000000000', currency: 'USDT', title: 'HSHW · 固定价增发 #2 创作者分成', created_at: now - day * 5 },
    { type: 'fixed_price_creator_fee', direction: 'in', amount_raw: '9600000000', currency: 'USDT', title: 'HSHW · 固定价增发 #1 创作者分成', created_at: now - day * 28 },
    // Reconcile distribute
    { type: 'reconcile_distribute', direction: 'in', amount_raw: '8000000000', currency: 'USDT', title: 'HSHW · 收益公开第 3 期分配', created_at: now - day * 10 },
    { type: 'reconcile_distribute', direction: 'in', amount_raw: '6500000000', currency: 'USDT', title: 'HSHW · 收益公开第 2 期分配', created_at: now - day * 40 },
    { type: 'reconcile_distribute', direction: 'in', amount_raw: '5200000000', currency: 'USDT', title: 'HSHW · 收益公开第 1 期分配', created_at: now - day * 72 },
    // Fee settle (out)
    { type: 'fee_settle', direction: 'out', amount_raw: '2400000000', currency: 'USDT', title: 'HSHW · 平台服务费结算', created_at: now - day * 6 },
    { type: 'fee_settle', direction: 'out', amount_raw: '1920000000', currency: 'USDT', title: 'HSHW · 平台服务费结算', created_at: now - day * 29 },
    // Deposit (out — initial margin)
    { type: 'deposit', direction: 'out', amount_raw: '50000000000', currency: 'USDT', title: 'HSHW · 保证金存入', created_at: now - day * 120 },
    // Deposit refund (in)
    { type: 'deposit_refund', direction: 'in', amount_raw: '50000000000', currency: 'USDT', title: 'DREAM · 保证金退还', created_at: now - day * 2 },
  ];

  return entries.map((e) => ({ ...e, id: nanoid() }));
}
