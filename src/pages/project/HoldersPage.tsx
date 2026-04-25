import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatTokenFromRaw, shortenAddress } from '@/lib/fmt';
import type { OnChainDetail, OnChainHolderRow } from '@/types/api';
import { useUserStore } from '@/stores/useUserStore';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function HoldersPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const wallet = useUserStore((s) => s.wallet_address);
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: detail } = useQuery({
    queryKey: ['launch', 'on-chain', 'detail', id],
    queryFn: () => apiFetch<OnChainDetail>(`/launch/on-chain/detail?project_id=${id}`),
    enabled: !!id,
  });

  const { data, isPending } = useQuery({
    queryKey: ['launch', 'holders', id],
    queryFn: () => apiFetch<OnChainHolderRow[]>(`/launch/on-chain/holders?project_id=${id}&limit=30`),
    enabled: !!id,
  });

  const rows = data ?? [];
  const symbol = detail?.symbol ?? '';

  return (
    <AppShell hideTab>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex h-12 shrink-0 items-center gap-2 px-2">
          <button type="button" className="rounded-lg p-2 text-text-secondary hover:bg-white/5" onClick={() => nav(-1)}>
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="flex-1 text-base font-semibold">{t('project.holdersTitle')}</h1>
          {detail ? (
            <span className="text-xs text-text-secondary">
              {t('holders.count', { n: (detail.holder_count ?? rows.length).toLocaleString(locale) })}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-0 px-3 pb-6 pt-1">
          {/* Header row */}
          <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
            <span>#</span>
            <span>{t('holders.colWallet')}</span>
            <span className="text-right">{t('holders.colHold')}</span>
            <span className="w-5" />
          </div>

          {isPending ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            rows.map((h) => {
              const isMe = !!(wallet && h.wallet.toLowerCase() === wallet.toLowerCase());
              const isOpen = expanded === h.rank;
              const pnl = Number(h.unrealized_pnl_usdt ?? '0') / 1e6;
              const pnlPositive = pnl >= 0;

              return (
                <div
                  key={h.rank}
                  className={cn(
                    'mb-1.5 overflow-hidden rounded-xl bg-surface ring-1 transition-all',
                    isMe ? 'ring-primary-500/50' : 'ring-white/6',
                  )}
                >
                  <button
                    type="button"
                    className="grid w-full grid-cols-[2rem_1fr_auto_auto] items-center gap-2 px-3 py-2.5 text-left"
                    onClick={() => setExpanded(isOpen ? null : h.rank)}
                  >
                    {/* Rank */}
                    <span className="text-sm font-bold">
                      {h.rank <= 3 ? MEDALS[h.rank - 1] : (
                        <span className="font-mono text-xs text-text-secondary">#{h.rank}</span>
                      )}
                    </span>

                    {/* Wallet */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs">{shortenAddress(h.wallet)}</span>
                        {isMe ? (
                          <span className="rounded-full bg-primary-500/20 px-1.5 py-0.5 text-[9px] font-bold text-primary-400">
                            {t('common.me')}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[10px] text-text-secondary tabular-nums">
                        {t('holders.sharePct', { pct: (h.pct_bps / 100).toFixed(2) })}
                      </p>
                    </div>

                    {/* Balance */}
                    <span className="tabular-nums text-sm font-semibold">
                      {formatTokenFromRaw(h.balance_raw, locale, 2)}
                    </span>

                    {/* Expand arrow */}
                    <ChevronDown className={cn('size-3.5 text-text-secondary transition-transform', isOpen && 'rotate-180')} />
                  </button>

                  {/* Expanded detail */}
                  {isOpen ? (
                    <div className="border-t border-white/6 px-3 pb-3 pt-2">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div>
                          <p className="text-text-secondary">{t('holders.tokenBalance')}</p>
                          <p className="font-medium tabular-nums">{formatTokenFromRaw(h.balance_raw, locale, 4)} {symbol}</p>
                        </div>
                        <div>
                          <p className="text-text-secondary">{t('holders.unrealizedPnl')}</p>
                          <p className={cn('font-semibold tabular-nums', pnlPositive ? 'text-success-400' : 'text-danger-400')}>
                            {pnlPositive ? '+' : ''}{pnl.toFixed(2)} USDT
                          </p>
                        </div>
                        <div>
                          <p className="text-text-secondary">{t('holders.buyCount')}</p>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="size-3 text-success-400" />
                            <span className="font-medium">{h.buy_count ?? '—'}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-text-secondary">{t('holders.sellCount')}</p>
                          <div className="flex items-center gap-1">
                            <TrendingDown className="size-3 text-danger-400" />
                            <span className="font-medium">{h.sell_count ?? '—'}</span>
                          </div>
                        </div>
                        {h.last_trade_time ? (
                          <div className="col-span-2">
                            <p className="text-text-secondary">{t('holders.lastTrade')}</p>
                            <p className="font-medium">
                              {new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(h.last_trade_time * 1000))}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}
