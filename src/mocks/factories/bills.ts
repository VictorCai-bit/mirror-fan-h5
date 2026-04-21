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
