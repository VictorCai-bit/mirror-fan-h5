import { CountdownBadge } from '@/components/ui/CountdownBadge';
import { formatPercentFromBps, formatTokenFromRaw, formatUsdtFromRaw } from '@/lib/fmt';
import { cn } from '@/lib/cn';
import type { OnChainDetail } from '@/types/api';
import { useUserStore } from '@/stores/useUserStore';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const TOKEN_DECIMALS = 6;

const STATUS_DOT: Record<string, string> = {
  curve_active: 'bg-success-500',
  on_chain: 'bg-info-500',
  migrated: 'bg-accent-500',
  pending_review: 'bg-warning-500',
  approved: 'bg-info-500',
  curve_completed: 'bg-warning-500',
  migrating: 'bg-warning-500',
  rejected: 'bg-danger-500',
  draft: 'bg-white/30',
  cancelled: 'bg-white/20',
  abandoned: 'bg-white/20',
};


function computeMktCap(totalSoldRaw: string | undefined, currentPriceRaw: string | undefined): number {
  if (!totalSoldRaw || !currentPriceRaw) return 0;
  return (Number(totalSoldRaw) * Number(currentPriceRaw)) / 10 ** (TOKEN_DECIMALS + TOKEN_DECIMALS);
}

export function ProjectCard({ item }: { item: OnChainDetail }) {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const locale = i18n.language;

  const positions = useUserStore((s) => s.positions ?? {});
  const userPosition = positions[item.id];
  const userBalanceRaw = userPosition?.token_balance_raw;
  const creatorOf = useUserStore((s) => s.creator_of);
  const isCreator = creatorOf.includes(item.id);

  const change = item.price_change_24h_bps ?? 0;
  const changePositive = change >= 0;
  const changeStr = `${changePositive ? '+' : ''}${(change / 100).toFixed(2)}%`;

  const mktCap = computeMktCap(item.total_sold_raw, item.current_price);
  const mktCapFmt =
    mktCap > 0
      ? new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: 'USD',
          notation: 'compact',
          maximumFractionDigits: 2,
        }).format(mktCap)
      : '—';

  const statusLabel = t(`status.${item.status}` as 'status.draft', { defaultValue: item.status });
  const statusDot = STATUS_DOT[item.status] ?? 'bg-white/20';
  const progressPct = Math.min(100, (item.progress_bps ?? 0) / 100);

  return (
    <button
      type="button"
      onClick={() => nav(`/project/${item.id}`)}
      className="w-full rounded-2xl bg-surface p-3.5 text-left text-text-primary ring-1 ring-white/8 transition-all active:scale-[0.99] hover:ring-white/15"
    >
      {/* Row 1: cover + name/symbol + badges */}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <img
            src={item.cover_image_url || `https://picsum.photos/seed/${item.id}/80/80`}
            alt=""
            className="size-14 rounded-xl object-cover"
          />
          {isCreator ? (
            <span className="absolute -right-1 -top-1 rounded-full bg-success-500 px-1.5 py-0.5 text-[8px] font-bold uppercase text-white shadow">
              Creator
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          {/* Name + RWA badge */}
          <div className="flex items-start justify-between gap-1">
            <p className="truncate text-sm font-semibold leading-tight">{item.name}</p>
            <span className="ml-1 shrink-0 rounded-full bg-accent-gradient px-2 py-0.5 text-[9px] font-bold uppercase text-white">
              RWA
            </span>
          </div>

          {/* Symbol + status */}
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-mono text-[10px] text-text-secondary">{item.symbol}</span>
            <span className="flex items-center gap-1 text-[10px] text-text-secondary">
              <span className={cn('size-1.5 rounded-full', statusDot)} />
              {statusLabel}
            </span>
          </div>

          {/* Price + change + volume */}
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-base font-bold tabular-nums">
              {item.current_price && Number(item.current_price) > 0
                ? `$${formatTokenFromRaw(item.current_price, locale, 4)}`
                : '—'}
            </span>
            {change !== 0 ? (
              <span
                className={cn(
                  'text-xs font-medium tabular-nums',
                  changePositive ? 'text-success-500' : 'text-danger-500',
                )}
              >
                {changeStr}
              </span>
            ) : null}
          </div>
        </div>

        {/* Countdown top-right (if airdrop) */}
        {item.airdrop_phase?.end_at ? (
          <div className="shrink-0 text-right">
            <p className="text-[9px] text-text-secondary">{t('project.airdrop')}</p>
            <CountdownBadge endAt={item.airdrop_phase.end_at} />
          </div>
        ) : null}
      </div>

      {/* Row 2: stats */}
      <div className="mt-3 grid grid-cols-3 text-[10px]">
        <div>
          <p className="text-text-secondary">{t('project.volume24h')}</p>
          <p className="tabular-nums font-medium text-text-primary">
            {formatUsdtFromRaw(item.volume_24h_raw ?? '0', locale)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-text-secondary">{t('project.mcap')}</p>
          <p className="tabular-nums font-medium text-text-primary">{mktCapFmt}</p>
        </div>
        <div className="text-right">
          <p className="text-text-secondary">{t('project.holderCount')}</p>
          <p className="tabular-nums font-medium text-text-primary">
            {(item.holder_count ?? 0).toLocaleString(locale)}
          </p>
        </div>
      </div>

      {/* Row 3: progress bar */}
      <div className="mt-2.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-accent-gradient transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px]">
          <span className="text-text-secondary tabular-nums">
            {t('project.listCardProgress', {
              pct: formatPercentFromBps(item.progress_bps ?? 0, locale),
            })}
          </span>
          {userBalanceRaw && Number(userBalanceRaw) > 0 ? (
            <span className="text-primary-500 tabular-nums">
              {t('project.listCardYouHold', {
                amount: formatTokenFromRaw(userBalanceRaw, locale, 2),
                symbol: item.symbol,
              })}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
