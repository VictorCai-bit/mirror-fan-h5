import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError, apiFetch } from '@/lib/api';
import type { AdminFixedPriceSaleRow, FixedPriceOrderRow } from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';
import { RequireInvestor } from '@/routes/guards';

export default function FixedPriceSaleDetailPage() {
  const { saleId } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [usdt, setUsdt] = useState('500');

  const { data: sale } = useQuery({
    queryKey: ['rwa', 'fixed-price', 'sale', saleId],
    queryFn: () => apiFetch<AdminFixedPriceSaleRow>(`/rwa/fixed-price/sales/${saleId}`),
    enabled: !!saleId,
  });

  const { data: orders } = useQuery({
    queryKey: ['rwa', 'fixed-price', 'orders', saleId],
    queryFn: () => apiFetch<FixedPriceOrderRow[]>(`/rwa/fixed-price/sales/${saleId}/orders`),
    enabled: !!saleId,
  });

  const sub = useMutation({
    mutationFn: async () => {
      const raw = String(Math.round(Number(usdt) * 1e6));
      const prev = await apiFetch<unknown>(`/rwa/fixed-price/sales/${saleId}/subscribe/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usdt_raw: raw }),
      });
      void prev;
      return apiFetch(`/rwa/fixed-price/sales/${saleId}/subscribe/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usdt_raw: raw, client_order_id: nanoid() }),
      });
    },
    onSuccess: async () => {
      toast.success(t('trade.filled'));
      await qc.invalidateQueries({ queryKey: ['rwa', 'fixed-price', 'orders', saleId] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  return (
    <RequireInvestor>
      <AppShell>
        <div className="flex flex-col gap-3 p-3">
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg p-2 hover:bg-white/5" onClick={() => nav(-1)}>
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="text-lg font-semibold">{sale?.symbol ?? '…'}</h1>
          </div>
          <Input value={usdt} onChange={(e) => setUsdt(e.target.value)} />
          <Button loading={sub.isPending} onClick={() => sub.mutate()}>
            {t('fp.subscribe')}
          </Button>
          <p className="text-sm font-medium">{t('fp.orders')}</p>
          <div className="space-y-1 text-xs">
            {(orders ?? []).map((o) => (
              <div key={o.order_id} className="rounded-lg bg-surface p-2 tabular-nums">
                {o.order_id}: {o.usdt_raw}
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    </RequireInvestor>
  );
}
