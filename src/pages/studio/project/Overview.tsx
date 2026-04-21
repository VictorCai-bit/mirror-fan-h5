import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { OnChainDetail, ProjectStatus } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Flag,
  Tag,
  Vault as VaultIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { RequireCreator } from '@/routes/guards';

const TIMELINE: ProjectStatus[] = [
  'draft',
  'pending_review',
  'approved',
  'on_chaining',
  'on_chain',
  'curve_active',
  'migrated',
];

export default function StudioProjectOverview() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();

  const { data: p, isPending } = useQuery({
    queryKey: ['launch', 'on-chain', 'detail', id],
    queryFn: () => apiFetch<OnChainDetail>(`/launch/on-chain/detail?project_id=${id}`),
    enabled: !!id,
  });

  const tabs: { key: keyof typeof TAB_ROUTES; label: string; icon: React.ReactNode }[] = [
    { key: 'phase', label: t('studio2.overview.tabPhase'), icon: <Flag className="size-4" /> },
    { key: 'milestone', label: t('studio2.overview.tabMilestone'), icon: <CheckCircle2 className="size-4" /> },
    { key: 'progress', label: t('studio2.overview.tabProgress'), icon: <Activity className="size-4" /> },
    { key: 'reconcile', label: t('studio2.overview.tabReconcile'), icon: <FileText className="size-4" /> },
    { key: 'fp', label: t('studio2.overview.tabFp'), icon: <Tag className="size-4" /> },
    { key: 'vault', label: t('studio2.overview.tabVault'), icon: <VaultIcon className="size-4" /> },
  ];

  const go = (tab: keyof typeof TAB_ROUTES) => nav(`/studio/project/${id}${TAB_ROUTES[tab]}`);

  return (
    <RequireCreator>
      <AppShell>
        <div className="flex flex-col gap-3 p-3 pb-8">
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg p-2 hover:bg-white/5" onClick={() => nav('/studio')}>
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="text-lg font-semibold">{p?.name ?? '—'}</h1>
          </div>

          {isPending || !p ? (
            <Skeleton className="h-44 w-full rounded-2xl" />
          ) : (
            <div className="flex gap-3 rounded-2xl bg-surface p-3 ring-1 ring-white/10">
              <img
                src={p.cover_image_url || `https://picsum.photos/seed/${p.id}/120/120`}
                alt=""
                className="size-20 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="font-mono text-[11px] text-text-secondary">{p.symbol}</p>
                  </div>
                  <Badge status={p.status}>{t(`status.${p.status}` as const)}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-text-secondary">
                  <span>
                    {t('studio2.overview.depositStatus')}: <span className="text-text-primary">{p.deposit_status}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {p ? (
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-black/20 p-2">
              <Cell label={t('studio2.overview.progress')} value={`${Math.round((p.progress_bps ?? 0) / 100)}%`} />
              <Cell label={t('studio2.overview.price')} value={p.current_price ? `$${Number(p.current_price).toFixed(4)}` : '—'} />
              <Cell label={t('studio2.overview.holders')} value={String(p.holder_count ?? 0)} />
            </div>
          ) : null}

          {p ? (
            <div className="rounded-2xl bg-surface p-3 ring-1 ring-white/10">
              <p className="mb-2 text-[11px] font-semibold text-text-secondary">
                {t('studio2.overview.timeline')}
              </p>
              <Timeline current={p.status} />
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => go(tab.key)}
                className="flex items-center gap-2 rounded-2xl bg-surface p-3 text-left ring-1 ring-white/10 transition hover:bg-white/5"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-accent-500/15 text-accent-500">
                  {tab.icon}
                </span>
                <span className="flex-1 text-sm font-medium text-text-primary">{tab.label}</span>
                <ChevronRight className="size-4 text-text-secondary" />
              </button>
            ))}
          </div>
        </div>
      </AppShell>
    </RequireCreator>
  );
}

const TAB_ROUTES = {
  phase: '/airdrop-phases',
  milestone: '/milestone',
  progress: '/progress',
  reconcile: '/reconcile',
  fp: '/fixed-price',
  vault: '/vault',
} as const;

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] text-text-secondary">{label}</p>
      <p className="font-mono text-xs font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function Timeline({ current }: { current: ProjectStatus }) {
  const { t } = useTranslation();
  const idx = Math.max(0, TIMELINE.indexOf(current));
  return (
    <div className="flex items-center gap-1">
      {TIMELINE.map((s, i) => (
        <div key={s} className="flex min-w-0 flex-1 items-center gap-1">
          <div
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold',
              i < idx
                ? 'bg-success-500 text-white'
                : i === idx
                  ? 'bg-accent-gradient text-white'
                  : 'bg-white/10 text-text-secondary',
            )}
          >
            {i + 1}
          </div>
          {i < TIMELINE.length - 1 ? (
            <div className={cn('h-0.5 flex-1 rounded-full', i < idx ? 'bg-success-500' : 'bg-white/10')} />
          ) : (
            <span className="shrink-0 text-[9px] text-text-secondary">
              {t(`status.${current}` as const)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
