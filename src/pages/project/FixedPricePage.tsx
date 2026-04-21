import { AppShell } from '@/components/layout/AppShell';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatTokenFromRaw, formatUsdtFromRaw } from '@/lib/fmt';
import type { AdminFixedPriceSaleRow, FixedPriceOrderRow } from '@/types/api';
import { useUserStore } from '@/stores/useUserStore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, Lock } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

type SheetStep = 'amount' | 'preview' | 'confirm';

const STATUS_CONFIG: Record<string, { label: string; cls: string } | undefined> = {
  upcoming:    { label: '即将开始', cls: 'bg-info-500/15 text-info-400' },
  subscribing: { label: '认购中', cls: 'bg-success-500/15 text-success-400' },
  ended:       { label: '已结束', cls: 'bg-text-secondary/15 text-text-secondary' },
  vesting:     { label: 'Vesting 中', cls: 'bg-purple-500/15 text-purple-400' },
  done:        { label: '已完成', cls: 'bg-text-secondary/15 text-text-secondary' },
  cancelled:   { label: '已取消', cls: 'bg-danger-500/15 text-danger-400' },
};

function fmtDate(unix: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(unix * 1000));
}

function VestingSummary({ sale }: { sale: AdminFixedPriceSaleRow; locale?: string }) {
  const pcts = sale.vesting_percentages_bps_csv.split(',').map(Number);
  const periodDays = Math.round(sale.vesting_slice_period_sec / 86400);
  return (
    <div className="flex flex-wrap gap-1">
      {pcts.map((bps, i) => (
        <span key={i} className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[10px] text-purple-400">
          {(bps / 100).toFixed(0)}% +{i === 0 ? '0' : i * periodDays}d
        </span>
      ))}
    </div>
  );
}

