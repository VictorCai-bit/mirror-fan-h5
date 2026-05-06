import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatPoints, formatTokenFromRaw } from '@/lib/fmt';
import type { PositionSummary, UserVestingEntry } from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowRight, Coins, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { RequireInvestor } from '@/routes/guards';

/* ── helpers ─────────────────────────────────────────────────────────── */

const TOKEN_DECIMALS = 9; // Solana SPL tokens

function rawToDisplay(raw: string | number, decimals = TOKEN_DECIMALS): number {
  return Number(raw) / 10 ** decimals;
}

/* ── main page ───────────────────────────────────────────────────────── */

export default function ExchangePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const qc = useQueryClient();
  const [pts, setPts] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  /* ── queries ── */
  const { data: detail } = useQuery({
    queryKey: ['launch', 'on-chain', 'detail', id],
    queryFn: () =>
      apiFetch<{ work_id: number; symbol: string; name: string }>(
        `/launch/on-chain/detail?project_id=${id}`,
      ),
    enabled: !!id,
  });

  const { data: pointsData } = useQuery({
    queryKey: ['user', 'points', detail?.work_id],
    queryFn: () =>
      apiFetch<{ points: number; points_symbol: string }>(
        `/user/points?work_id=${detail?.work_id ?? 0}`,
      ),
    enabled: !!detail?.work_id,
  });

  const { data: position } = useQuery({
    queryKey: ['rwa', 'my', 'position', id],
    queryFn: () =>
      apiFetch<PositionSummary>(`/rwa/my/position?project_id=${id}`),
    enabled: !!id,
  });

  const { data: vestingList } = useQuery({
    queryKey: ['rwa', 'my', 'vesting', id],
    queryFn: () => apiFetch<UserVestingEntry[]>(`/rwa/my/vesting?project_id=${id}`),
    enabled: !!id,
  });

  /* ── derived values ── */
  const symbol = detail?.symbol ?? '';
  const pointsSymbol = pointsData?.points_symbol ?? `${symbol}s`;
  const available = pointsData?.points ?? 0;   // points balance (1 pt = 1 token)
  const ptsNum = parseInt(pts, 10) || 0;
  const isValid = ptsNum >= 1 && ptsNum <= available;

  // Tokens already acquired (curve + fixed-price purchases, settled vesting)
  const purchaseVesting = useMemo(
    () =>
      (vestingList ?? []).filter(
        (v) =>
          v.source === 'curve_buy' ||
          v.source === 'fixed_price' ||
          v.source === 'fixed_price_subscribe',
      ),
    [vestingList],
  );

  // Points-converted tokens
  const exchangeVesting = useMemo(
    () =>
      (vestingList ?? []).filter(
        (v) =>
          v.source === 'ip_points' ||
          v.source === 'exchange_converted' ||
          v.source === 'airdrop_utility',
      ),
    [vestingList],
  );

  // Wallet balance (liquid)
  const walletRaw = position?.token_balance_raw ?? '0';
  const walletAmt = rawToDisplay(walletRaw);

  // Total from purchases (vesting)
  const purchaseTotalRaw = purchaseVesting.reduce(
    (s, v) => s + Number(v.amount_raw),
    0,
  );
  const purchaseTotal = rawToDisplay(purchaseTotalRaw);

  // Total from exchanges (vesting)
  const exchangeTotalRaw = exchangeVesting.reduce(
    (s, v) => s + Number(v.amount_raw),
    0,
  );
  const exchangeTotal = rawToDisplay(exchangeTotalRaw);

  // Grand total held
  const grandTotal = walletAmt + purchaseTotal + exchangeTotal;

  /* ── exchange mutation ── */
  const m = useMutation({
    mutationFn: () =>
      apiFetch('/rwa/ip-points-to-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: Number(id), points: ptsNum }),
      }),
    onSuccess: async () => {
      toast.success(t('exchange.success'));
      await qc.invalidateQueries({ queryKey: ['rwa', 'my', 'vesting', id] });
      await qc.invalidateQueries({ queryKey: ['rwa', 'my', 'position', id] });
      await qc.invalidateQueries({ queryKey: ['user', 'points', detail?.work_id] });
      nav(`/project/${id}/vesting`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  return (
    <RequireInvestor>
      <AppShell hideTab>
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex h-12 shrink-0 items-center gap-2 px-2">
            <button
              type="button"
              className="rounded-lg p-2 text-text-secondary hover:bg-white/5"
              onClick={() => nav(-1)}
            >
              <ArrowRight className="size-5 rotate-180" />
            </button>
            <h1 className="flex-1 text-base font-semibold">
              {pointsSymbol} → {symbol}
            </h1>
          </div>

          <div className="flex flex-col gap-4 px-3 pb-10 pt-1">
            {/* ── Holdings overview ── */}
            <div className="rounded-2xl bg-gradient-to-br from-accent-500/20 via-primary-500/10 to-transparent p-4 ring-1 ring-accent-500/20">
              <p className="mb-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                {t('exchange.holdings')}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* Points available */}
                <div className="flex flex-col gap-1 rounded-xl bg-black/20 p-3">
                  <div className="flex items-center gap-1.5">
                    <Coins className="size-3 text-accent-400" />
                    <span className="text-[10px] text-text-secondary">{t('exchange.yourPoints')}</span>
                  </div>
                  <p className="font-mono text-lg font-bold tabular-nums text-accent-400">
                    {formatPoints(available, locale)}
                  </p>
                  <p className="text-[10px] text-text-secondary/70">{pointsSymbol}</p>
                </div>

                {/* Tokens from purchases */}
                <div className="flex flex-col gap-1 rounded-xl bg-black/20 p-3">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="size-3 text-success-400" />
                    <span className="text-[10px] text-text-secondary">{t('exchange.purchased')}</span>
                  </div>
                  <p className="font-mono text-lg font-bold tabular-nums text-success-400">
                    {purchaseTotal > 0
                      ? purchaseTotal.toLocaleString(locale, { maximumFractionDigits: 2 })
                      : '—'}
                  </p>
                  <p className="text-[10px] text-text-secondary/70">{symbol}</p>
                </div>

                {/* Wallet (liquid) */}
                <div className="flex flex-col gap-1 rounded-xl bg-black/20 p-3">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="size-3 text-info-400" />
                    <span className="text-[10px] text-text-secondary">{t('exchange.walletBalance')}</span>
                  </div>
                  <p className="font-mono text-lg font-bold tabular-nums text-info-400">
                    {walletAmt > 0
                      ? walletAmt.toLocaleString(locale, { maximumFractionDigits: 2 })
                      : '—'}
                  </p>
                  <p className="text-[10px] text-text-secondary/70">{symbol}</p>
                </div>

                {/* Total */}
                <div className="flex flex-col gap-1 rounded-xl bg-accent-500/15 p-3 ring-1 ring-accent-500/30">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="size-3 text-accent-400" />
                    <span className="text-[10px] text-text-secondary">{t('exchange.total')}</span>
                  </div>
                  <p className="font-mono text-lg font-bold tabular-nums text-accent-400">
                    {grandTotal > 0
                      ? grandTotal.toLocaleString(locale, { maximumFractionDigits: 2 })
                      : '—'}
                  </p>
                  <p className="text-[10px] text-text-secondary/70">{symbol}</p>
                </div>
              </div>

              {/* "Can redeem" hint */}
              {available > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-accent-500/10 px-3 py-2">
                  <span className="text-[11px] text-text-secondary">{t('exchange.canRedeem')}</span>
                  <span className="font-mono text-sm font-bold text-accent-400 tabular-nums">
                    {formatPoints(available, locale)} {symbol}
                  </span>
                </div>
              )}
            </div>

            {/* ── Rate info ── */}
            <div className="rounded-xl bg-surface px-4 py-3 text-xs text-text-secondary ring-1 ring-white/8">
              <p className="font-medium text-text-primary">
                1 {pointsSymbol} = 1 {symbol}
              </p>
              <p className="mt-0.5">{t('exchange.ratioNote')}</p>
            </div>

            {/* ── Exchange flow ── */}
            <div className="space-y-2">
              {/* From */}
              <div className="rounded-2xl bg-surface p-3 ring-1 ring-white/8">
                <div className="mb-1.5 flex items-center justify-between text-xs text-text-secondary">
                  <span>{t('exchange.from')}</span>
                  <button
                    type="button"
                    className="font-medium text-accent-500"
                    onClick={() => setPts(String(available))}
                  >
                    MAX {formatPoints(available, locale)}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={pts}
                    onChange={(e) => {
                      setConfirmed(false);
                      setPts(e.target.value.replace(/[^0-9]/g, ''));
                    }}
                    placeholder="0"
                    className="flex-1 text-xl font-bold"
                  />
                  <span className="shrink-0 rounded-full bg-accent-500/15 px-2.5 py-1 text-xs font-bold text-accent-400">
                    {pointsSymbol}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="flex size-8 items-center justify-center rounded-full bg-white/10">
                  <ArrowDown className="size-4 text-text-secondary" />
                </div>
              </div>

              {/* To */}
              <div className="rounded-2xl bg-surface p-3 ring-1 ring-white/8">
                <p className="mb-1.5 text-xs text-text-secondary">{t('exchange.youReceive')}</p>
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      'flex-1 text-xl font-bold tabular-nums',
                      ptsNum > 0 ? 'text-success-400' : 'text-text-secondary',
                    )}
                  >
                    {ptsNum > 0 ? formatPoints(ptsNum, locale) : '0'}
                  </p>
                  <span className="shrink-0 rounded-full bg-success-500/15 px-2.5 py-1 text-xs font-bold text-success-400">
                    {symbol}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-text-secondary">{t('exchange.vestingNote')}</p>
              </div>
            </div>

            {/* After-exchange total */}
            {ptsNum > 0 && ptsNum <= available && (
              <div className="flex items-center justify-between rounded-xl bg-success-500/8 px-3 py-2 ring-1 ring-success-500/20">
                <span className="text-[11px] text-text-secondary">{t('exchange.afterTotal')}</span>
                <span className="font-mono text-sm font-bold text-success-400 tabular-nums">
                  {(grandTotal + ptsNum).toLocaleString(locale, { maximumFractionDigits: 2 })} {symbol}
                </span>
              </div>
            )}

            {ptsNum > available && available > 0 ? (
              <p className="text-center text-xs text-danger-500">{t('exchange.insufficient')}</p>
            ) : null}

            {/* Confirm flow */}
            {!confirmed ? (
              <Button disabled={!isValid} onClick={() => setConfirmed(true)}>
                {t('exchange.review')}
              </Button>
            ) : (
              <div className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-white/10">
                <p className="text-sm font-semibold">{t('exchange.confirmTitle')}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">{t('exchange.spend')}</span>
                  <span className="tabular-nums font-medium">
                    {formatPoints(ptsNum, locale)} {pointsSymbol}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">{t('exchange.receive')}</span>
                  <span className="tabular-nums font-medium text-success-400">
                    {formatPoints(ptsNum, locale)} {symbol}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">{t('exchange.afterTotal')}</span>
                  <span className="tabular-nums font-medium text-accent-400">
                    {(grandTotal + ptsNum).toLocaleString(locale, { maximumFractionDigits: 2 })} {symbol}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button variant="secondary" onClick={() => setConfirmed(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button loading={m.isPending} onClick={() => m.mutate()}>
                    {t('exchange.confirm')}
                  </Button>
                </div>
              </div>
            )}

            {/* Link to vesting detail */}
            {(purchaseVesting.length > 0 || exchangeVesting.length > 0) && (
              <button
                type="button"
                className="mt-1 w-full rounded-xl bg-white/5 py-2.5 text-xs font-medium text-text-secondary hover:bg-white/10"
                onClick={() => nav(`/project/${id}/vesting`)}
              >
                {t('exchange.viewVesting')} →
              </button>
            )}
          </div>
        </div>
      </AppShell>
    </RequireInvestor>
  );
}
