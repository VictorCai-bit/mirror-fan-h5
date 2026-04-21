import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatEntFromRaw, formatPoints, formatUsdtFromRaw, shortenAddress } from '@/lib/fmt';
import { useUserStore } from '@/stores/useUserStore';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Coins,
  FileText,
  PenLine,
  Wallet,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RequireInvestor } from '@/routes/guards';

interface WalletSummary {
  usdt_raw: string;
  ent_raw: string;
  total_value_usdt: string;
  points_by_work?: Record<string, number>;
}

export default function WalletPage() {
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const wallet = useUserStore((s) => s.wallet_address);
  const creatorOf = useUserStore((s) => s.creator_of);
  const isCreator = creatorOf.length > 0;

  const { data, isPending } = useQuery({
    queryKey: ['wallet', 'summary'],
    queryFn: () => apiFetch<WalletSummary>('/wallet/summary'),
  });

  const pointsEntries = Object.entries(data?.points_by_work ?? {}).filter(([, v]) => v > 0);

  return (
    <RequireInvestor>
      <AppShell hideTab>
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex h-12 shrink-0 items-center px-4">
            <h1 className="flex-1 text-base font-semibold">{t('wallet.title')}</h1>
          </div>

          <div className="flex flex-col gap-3 px-3 pb-8 pt-1">
            {/* Total value hero */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500/30 via-accent-500/15 to-info-500/20 p-5">
              <div className="absolute -right-8 -top-8 size-36 rounded-full bg-white/5 blur-3xl" />
              <p className="mb-1 text-xs text-white/60">{t('wallet.totalValue')}</p>
              {isPending ? (
                <Skeleton className="h-10 w-44 rounded-xl" />
              ) : (
                <p className="text-4xl font-bold tabular-nums text-white">
                  {formatUsdtFromRaw(data?.total_value_usdt ?? data?.usdt_raw ?? '0', locale)}
                </p>
              )}
              <p className="mt-1 text-[10px] text-white/50">USDT</p>

              {wallet ? (
                <div className="mt-4 flex items-center gap-2">
                  <Wallet className="size-3.5 text-white/50" />
                  <span className="font-mono text-[11px] text-white/60">{shortenAddress(wallet)}</span>
                </div>
              ) : null}
            </div>

            {/* USDT / ENT split */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="USDT"
                value={isPending ? null : formatUsdtFromRaw(data?.usdt_raw ?? '0', locale)}
                color="success"
              />
              <StatCard
                label="ENT"
                value={isPending ? null : formatEntFromRaw(data?.ent_raw ?? '0', locale)}
                color="accent"
              />
            </div>

            {/* IP Points holdings */}
            {pointsEntries.length > 0 ? (
              <div className="rounded-2xl bg-surface">
                <p className="border-b border-white/8 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                  {t('wallet.ipPoints')}
                </p>
                {pointsEntries.map(([workId, pts]) => (
                  <div
                    key={workId}
                    className="flex items-center justify-between border-b border-white/6 px-4 py-3 last:border-0 text-sm"
                  >
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Coins className="size-4 text-primary-400" />
                      <span>Work #{workId}</span>
                    </div>
                    <span className="tabular-nums font-semibold">
                      {formatPoints(pts, locale)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Action CTAs */}
            <div className="grid grid-cols-2 gap-2.5">
              <ActionBtn
                icon={<ArrowDownLeft className="size-4" />}
                label={t('wallet.recharge')}
                color="success"
                onClick={() => nav('/wallet/recharge')}
              />
              <ActionBtn
                icon={<ArrowUpRight className="size-4" />}
                label={t('wallet.withdraw')}
                color="danger"
                onClick={() => nav('/wallet/withdraw')}
              />
            </div>

            {/* Entry rows */}
            <div className="rounded-2xl bg-surface overflow-hidden">
              <EntryRow
                icon={<FileText className="size-4" />}
                label={t('wallet.bills')}
                onClick={() => nav('/wallet/bills')}
              />
              {isCreator ? (
                <EntryRow
                  icon={<PenLine className="size-4 text-success-400" />}
                  label={t('nav.enterStudio')}
                  sub={t('wallet.studioSub')}
                  onClick={() => nav('/studio')}
                  accent
                />
              ) : null}
            </div>
          </div>
        </div>
      </AppShell>
    </RequireInvestor>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | null;
  color: 'success' | 'accent';
}) {
  const bg = color === 'success' ? 'bg-success-500/10' : 'bg-accent-500/10';
  const text = color === 'success' ? 'text-success-400' : 'text-accent-400';
  return (
    <div className={cn('rounded-2xl p-4', bg)}>
      <p className={cn('mb-1 text-[11px] font-semibold', text)}>{label}</p>
      {value === null ? (
        <Skeleton className="h-5 w-24 rounded-lg" />
      ) : (
        <p className="text-base font-bold tabular-nums">{value}</p>
      )}
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: 'success' | 'danger';
  onClick: () => void;
}) {
  const bg = color === 'success' ? 'bg-success-500/15 text-success-400' : 'bg-danger-500/15 text-danger-400';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl py-4 text-sm font-semibold transition hover:opacity-90 active:scale-[0.97]',
        bg,
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function EntryRow({
  icon,
  label,
  sub,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-white/6 px-4 py-3.5 last:border-0 hover:bg-white/5"
    >
      <span className={cn('flex size-8 items-center justify-center rounded-full', accent ? 'bg-success-500/15 text-success-400' : 'bg-white/10 text-text-secondary')}>
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-left">
        <p className={cn('text-sm font-medium', accent && 'text-success-400')}>{label}</p>
        {sub ? <p className="text-[11px] text-text-secondary">{sub}</p> : null}
      </div>
      <ChevronRight className="size-4 text-text-secondary" />
    </button>
  );
}
