import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/fmt';
import { RequireCreator } from '@/routes/guards';
import type { OnChainDetail, ProjectStatus } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronLeft, Clock } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

const FLOW: { key: ProjectStatus; label: string }[] = [
  { key: 'draft', label: 'studio2.review.tLDraft' },
  { key: 'pending_review', label: 'studio2.review.tLPending' },
  { key: 'approved', label: 'studio2.review.tLApproved' },
  { key: 'on_chaining', label: 'studio2.review.tLOnChaining' },
  { key: 'migrated', label: 'studio2.review.tLMigrated' },
];

function flowIndex(s: ProjectStatus): number {
  if (s === 'rejected') return 1;
  const i = FLOW.findIndex((x) => x.key === s);
  if (i >= 0) return i;
  if (s === 'on_chain' || s === 'curve_active' || s === 'curve_completed') return 3;
  if (s === 'migrating') return 4;
  return 0;
}

export default function StudioProjectReview() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const { data, isPending } = useQuery({
    queryKey: ['launch', 'on-chain', 'detail', id],
    queryFn: () => apiFetch<OnChainDetail>(`/launch/on-chain/detail?project_id=${id}`),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const idx = useMemo(() => (data ? flowIndex(data.status) : 0), [data]);

  return (
    <RequireCreator>
      <AppShell>
        <div className="flex flex-col gap-3 p-3 pb-8">
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg p-2 hover:bg-white/5" onClick={() => nav(-1)}>
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="text-lg font-semibold">{t('studio.review')}</h1>
            {data ? <Badge status={data.status}>{t(`status.${data.status}` as const)}</Badge> : null}
          </div>

          {isPending || !data ? <Skeleton className="h-40 w-full rounded-2xl" /> : null}

          {data ? (
            <section className="rounded-2xl bg-surface p-4 ring-1 ring-white/10">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="size-4 text-text-secondary" />
                <p className="text-xs text-text-secondary">
                  {t('studio2.review.waiting')}
                </p>
              </div>
              <ol className="flex flex-col gap-3">
                {FLOW.map((s, i) => {
                  const reached = i <= idx;
                  const current = i === idx;
                  const isRejectedAt = data.status === 'rejected' && s.key === 'pending_review';
                  return (
                    <li key={s.key} className="flex items-start gap-3">
                      <span
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                          reached ? 'bg-success-500 text-white' : 'bg-white/10 text-text-secondary',
                          current && 'bg-accent-gradient',
                          isRejectedAt && 'bg-danger-500',
                        )}
                      >
                        {reached && !current ? <Check className="size-3.5" /> : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'text-sm',
                            isRejectedAt
                              ? 'text-danger-500'
                              : reached
                                ? 'text-text-primary'
                                : 'text-text-secondary',
                          )}
                        >
                          {isRejectedAt ? t('studio2.review.tLRejected') : t(s.label as 'common.ok')}
                        </p>
                        {isRejectedAt && data.reject_reason ? (
                          <p className="mt-0.5 text-[11px] text-danger-500/80">
                            {data.reject_reason}
                          </p>
                        ) : null}
                      </div>
                      {current && data.curve_start_unix ? (
                        <span className="shrink-0 text-[10px] text-text-secondary">
                          {formatDateTime(data.curve_start_unix, i18n.language)}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}

        </div>
      </AppShell>
    </RequireCreator>
  );
}
