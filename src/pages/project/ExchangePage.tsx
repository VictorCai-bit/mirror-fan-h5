import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatPoints } from '@/lib/fmt';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ChevronLeft, Coins } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { RequireInvestor } from '@/routes/guards';

export default function ExchangePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const qc = useQueryClient();
  const [pts, setPts] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const { data: detail } = useQuery({
    queryKey: ['launch', 'on-chain', 'detail', id],
    queryFn: () => apiFetch<{ work_id: number; symbol: string; name: string }>(`/launch/on-chain/detail?project_id=${id}`),
    enabled: !!id,
  });

  const { data: points } = useQuery({
    queryKey: ['user', 'points', detail?.work_id],
    queryFn: () =>
      apiFetch<{ points: number; points_symbol: string }>(`/user/points?work_id=${detail?.work_id ?? 0}`),
    enabled: !!detail?.work_id,
  });

  const m = useMutation({
    mutationFn: () =>
      apiFetch('/rwa/ip-points-to-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: Number(id), points: Number(pts) }),
      }),
    onSuccess: async () => {
      toast.success(t('exchange.success'));
      await qc.invalidateQueries({ queryKey: ['rwa', 'my', 'vesting'] });
      await qc.invalidateQueries({ queryKey: ['user', 'points', detail?.work_id] });
      nav(`/project/${id}/vesting`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  const symbol = detail?.symbol ?? '';
  const pointsSymbol = points?.points_symbol ?? `${symbol}s`;
  const available = points?.points ?? 0;
  const ptsNum = parseInt(pts, 10) || 0;
  const isValid = ptsNum >= 1 && ptsNum <= available;

  return (
    <RequireInvestor>
      <AppShell hideTab>
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex h-12 shrink-0 items-center gap-2 px-2">
            <button type="button" className="rounded-lg p-2 text-text-secondary hover:bg-white/5" onClick={() => nav(-1)}>
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="flex-1 text-base font-semibold">{t('project.exchange')}</h1>
          </div>

          <div className="flex flex-col gap-4 px-3 pb-8 pt-1">
            {/* Balance hero */}
            <div className="rounded-2xl bg-gradient-to-br from-accent-500/20 to-primary-500/10 p-4">
              <div className="flex items-center gap-2">
                <Coins className="size-4 text-accent-400" />
                <p className="text-xs font-medium text-text-secondary">{t('exchange.yourBalance')}</p>
              </div>
              <p className="mt-1 text-3xl font-bold tabular-nums">
                {formatPoints(available, locale)}
              </p>
              <p className="mt-0.5 text-xs font-medium text-accent-400">{pointsSymbol}</p>
            </div>

            {/* Ratio info */}
            <div className="rounded-xl bg-surface px-4 py-3 text-xs text-text-secondary">
              <p className="font-medium text-text-primary">
                1 {pointsSymbol} = 1 {symbol}
              </p>
              <p className="mt-0.5">{t('exchange.ratioNote')}</p>
            </div>

            {/* Exchange flow */}
            <div className="space-y-2">
              {/* From */}
              <div className="rounded-2xl bg-surface p-3">
                <div className="mb-1.5 flex items-center justify-between text-xs text-text-secondary">
                  <span>{t('exchange.from')}</span>
                  <button
                    type="button"
                    className="text-accent-500 font-medium"
                    onClick={() => setPts(String(available))}
                  >
                    MAX {formatPoints(available, locale)}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={pts}
                    onChange={(e) => setPts(e.target.value.replace(/[^0-9]/g, ''))}
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
              <div className="rounded-2xl bg-surface p-3">
                <p className="mb-1.5 text-xs text-text-secondary">{t('exchange.youReceive')}</p>
                <div className="flex items-center gap-2">
                  <p className={cn('flex-1 text-xl font-bold tabular-nums', ptsNum > 0 ? 'text-success-400' : 'text-text-secondary')}>
                    {ptsNum > 0 ? formatPoints(ptsNum, locale) : '0'}
                  </p>
                  <span className="shrink-0 rounded-full bg-success-500/15 px-2.5 py-1 text-xs font-bold text-success-400">
                    {symbol}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-text-secondary">{t('exchange.vestingNote')}</p>
              </div>
            </div>

            {ptsNum > available && available > 0 ? (
              <p className="text-center text-xs text-danger-500">{t('exchange.insufficient')}</p>
            ) : null}

            {!confirmed ? (
              <Button
                disabled={!isValid}
                onClick={() => setConfirmed(true)}
              >
                {t('exchange.review')}
              </Button>
            ) : (
              <div className="rounded-2xl bg-surface p-4 space-y-3">
                <p className="text-sm font-semibold">{t('exchange.confirmTitle')}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">{t('exchange.spend')}</span>
                  <span className="tabular-nums font-medium">{formatPoints(ptsNum, locale)} {pointsSymbol}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">{t('exchange.receive')}</span>
                  <span className="tabular-nums font-medium text-success-400">{formatPoints(ptsNum, locale)} {symbol}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button variant="secondary" onClick={() => setConfirmed(false)}>{t('common.cancel')}</Button>
                  <Button loading={m.isPending} onClick={() => m.mutate()}>{t('exchange.confirm')}</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </RequireInvestor>
  );
}
