import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { AirdropPanel } from '@/pages/studio/new/_panels/AirdropPanel';
import { BasicsPanel } from '@/pages/studio/new/_panels/BasicsPanel';
import { EconomicsPanel } from '@/pages/studio/new/_panels/EconomicsPanel';
import { MilestonePreviewPanel } from '@/pages/studio/new/_panels/MilestonePreviewPanel';
import { RequireCreator } from '@/routes/guards';
import type { NewProjectDraft, OnChainDetail, ProjectStatus } from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

type TabKey = 'basic' | 'econ' | 'air' | 'ms';

const EDITABLE_STATUS: ProjectStatus[] = ['draft', 'rejected'];

function projectToDraft(p: OnChainDetail): NewProjectDraft {
  const now = Math.floor(Date.now() / 1000);
  return {
    localId: `p-${p.id}`,
    work_id: p.work_id,
    work_type: p.work_type,
    name: p.name,
    symbol: p.symbol,
    description: p.description ?? '',
    cover_image_url: p.cover_image_url ?? '',
    language: p.language,
    target_financing_micro_usdt: p.target_financing_micro_usdt,
    ip_revenue_rights_valuation_micro_usdt: p.ip_revenue_rights_valuation_micro_usdt,
    fundraising_fraction_bps: p.fundraising_fraction_bps,
    airdrop_fraction_bps: p.airdrop_fraction_bps,
    initial_airdrop_phase: p.airdrop_phase
      ? {
          phase_id: p.airdrop_phase.phase_id,
          start_at: p.airdrop_phase.start_at,
          end_at: p.airdrop_phase.end_at,
          daily_sign_amount: p.airdrop_phase.daily_sign_amount,
          invite_per_day_amount: p.airdrop_phase.invite_per_day_amount,
          invite_daily_cap: p.airdrop_phase.invite_daily_cap,
          team_per_day_amount: p.airdrop_phase.team_per_day_amount,
          team_daily_cap: p.airdrop_phase.team_daily_cap,
          total_points_cap: p.airdrop_phase.total_points_cap,
        }
      : {
          start_at: now + 3600,
          end_at: now + 86400 * 14,
          daily_sign_amount: 5,
          invite_per_day_amount: 10,
          invite_daily_cap: 10,
          team_per_day_amount: 1,
          team_daily_cap: 3,
          total_points_cap: 1_000_000,
        },
    step: 5,
    updatedAt: Date.now(),
  };
}

export default function StudioProjectEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [tab, setTab] = useState<TabKey>('basic');
  const [form, setForm] = useState<NewProjectDraft | null>(null);

  const { data, isPending } = useQuery({
    queryKey: ['launch', 'on-chain', 'detail', id],
    queryFn: () => apiFetch<OnChainDetail>(`/launch/on-chain/detail?project_id=${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (data && !form) setForm(projectToDraft(data));
  }, [data, form]);

  const editable = useMemo(
    () => !!data && EDITABLE_STATUS.includes(data.status),
    [data],
  );

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      await apiFetch(`/launch/project/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          cover_image_url: form.cover_image_url,
          language: form.language,
          target_financing_micro_usdt: form.target_financing_micro_usdt,
          ip_revenue_rights_valuation_micro_usdt: form.ip_revenue_rights_valuation_micro_usdt,
          fundraising_fraction_bps: form.fundraising_fraction_bps,
          airdrop_fraction_bps: form.airdrop_fraction_bps,
        }),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['launch', 'on-chain', 'detail', id] });
      await qc.invalidateQueries({ queryKey: ['creator', 'my', 'projects'] });
      toast.success(t('common.ok'));
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  const submit = useMutation({
    mutationFn: () =>
      apiFetch(`/launch/project/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmations: { rules: true } }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['launch', 'on-chain', 'detail', id] });
      await qc.invalidateQueries({ queryKey: ['creator', 'my', 'projects'] });
      toast.success(t('studio.submit'));
      nav(`/studio/project/${id}/review`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'basic', label: t('studio2.edit.tabBasic') },
    { key: 'econ', label: t('studio2.edit.tabEcon') },
    { key: 'air', label: t('studio2.edit.tabAir') },
    { key: 'ms', label: t('studio2.edit.tabMs') },
  ];

  return (
    <RequireCreator>
      <AppShell>
        <div className="flex flex-col gap-3 p-3 pb-8">
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg p-2 hover:bg-white/5" onClick={() => nav('/studio')}>
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="text-lg font-semibold">{t('studio.edit')}</h1>
            {data ? <Badge status={data.status}>{t(`status.${data.status}` as const)}</Badge> : null}
          </div>

          {data?.status === 'rejected' && data.reject_reason ? (
            <div className="flex items-start gap-2 rounded-xl bg-danger-500/15 p-3 text-xs text-danger-500 ring-1 ring-danger-500/30">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>{t('studio2.edit.rejectBanner', { reason: data.reject_reason })}</p>
            </div>
          ) : null}

          {!editable && data ? (
            <p className="rounded-xl bg-warn-500/10 p-2 text-center text-xs text-warn-500">
              {t('studio2.edit.immutable')}
            </p>
          ) : null}

          <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-black/20 p-1">
            {tabs.map((x) => (
              <button
                key={x.key}
                type="button"
                onClick={() => setTab(x.key)}
                className={cn(
                  'flex-1 rounded-xl px-3 py-1.5 text-xs font-medium transition',
                  tab === x.key
                    ? 'bg-accent-gradient text-white shadow'
                    : 'text-text-secondary hover:bg-white/5',
                )}
              >
                {x.label}
              </button>
            ))}
          </div>

          {isPending || !form ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : (
            <div className="flex flex-col gap-3">
              {tab === 'basic' ? (
                <BasicsPanel
                  value={form}
                  disabled={!editable}
                  onChange={(patch) => setForm((f) => (f ? { ...f, ...patch } : f))}
                />
              ) : null}
              {tab === 'econ' ? (
                <EconomicsPanel
                  value={form}
                  disabled={!editable}
                  onChange={(patch) => setForm((f) => (f ? { ...f, ...patch } : f))}
                />
              ) : null}
              {tab === 'air' ? (
                <AirdropPanel
                  value={form}
                  symbol={form.symbol || 'IP'}
                  disabled={!editable}
                  onChange={(patch) => setForm((f) => (f ? { ...f, ...patch } : f))}
                />
              ) : null}
              {tab === 'ms' ? <MilestonePreviewPanel workType={form.work_type ?? 'Fiction'} /> : null}
            </div>
          )}

          {editable ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" loading={save.isPending} onClick={() => save.mutate()}>
                {t('studio2.edit.save')}
              </Button>
              <Button loading={submit.isPending} onClick={() => submit.mutate()}>
                {t('studio2.edit.submit')}
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => nav(`/studio/project/${id}/overview`)}>
              {t('studioHome.statusView')}
            </Button>
          )}
        </div>
      </AppShell>
    </RequireCreator>
  );
}
