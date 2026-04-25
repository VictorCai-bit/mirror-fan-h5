import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatTokenFromRaw, formatUsdtFromRaw } from '@/lib/fmt';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Coins, Lock, Unlock, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface WalletSummary {
  available_raw: string;
  locked_a_raw: string;
  locked_b_raw: string;
  ip_token_held: { symbol: string; raw: string }[];
}

export default function StudioWallet() {
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  const { data, isPending } = useQuery({
    queryKey: ['creator', 'wallet', 'summary'],
    queryFn: () => apiFetch<WalletSummary>('/creator/wallet/summary'),
  });

  const totalLocked = data
    ? BigInt(data.locked_a_raw) + BigInt(data.locked_b_raw)
    : 0n;

  return (
    <AppShell hideTab>
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center gap-2 px-2">
          <button
            type="button"
            className="rounded-lg p-2 text-text-secondary hover:bg-white/5"
            onClick={() => nav(-1)}
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="flex-1 text-base font-semibold">{t('studio.wallet')}</h1>
        </div>

        <div className="flex flex-col gap-3 px-3 pb-8 pt-1">
          {/* Balance hero card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-success-500/25 via-accent-500/15 to-primary-500/20 p-5">
            <div className="absolute -right-6 -top-6 size-32 rounded-full bg-white/5 blur-2xl" />
            <p className="mb-1 text-xs text-text-secondary/80">{t('studio.walletAvailable')}</p>
            {isPending ? (
              <Skeleton className="h-9 w-40 rounded-xl" />
            ) : (
              <p className="text-3xl font-bold tabular-nums text-white">
                {formatUsdtFromRaw(data?.available_raw ?? '0', locale)}
              </p>
            )}
            <p className="mt-1 text-[10px] text-text-secondary/60">USDT</p>
          </div>

          {/* Locked breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Lock className="size-4 text-warn-400" />}
              label={t('studio.walletLockedA')}
              value={isPending ? null : formatUsdtFromRaw(data?.locked_a_raw ?? '0', locale)}
              sub={t('creator.studioWallet.subVolume')}
              color="warn"
            />
            <StatCard
              icon={<Unlock className="size-4 text-info-400" />}
              label={t('studio.walletLockedB')}
              value={isPending ? null : formatUsdtFromRaw(data?.locked_b_raw ?? '0', locale)}
              sub={t('creator.studioWallet.subMilestone')}
              color="info"
            />
          </div>

          {/* Total locked summary */}
          <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3 text-sm">
            <span className="text-text-secondary">{t('studio.walletTotalLocked')}</span>
            <span className="tabular-nums font-semibold">
              {isPending ? '…' : formatUsdtFromRaw(String(totalLocked), locale)}
            </span>
          </div>

          {/* IP tokens held */}
          {(data?.ip_token_held ?? []).length > 0 ? (
            <div className="rounded-2xl bg-surface">
              <p className="border-b border-white/8 px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                {t('studio.walletTokens')}
              </p>
              {data!.ip_token_held.map((tok) => (
                <div
                  key={tok.symbol}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Coins className="size-4 text-accent-400" />
                    <span className="font-mono font-semibold">{tok.symbol}</span>
                  </div>
                  <span className="tabular-nums text-text-secondary">
                    {formatTokenFromRaw(tok.raw, locale, 2)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {/* CTA — Bills */}
          <button
            type="button"
            onClick={() => nav('/studio/bills')}
            className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3.5 text-sm"
          >
            <div className="flex items-center gap-2.5">
              <Wallet className="size-4 text-text-secondary" />
              <span className="font-medium">{t('studio.bills')}</span>
            </div>
            <ChevronRight className="size-4 text-text-secondary" />
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  sub: string;
  color: 'warn' | 'info';
}) {
  const bg = color === 'warn' ? 'bg-warn-500/10' : 'bg-info-500/10';
  return (
    <div className={cn('rounded-2xl p-4', bg)}>
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <p className="text-[11px] text-text-secondary">{label}</p>
      </div>
      {value === null ? (
        <Skeleton className="h-5 w-24 rounded-lg" />
      ) : (
        <p className="text-base font-bold tabular-nums">{value}</p>
      )}
      <p className="mt-0.5 text-[10px] text-text-secondary/60">{sub}</p>
    </div>
  );
}
