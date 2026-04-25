import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCountdown } from '@/hooks/useCountdown';
import { apiFetch } from '@/lib/api';
import { translateCoBuilderApiError } from '@/lib/apiErrors';
import { cn } from '@/lib/cn';
import { useUserStore } from '@/stores/useUserStore';
import { useUIStore } from '@/stores/useUIStore';
import type {
  CoBuilderIndexData,
  CoBuilderLivePrice,
  CoBuilderOrder,
  CoBuilderQuote,
  TierCardData,
} from '@/types/coBuilder';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, Lock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { LevelBadge } from './LevelBadge';

const TIER_PRESETS: { qty: number; key: TierCardData['level'] }[] = [
  { qty: 100, key: 'base' },
  { qty: 1500, key: 'active' },
  { qty: 88500, key: 'global' },
];

export function PurchaseSheet({
  open,
  onClose,
  initialQty,
  index,
}: {
  open: boolean;
  onClose: () => void;
  initialQty: number;
  index: CoBuilderIndexData;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const logged = useUserStore((s) => s.is_logged_in());
  const setSheet = useUIStore((s) => s.setBottomSheet);
  const [qty, setQty] = useState<string>(String(initialQty));
  const [quote, setQuote] = useState<CoBuilderQuote | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<number | null>(null);
  const [showPriceDialog, setShowPriceDialog] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQty(String(initialQty));
      setQuote(null);
      setConfirmedAt(null);
      setShowPriceDialog(false);
    }
  }, [open, initialQty]);

  const { data: live } = useQuery({
    queryKey: ['co-builder', 'price', 'live'],
    queryFn: () => apiFetch<CoBuilderLivePrice>('/co-builder/price/live'),
    refetchInterval: open ? 5_000 : false,
    enabled: open,
  });

  const numericQty = useMemo(() => Number(qty.replace(/[^0-9]/g, '')) || 0, [qty]);
  const qtyError = useMemo(() => {
    if (numericQty === 0) return null;
    if (numericQty < 100) return t('coBuilder.purchase.errors.minQty');
    if (numericQty > 885_000) return t('coBuilder.purchase.errors.maxQty');
    if (numericQty % 100 !== 0) return t('coBuilder.purchase.errors.notMultiple');
    return null;
  }, [numericQty, t]);

  const liveUnit = live?.unit_price ?? index.unit_price;
  const total = useMemo(() => {
    if (qtyError || numericQty === 0) return 0;
    return Math.round(numericQty * liveUnit * 100) / 100;
  }, [numericQty, liveUnit, qtyError]);

  const cd = useCountdown(quote?.lock_expires_at ?? null);
  const cdLabel = cd?.label ?? '';

  const preMutation = useMutation({
    mutationFn: () =>
      apiFetch<CoBuilderQuote>('/co-builder/order/pre', {
        method: 'POST',
        body: JSON.stringify({ quantity: numericQty }),
        headers: { 'content-type': 'application/json' },
      }),
    onSuccess: (q) => {
      setQuote(q);
      // Re-confirm on price change
      if (live && Math.abs(live.unit_price - q.lock_price) > 1e-6) {
        setShowPriceDialog(true);
      }
    },
    onError: (e: unknown) => {
      toast.error(translateCoBuilderApiError(e, t, 'coBuilder.purchase.errors.network'));
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (q: CoBuilderQuote) =>
      apiFetch<CoBuilderOrder>('/co-builder/order/confirm', {
        method: 'POST',
        body: JSON.stringify({
          order_no: q.order_no,
          quantity: q.quantity,
          lock_price: q.lock_price,
        }),
        headers: { 'content-type': 'application/json' },
      }),
    onSuccess: () => {
      setConfirmedAt(Date.now());
      toast.success(t('coBuilder.purchase.payDone'));
      void qc.invalidateQueries({ queryKey: ['co-builder'] });
      window.setTimeout(() => onClose(), 1500);
    },
    onError: (e: unknown) => {
      toast.error(translateCoBuilderApiError(e, t, 'coBuilder.purchase.errors.network'));
    },
  });

  const onPreset = (q: number) => setQty(String(q));

  const onPay = () => {
    if (!logged) {
      setSheet('connect');
      return;
    }
    if (qtyError || numericQty === 0) {
      toast.error(qtyError ?? t('coBuilder.purchase.errors.minQty'));
      return;
    }
    if (!quote) {
      preMutation.mutate();
      return;
    }
    if (cd?.ended) {
      preMutation.mutate();
      return;
    }
    if (live && Math.abs(live.unit_price - quote.lock_price) > 1e-6) {
      setShowPriceDialog(true);
      return;
    }
    confirmMutation.mutate(quote);
  };

  const acceptNewPrice = () => {
    setShowPriceDialog(false);
    preMutation.mutate();
  };

  const cancelNewPrice = () => {
    setShowPriceDialog(false);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t('coBuilder.purchase.title')}>
      <div className="space-y-4 pb-2">
        {/* Tier presets */}
        <div className="grid grid-cols-3 gap-2">
          {TIER_PRESETS.map((p) => {
            const on = numericQty === p.qty;
            return (
              <button
                key={p.qty}
                type="button"
                onClick={() => onPreset(p.qty)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-2xl border bg-white/4 px-2 py-3 transition-all',
                  on
                    ? 'border-primary-500/60 bg-primary-500/10 ring-2 ring-primary-500/40'
                    : 'border-white/8 hover:bg-white/8',
                )}
              >
                <LevelBadge level={p.key} label={t(`coBuilder.tier.${p.key}.tag`)} size="sm" />
                <span className="text-base font-bold tabular-nums">{p.qty.toLocaleString()}A</span>
                <span className="text-[10px] text-text-secondary">
                  ≈ {(p.qty * liveUnit).toLocaleString(undefined, { maximumFractionDigits: 0 })} USDT
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom amount */}
        <div>
          <p className="mb-1.5 text-[11px] text-text-secondary">{t('coBuilder.purchase.customLabel')}</p>
          <Input
            inputMode="numeric"
            placeholder={t('coBuilder.purchase.customPlaceholder')}
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))}
            error={qtyError ?? undefined}
            suffix={<span className="text-xs text-text-secondary">A</span>}
          />
        </div>

        {/* Total panel */}
        <div className="space-y-2 rounded-2xl border border-white/8 bg-elevated/80 px-3 py-3">
          <Row
            label={t('coBuilder.purchase.unitLabel')}
            value={
              <span className="flex items-center gap-1 tabular-nums">
                <Lock className="size-3 text-text-secondary" />
                {liveUnit.toFixed(2)} USDT / A
                {quote ? (
                  <span className="ml-1 rounded-full bg-success-500/15 px-1.5 py-0.5 text-[9px] font-bold text-success-400">
                    {cd?.ended ? t('coBuilder.purchase.relockHint') : `LOCK ${cdLabel}`}
                  </span>
                ) : null}
              </span>
            }
          />
          <Row
            label={t('coBuilder.purchase.totalLabel')}
            value={
              <span className="text-base font-bold tabular-nums text-text-primary">
                {total.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT
              </span>
            }
            emphasized
          />
          {quote ? (
            <p className="text-[10px] text-text-secondary">
              {t('coBuilder.purchase.orderNo')}: <span className="font-mono">{quote.order_no}</span>
            </p>
          ) : null}
        </div>

        {/* Bond rules */}
        <div className="rounded-2xl bg-white/4 px-3 py-2.5">
          <p className="mb-1.5 text-[11px] font-semibold text-text-primary">
            {t('coBuilder.purchase.bondTitle')}
          </p>
          <ul className="space-y-1 text-[10px] leading-relaxed text-text-secondary">
            {(t('coBuilder.purchase.bondBullets', { returnObjects: true }) as string[]).map((b, i) => (
              <li key={i} className="relative pl-3">
                <span className="absolute left-0 top-1.5 size-1 rounded-full bg-accent-400" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <Button
          variant="primary"
          className="w-full"
          loading={preMutation.isPending || confirmMutation.isPending}
          onClick={onPay}
          disabled={!!qtyError || numericQty === 0}
        >
          {confirmedAt ? (
            <span className="inline-flex items-center gap-1">
              <Check className="size-4" />
              {t('coBuilder.purchase.payDone')}
            </span>
          ) : !logged ? (
            t('coBuilder.purchase.errors.connect')
          ) : !quote ? (
            t('coBuilder.purchase.payCta')
          ) : (
            t('coBuilder.purchase.payCta')
          )}
        </Button>
      </div>

      <AnimatePresence>
        {showPriceDialog ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center px-4"
          >
            <button
              type="button"
              aria-label="close"
              className="absolute inset-0 bg-black/60"
              onClick={cancelNewPrice}
            />
            <motion.div
              initial={{ scale: 0.96, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative z-10 w-full max-w-[320px] rounded-3xl border border-white/10 bg-elevated p-4 shadow-2xl"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-warning-500/15 text-warning-500">
                  <AlertTriangle className="size-4" />
                </span>
                <h4 className="text-sm font-semibold">{t('coBuilder.purchase.priceChangedTitle')}</h4>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                {t('coBuilder.purchase.priceChangedBody', { p: live?.unit_price.toFixed(2) ?? '—' })}
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={cancelNewPrice}>
                  {t('coBuilder.purchase.priceChangedCancel')}
                </Button>
                <Button variant="primary" className="flex-1" onClick={acceptNewPrice}>
                  {t('coBuilder.purchase.priceChangedAccept')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </BottomSheet>
  );
}

function Row({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: React.ReactNode;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-text-secondary">{label}</span>
      <span className={cn('font-medium', emphasized ? 'text-text-primary' : 'text-text-primary/90')}>
        {value}
      </span>
    </div>
  );
}