function SaleCard({ sale, onSubscribe, locale }: { sale: AdminFixedPriceSaleRow; onSubscribe: (s: AdminFixedPriceSaleRow) => void; locale: string }) {
  const cfg = STATUS_CONFIG[sale.status] ?? { label: '已结束', cls: 'bg-text-secondary/15 text-text-secondary' };
  const raised = BigInt(sale.raised_usdt_raw);
  const target = BigInt(sale.target_usdt_raw);
  const pct = target > 0n ? Number((raised * 10000n) / target) / 100 : 0;
  const priceUsdt = parseFloat(sale.price_usdt_per_token_raw) / 1e6;
  const isActive = sale.status === 'subscribing';

  return (
    <div className={cn('rounded-2xl bg-surface p-3 ring-1 transition-all', isActive ? 'ring-success-500/30' : 'ring-white/6')}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-text-secondary">{sale.symbol} 固定价格认购</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums">${priceUsdt.toFixed(4)}<span className="ml-1 text-xs text-text-secondary">/ 代币</span></p>
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold shrink-0', cfg.cls)}>
          {cfg.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="mb-1 flex items-center justify-between text-[10px] text-text-secondary">
          <span>已募集 {pct.toFixed(1)}%</span>
          <span className="tabular-nums">
            {formatUsdtFromRaw(sale.raised_usdt_raw, locale)} / {formatUsdtFromRaw(sale.target_usdt_raw, locale)} USDT
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className={cn('h-full rounded-full transition-all', isActive ? 'bg-success-500' : 'bg-text-secondary/40')} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      </div>

      {/* Dates */}
      <div className="mb-2 flex items-center gap-3 text-[10px] text-text-secondary">
        <span className="flex items-center gap-1"><Calendar className="size-3" /> {fmtDate(sale.sale_start_unix, locale)}</span>
        <span>→</span>
        <span>{fmtDate(sale.sale_end_unix, locale)}</span>
      </div>

      {/* Vesting plan */}
      <div className="mb-2">
        <p className="mb-1 text-[10px] text-text-secondary">Vesting 计划</p>
        <VestingSummary sale={sale} locale={locale} />
      </div>

      {isActive ? (
        <Button className="mt-1 w-full" onClick={() => onSubscribe(sale)}>
          立即认购
        </Button>
      ) : (
        <div className="mt-1 flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white/5 text-xs text-text-secondary">
          <Lock className="size-3" />
          {sale.status === 'upcoming' ? '认购尚未开始' : '认购已结束'}
        </div>
      )}
    </div>
  );
}

function OrdersSection({ saleId, locale }: { saleId: string; locale: string }) {
  const { data } = useQuery({
    queryKey: ['fixed-price', 'orders', saleId],
    queryFn: () => apiFetch<FixedPriceOrderRow[]>(`/rwa/fixed-price/sales/${saleId}/orders`),
  });
  const rows = data ?? [];
  if (rows.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="mb-2 text-xs font-semibold text-text-secondary">我的订单</p>
      <div className="space-y-2">
        {rows.map((o) => (
          <div key={o.order_id} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-xs ring-1 ring-white/6">
            <div>
              <p className="font-medium tabular-nums">{formatUsdtFromRaw(o.usdt_raw, locale)} USDT</p>
              <p className="text-text-secondary">{new Date(o.created_at * 1000).toLocaleDateString(locale)}</p>
            </div>
            <div className="text-right">
              <p className="font-medium tabular-nums text-success-400">+{formatTokenFromRaw(o.token_raw, locale, 2)} 代币</p>
              <p className="text-[10px] text-text-secondary">{o.order_id.slice(0, 8)}…</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FixedPricePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const qc = useQueryClient();
  const usdtRaw = useUserStore((s) => s.usdt_raw);

  const [activeSale, setActiveSale] = useState<AdminFixedPriceSaleRow | null>(null);
  const [step, setStep] = useState<SheetStep>('amount');
  const [amountStr, setAmountStr] = useState('');
  const [previewData, setPreviewData] = useState<{ estimated_token_raw: string; usdt_raw: string } | null>(null);

  const { data: detail } = useQuery({
    queryKey: ['launch', 'on-chain', 'detail', id],
    queryFn: () => apiFetch<{ work_id: number; symbol: string }>(`/launch/on-chain/detail?project_id=${id}`),
    enabled: !!id,
  });

  const { data, isPending } = useQuery({
    queryKey: ['fixed-price', 'sales', id],
    queryFn: () => apiFetch<AdminFixedPriceSaleRow[]>(`/rwa/fixed-price/sales?work_id=${detail?.work_id ?? 0}`),
    enabled: !!detail?.work_id,
  });

  const previewM = useMutation({
    mutationFn: () =>
      apiFetch<{ estimated_token_raw: string; usdt_raw: string }>('/rwa/fixed-price/subscribe/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale_id: activeSale?.id, usdt_raw: String(Math.floor(parseFloat(amountStr || '0') * 1e6)) }),
      }),
    onSuccess: (d) => { setPreviewData(d); setStep('preview'); },
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  const confirmM = useMutation({
    mutationFn: () =>
      apiFetch('/rwa/fixed-price/subscribe/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale_id: activeSale?.id, usdt_raw: String(Math.floor(parseFloat(amountStr || '0') * 1e6)) }),
      }),
    onSuccess: async () => {
      toast.success('认购成功');
      await qc.invalidateQueries({ queryKey: ['rwa', 'my', 'vesting'] });
      closeSheet();
      nav(`/project/${id}/vesting`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  function openSheet(sale: AdminFixedPriceSaleRow) {
    setActiveSale(sale);
    setAmountStr('');
    setPreviewData(null);
    setStep('amount');
  }

  function closeSheet() {
    setActiveSale(null);
    setStep('amount');
    setPreviewData(null);
    setAmountStr('');
  }

  const sales = data ?? [];
  const symbol = detail?.symbol ?? '';
  const availableUsdt = parseFloat(usdtRaw ?? '0') / 1e6;
  const amountNum = parseFloat(amountStr || '0');
  const pricePerToken = activeSale ? parseFloat(activeSale.price_usdt_per_token_raw) / 1e6 : 1;
  const estimatedTokens = amountNum > 0 ? amountNum / pricePerToken : 0;
  const canNext = amountNum >= 1 && amountNum <= availableUsdt;

  return (
    <AppShell hideTab>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex h-12 shrink-0 items-center gap-2 px-2">
          <button type="button" className="rounded-lg p-2 text-text-secondary hover:bg-white/5" onClick={() => nav(-1)}>
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="flex-1 text-base font-semibold">固定价格认购 · {symbol}</h1>
        </div>

        <div className="flex flex-col gap-3 px-3 pb-8">
          {isPending ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)
          ) : sales.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-secondary">暂无认购轮次</p>
          ) : (
            <>
              {/* Group: active first */}
              {sales.filter((s) => s.status === 'subscribing').map((s) => (
                <div key={s.id}>
                  <SaleCard sale={s} onSubscribe={openSheet} locale={locale} />
                  <OrdersSection saleId={s.id} locale={locale} />
                </div>
              ))}
              {sales.filter((s) => s.status !== 'subscribing').map((s) => (
                <SaleCard key={s.id} sale={s} onSubscribe={openSheet} locale={locale} />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Subscribe sheet */}
      <BottomSheet open={!!activeSale} onClose={closeSheet} title={`认购 ${symbol}`}>
        {activeSale && (
          <div className="space-y-3 pb-4">
            {step === 'amount' && (
              <>
                {/* Price info */}
                <div className="rounded-xl bg-surface px-3 py-2 text-xs flex items-center gap-2">
                  <TrendingUp className="size-3.5 text-success-400" />
                  <span className="text-text-secondary">认购单价：</span>
                  <span className="font-bold text-success-400">${pricePerToken.toFixed(4)} / {symbol}</span>
                </div>

                {/* Balance */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">可用 USDT</span>
                  <span className="tabular-nums font-medium">{availableUsdt.toLocaleString(locale, { minimumFractionDigits: 2 })} USDT</span>
                </div>

                {/* Amount input */}
                <div className="rounded-2xl bg-surface p-3">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-text-secondary">
                    <span>认购金额 (USDT)</span>
                    <button type="button" className="text-accent-500 font-medium" onClick={() => setAmountStr(Math.floor(availableUsdt).toString())}>
                      MAX
                    </button>
                  </div>
                  <Input
                    type="number"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    className="text-xl font-bold"
                  />
                </div>

                {/* Estimated tokens */}
                {amountNum > 0 ? (
                  <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-xs">
                    <span className="text-text-secondary">预计获得</span>
                    <span className="font-bold tabular-nums text-success-400">
                      {estimatedTokens.toLocaleString(locale, { maximumFractionDigits: 2 })} {symbol}
                    </span>
                  </div>
                ) : null}

                {/* Vesting plan */}
                <div className="rounded-xl bg-surface px-3 py-2">
                  <p className="mb-1.5 text-[10px] text-text-secondary">Vesting 计划</p>
                  <VestingSummary sale={activeSale} locale={locale} />
                </div>

                {amountNum > availableUsdt && availableUsdt > 0 ? (
                  <p className="text-center text-xs text-danger-500">超出可用余额</p>
                ) : null}

                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={closeSheet}>取消</Button>
                  <Button
                    className="flex-1"
                    disabled={!canNext}
                    loading={previewM.isPending}
                    onClick={() => previewM.mutate()}
                  >
                    预览 <ChevronRight className="ml-1 size-3.5" />
                  </Button>
                </div>
              </>
            )}

            {step === 'preview' && previewData && (
              <>
                <div className="rounded-2xl bg-surface p-4 space-y-3">
                  <p className="font-semibold">确认认购</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">支付</span>
                      <span className="tabular-nums font-medium">{amountNum.toLocaleString(locale, { minimumFractionDigits: 2 })} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">获得（进入 Vesting）</span>
                      <span className="tabular-nums font-bold text-success-400">
                        {formatTokenFromRaw(previewData.estimated_token_raw, locale, 2)} {symbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">认购单价</span>
                      <span className="tabular-nums">${pricePerToken.toFixed(4)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] text-text-secondary">Vesting 计划</p>
                    <VestingSummary sale={activeSale} locale={locale} />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setStep('amount')}>返回修改</Button>
                  <Button
                    className="flex-1"
                    loading={confirmM.isPending}
                    onClick={() => confirmM.mutate()}
                  >
                    确认认购
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </BottomSheet>
    </AppShell>
  );
}
