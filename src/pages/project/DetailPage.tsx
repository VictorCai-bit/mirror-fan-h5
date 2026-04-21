import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { KLineChart } from '@/components/chart/KLineChart';
import { apiFetch } from '@/lib/api';
import {
  formatPercentFromBps,
  formatTokenFromRaw,
  formatUsdtFromRaw,
  shortenAddress,
} from '@/lib/fmt';
import { cn } from '@/lib/cn';
import type { Candle, OnChainDetail, OnChainTradeRow } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '@/stores/useUIStore';
import { useUserStore } from '@/stores/useUserStore';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Share2,
  Copy,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CountdownBadge } from '@/components/ui/CountdownBadge';

const CHART_INTERVALS = ['10m', '1h', '24h', '7d'] as const;
type Interval = (typeof CHART_INTERVALS)[number];

const intervalToApi: Record<Interval, string> = {
  '10m': '5m',
  '1h': '1h',
  '24h': '1d',
  '7d': '1d',
};
const intervalLimit: Record<Interval, number> = {
  '10m': 24,
  '1h': 48,
  '24h': 30,
  '7d': 7,
};

type SubTab = 'deal' | 'pond';
type MainTab = 'first' | 'market';

export default function DetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const logged = useUserStore((s) => s.is_logged_in());
  const isCreator = useUserStore((s) => s.is_creator_of(Number(id)));
  const setSheet = useUIStore((s) => s.setBottomSheet);

  const [mainTab, setMainTab] = useState<MainTab>('first');
  const [subTab, setSubTab] = useState<SubTab>('deal');
  const [interval, setInterval] = useState<Interval>('1h');
  const [copied, setCopied] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy');

  const { data: p, isPending } = useQuery({
    queryKey: ['launch', 'on-chain', 'detail', id],
    queryFn: () => apiFetch<OnChainDetail>(`/launch/on-chain/detail?project_id=${id}`),
    enabled: !!id,
  });

  const { data: candles } = useQuery({
    queryKey: ['launch', 'kline', id, interval],
    queryFn: () =>
      apiFetch<Candle[]>(
        `/launch/kline?project_id=${id}&interval=${intervalToApi[interval]}&limit=${intervalLimit[interval]}`,
      ),
    enabled: !!id,
  });

  const { data: trades } = useQuery({
    queryKey: ['launch', 'trades', id],
    queryFn: () =>
      apiFetch<OnChainTradeRow[]>(`/launch/on-chain/trades?project_id=${id}&limit=20`),
    enabled: !!id && subTab === 'deal',
  });

  const canTrade =
    p?.status === 'curve_active' ||
    (p?.status === 'on_chain' && p.curve_start_unix != null && Date.now() / 1000 >= p.curve_start_unix);

  const price = p?.current_price ?? '0';
  const change = p?.price_change_24h_bps ?? 0;
  const changePositive = change >= 0;
  const changeStr = `${changePositive ? '+' : ''}${(change / 100).toFixed(2)}%`;

  const mktCap =
    p?.total_sold_raw && p.current_price
      ? (Number(p.total_sold_raw) * Number(p.current_price)) / 1e12
      : 0;

  function copyLink() {
    void navigator.clipboard.writeText(`https://mirror.fan/project/${id ?? ''}`).then(() => {
      setCopied(true);
      toast.success(t('common.copied'));
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function openTrade(side: 'buy' | 'sell') {
    if (!logged) { setSheet('connect'); return; }
    setTradeSide(side);
    setTradeOpen(true);
  }

  if (isPending || !p) {
    return (
      <AppShell hideTab>
        <div className="flex flex-col gap-3 p-3">
          <Skeleton className="h-[180px] w-full rounded-none" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  const tradeDisabledReason = p.status === 'migrated'
    ? 'Token migrated to Meteora — use Market tab'
    : p.status === 'on_chain'
      ? 'Trading starts soon'
      : 'Trading not available';

  return (
    <AppShell hideTab noScroll>
      {tradeOpen ? (
        <TradeSheetInline
          projectId={Number(id)}
          symbol={p.symbol}
          side={tradeSide}
          price={price}
          onClose={() => setTradeOpen(false)}
        />
      ) : null}

      {/* Outer layout: flex col, fill screen — h-full works because parent <main> is overflow-hidden */}
      <div className="flex h-full flex-col overflow-hidden">

        {/* ── Top nav bar ── */}
        <div className="flex h-12 shrink-0 items-center gap-2 px-2">
          <button
            type="button"
            className="rounded-lg p-2 text-text-secondary hover:bg-white/5"
            onClick={() => nav(-1)}
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="flex-1 truncate text-base font-semibold">{p.name}</h1>
          {/* Main tab switcher */}
          <div className="flex rounded-xl bg-white/8 p-0.5">
            {(['first', 'market'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMainTab(tab)}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-semibold transition-all',
                  mainTab === tab
                    ? 'bg-white/15 text-text-primary shadow'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {tab === 'first' ? 'The First' : 'Market'}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-text-secondary hover:bg-white/5"
            onClick={copyLink}
          >
            {copied ? (
              <CheckCircle2 className="size-4 text-success-500" />
            ) : (
              <Share2 className="size-4" />
            )}
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto pb-[72px]">
          {mainTab === 'market' ? (
            <MarketView p={p} t={t} />
          ) : (
            <>
              {/* Hero image */}
              <div className="relative h-[180px] shrink-0 overflow-hidden">
                <img
                  src={p.cover_image_url || `https://picsum.photos/seed/${p.id}/600/180`}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-base/95" />
                {/* Overlaid info */}
                <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-4 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-accent-gradient px-2 py-0.5 text-[9px] font-bold text-white">
                        RWA
                      </span>
                      {isCreator ? (
                        <span className="rounded-full bg-success-500 px-2 py-0.5 text-[9px] font-bold text-white">
                          Creator
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-white/60">{p.symbol}</p>
                  </div>
                  {p.airdrop_phase?.end_at ? (
                    <div className="text-right">
                      <p className="text-[9px] text-white/50">{t('home.countdown')}</p>
                      <CountdownBadge endAt={p.airdrop_phase.end_at} />
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Price + stats strip */}
              <div className="px-4 pt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums">
                    ${formatTokenFromRaw(price, locale, 4)}
                  </span>
                  {change !== 0 ? (
                    <span
                      className={cn(
                        'text-sm font-semibold tabular-nums',
                        changePositive ? 'text-success-500' : 'text-danger-500',
                      )}
                    >
                      {changeStr}
                    </span>
                  ) : null}
                </div>
                {/* Stats row */}
                <div className="mt-2 grid grid-cols-3 text-[11px]">
                  <div>
                    <p className="text-text-secondary">24h 买入</p>
                    <p className="tabular-nums font-medium">
                      {formatUsdtFromRaw(p.volume_24h_raw ?? '0', locale)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-text-secondary">市值</p>
                    <p className="tabular-nums font-medium">
                      {mktCap > 0
                        ? new Intl.NumberFormat(locale, {
                            style: 'currency',
                            currency: 'USD',
                            notation: 'compact',
                            maximumFractionDigits: 2,
                          }).format(mktCap)
                        : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-secondary">持有者</p>
                    <p className="tabular-nums font-medium">
                      {(p.holder_count ?? 0).toLocaleString(locale)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 px-4">
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-accent-gradient transition-all"
                    style={{ width: `${Math.min(100, (p.progress_bps ?? 0) / 100)}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className="text-text-secondary tabular-nums">
                    {formatPercentFromBps(p.progress_bps ?? 0, locale)} {t('project.progress')}
                  </span>
                  <button
                    type="button"
                    className="text-accent-500 underline-offset-2 hover:underline"
                    onClick={() => nav(`/project/${id}/milestones`)}
                  >
                    {t('project.milestones')} →
                  </button>
                </div>
              </div>

              {/* RWA Info — always expanded */}
              <div className="mx-3 mt-3 rounded-2xl bg-surface p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-accent-400">
                  RWA Info
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <InfoField
                    label="收益权比例"
                    value={formatPercentFromBps(
                      p.revenue_rights_percent_bps ?? p.fundraising_fraction_bps ?? 0,
                      locale,
                    )}
                  />
                  <InfoField
                    label="公允估值"
                    value={formatUsdtFromRaw(p.ip_revenue_rights_valuation_micro_usdt, locale)}
                  />
                  <InfoField
                    label="融资目标"
                    value={formatUsdtFromRaw(p.target_financing_micro_usdt, locale)}
                  />
                  <InfoField
                    label="已募集"
                    value={
                      p.total_sold_raw && Number(p.total_sold_raw) > 0
                        ? `${formatTokenFromRaw(p.total_sold_raw, locale, 0)} ${p.symbol}`
                        : '—'
                    }
                  />
                  <InfoField
                    label="保证金"
                    value={
                      p.deposit_status === 'paid'
                        ? '✓ 已缴'
                        : p.deposit_status === 'unpaid'
                          ? '✗ 未缴'
                          : (p.deposit_status ?? '—')
                    }
                    valueClass={
                      p.deposit_status === 'paid'
                        ? 'text-success-500'
                        : p.deposit_status === 'unpaid'
                          ? 'text-danger-500'
                          : ''
                    }
                  />
                  <InfoField label="作品类型" value={p.work_type ?? '—'} />
                </div>
              </div>

              {/* Secondary nav strip */}
              <div className="mt-3 overflow-x-auto px-3 [&::-webkit-scrollbar]:hidden">
                <div className="flex gap-1.5 pb-1 whitespace-nowrap">
                  <SecNavChip label={t('project.airdrop')} onClick={() => nav(`/project/${id}/airdrop`)} />
                  <SecNavChip label={t('project.exchange')} onClick={() => nav(`/project/${id}/exchange`)} />
                  <SecNavChip label={t('project.holdersTitle')} onClick={() => nav(`/project/${id}/holders`)} />
                  <SecNavChip label={t('project.mine')} onClick={() => nav(`/project/${id}/mine`)} />
                  <SecNavChip label={t('project.milestones')} onClick={() => nav(`/project/${id}/milestones`)} />
                  <SecNavChip label={t('project.disclosure')} onClick={() => nav(`/project/${id}/disclosure`)} />
                  <SecNavChip label={t('project.fixedPrice')} onClick={() => nav(`/project/${id}/fixed-price`)} />
                  <SecNavChip label={t('project.vesting')} onClick={() => nav(`/project/${id}/vesting`)} />
                  {p.meteora_pool ? (
                    <SecNavChip
                      label={t('project.meteora')}
                      accent
                      onClick={() => window.open(`https://app.meteora.ag/dlmm/${p.meteora_pool ?? ''}`, '_blank')}
                    />
                  ) : null}
                </div>
              </div>

              {/* Chart */}
              <div className="mx-3 mt-3 rounded-2xl bg-surface p-3">
                <div className="mb-2 flex gap-1.5">
                  {CHART_INTERVALS.map((iv) => (
                    <button
                      key={iv}
                      type="button"
                      onClick={() => setInterval(iv)}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-medium transition-all',
                        interval === iv
                          ? 'bg-accent-500/25 text-accent-400'
                          : 'bg-white/8 text-text-secondary hover:bg-white/12',
                      )}
                    >
                      {iv}
                    </button>
                  ))}
                </div>
                {candles && candles.length > 0 ? (
                  <KLineChart data={candles} />
                ) : (
                  <div className="flex h-[120px] items-center justify-center gap-2 text-sm text-text-secondary">
                    <TrendingUp className="size-4" />
                    No trades yet
                  </div>
                )}
              </div>

              {/* Sub-tabs: Trades | Pond */}
              <div className="mx-3 mt-3">
                <div className="flex rounded-xl bg-white/6 p-0.5">
                  {(['deal', 'pond'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSubTab(st)}
                      className={cn(
                        'flex-1 rounded-lg py-2 text-xs font-semibold transition-all',
                        subTab === st
                          ? 'bg-surface text-text-primary shadow'
                          : 'text-text-secondary hover:text-text-primary',
                      )}
                    >
                      {st === 'deal' ? 'Recent Trades' : 'Pond'}
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  {subTab === 'deal' ? (
                    <RecentTrades trades={trades ?? []} locale={locale} symbol={p.symbol} />
                  ) : (
                    <PondView p={p} />
                  )}
                </div>
              </div>

              {/* Creator quick links */}
              {isCreator ? (
                <div className="mx-3 mt-3 mb-4 rounded-2xl bg-gradient-to-br from-success-500/15 to-info-500/10 p-3">
                  <p className="mb-2 text-xs font-semibold text-success-400">Creator Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Manage Airdrops', path: `/studio/project/${id}/airdrop-phases` },
                      { label: 'Submit Milestone', path: `/studio/project/${id}/milestone` },
                      { label: 'Progress', path: `/studio/project/${id}/progress` },
                      { label: 'Reconcile', path: `/studio/project/${id}/reconcile` },
                      { label: 'Vault', path: `/studio/project/${id}/vault` },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => nav(item.path)}
                        className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium hover:bg-white/15"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-4" />
              )}
            </>
          )}
        </div>

        {/* ── Sticky Buy / Sell bar ── */}
        {mainTab === 'first' ? (
          <div className="shrink-0 px-3 pb-5 pt-2.5" style={{ background: 'linear-gradient(to bottom, transparent, var(--color-base) 28%)' }}>
            {/* Price ticker pill */}
            <div className="mb-2.5 flex items-center justify-center gap-1.5">
              <span className="text-[11px] tabular-nums text-text-secondary">
                ${formatTokenFromRaw(price, locale, 4)}
              </span>
              {change !== 0 ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                    changePositive
                      ? 'bg-success-500/15 text-success-400'
                      : 'bg-danger-500/15 text-danger-400',
                  )}
                >
                  {changeStr}
                </span>
              ) : null}
              {!canTrade ? (
                <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-text-secondary">
                  {tradeDisabledReason}
                </span>
              ) : null}
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={!canTrade}
                onClick={() => openTrade('buy')}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl py-3.5 transition-all active:scale-[0.97]',
                  canTrade
                    ? 'bg-success-500 text-white shadow-lg shadow-success-500/30'
                    : 'bg-white/8 text-text-secondary',
                )}
              >
                {canTrade ? (
                  <span className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent" />
                ) : null}
                <span className="relative text-[15px] font-bold tracking-wide">
                  {t('project.buy')}
                </span>
                {canTrade ? (
                  <span className="relative mt-0.5 text-[10px] font-normal text-white/60">
                    做多
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                disabled={!canTrade}
                onClick={() => openTrade('sell')}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl py-3.5 transition-all active:scale-[0.97]',
                  canTrade
                    ? 'bg-warning-500 text-white shadow-lg shadow-warning-500/30'
                    : 'bg-white/8 text-text-secondary',
                )}
              >
                {canTrade ? (
                  <span className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent" />
                ) : null}
                <span className="relative text-[15px] font-bold tracking-wide">
                  {t('project.sell')}
                </span>
                {canTrade ? (
                  <span className="relative mt-0.5 text-[10px] font-normal text-white/60">
                    做空
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────── */

function InfoField({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-[10px] text-text-secondary">{label}</p>
      <p className={cn('mt-0.5 font-medium tabular-nums', valueClass)}>{value}</p>
    </div>
  );
}

function SecNavChip({
  label,
  onClick,
  accent,
}: {
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 transition hover:opacity-90',
        accent
          ? 'bg-accent-500/15 text-accent-400 ring-accent-500/30'
          : 'bg-white/6 text-text-secondary ring-white/10 hover:bg-white/10 hover:text-text-primary',
      )}
    >
      {label}
    </button>
  );
}

function RecentTrades({
  trades,
  locale,
  symbol,
}: {
  trades: OnChainTradeRow[];
  locale: string;
  symbol: string;
}) {
  if (trades.length === 0) {
    return <p className="py-6 text-center text-sm text-text-secondary">No trades yet</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl">
      <div className="grid grid-cols-4 border-b border-white/10 px-1 py-1.5 text-[10px] text-text-secondary">
        <span>Time</span>
        <span className="text-right">Dir</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Price</span>
      </div>
      {trades.slice(0, 12).map((tr, i) => {
        const isBuy = tr.side === 'buy';
        const d = new Date(tr.ts * 1000);
        const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
        return (
          <div
            key={i}
            className="grid grid-cols-4 border-b border-white/5 px-1 py-1.5 text-[10px] tabular-nums"
          >
            <span className="text-text-secondary">{timeStr}</span>
            <span className={cn('text-right font-medium', isBuy ? 'text-success-500' : 'text-danger-500')}>
              {isBuy ? 'Buy' : 'Sell'}
            </span>
            <span className="text-right text-text-secondary">
              {formatTokenFromRaw(tr.amount_token_raw, locale, 2)} {symbol}
            </span>
            <span className="text-right text-text-primary">
              ${formatTokenFromRaw(tr.price_raw, locale, 4)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PondView({ p }: { p: OnChainDetail }) {
  const vaultItems = [
    { label: 'Early Airdrop Replenishment (20%)', pct: 20, color: 'bg-info-500' },
    { label: 'Price Guard Fund (10%)', pct: 10, color: 'bg-warning-500' },
    { label: 'Ecosystem LP (10%)', pct: 10, color: 'bg-accent-500' },
    { label: 'Creator Fund (60%)', pct: 60, color: 'bg-success-500' },
  ];
  return (
    <div className="space-y-2 py-1">
      {p.status !== 'migrated' ? (
        <p className="py-2 text-center text-xs text-text-secondary">
          Pond unlocks after graduation (Meteora migration)
        </p>
      ) : null}
      {vaultItems.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-[10px] text-text-secondary">
            <span>{item.label}</span>
            <span className="tabular-nums">{item.pct}%</span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className={cn('h-full', item.color)} style={{ width: `${item.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketView({ p, t }: { p: OnChainDetail; t: (k: string) => string }) {
  if (p.status !== 'migrated') {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16">
        <div className="flex size-16 items-center justify-center rounded-full bg-white/5 text-2xl">🌊</div>
        <p className="text-sm font-medium">{p.symbol} is not on Meteora yet</p>
        <p className="text-center text-xs text-text-secondary">
          Market tab becomes available after the project graduates (curve completes) and migrates to Meteora DLMM.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="rounded-2xl bg-surface p-3 space-y-2">
        <p className="text-sm font-semibold">On Meteora since graduation</p>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span>Pool:</span>
          <span className="font-mono text-text-primary">{shortenAddress(p.meteora_pool ?? '', 8, 4)}</span>
          <button
            type="button"
            className="rounded px-1.5 py-0.5 bg-white/10 text-[10px]"
            onClick={() => {
              void navigator.clipboard.writeText(p.meteora_pool ?? '');
              toast.success(t('common.copied'));
            }}
          >
            <Copy className="size-3 inline mr-0.5" />
            Copy
          </button>
        </div>
      </div>
      <a
        href={`https://app.meteora.ag/dlmm/${p.meteora_pool ?? ''}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl bg-accent-gradient py-3 text-center text-sm font-bold text-white shadow-lg"
      >
        {t('common.openMeteora')}
      </a>
      <a
        href={`https://app.meteora.ag/dlmm/${p.meteora_pool ?? ''}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl bg-white/10 py-3 text-center text-sm font-medium text-text-primary"
      >
        Provide Liquidity
      </a>
      <p className="text-center text-[10px] text-text-secondary">
        Mirror.fan does not custody external trades. Fees and rewards are governed by Meteora.
      </p>
    </div>
  );
}

/* ─── Inline Trade Sheet ─────────────────────────────────────────────── */

import { BottomSheet } from '@/components/ui/BottomSheet';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch as apiFetchAlias } from '@/lib/api';
import { usdtToRaw } from '@/lib/fmt';
import { nanoid } from 'nanoid';
import { Input } from '@/components/ui/Input';

const SLIPPAGE_PRESETS = [50, 100, 300] as const;

function TradeSheetInline({
  projectId,
  symbol,
  side: initialSide,
  price,
  onClose,
}: {
  projectId: number;
  symbol: string;
  side: 'buy' | 'sell';
  price: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const qc = useQueryClient();
  const wallet = useUserStore((s) => s.wallet_address);
  const usdtRaw = useUserStore((s) => s.usdt_raw);
  const patchBalances = useUserStore((s) => s.patchBalances);
  const nav = useNavigate();
  const setSheet = useUIStore((s) => s.setBottomSheet);

  const [side, setSide] = useState<'buy' | 'sell'>(initialSide);
  const [amount, setAmount] = useState('100');
  const [slippage, setSlippage] = useState<50 | 100 | 300>(100);
  const [showFeeDetail, setShowFeeDetail] = useState(false);
  const [preview, setPreview] = useState<{
    amount_out_raw: string;
    min_amount_out_raw: string;
    price_before_raw: string;
    price_after_raw: string;
    fee_raw: string;
  } | null>(null);

  const usdtBalance = Number(usdtRaw) / 1e6;
  const amountNum = Number(amount.replace(/,/g, ''));
  const insufficientFunds = side === 'buy' && amountNum > usdtBalance;
  const tooSmall = amountNum < 1;

  const mPreview = useMutation({
    mutationFn: async () =>
      apiFetchAlias<{
        amount_out_raw: string;
        min_amount_out_raw: string;
        price_before_raw: string;
        price_after_raw: string;
        fee_raw: string;
      }>('/launch/swap/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          side,
          amount_in_raw: usdtToRaw(amount),
          slippage_bps: slippage,
        }),
      }),
    onSuccess: (d) => setPreview(d),
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  const mConfirm = useMutation({
    mutationFn: async () => {
      if (!preview) return;
      return apiFetchAlias<{ tx_signature: string }>('/launch/swap/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          side,
          amount_in_raw: usdtToRaw(amount),
          min_amount_out_raw: preview.min_amount_out_raw,
          client_order_id: nanoid(),
        }),
      });
    },
    onSuccess: async () => {
      if (side === 'buy') {
        patchBalances({ usdt_raw: String(Math.max(0, Number(usdtRaw) - Number(usdtToRaw(amount)))) });
      }
      toast.success(t('trade.filled'));
      await qc.invalidateQueries({ queryKey: ['launch', 'on-chain', 'detail', String(projectId)] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  const priceNum = Number(price) / 1e6;
  const estOut = priceNum > 0 && amountNum > 0 ? (amountNum / priceNum).toFixed(4) : '—';

  return (
    <BottomSheet open onClose={onClose} title={`${side === 'buy' ? 'Buy' : 'Sell'} ${symbol}`}>
      {/* Side toggle */}
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => { setSide('buy'); setPreview(null); }}
          className={cn(
            'flex-1 rounded-xl py-2 text-sm font-bold transition-all',
            side === 'buy' ? 'bg-success-500 text-white' : 'bg-white/10 text-text-secondary',
          )}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => { setSide('sell'); setPreview(null); }}
          className={cn(
            'flex-1 rounded-xl py-2 text-sm font-bold transition-all',
            side === 'sell' ? 'bg-warning-500 text-white' : 'bg-white/10 text-text-secondary',
          )}
        >
          Sell
        </button>
      </div>

      {wallet ? (
        <div className="mb-3 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-xs">
          <span className="font-mono text-text-secondary">{shortenAddress(wallet)}</span>
          <span className="tabular-nums text-text-primary">
            {new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(usdtBalance)} USDT
          </span>
        </div>
      ) : null}

      <div className="relative mb-1">
        <Input
          value={amount}
          onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.]/g, '')); setPreview(null); }}
          placeholder={side === 'buy' ? 'USDT amount' : `${symbol} amount`}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-accent-500/20 px-2 py-0.5 text-[10px] font-bold text-accent-500"
          onClick={() => { if (side === 'buy') setAmount(usdtBalance.toFixed(2)); }}
        >
          MAX
        </button>
      </div>

      <div className="mb-3 flex items-center justify-between text-xs text-text-secondary">
        <span>You get ≈</span>
        <span className="tabular-nums font-medium text-text-primary">
          {preview
            ? `${formatTokenFromRaw(preview.amount_out_raw, locale, 4)} ${symbol}`
            : `${estOut} ${symbol}`}
        </span>
      </div>

      <div className="mb-2 rounded-xl bg-white/5 p-2.5 space-y-2 text-xs">
        <div className="flex justify-between text-text-secondary">
          <span>Current price</span>
          <span className="tabular-nums text-text-primary">${priceNum.toFixed(6)} USDT</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">Slippage</span>
          <div className="flex gap-1.5">
            {SLIPPAGE_PRESETS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlippage(s)}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-medium transition-all',
                  slippage === s ? 'bg-accent-500/25 text-accent-400' : 'bg-white/10 text-text-secondary',
                )}
              >
                {s / 100}%
              </button>
            ))}
          </div>
        </div>
        {preview ? (
          <div className="flex justify-between text-text-secondary">
            <span>Min received</span>
            <span className="tabular-nums text-text-primary">
              {formatTokenFromRaw(preview.min_amount_out_raw, locale, 4)} {symbol}
            </span>
          </div>
        ) : null}
      </div>

      {preview ? (
        <div className="mb-3">
          <button
            type="button"
            className="flex w-full items-center justify-between text-xs text-text-secondary"
            onClick={() => setShowFeeDetail((v) => !v)}
          >
            <span>Fee details</span>
            {showFeeDetail ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
          {showFeeDetail ? (
            <div className="mt-1.5 space-y-1 rounded-xl bg-white/5 p-2.5 text-[10px] tabular-nums text-text-secondary">
              <div className="flex justify-between">
                <span>Protocol fee (1%)</span>
                <span>{formatUsdtFromRaw(preview.fee_raw, locale)}</span>
              </div>
              <div className="flex justify-between">
                <span>Price before</span>
                <span>${(Number(preview.price_before_raw) / 1e6).toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span>Price after</span>
                <span>${(Number(preview.price_after_raw) / 1e6).toFixed(6)}</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {insufficientFunds ? (
        <button
          type="button"
          className="w-full rounded-2xl bg-accent-gradient py-3.5 text-sm font-bold text-white"
          onClick={() => { onClose(); nav('/wallet/recharge'); }}
        >
          Recharge USDT
        </button>
      ) : !wallet ? (
        <button
          type="button"
          className="w-full rounded-2xl bg-white/10 py-3.5 text-sm font-medium text-text-primary"
          onClick={() => { onClose(); setSheet('connect'); }}
        >
          Connect Wallet
        </button>
      ) : !preview ? (
        <button
          type="button"
          disabled={tooSmall || mPreview.isPending}
          onClick={() => mPreview.mutate()}
          className={cn(
            'w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all',
            side === 'buy' ? 'bg-success-500' : 'bg-warning-500',
            (tooSmall || mPreview.isPending) && 'opacity-50',
          )}
        >
          {mPreview.isPending ? 'Calculating...' : `Preview ${side === 'buy' ? 'Buy' : 'Sell'}`}
        </button>
      ) : (
        <button
          type="button"
          disabled={mConfirm.isPending}
          onClick={() => mConfirm.mutate()}
          className={cn(
            'w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all',
            side === 'buy' ? 'bg-success-500 shadow-lg shadow-success-500/30' : 'bg-warning-500 shadow-lg shadow-warning-500/30',
            mConfirm.isPending && 'opacity-70',
          )}
        >
          {mConfirm.isPending ? 'Confirming...' : `Confirm ${side === 'buy' ? 'Buy' : 'Sell'}`}
        </button>
      )}
      {tooSmall && !insufficientFunds ? (
        <p className="mt-1 text-center text-[10px] text-danger-500">Minimum $1 USDT</p>
      ) : null}
    </BottomSheet>
  );
}
