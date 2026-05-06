import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatUsdtFromRaw } from '@/lib/fmt';
import type { ProjectStatus, RwaProject } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Flag,
  LayoutGrid,
  PenLine,
  Plus,
  Receipt,
  Tag,
  Upload,
  Vault as VaultIcon,
  Wallet,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

type FilterKey = 'all' | 'draft' | 'review' | 'live';

const FILTER_MATCH: Record<FilterKey, (s: ProjectStatus) => boolean> = {
  all: () => true,
  draft: (s) => s === 'draft' || s === 'rejected',
  review: (s) => s === 'pending_review' || s === 'approved' || s === 'on_chaining',
  live: (s) =>
    s === 'on_chain' || s === 'curve_active' || s === 'curve_completed' || s === 'migrating' || s === 'migrated',
};

export default function StudioHome() {
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'zh-CN';
  const [sp, setSp] = useSearchParams();
  const filter = (sp.get('filter') as FilterKey | null) ?? 'all';

  const { data, isPending } = useQuery({
    queryKey: ['creator', 'my', 'projects'],
    queryFn: () => apiFetch<RwaProject[]>('/creator/my/projects'),
  });

  const { data: vault } = useQuery({
    queryKey: ['creator', 'wallet', 'summary'],
    queryFn: () => apiFetch<{ available_raw: string }>('/creator/wallet/summary'),
  });

  const allProjects = data ?? [];
  const projects = useMemo(
    () => allProjects.filter((p) => FILTER_MATCH[filter](p.status)),
    [allProjects, filter],
  );
  const totalRaiseUsdt = useMemo(() => {
    const sum = allProjects.reduce((acc, p) => acc + BigInt(p.target_financing_micro_usdt || '0'), 0n);
    return formatUsdtFromRaw(sum.toString(), locale);
  }, [allProjects, locale]);
  const vaultAvailable = vault ? formatUsdtFromRaw(vault.available_raw, locale) : formatUsdtFromRaw('0', locale);


  const setFilter = (f: FilterKey) => {
    if (f === 'all') {
      sp.delete('filter');
    } else {
      sp.set('filter', f);
    }
    setSp(sp, { replace: true });
  };

  return (
    <AppShell>
      <div className="flex flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg p-2 text-text-secondary hover:bg-white/5"
              onClick={() => nav('/')}
            >
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="text-lg font-semibold">{t('studio.title')}</h1>
          </div>
          <button
            type="button"
            onClick={() => nav('/studio/new/step1')}
            className="flex items-center gap-1.5 rounded-full bg-accent-gradient px-4 py-2 text-xs font-bold text-white shadow-lg shadow-accent-500/20"
          >
            <Plus className="size-4" />
            {t('studio.newRwa')}
          </button>
        </div>

        <div className="mx-3 mb-3 rounded-2xl bg-gradient-to-br from-accent-500/20 via-primary-500/10 to-transparent p-3 ring-1 ring-accent-500/20">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-secondary">
                {t('studioHome.totalRaise')}
              </p>
              <p className="mt-0.5 font-mono text-lg font-bold text-text-primary">{totalRaiseUsdt}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-secondary">
                {t('studioHome.availableVault')}
              </p>
              <p className="mt-0.5 font-mono text-lg font-bold text-success-500">{vaultAvailable}</p>
            </div>
          </div>
        </div>

        <div className="mx-3 mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => nav('/studio/wallet')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface py-2.5 text-xs font-medium text-text-secondary hover:bg-white/10"
          >
            <Wallet className="size-4 text-accent-500" />
            {t('studio.wallet')}
          </button>
          <button
            type="button"
            onClick={() => nav('/studio/bills')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface py-2.5 text-xs font-medium text-text-secondary hover:bg-white/10"
          >
            <Receipt className="size-4 text-accent-500" />
            {t('studio.bills')}
          </button>
        </div>

        <div className="mx-3 mb-3 flex gap-1.5 overflow-x-auto">
          {(['all', 'draft', 'review', 'live'] as FilterKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition',
                filter === key
                  ? 'bg-accent-gradient text-white shadow-sm shadow-accent-500/30'
                  : 'bg-white/5 text-text-secondary hover:bg-white/10',
              )}
            >
              {t(`studioHome.filter${key === 'all' ? 'All' : key === 'draft' ? 'Draft' : key === 'review' ? 'Review' : 'OnChain'}` as const)}
            </button>
          ))}
        </div>

        <div className="space-y-3 px-3 pb-4">
          {isPending ? (
            <>
              <Skeleton className="h-[160px] w-full rounded-2xl" />
              <Skeleton className="h-[160px] w-full rounded-2xl" />
            </>
          ) : projects.length === 0 ? (
            <EmptyState onNew={() => nav('/studio/new/step1')} />
          ) : (
            projects.map((p) => <ProjectStudioCard key={p.id} project={p} nav={nav} />)
          )}
        </div>
      </div>
    </AppShell>
  );
}

