import { AppShell } from '@/components/layout/AppShell';
import { KLineChart } from '@/components/chart/KLineChart';
import { apiFetch } from '@/lib/api';
import type { Candle, OnChainTradeRow } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;

export default function KlinePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const [iv, setIv] = useState<(typeof INTERVALS)[number]>('1h');

  const { data: candles } = useQuery({
    queryKey: ['launch', 'kline', id, iv],
    queryFn: () => apiFetch<Candle[]>(`/launch/kline?project_id=${id}&interval=${iv}&limit=48`),
    enabled: !!id,
  });

  const { data: trades } = useQuery({
    queryKey: ['launch', 'trades', id],
    queryFn: () => apiFetch<OnChainTradeRow[]>(`/launch/on-chain/trades?project_id=${id}&limit=30`),
    enabled: !!id,
  });

  return (
    <AppShell>
      <div className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-lg p-2 hover:bg-white/5" onClick={() => nav(-1)}>
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="text-lg font-semibold">{t('project.kline')}</h1>
        </div>
        <div className="flex flex-wrap gap-1">
          {INTERVALS.map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setIv(x)}
              className={`rounded-full px-2 py-1 text-[10px] ${
                iv === x ? 'bg-primary-500/30 text-primary-500' : 'bg-surface text-text-secondary'
              }`}
            >
              {x}
            </button>
          ))}
        </div>
        {candles ? <KLineChart data={candles} /> : null}
        <div className="max-h-48 overflow-y-auto rounded-xl bg-surface p-2 text-xs">
          {(trades ?? []).map((tr, i) => (
            <div key={i} className="flex justify-between border-b border-white/5 py-1 tabular-nums">
              <span>{tr.side}</span>
              <span>{tr.price_raw}</span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
