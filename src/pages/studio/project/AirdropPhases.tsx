import { AppShell } from '@/components/layout/AppShell';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { RequireCreator } from '@/routes/guards';
import type { LaunchAirdropPhasePublicRow, OnChainDetail, PhaseDraft } from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, Trash2, Lock, Pencil, Clock, Users, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { formatPoints } from '@/lib/fmt';

/* ── helpers ─────────────────────────────────────────────────────────── */

/** Convert a unix timestamp to datetime-local input value (local time) */
function unixToLocal(unix: number): string {
  if (!unix) return '';
  const d = new Date(unix * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert datetime-local value to unix timestamp */
function localToUnix(val: string): number {
  if (!val) return 0;
  return Math.floor(new Date(val).getTime() / 1000);
}

function defaultDraft(): PhaseDraft {
  const now = Math.floor(Date.now() / 1000);
  return {
    start_at: now + 3600 * 24,
    end_at: now + 86400 * 14,
    daily_sign_amount: 5,
    invite_per_day_amount: 10,
    invite_daily_cap: 10,
    team_per_day_amount: 3,
    team_daily_cap: 1,
    total_points_cap: 1_000_000,
  };
}

function phaseToDraft(ph: LaunchAirdropPhasePublicRow): PhaseDraft {
  return {
    start_at: ph.start_at,
    end_at: ph.end_at,
    daily_sign_amount: ph.daily_sign_amount,
    invite_per_day_amount: ph.invite_per_day_amount,
    invite_daily_cap: ph.invite_daily_cap,
    team_per_day_amount: ph.team_per_day_amount,
    team_daily_cap: ph.team_daily_cap,
    total_points_cap: ph.total_points_cap,
  };
}

/* ── overlap detection ──────────────────────────────────────────────── */
function detectOverlap(
  phases: LaunchAirdropPhasePublicRow[],
  draft: PhaseDraft,
  excludeId?: number,
): number | null {
  for (const ph of phases) {
    if (ph.phase_id === excludeId) continue;
    // Overlap: start < other.end AND end > other.start
    if (draft.start_at < ph.end_at && draft.end_at > ph.start_at) {
      return ph.phase_id;
    }
  }
  return null;
}

/* ── state badge ─────────────────────────────────────────────────────── */
const STATE_CONFIG: Record<string, { cls: string; icon: React.ReactNode }> = {
  pending:   { cls: 'bg-primary-500/15 text-primary-400', icon: <Clock className="size-3" /> },
  active:    { cls: 'bg-accent-500/15 text-accent-400', icon: <CheckCircle2 className="size-3" /> },
  ended:     { cls: 'bg-text-secondary/15 text-text-secondary', icon: <Lock className="size-3" /> },
  exhausted: { cls: 'bg-warning-500/15 text-warning-400', icon: <AlertCircle className="size-3" /> },
};

/* ── PhaseEditorSheet ─────────────────────────────────────────────────── */
function PhaseEditorSheet({
  open,
  onClose,
  draft,
  setDraft,
  onSave,
  loading,
  isNew,
  overlapId,
  symbol,
}: {
  open: boolean;
  onClose: () => void;
  draft: PhaseDraft;
  setDraft: (d: PhaseDraft) => void;
  onSave: () => void;
  loading: boolean;
  isNew: boolean;
  overlapId: number | null;
  symbol: string;
}) {
  const { t, i18n } = useTranslation();
  const set = (p: Partial<PhaseDraft>) => setDraft({ ...draft, ...p });
  const ptsSymbol = symbol ? `${symbol}s` : t('airdropPhases.pointsDefault');
  const validDates = draft.end_at > draft.start_at;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isNew ? t('studio2.phases.addBtn') : t('studio2.phases.edit')}
    >
      <div className="space-y-3 pb-4">
        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-text-secondary">{t('studio2.phases.start')}</span>
            <input
              type="datetime-local"
              className="rounded-xl bg-white/8 px-3 py-2 text-xs text-text-primary outline-none ring-1 ring-white/12 focus:ring-primary-500/60"
              value={unixToLocal(draft.start_at)}
              onChange={(e) => set({ start_at: localToUnix(e.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-text-secondary">{t('studio2.phases.end')}</span>
            <input
              type="datetime-local"
              className="rounded-xl bg-white/8 px-3 py-2 text-xs text-text-primary outline-none ring-1 ring-white/12 focus:ring-primary-500/60"
              value={unixToLocal(draft.end_at)}
              min={unixToLocal(draft.start_at)}
              onChange={(e) => set({ end_at: localToUnix(e.target.value) })}
            />
          </label>
        </div>

        {!validDates ? (
          <p className="text-[11px] text-danger-400">{t('airdropPhases.endAfterStart')}</p>
        ) : overlapId ? (
          <p className="text-[11px] text-warning-400">{t('airdrop.overlap', { n: overlapId })}</p>
        ) : null}

        {/* Divider */}
        <p className="text-[10px] font-medium text-text-secondary">{t('airdropPhases.dailyRewards', { symbol: ptsSymbol })}</p>

        <div className="grid grid-cols-2 gap-2">
          <FieldInput
            label={<span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-primary-400" /> {t('studio2.phases.sign')}</span>}
            value={draft.daily_sign_amount}
            onChange={(v) => set({ daily_sign_amount: v })}
          />
          <FieldInput
            label={<span className="flex items-center gap-1"><UserPlus className="size-3 text-accent-400" /> {t('studio2.phases.inv')}</span>}
            value={draft.invite_per_day_amount}
            onChange={(v) => set({ invite_per_day_amount: v })}
          />
          <FieldInput
            label={t('airdropPhases.inviteCap')}
            value={draft.invite_daily_cap}
            onChange={(v) => set({ invite_daily_cap: v })}
          />
          <FieldInput
            label={<span className="flex items-center gap-1"><Users className="size-3 text-info-400" /> {t('studio2.phases.team')}</span>}
            value={draft.team_per_day_amount}
            onChange={(v) => set({ team_per_day_amount: v })}
          />
          <FieldInput
            label={t('airdropPhases.teamCap')}
            value={draft.team_daily_cap}
            onChange={(v) => set({ team_daily_cap: v })}
          />
          <FieldInput
            label={t('studio2.phases.total')}
            value={draft.total_points_cap}
            onChange={(v) => set({ total_points_cap: v })}
          />
        </div>

        {/* Preview */}
        <div className="rounded-xl bg-white/5 px-3 py-2 text-[11px] text-text-secondary">
          <span className="font-medium text-text-primary">{t('airdropPhases.preview')}</span>{' '}
          {t('airdropPhases.previewLine', {
            sign: draft.daily_sign_amount,
            inv: draft.invite_per_day_amount,
            invCap: draft.invite_daily_cap,
            team: draft.team_per_day_amount,
            total: formatPoints(draft.total_points_cap, i18n.language),
            sym: ptsSymbol,
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            loading={loading}
            disabled={!validDates || !!overlapId}
            onClick={onSave}
          >
            {t('studio2.phases.save')}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}

function FieldInput({
  label,
  value,
  onChange,
}: {
  label: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-text-secondary">{label}</span>
      <Input
        type="number"
        className="text-xs"
        value={String(value)}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
      />
    </label>
  );
}

/* ── Main page ───────────────────────────────────────────────────────── */
export default function StudioProjectAirdropPhases() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const qc = useQueryClient();

  const { data: detail } = useQuery({
    queryKey: ['launch', 'on-chain', 'detail', id],
    queryFn: () => apiFetch<OnChainDetail>(`/launch/on-chain/detail?project_id=${id}`),
    enabled: !!id,
  });
  const symbol = detail?.symbol ?? '';

  const { data, isPending } = useQuery({
    queryKey: ['launch', 'airdrop', 'phases', id],
    queryFn: () => apiFetch<LaunchAirdropPhasePublicRow[]>(`/launch/project/${id}/airdrop/phases`),
    enabled: !!id,
  });
  const phases = data ?? [];

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editPhaseId, setEditPhaseId] = useState<number | null>(null);
  const [draft, setDraft] = useState<PhaseDraft>(defaultDraft());

  const refresh = () => qc.invalidateQueries({ queryKey: ['launch', 'airdrop', 'phases', id] });

  const overlapId = sheetOpen ? detectOverlap(phases, draft, editPhaseId ?? undefined) : null;

  function openCreate() {
    setDraft(defaultDraft());
    setEditPhaseId(null);
    setSheetOpen(true);
  }

  function openEdit(ph: LaunchAirdropPhasePublicRow) {
    setDraft(phaseToDraft(ph));
    setEditPhaseId(ph.phase_id);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditPhaseId(null);
  }

  const createM = useMutation({
    mutationFn: (d: PhaseDraft) =>
      apiFetch(`/launch/project/${id}/airdrop/phases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
      }),
    onSuccess: async () => {
      await refresh();
      toast.success(t('studio2.phases.saved'));
      closeSheet();
    },
    onError: (e) => handleApiErr(e, t),
  });

  const updateM = useMutation({
    mutationFn: ({ phaseId, d }: { phaseId: number; d: PhaseDraft }) =>
      apiFetch(`/launch/project/${id}/airdrop/phases/${phaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
      }),
    onSuccess: async () => {
      await refresh();
      toast.success(t('studio2.phases.saved'));
      closeSheet();
    },
    onError: (e) => handleApiErr(e, t),
  });

  const deleteM = useMutation({
    mutationFn: (phaseId: number) =>
      apiFetch(`/launch/project/${id}/airdrop/phases/${phaseId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await refresh();
      toast.success(t('airdropPhases.deleted'));
    },
    onError: (e) => handleApiErr(e, t),
  });

  function handleSave() {
    if (editPhaseId != null) {
      updateM.mutate({ phaseId: editPhaseId, d: draft });
    } else {
      createM.mutate(draft);
    }
  }

  const savePending = createM.isPending || updateM.isPending;

  return (
    <RequireCreator>
      <AppShell hideTab>
        <div className="flex flex-1 flex-col overflow-y-auto pb-8">
          {/* Header */}
          <div className="flex h-12 shrink-0 items-center gap-2 px-2">
            <button type="button" className="rounded-lg p-2 text-text-secondary hover:bg-white/5" onClick={() => nav(-1)}>
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="flex-1 text-base font-semibold">
              {t('studio.airdropPhases')} · {symbol}
            </h1>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-1 rounded-full bg-primary-500/15 px-3 py-1.5 text-xs font-medium text-primary-400 hover:bg-primary-500/25"
            >
              <Plus className="size-3.5" />
              {t('studio2.phases.addBtn')}
            </button>
          </div>

          <div className="flex flex-col gap-2 px-3 pt-1">
            {isPending ? (
              <Skeleton className="h-24 w-full rounded-2xl" />
            ) : phases.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="flex size-14 items-center justify-center rounded-full bg-white/8">
                  <Sparkle className="size-6 text-text-secondary/60" />
                </div>
                <p className="text-sm text-text-secondary">{t('airdropPhases.empty')}</p>
                <Button onClick={openCreate}>
                  <Plus className="mr-1.5 size-4" />
                  {t('studio2.phases.addBtn')}
                </Button>
              </div>
            ) : (
              phases.map((ph) => {
                const editable = ph.timeline_state === 'pending';
                const stateCfg = (STATE_CONFIG[ph.timeline_state] ?? STATE_CONFIG.ended)!;
                const stateLabel = t(`airdropPhases.state.${ph.timeline_state}`, {
                  defaultValue: ph.timeline_state,
                });
                const distributedPct = ph.total_points_cap > 0
                  ? Math.min(100, (ph.distributed_points / ph.total_points_cap) * 100)
                  : 0;
                const startDate = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ph.start_at * 1000));
                const endDate = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ph.end_at * 1000));

                return (
                  <div
                    key={ph.phase_id}
                    className={cn(
                      'rounded-2xl bg-surface p-3 ring-1',
                      ph.timeline_state === 'active' ? 'ring-accent-500/30' : 'ring-white/8',
                    )}
                  >
                    {/* Top row */}
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-text-secondary">#{ph.phase_id}</span>
                          <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', stateCfg.cls)}>
                            {stateCfg.icon}
                            {stateLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-text-secondary">
                          {startDate} → {endDate}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        {editable ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(ph)}
                              className="flex size-7 items-center justify-center rounded-lg bg-white/8 text-text-secondary hover:bg-white/14"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={deleteM.isPending}
                              onClick={() => {
                                if (confirm(String(t('studio2.phases.deleteConfirm')))) {
                                  deleteM.mutate(ph.phase_id);
                                }
                              }}
                              className="flex size-7 items-center justify-center rounded-lg bg-danger-500/15 text-danger-400 hover:bg-danger-500/25"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-text-secondary">
                            <Lock className="size-3" />
                            {ph.timeline_state === 'active' ? t('studio2.phases.lockedRunning') : t('studio2.phases.readOnly')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="mb-2 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-white/5 px-2 py-1.5">
                        <p className="text-[10px] text-text-secondary">{t('airdropPhases.listSign')}</p>
                        <p className="font-semibold tabular-nums">+{ph.daily_sign_amount}</p>
                      </div>
                      <div className="rounded-lg bg-white/5 px-2 py-1.5">
                        <p className="text-[10px] text-text-secondary">{t('airdropPhases.listInvite', { n: ph.invite_daily_cap })}</p>
                        <p className="font-semibold tabular-nums">+{ph.invite_per_day_amount}</p>
                      </div>
                      <div className="rounded-lg bg-white/5 px-2 py-1.5">
                        <p className="text-[10px] text-text-secondary">{t('airdropPhases.listTeam')}</p>
                        <p className="font-semibold tabular-nums">+{ph.team_per_day_amount}</p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="mb-1 flex justify-between text-[10px] text-text-secondary">
                        <span>{t('studio2.phases.total')}</span>
                        <span className="tabular-nums">
                          {formatPoints(ph.distributed_points, locale)} / {formatPoints(ph.total_points_cap, locale)}
                          <span className="ml-1 text-text-primary">({distributedPct.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={cn('h-full rounded-full transition-all', ph.timeline_state === 'active' ? 'bg-accent-500' : 'bg-white/30')}
                          style={{ width: `${distributedPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Create / Edit sheet */}
        <PhaseEditorSheet
          open={sheetOpen}
          onClose={closeSheet}
          draft={draft}
          setDraft={setDraft}
          onSave={handleSave}
          loading={savePending}
          isNew={editPhaseId == null}
          overlapId={overlapId}
          symbol={symbol}
        />
      </AppShell>
    </RequireCreator>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function handleApiErr(
  e: unknown,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  if (e instanceof ApiError) {
    if (e.code === 4012) toast.error(t('errors.4012'));
    else if (e.code === 4010) toast.error(t('studio2.phases.minWindow'));
    else toast.error(e.msg);
  } else {
    toast.error(String(e));
  }
}

function Sparkle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  );
}
