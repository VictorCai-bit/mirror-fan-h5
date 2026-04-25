import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatUsdtFromRaw } from '@/lib/fmt';
import type { BillRow } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RequireInvestor } from '@/routes/guards';

const TYPE_FILTERS = [
  'all',
  'recharge',
  'withdraw',
  'swap',
  'airdrop_claim',
  'vesting_claim',
  'fee',
] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

function typeLabel(type: string, t: (k: string) => string): string {
  const map: Record<string, string> = {
    recharge: t('bill.recharge'),
    withdraw: t('bill.withdraw'),
    swap: t('bill.swap'),
    airdrop_claim: t('bill.airdropClaim'),
    vesting_claim: t('bill.vestingClaim'),
    fee: t('bill.feeSettle'),
    deposit: t('bill.deposit'),
    deposit_refund: t('bill.depositRefund'),
    milestone_claim: t('bill.milestoneClaim'),
    vault_a_claim: t('bill.vaultAClaim'),
    vault_b_claim: t('bill.vaultBClaim'),
    reconcile_distribute: t('bill.reconcileDistribute'),
    fixed_price_creator_fee: t('bill.fpCreatorFee'),
  };
  return map[type] ?? type;
}

export default function BillsPage() {
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [filter, setFilter] = useState<TypeFilter>('all');

  const { data, isPending } = useQuery({
    queryKey: ['wallet', 'bills'],
    queryFn: () => apiFetch<BillRow[]>('/wallet/bills'),
  });

  const rows = useMemo(() => {
    const all = data ?? [];
    return filter === 'all' ? all : all.filter((b) => b.type === filter);
  }, [data, filter]);

  const inTotal = useMemo(
    () => (data ?? []).filter((b) => b.direction === 'in').reduce((s, b) => s + Number(b.amount_raw), 0),
    [data],
  );
  const outTotal = useMemo(
    () => (data ?? []).filter((b) => b.direction === 'out').reduce((s, b) => s + Number(b.amount_raw), 0),
    [data],
  );

  return (
    <RequireInvestor>
      <AppShell hideTab>
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex h-12 shrink-0 items-center gap-2 px-2">
            <button
              type="button"
              className="rounded-lg p-2 text-text-secondary hover:bg-white/5"
              onClick={() => nav(-1)}
            >
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="flex-1 text-base font-semibold">{t('wallet.bills')}</h1>
            {data ? (
              <span className="text-xs text-text-secondary">{t('wallet.billCount', { n: data.length })}</span>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 px-3 pb-8 pt-1">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-success-500/10 p-3.5">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] text-text-secondary">
                  <ArrowDownLeft className="size-3.5 text-success-400" />
                  {t('bill.totalIn')}
                </div>
                {isPending ? (
                  <Skeleton className="h-5 w-24 rounded-lg" />
                ) : (
                  <p className="tabular-nums font-bold text-success-400">
                    +{formatUsdtFromRaw(String(inTotal), locale)}
                  </p>
                )}
              </div>
              <div className="rounded-2xl bg-danger-500/10 p-3.5">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] text-text-secondary">
                  <ArrowUpRight className="size-3.5 text-danger-400" />
                  {t('bill.totalOut')}
                </div>
                {isPending ? (
                  <Skeleton className="h-5 w-24 rounded-lg" />
                ) : (
                  <p className="tabular-nums font-bold text-danger-400">
                    -{formatUsdtFromRaw(String(outTotal), locale)}
                  </p>
                )}
              </div>
            </div>

            {/* Type filter chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition',
                    filter === f
                      ? 'bg-accent-500/25 text-accent-400 ring-1 ring-accent-500/40'
                      : 'bg-white/6 text-text-secondary hover:bg-white/10',
                  )}
                >
                  {f === 'all' ? t('common.all') : typeLabel(f, t)}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="overflow-hidden rounded-2xl bg-surface">
              {isPending ? (
                <>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3 border-b border-white/6 px-4 py-3.5">
                      <Skeleton className="size-8 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-32 rounded" />
                        <Skeleton className="h-2.5 w-20 rounded" />
                      </div>
                      <Skeleton className="h-4 w-16 rounded" />
                    </div>
                  ))}
                </>
              ) : rows.length === 0 ? (
                <p className="py-10 text-center text-xs text-text-secondary">{t('common.empty')}</p>
              ) : (
                rows.map((b, idx) => (
                  <BillItem key={b.id} bill={b} locale={locale} t={t} last={idx === rows.length - 1} />
                ))
              )}
            </div>
          </div>
        </div>
      </AppShell>
    </RequireInvestor>
  );
}

function BillItem({
  bill,
  locale,
  t,
  last,
}: {
  bill: BillRow;
  locale: string;
  t: (k: string) => string;
  last: boolean;
}) {
  const isIn = bill.direction === 'in';
  const dateStr = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(bill.created_at * 1000));

  return (
    <div className={cn('flex items-center gap-3 px-4 py-3.5', !last && 'border-b border-white/6')}>
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full bg-white/8',
          isIn ? 'text-success-400' : 'text-danger-400',
        )}
      >
        {isIn ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{typeLabel(bill.type, t)}</p>
        <p className="text-[10px] tabular-nums text-text-secondary">{dateStr}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn('text-sm font-semibold tabular-nums', isIn ? 'text-success-400' : 'text-danger-400')}>
          {isIn ? '+' : '-'}
          {formatUsdtFromRaw(bill.amount_raw, locale)}
        </p>
        <p className="text-[10px] text-text-secondary">{bill.currency}</p>
      </div>
    </div>
  );
}
