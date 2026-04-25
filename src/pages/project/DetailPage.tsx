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
  Zap,
  Users,
  Gift,
  ArrowLeftRight,
  Lock,
  Flag,
  FileText,
  Tag,
  BarChart2,
  Layers,
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

const STATUS_META: Record<string, { label: string; dot: string }> = {
  curve_active:     { label: 'Casting',    dot: 'bg-success-500' },
  on_chain:         { label: 'Coming',     dot: 'bg-info-500' },
  migrated:         { label: 'Meteora',    dot: 'bg-accent-500' },
  curve_completed:  { label: 'Completed',  dot: 'bg-warning-400' },
  migrating:        { label: 'Migrating',  dot: 'bg-warning-400' },
  pending_review:   { label: 'In Review',  dot: 'bg-warning-400' },
  approved:         { label: 'Approved',   dot: 'bg-info-500' },
  rejected:         { label: 'Rejected',   dot: 'bg-danger-500' },
  draft:            { label: 'Draft',      dot: 'bg-white/30' },
};

export default function DetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const logged = useUserStore((s) => s.is_logged_in());
  const isCreator = useUserStore((s) => s.is_creator_of(Number(id)));
  const positions = useUserStore((s) => s.positions ?? {});
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

  const userPosition = p ? (positions[p.id]?.token_balance_raw ?? null) : null;

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
        <div className="animate-pulse">
          <Skeleton className="h-[240px] w-full rounded-none" />
          <div className="flex flex-col gap-3 p-3">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  const statusMeta = STATUS_META[p.status] ?? { label: p.status, dot: 'bg-white/20' };
  const tradeDisabledReason =
    p.status === 'migrated'
      ? 'Token migrated to Meteora — use Market tab'
      : p.status === 'on_chain'
        ? 'Trading starts soon'
        : 'Trading not available';

  const buySellFooter = mainTab === 'first' ? (
    <div
      className="relative z-20 bg-canvas px-3 pt-2"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-gradient-to-b from-transparent to-canvas" />
      {/* Price + status row */}
      <div className="mb-2 flex items-center justify-center gap-2">
        <span className="text-sm font-bold tabular-nums">${formatTokenFromRaw(price, locale, 4)}</span>
        {change !== 0 && (
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums',
            changePositive ? 'bg-success-500/15 text-success-400' : 'bg-danger-500/15 text-danger-400',
          )}>
            {changeStr}
          </span>
        )}
        {!canTrade && (
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-text-secondary">
            {tradeDisabledReason}
          </span>
        )}
      </div>
      <div className="flex gap-2.5">
        <button
          type="button"
          disabled={!canTrade}
          onClick={() => openTrade('buy')}
          className={cn(
            'relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl py-3 transition-all active:scale-[0.97]',
            canTrade ? 'bg-success-500 shadow-lg shadow-success-500/25 text-white' : 'bg-white/8 text-text-secondary',
          )}
        >
          {canTrade && <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />}
          <span className="relative text-[15px] font-bold tracking-wide">{t('project.buy')}</span>
          {canTrade && <span className="relative mt-0.5 text-[10px] font-normal opacity-70">{t('project.tradeLong')}</span>}
        </button>
        <button
          type="button"
          disabled={!canTrade}
          onClick={() => openTrade('sell')}
          className={cn(
            'relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl py-3 transition-all active:scale-[0.97]',
            canTrade ? 'bg-warning-500 shadow-lg shadow-warning-500/25 text-white' : 'bg-white/8 text-text-secondary',
          )}
        >
          {canTrade && <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />}
          <span className="relative text-[15px] font-bold tracking-wide">{t('project.sell')}</span>
          {canTrade && <span className="relative mt-0.5 text-[10px] font-normal opacity-70">{t('project.tradeShort')}</span>}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <AppShell hideTab footer={buySellFooter}>
      {tradeOpen ? (
        <TradeSheetInline
          projectId={Number(id)}
          symbol={p.symbol}
          side={tradeSide}
          price={price}
          onClose={() => setTradeOpen(false)}
        />
      ) : null}

      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-10 flex h-12 items-center gap-2 bg-canvas/90 px-2 backdrop-blur-md">
        <button
          type="button"
          className="rounded-lg p-2 text-text-secondary hover:bg-white/5"
          onClick={() => nav(-1)}
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="flex-1 truncate text-sm font-semibold">{p.name}</h1>
        {/* Main tab switcher */}
        <div className="flex rounded-full bg-white/8 p-0.5">
          {(['first', 'market'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMainTab(tab)}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-semibold transition-all',
                mainTab === tab
                  ? 'bg-white/20 text-text-primary shadow'
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
          {copied ? <CheckCircle2 className="size-4 text-success-500" /> : <Share2 className="size-4" />}
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <div className={mainTab === 'first' ? 'pb-[148px]' : 'pb-4'}>
        {mainTab === 'market' ? (
          <MarketView p={p} t={t} />
        ) : (
          <>
            {/* ── Hero ── */}
            <div className="relative h-[240px] shrink-0 overflow-hidden">
              <img
                src={p.cover_image_url || `https://picsum.photos/seed/${p.id}/600/240`}
                alt=""
                className="h-full w-full object-cover"
              />
              {/* layered gradient: dark at top + strong dark at bottom */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-canvas" />

              {/* Top-left: status badge */}
              <div className="absolute left-4 top-4 flex items-center gap-1.5">
                <span className={cn('size-2 rounded-full', statusMeta.dot)} />
                <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                  {statusMeta.label}
                </span>
                {isCreator && (
                  <span className="rounded-full bg-success-500/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                    Creator
                  </span>
                )}
              </div>

              {/* Top-right: airdrop countdown */}
              {p.airdrop_phase?.end_at ? (
                <div className="absolute right-4 top-4 text-right">
                  <p className="text-[9px] text-white/60">{t('home.countdown')}</p>
                  <CountdownBadge endAt={p.airdrop_phase.end_at} />
                </div>
              ) : null}

              {/* Bottom: name + symbol + price */}
              <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="rounded-full bg-accent-gradient px-2 py-0.5 text-[9px] font-bold uppercase text-white">
                        RWA
                      </span>
                      <span className="font-mono text-[11px] text-white/60">{p.symbol}</span>
                    </div>
                    <h2 className="text-xl font-bold leading-tight text-white drop-shadow">{p.name}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold tabular-nums text-white drop-shadow">
                      ${formatTokenFromRaw(price, locale, 4)}
                    </p>
                    {change !== 0 && (
                      <span className={cn(
                        'mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
                        changePositive ? 'bg-success-500/25 text-success-400' : 'bg-danger-500/25 text-danger-400',
                      )}>
                        {changeStr}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Stat strip ── */}
            <div className="grid grid-cols-3 gap-0 border-b border-white/8">
              <StatCell label={t('project.volume24h')} value={formatUsdtFromRaw(p.volume_24h_raw ?? '0', locale)} />
              <StatCell
                label={t('project.mcap')}
                value={
                  mktCap > 0
                    ? new Intl.NumberFormat(locale, {
                        style: 'currency',
                        currency: 'USD',
                        notation: 'compact',
                        maximumFractionDigits: 2,
                      }).format(mktCap)
                    : '—'
                }
                center
              />
              <StatCell label={t('project.holderCount')} value={(p.holder_count ?? 0).toLocaleString(locale)} right />
            </div>

            {/* ── Progress bar ── */}
            <div className="px-4 py-3">
              <div className="mb-1.5 flex items-center justify-between text-[10px]">
                <span className="font-medium text-text-secondary">{t('project.progress')}</span>
                <button
                  type="button"
                  className="flex items-center gap-1 text-accent-400 hover:underline"
                  onClick={() => nav(`/project/${id}/milestones`)}
                >
                  <Flag className="size-2.5" />
                  {t('project.milestones')}
                </button>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-accent-gradient transition-all"
                  style={{ width: `${Math.min(100, (p.progress_bps ?? 0) / 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] font-semibold tabular-nums text-accent-400">
                {formatPercentFromBps(p.progress_bps ?? 0, locale)} {t('project.progress')}
              </p>
            </div>

            {/* ── User position banner (if holding) ── */}
            {userPosition && Number(userPosition) > 0 ? (
              <div className="mx-3 mb-3 flex items-center justify-between rounded-2xl bg-success-500/10 px-4 py-3 ring-1 ring-success-500/20">
                <div>
                  <p className="text-[10px] text-success-400">{t('project.mine')}</p>
                  <p className="text-sm font-bold tabular-nums text-success-400">
                    {formatTokenFromRaw(userPosition, locale, 2)} {p.symbol}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full bg-success-500/15 px-3 py-1.5 text-[11px] font-semibold text-success-400"
                  onClick={() => nav(`/project/${id}/mine`)}
                >
                  {t('project.positionCta')}
                </button>
              </div>
            ) : null}

            {/* ── RWA Info card ── */}
            <div className="mx-3 mb-3 overflow-hidden rounded-2xl bg-surface ring-1 ring-white/8">
              {/* Header */}
              <div className="flex items-center gap-2 bg-accent-gradient px-4 py-2.5">
                <Layers className="size-3.5 text-white/80" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-white">RWA Info</p>
              </div>
              <div className="grid grid-cols-2 gap-0 px-4 py-3">
                <RwaField
                  label={t('project.revenueRights')}
                  value={formatPercentFromBps(
                    p.revenue_rights_percent_bps ?? p.fundraising_fraction_bps ?? 0,
                    locale,
                  )}
                />
                <RwaField
                  label={t('project.fairValue')}
                  value={formatUsdtFromRaw(p.ip_revenue_rights_valuation_micro_usdt, locale)}
                  right
                />
                <RwaField
                  label={t('project.raiseTarget')}
                  value={formatUsdtFromRaw(p.target_financing_micro_usdt, locale)}
                  border
                />
                <RwaField
                  label={t('project.raised')}
                  value={
                    p.total_sold_raw && Number(p.total_sold_raw) > 0
                      ? `${formatTokenFromRaw(p.total_sold_raw, locale, 0)} ${p.symbol}`
                      : '—'
                  }
                  right
                  border
                />
                <RwaField
                  label={t('project.margin')}
                  value={
                    p.deposit_status === 'paid' ? t('project.marginPaid')
                    : p.deposit_status === 'unpaid' ? t('project.marginUnpaid')
                    : (p.deposit_status ?? '—')
                  }
                  valueClass={
                    p.deposit_status === 'paid' ? 'text-success-400'
                    : p.deposit_status === 'unpaid' ? 'text-danger-400'
                    : ''
                  }
                  border
                />
                <RwaField
                  label={t('project.workType')}
                  value={p.work_type ?? '—'}
                  right
                  border
                />
              </div>
            </div>

            {/* ── Secondary nav ── */}
            <div className="overflow-x-auto px-3 pb-2 [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-2 whitespace-nowrap">
                <SecNavChip icon={<Gift className="size-3" />}       label={t('project.airdrop')}     onClick={() => nav(`/project/${id}/airdrop`)} />
                <SecNavChip icon={<ArrowLeftRight className="size-3" />} label={t('project.exchange')} onClick={() => nav(`/project/${id}/exchange`)} />
                <SecNavChip icon={<Users className="size-3" />}       label={t('project.holdersTitle')} onClick={() => nav(`/project/${id}/holders`)} />
                <SecNavChip icon={<BarChart2 className="size-3" />}   label={t('project.mine')}        onClick={() => nav(`/project/${id}/mine`)} />
                <SecNavChip icon={<Flag className="size-3" />}        label={t('project.milestones')}  onClick={() => nav(`/project/${id}/milestones`)} />
                <SecNavChip icon={<FileText className="size-3" />}    label={t('project.disclosure')}  onClick={() => nav(`/project/${id}/disclosure`)} />
                <SecNavChip icon={<Tag className="size-3" />}         label={t('project.fixedPrice')}  onClick={() => nav(`/project/${id}/fixed-price`)} />
                <SecNavChip icon={<Lock className="size-3" />}        label={t('project.vesting')}     onClick={() => nav(`/project/${id}/vesting`)} />
                {p.meteora_pool ? (
                  <SecNavChip
                    icon={<Zap className="size-3" />}
                    label={t('project.meteora')}
                    accent
                    onClick={() => window.open(`https://app.meteora.ag/dlmm/${p.meteora_pool ?? ''}`, '_blank')}
                  />
                ) : null}
              </div>
            </div>

            {/* ── K-line chart ── */}
            <div className="mx-3 mb-3 overflow-hidden rounded-2xl bg-surface ring-1 ring-white/8">
              <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
                <p className="text-[11px] font-semibold text-text-secondary">Price Chart</p>
                <div className="flex gap-1">
                  {CHART_INTERVALS.map((iv) => (
                    <button
                      key={iv}
                      type="button"
                      onClick={() => setInterval(iv)}
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-all',
                        interval === iv
                          ? 'bg-accent-500/25 text-accent-400'
                          : 'text-text-secondary hover:text-text-primary',
                      )}
                    >
                      {iv}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3">
                {candles && candles.length > 0 ? (
                  <KLineChart data={candles} />
                ) : (
                  <div className="flex h-[120px] items-center justify-center gap-2 text-sm text-text-secondary">
                    <TrendingUp className="size-4 opacity-40" />
                    <span className="text-xs">No trades yet</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Sub-tabs: Trades | Pond ── */}
            <div className="mx-3 mb-3">
              <div className="flex overflow-hidden rounded-2xl bg-surface ring-1 ring-white/8">
                {(['deal', 'pond'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSubTab(st)}
                    className={cn(
                      'flex-1 py-2.5 text-xs font-semibold transition-all',
                      subTab === st
                        ? 'bg-white/12 text-text-primary'
                        : 'text-text-secondary hover:text-text-primary',
                    )}
                  >
                    {st === 'deal' ? '📋 Recent Trades' : '🌊 Pond'}
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

            {/* ── Creator quick links ── */}
            {isCreator ? (
              <div className="mx-3 mb-4 overflow-hidden rounded-2xl ring-1 ring-success-500/20">
                <div className="flex items-center gap-2 bg-success-500/10 px-4 py-2.5">
                  <span className="text-sm">✦</span>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-success-400">Creator Studio</p>
                </div>
                <div className="grid grid-cols-2 gap-px bg-white/5 p-0">
                  {[
                    { labelKey: 'project.studioAirdrop' as const, icon: '🎁', path: `/studio/project/${id}/airdrop-phases` },
                    { labelKey: 'project.studioMilestone' as const, icon: '🏁', path: `/studio/project/${id}/milestone` },
                    { labelKey: 'project.studioRevenue' as const, icon: '📈', path: `/studio/project/${id}/progress` },
                    { labelKey: 'project.studioDisclosure' as const, icon: '📄', path: `/studio/project/${id}/reconcile` },
                    { labelKey: 'project.studioFixedPrice' as const, icon: '🏷️', path: `/studio/project/${id}/fixed-price` },
                    { labelKey: 'project.studioVault' as const, icon: '🏦', path: `/studio/project/${id}/vault` },
                  ].map((item) => (
                    <button
                      key={item.labelKey}
                      type="button"
                      onClick={() => nav(item.path)}
                      className="flex items-center gap-2 bg-canvas px-4 py-3 text-left text-xs hover:bg-white/5"
                    >
                      <span className="text-base">{item.icon}</span>
                      <span className="text-text-secondary hover:text-text-primary">{t(item.labelKey)}</span>
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
    </AppShell>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────── */

function StatCell({
  label,
  value,
  center,
  right,
}: {
  label: string;
  value: string;
  center?: boolean;
  right?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 px-4 py-3',
        center && 'items-center border-x border-white/8',
        right && 'items-end',
      )}
    >
      <p className="text-[10px] text-text-secondary">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function RwaField({
  label,
  value,
  valueClass,
  right,
  border,
}: {
  label: string;
  value: string;
  valueClass?: string;
  right?: boolean;
  border?: boolean;
}) {
  return (
    <div
      className={cn(
        'py-2.5',
        right && 'text-right',
        border && 'border-t border-white/8',
      )}
    >
      <p className="text-[10px] text-text-secondary">{label}</p>
      <p className={cn('mt-0.5 text-sm font-semibold tabular-nums', valueClass)}>{value}</p>
    </div>
  );
}

function SecNavChip({
  icon,
  label,
  onClick,
  accent,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 transition-all active:scale-95',
        accent
          ? 'bg-accent-500/15 text-accent-400 ring-accent-500/30 hover:bg-accent-500/25'
          : 'bg-white/6 text-text-secondary ring-white/10 hover:bg-white/12 hover:text-text-primary',
      )}
    >
      {icon}
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
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface py-8 ring-1 ring-white/6">
        <TrendingUp className="size-6 text-text-secondary opacity-30" />
        <p className="text-xs text-text-secondary">No trades yet</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-white/8">
      <div className="grid grid-cols-4 border-b border-white/8 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
        <span>Time</span>
        <span className="text-right">Side</span>
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
            className={cn(
              'grid grid-cols-4 border-b border-white/5 px-3 py-2 text-[10px] tabular-nums last:border-0',
              isBuy ? 'hover:bg-success-500/5' : 'hover:bg-danger-500/5',
            )}
          >
            <span className="text-text-secondary">{timeStr}</span>
            <span className={cn('text-right font-semibold', isBuy ? 'text-success-400' : 'text-danger-400')}>
              {isBuy ? '▲ Buy' : '▼ Sell'}
            </span>
            <span className="text-right text-text-secondary">
              {formatTokenFromRaw(tr.amount_token_raw, locale, 2)} {symbol}
            </span>
            <span className="text-right font-medium">
              ${formatTokenFromRaw(tr.price_raw, locale, 4)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PondView({ p }: { p: OnChainDetail }) {
  const { t } = useTranslation();
  const vaultItems = [
    { k: 'early' as const, pct: 20, color: 'bg-info-500', glow: 'shadow-info-500/30' },
    { k: 'guard' as const, pct: 10, color: 'bg-warning-400', glow: 'shadow-warning-400/30' },
    { k: 'lp' as const, pct: 10, color: 'bg-accent-500', glow: 'shadow-accent-500/30' },
    { k: 'creator' as const, pct: 60, color: 'bg-success-500', glow: 'shadow-success-500/30' },
  ];
  return (
    <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-white/8">
      {p.status !== 'migrated' ? (
        <div className="border-b border-white/8 px-4 py-3 text-center text-xs text-text-secondary">
          🌊 Pond unlocks after graduation (Meteora migration)
        </div>
      ) : null}
      <div className="space-y-3 p-4">
        {vaultItems.map((item) => (
          <div key={item.k}>
            <div className="mb-1 flex items-baseline justify-between">
              <div>
                <span className="text-xs font-medium">{t(`project.pond.${item.k}.main`)}</span>
                <span className="ml-1.5 text-[10px] text-text-secondary">{t(`project.pond.${item.k}.sub`)}</span>
              </div>
              <span className="text-xs font-bold tabular-nums">{item.pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className={cn('h-full rounded-full', item.color)}
                style={{ width: `${item.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketView({ p, t }: { p: OnChainDetail; t: (k: string) => string }) {
  if (p.status !== 'migrated') {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-20">
        <div className="flex size-20 items-center justify-center rounded-full bg-accent-500/10 text-3xl ring-1 ring-accent-500/20">
          🌊
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold">{p.symbol} is not on Meteora yet</p>
          <p className="mt-1 text-xs text-text-secondary">
            Market tab becomes available after the project graduates and migrates to Meteora DLMM.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-white/8">
        <div className="border-b border-white/8 px-4 py-2.5">
          <p className="text-xs font-semibold text-success-400">✓ Graduated · On Meteora</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 text-xs text-text-secondary">
          <span>Pool:</span>
          <span className="font-mono text-text-primary">{shortenAddress(p.meteora_pool ?? '', 8, 4)}</span>
          <button
            type="button"
            className="ml-auto flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px]"
            onClick={() => {
              void navigator.clipboard.writeText(p.meteora_pool ?? '');
              toast.success(t('common.copied'));
            }}
          >
            <Copy className="size-3" />
            Copy
          </button>
        </div>
      </div>
      <a
        href={`https://app.meteora.ag/dlmm/${p.meteora_pool ?? ''}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl bg-accent-gradient py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-accent-500/20"
      >
        {t('common.openMeteora')} ↗
      </a>
      <a
        href={`https://app.meteora.ag/dlmm/${p.meteora_pool ?? ''}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl bg-white/8 py-3.5 text-center text-sm font-medium ring-1 ring-white/10 hover:bg-white/12"
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
            side === 'buy' ? 'bg-success-500 text-white shadow-lg shadow-success-500/25' : 'bg-white/10 text-text-secondary',
          )}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => { setSide('sell'); setPreview(null); }}
          className={cn(
            'flex-1 rounded-xl py-2 text-sm font-bold transition-all',
            side === 'sell' ? 'bg-warning-500 text-white shadow-lg shadow-warning-500/25' : 'bg-white/10 text-text-secondary',
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
          className="w-full rounded-2xl bg-white/10 py-3.5 text-sm font-medium text-text-primary ring-1 ring-white/15"
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
            side === 'buy' ? 'bg-success-500 shadow-lg shadow-success-500/20' : 'bg-warning-500 shadow-lg shadow-warning-500/20',
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