type StatusAction = {
  key: string;
  icon: React.ReactNode;
  route: string;
  variant: 'primary' | 'secondary' | 'warn' | 'success';
};

function useStatusActions(p: RwaProject): StatusAction[] {
  const base = `/studio/project/${p.id}`;
  const { t } = useTranslation();
  switch (p.status) {
    case 'draft':
      return [
        { key: t('studioHome.statusEdit'), icon: <PenLine className="size-3.5" />, route: `${base}`, variant: 'primary' },
        { key: t('studio.submit'), icon: <Upload className="size-3.5" />, route: `${base}/review`, variant: 'secondary' },
      ];
    case 'pending_review':
      return [
        { key: t('studio.review'), icon: <Clock className="size-3.5" />, route: `${base}/review`, variant: 'secondary' },
      ];
    case 'rejected':
      return [
        { key: t('studioHome.statusFix'), icon: <AlertCircle className="size-3.5" />, route: `${base}`, variant: 'warn' },
      ];
    case 'approved':
      return [
        { key: t('studioHome.statusDeposit'), icon: <CheckCircle2 className="size-3.5" />, route: `${base}/deposit`, variant: 'primary' },
      ];
    case 'on_chaining':
      return [
        { key: t('studio.onChain'), icon: <Activity className="size-3.5" />, route: `${base}/on-chain`, variant: 'secondary' },
      ];
    case 'on_chain':
    case 'curve_active':
      return [
        { key: t('studio.airdropPhases'), icon: <Flag className="size-3.5" />, route: `${base}/airdrop-phases`, variant: 'secondary' },
        { key: t('studio.milestone'), icon: <CheckCircle2 className="size-3.5" />, route: `${base}/milestone`, variant: 'secondary' },
        { key: t('studio.progress'), icon: <Activity className="size-3.5" />, route: `${base}/progress`, variant: 'secondary' },
        { key: t('studio.vault'), icon: <VaultIcon className="size-3.5" />, route: `${base}/vault`, variant: 'success' },
      ];
    case 'curve_completed':
    case 'migrating':
    case 'migrated':
      return [
        { key: t('studio.milestone'), icon: <CheckCircle2 className="size-3.5" />, route: `${base}/milestone`, variant: 'secondary' },
        { key: t('studio.reconcile'), icon: <FileText className="size-3.5" />, route: `${base}/reconcile`, variant: 'secondary' },
        { key: t('studio2.fp.title'), icon: <Tag className="size-3.5" />, route: `${base}/fixed-price`, variant: 'secondary' },
        { key: t('studio.vault'), icon: <VaultIcon className="size-3.5" />, route: `${base}/vault`, variant: 'success' },
      ];
    default:
      return [
        { key: t('studioHome.statusView'), icon: <ChevronRight className="size-3.5" />, route: `${base}`, variant: 'secondary' },
      ];
  }
}

const VARIANT_STYLES = {
  primary: 'bg-accent-gradient text-white',
  secondary: 'bg-white/10 text-text-primary hover:bg-white/15',
  warn: 'bg-warn-500/20 text-warn-500 border border-warn-500/30',
  success: 'bg-success-500/20 text-success-500 border border-success-500/30',
};

