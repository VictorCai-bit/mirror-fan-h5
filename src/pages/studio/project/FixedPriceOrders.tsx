import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime, formatUsdtFromRaw } from '@/lib/fmt';
import { RequireCreator } from '@/routes/guards';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ChevronLeft, TrendingUp, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

interface CreatorOrder {
  order_id: string;
  investor_uid: string;
  usdt_raw: string;
  token_raw: string;
  created_at: number;
}

interface SaleSummary {
  sale_id: string;
  symbol: string;
  status: string;
  price_usdt_per_token_raw: string;
  target_usdt_raw: string;
  raised_usdt_raw: string;
  sale_start_unix: number;
  sale_end_unix: number;
}

export default function StudioFixedPriceOrders() {
  const { id, saleId } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'zh-CN';

  const { data: summary, isPending: loadingSale } = useQuery({
    queryKey: ['creator', 'fp', 'sale', saleId],
    queryFn: () => apiFetch<SaleSummary>(`/creator/fixed-price/sales/${saleId ?? ''}`),
    enabled: !!saleId,
  });

  const { data: orders, isPending: loadingOrders } = useQuery({
    queryKey: ['creator', 'fp', 'orders', saleId],
    queryFn: () =>
      apiFetch<CreatorOrder[]>(`/creator/fixed-price/sales/${saleId ?? ''}/orders`),
    enabled: !!saleId,
  });

  const isPending = loadingSale || loadingOrders;
  const raised = Number(summary?.raised_usdt_raw ?? 0);
  const target = Number(summary?.target_usdt_raw ?? 1);
  const pct = Math.min(100, (raised / target) * 100);
  const totalOrders = orders?.length ?? 0;

  return (
    <RequireCreator>
      <AppShell hideTab>
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex h-12 shrink-0 items-center gap-2 px-2">
            <button
              type="button"
              className="rounded-lg p-2 text-text-secondary hover:bg-white/5"
              onClick={() => nav(`/studio/project/${id ?? ''}/fixed-price`)}
            >
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="flex-1 text-base font-semibold">
              {t('fpOrders.title')}
              {summary?.symbol ? ` · ${summary.symbol}` : ''}
            </h1>
          </div>

          <div className="flex flex-col gap-3 px-3 pb-10 pt-1">
            {/* Sale summary card */}
            {loadingSale ? (
              <Skeleton className="h-28 w-full rounded-2xl" />
            ) : summary ? (
              <div className="rounded-2xl bg-gradient-to-br from-accent-500/15 to-primary-500/8 p-4 ring-1 ring-accent-500/20">
                <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  <span className="text-text-secondary">{t('fpOrders.price')}</span>
                  <span className="font-mono text-text-primary">
                    ${(Number(summary.price_usdt_per_token_raw) / 1e6).toFixed(4)} USDT
                  </span>
                  <span className="text-text-secondary">{t('fpOrders.target')}</span>
                  <span className="font-mono text-text-primary">
                    {formatUsdtFromRaw(summary.target_usdt_raw, locale)}
                  </span>
                  <span className="text-text-secondary">{t('fpOrders.raised')}</span>
                  <span className="font-mono font-semibold text-success-400">
                    {formatUsdtFromRaw(summary.raised_usdt_raw, locale)}
                  </span>
                  <span className="text-text-secondary">{t('fpOrders.orderCount')}</span>
                  <span className="font-mono text-text-primary">{totalOrders}</span>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="mb-1 flex justify-between text-[10px] text-text-secondary">
                    <span>{t('fpOrders.progress')}</span>
                    <span className="tabular-nums">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent-500 to-success-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Orders list */}
            <div className="flex items-center gap-2">
              <Users className="size-4 text-text-secondary" />
              <h2 className="text-sm font-semibold">{t('fpOrders.subscriberList')}</h2>
            </div>

            {isPending ? (
              <div className="flex flex-col gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : (orders ?? []).length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <TrendingUp className="size-10 text-text-secondary/30" />
                <p className="text-sm text-text-secondary">{t('fpOrders.empty')}</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-white/8">
                {(orders ?? []).map((o, idx) => (
                  <OrderRow
                    key={o.order_id}
                    order={o}
                    locale={locale}
                    last={idx === (orders ?? []).length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </RequireCreator>
  );
}

function OrderRow({
  order,
  locale,
  last,
}: {
  order: CreatorOrder;
  locale: string;
  last: boolean;
}) {
  const { t } = useTranslation();
  const usdtDisplay = formatUsdtFromRaw(order.usdt_raw, locale);
  const tokenDisplay = (Number(order.token_raw) / 1e9).toLocaleString(locale, {
    maximumFractionDigits: 2,
  });

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3',
        !last && 'border-b border-white/6',
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success-500/15">
        <ArrowDownLeft className="size-4 text-success-400" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xs text-text-primary">
          {order.investor_uid}
        </p>
        <p className="text-[10px] text-text-secondary tabular-nums">
          {formatDateTime(order.created_at, locale)}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums text-success-400">
          {usdtDisplay}
        </p>
        <p className="text-[10px] text-text-secondary tabular-nums">
          {tokenDisplay} {t('fpOrders.tokens')}
        </p>
      </div>
    </div>
  );
}
