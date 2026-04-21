/**
 * TradePage: standalone route /project/:id/trade
 * Renders a full-page version of the trade UI when navigated directly.
 * The primary UX path is via the BottomSheet in DetailPage.
 */
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError, apiFetch } from '@/lib/api';
import { formatTokenFromRaw, formatUsdtFromRaw, usdtToRaw } from '@/lib/fmt';
import { cn } from '@/lib/cn';
import { useUserStore } from '@/stores/useUserStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';
import { RequireInvestor } from '@/routes/guards';

const SLIPPAGE_PRESETS = [50, 100, 300] as const;

export default function TradePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const qc = useQueryClient();
  const usdtRaw = useUserStore((s) => s.usdt_raw);
  const patchBalances = useUserStore((s) => s.patchBalances);

  const [side, setSide] = useState<'buy' | 'sell'>('buy');
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
      apiFetch<{
        amount_out_raw: string;
        min_amount_out_raw: string;
        price_before_raw: string;
        price_after_raw: string;
        fee_raw: string;
      }>('/launch/swap/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: Number(id),
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
      return apiFetch<{ tx_signature: string }>('/launch/swap/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: Number(id),
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
      await qc.invalidateQueries({ queryKey: ['launch', 'on-chain', 'detail', id] });
      nav(-1);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  return (
    <RequireInvestor>
      <AppShell hideTab>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg p-2 hover:bg-white/5" onClick={() => nav(-1)}>
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="text-lg font-semibold">{t('trade.title')}</h1>
          </div>

          {/* Side toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setSide('buy'); setPreview(null); }}
              className={cn(
                'flex-1 rounded-xl py-2.5 text-sm font-bold transition-all',
                side === 'buy' ? 'bg-success-500 text-white' : 'bg-white/10 text-text-secondary',
              )}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => { setSide('sell'); setPreview(null); }}
              className={cn(
                'flex-1 rounded-xl py-2.5 text-sm font-bold transition-all',
                side === 'sell' ? 'bg-warn-500 text-white' : 'bg-white/10 text-text-secondary',
              )}
            >
              Sell
            </button>
          </div>

          {/* Balance */}
          <div className="flex justify-between rounded-xl bg-surface px-3 py-2 text-xs text-text-secondary">
            <span>USDT Balance</span>
            <span className="tabular-nums text-text-primary">
              {new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(usdtBalance)}
            </span>
          </div>

          {/* Amount input */}
          <div className="relative">
            <Input
              value={amount}
              onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.]/g, '')); setPreview(null); }}
              placeholder={side === 'buy' ? 'USDT amount' : 'Token amount'}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-accent-500/20 px-2 py-0.5 text-[10px] font-bold text-accent-500"
              onClick={() => side === 'buy' && setAmount(usdtBalance.toFixed(2))}
            >
              MAX
            </button>
          </div>

          {/* Slippage */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">Slippage</span>
            <div className="flex gap-1.5">
              {SLIPPAGE_PRESETS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlippage(s)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[10px] font-medium transition-all',
                    slippage === s ? 'bg-accent-500/25 text-accent-500' : 'bg-white/10 text-text-secondary',
                  )}
                >
                  {s / 100}%
                </button>
              ))}
            </div>
          </div>

          {/* Preview result */}
          {preview ? (
            <div className="rounded-xl bg-surface p-3 space-y-1.5 text-sm">
              <div className="flex justify-between tabular-nums">
                <span className="text-text-secondary">You get</span>
                <span className="font-medium">{formatTokenFromRaw(preview.amount_out_raw, locale, 4)}</span>
              </div>
              <div className="flex justify-between tabular-nums">
                <span className="text-text-secondary">Min received</span>
                <span>{formatTokenFromRaw(preview.min_amount_out_raw, locale, 4)}</span>
              </div>
              <button
                type="button"
                className="flex w-full items-center justify-between text-xs text-text-secondary"
                onClick={() => setShowFeeDetail((v) => !v)}
              >
                <span>Fee details</span>
                {showFeeDetail ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              </button>
              {showFeeDetail ? (
                <div className="space-y-1 text-[10px] tabular-nums text-text-secondary pt-1 border-t border-white/10">
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

          {/* CTA */}
          {insufficientFunds ? (
            <Button onClick={() => nav('/wallet/recharge')}>Recharge USDT</Button>
          ) : !preview ? (
            <Button
              disabled={tooSmall}
              loading={mPreview.isPending}
              onClick={() => mPreview.mutate()}
            >
              {t('trade.preview')}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setPreview(null)}>
                {t('common.back')}
              </Button>
              <Button loading={mConfirm.isPending} onClick={() => mConfirm.mutate()}>
                {t('trade.confirm')}
              </Button>
            </div>
          )}
          {tooSmall && !insufficientFunds ? (
            <p className="text-center text-xs text-danger-500">Minimum $1 USDT</p>
          ) : null}
        </div>
      </AppShell>
    </RequireInvestor>
  );
}
