import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/fmt';
import { RequireCreator } from '@/routes/guards';
import type { OnChainDetail, ProjectStatus } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronLeft, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

const FLOW: { key: ProjectStatus; label: string }[] = [
  { key: 'approved', label: 'status.approved' },
  { key: 'on_chaining', label: 'status.on_chaining' },
  { key: 'on_chain', label: 'status.on_chain_coming' },
  { key: 'curve_active', label: 'status.curve_active' },
  { key: 'curve_completed', label: 'status.curve_completed' },
  { key: 'migrating', label: 'status.migrating' },
  { key: 'migrated', label: 'status.migrated' },
];

function stageIdx(s: ProjectStatus): number {
  const i = FLOW.findIndex((x) => x.key === s);
  return i === -1 ? 0 : i;
}

export default function StudioProjectOnChain() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();

  const { data, isPending } = useQuery({
    queryKey: ['launch', 'on-chain', 'detail', id, 'poll'],
    queryFn: () => apiFetch<OnChainDetail>(`/launch/on-chain/detail?project_id=${id}`),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const idx = data ? stageIdx(data.status) : 0;

  return (
    <RequireCreator>
      <AppShell>
        <div className="flex flex-col gap-3 p-3 pb-8">
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg p-2 hover:bg-white/5" onClick={() => nav(-1)}>
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="text-lg font-semibold">{t('studio.onChain')}</h1>
            {data ? <Badge status={data.status}>{t(`status.${data.status}` as const)}</Badge> : null}
          </div>

          <p className="flex items-center gap-1.5 rounded-xl bg-black/20 p-2 text-[11px] text-text-secondary">
            <Loader2 className="size-3 animate-spin" />
            {t('studio2.onchain.polling')}
          </p>

          {isPending || !data ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : (
            <section className="rounded-2xl bg-surface p-4 ring-1 ring-white/10">
              <ol className="flex flex-col gap-3">
                {FLOW.map((s, i) => {
                  const reached = i <= idx;
                  const current = i === idx;
                  return (
                    <li key={s.key} className="flex items-start gap-3">
                      <span
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                          reached ? 'bg-success-500 text-white' : 'bg-white/10 text-text-secondary',
                          current && 'bg-accent-gradient',
                        )}
                      >
                        {reached && !current ? <Check className="size-3.5" /> : i + 1}
                      </span>
                      <p
                        className={cn(
                          'text-sm',
                          reached ? 'text-text-primary' : 'text-text-secondary',
                        )}
                      >
                        {t(s.label as 'common.ok')}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {data ? (
            <section className="rounded-2xl bg-surface p-3 text-sm ring-1 ring-white/10">
              <Row label={t('studio2.onchain.statusLabel')} value={t(`status.${data.status}` as const)} />
              {data.meteora_pool ? (
                <Row label="Meteora Pool" value={data.meteora_pool} mono />
              ) : null}
              {data.curve_start_unix ? (
                <Row
                  label={t('studio2.review.tLOnChaining')}
                  value={formatDateTime(data.curve_start_unix, i18n.language)}
                />
              ) : null}
              {data.curve_deadline_unix ? (
                <Row
                  label={t('studio2.review.tLMigrated')}
                  value={formatDateTime(data.curve_deadline_unix, i18n.language)}
                />
              ) : null}
            </section>
          ) : null}
        </div>
      </AppShell>
    </RequireCreator>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-text-secondary">{label}</span>
      <span
        className={cn(
          'max-w-[60%] truncate text-right text-text-primary',
          mono && 'font-mono text-[11px]',
        )}
      >
        {value}
      </span>
    </div>
  );
}
