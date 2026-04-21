import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { RequireCreator } from '@/routes/guards';
import type { MilestoneNodeStatus, MilestoneProjectNode } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

const STATUS_STYLE: Record<MilestoneNodeStatus, string> = {
  empty: 'bg-white/5 text-text-secondary',
  submitted: 'bg-accent-500/15 text-accent-500',
  pending_review: 'bg-warn-500/15 text-warn-500',
  rejected: 'bg-danger-500/15 text-danger-500',
  approved: 'bg-info-500/15 text-info-500',
  public_display: 'bg-primary-500/15 text-primary-500',
  claimable: 'bg-success-500/15 text-success-500',
  unlocked: 'bg-success-500/25 text-success-500',
};

const STATUS_KEY: Record<MilestoneNodeStatus, string> = {
  empty: 'milestoneNode.statusEmpty',
  submitted: 'milestoneNode.statusSubmitted',
  pending_review: 'milestoneNode.statusPending',
  rejected: 'milestoneNode.statusRejected',
  approved: 'milestoneNode.statusApproved',
  public_display: 'milestoneNode.statusPublic',
  claimable: 'milestoneNode.statusClaimable',
  unlocked: 'milestoneNode.statusUnlocked',
};

export default function StudioMilestoneList() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();

  const { data, isPending } = useQuery({
    queryKey: ['rwa', 'project', 'milestones', id],
    queryFn: () => apiFetch<MilestoneProjectNode[]>(`/rwa/project/${id}/milestones`),
    enabled: !!id,
  });

  return (
    <RequireCreator>
      <AppShell>
        <div className="flex flex-col gap-3 p-3 pb-8">
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg p-2 hover:bg-white/5" onClick={() => nav(-1)}>
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="text-lg font-semibold">{t('studio.milestone')}</h1>
          </div>

          <p className="rounded-xl bg-black/20 p-2 text-[11px] text-text-secondary">
            {t('studio2.milestone.autoNode1')}
          </p>

          {isPending ? <Skeleton className="h-64 w-full rounded-2xl" /> : null}

          <div className="grid grid-cols-2 gap-2">
            {(data ?? []).map((n) => {
              const locked = n.node_index === 1;
              const statusCls = STATUS_STYLE[n.status] ?? STATUS_STYLE.empty;
              return (
                <button
                  key={n.node_index}
                  type="button"
                  disabled={locked}
                  onClick={() => nav(`/studio/project/${id}/milestone/${n.node_index}`)}
                  className={cn(
                    'flex flex-col gap-2 rounded-2xl p-3 text-left ring-1 ring-white/10 transition',
                    locked
                      ? 'cursor-not-allowed bg-white/5 opacity-60'
                      : 'bg-surface hover:ring-accent-500/40',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-text-secondary">
                      #{n.node_index}
                    </span>
                    <span className="font-mono text-[10px] text-accent-500">{n.bps} bps</span>
                  </div>
                  <p className="line-clamp-2 text-xs font-medium text-text-primary">{n.title}</p>
                  <span className={cn('self-start rounded-full px-2 py-0.5 text-[10px]', statusCls)}>
                    {t(STATUS_KEY[n.status] as 'common.ok')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </AppShell>
    </RequireCreator>
  );
}