function ProjectStudioCard({
  project: p,
  nav,
}: {
  project: RwaProject;
  nav: (r: string) => void;
}) {
  const actions = useStatusActions(p);
  const { t } = useTranslation();
  const isOnChainStage =
    p.status === 'on_chain' ||
    p.status === 'curve_active' ||
    p.status === 'curve_completed' ||
    p.status === 'migrating' ||
    p.status === 'migrated';
  const clickTarget = isOnChainStage ? `/studio/project/${p.id}/overview` : `/studio/project/${p.id}`;

  return (
    <div
      className={cn(
        'rounded-2xl bg-surface p-3 ring-1',
        p.status === 'rejected'
          ? 'ring-danger-500/30'
          : p.status === 'curve_active' || p.status === 'migrated'
            ? 'ring-success-500/20'
            : 'ring-white/10',
      )}
    >
      <button
        type="button"
        onClick={() => nav(clickTarget)}
        className="flex w-full gap-3 text-left"
      >
        <img
          src={p.cover_image_url || `https://picsum.photos/seed/${p.id}/80/80`}
          alt=""
          className="size-14 shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <p className="truncate font-semibold leading-tight">
              {p.name || t('studio.wizard.title')}
            </p>
            <Badge status={p.status}>{t(`status.${p.status}` as const)}</Badge>
          </div>
          <p className="font-mono text-[10px] text-text-secondary">{p.symbol || '—'}</p>
          <p className="text-[10px] text-text-secondary">{p.work_type}</p>
          {p.reject_reason ? (
            <p className="mt-0.5 text-[10px] text-danger-500">✗ {p.reject_reason}</p>
          ) : null}
        </div>
      </button>

      {isOnChainStage ? (
        <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl bg-black/20 p-2">
          <Cell label={t('studioHome.cardProgress')} value={`${Math.round((p.progress_bps ?? 0) / 100)}%`} />
          <Cell label={t('studioHome.cardPrice')} value={p.current_price ? `$${Number(p.current_price).toFixed(4)}` : '—'} />
          <Cell label={t('studioHome.cardHolders')} value={String(p.holder_count ?? 0)} />
        </div>
      ) : null}

      {(p.status === 'curve_completed' || p.status === 'migrating' || p.status === 'migrated') ? (
        <button
          type="button"
          onClick={() => nav(`/studio/project/${p.id}/reconcile`)}
          className="mt-2 flex w-full items-center gap-2 rounded-xl bg-info-500/8 px-3 py-2 text-left hover:bg-info-500/15"
        >
          <FileText className="size-3.5 shrink-0 text-info-400" />
          <span className="flex-1 text-[11px] text-info-400">{t('studioHome.reconcileEntry')}</span>
          <ChevronRight className="size-3.5 text-info-400/60" />
        </button>
      ) : null}

      {actions.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => nav(action.route)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all',
                VARIANT_STYLES[action.variant],
              )}
            >
              {action.icon}
              {action.key}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[9px] text-text-secondary/50">ID #{p.id}</span>
        <button
          type="button"
          className="text-[10px] text-accent-500 hover:underline"
          onClick={() => nav(`/project/${p.id}`)}
        >
          {t('studioHome.investorView')} →
        </button>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] text-text-secondary">{label}</p>
      <p className="font-mono text-[11px] font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-accent-500/20 to-primary-500/20 text-3xl">
        <LayoutGrid className="size-8 text-accent-500" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-text-primary">{t('studioHome.emptyTitle')}</p>
        <p className="mt-1 text-xs text-text-secondary">{t('studioHome.emptySub')}</p>
      </div>
      <button
        type="button"
        onClick={onNew}
        className="flex items-center gap-2 rounded-full bg-accent-gradient px-6 py-3 text-sm font-bold text-white shadow-lg shadow-accent-500/20"
      >
        <Plus className="size-4" />
        {t('studio.newRwa')}
      </button>
    </div>
  );
}
