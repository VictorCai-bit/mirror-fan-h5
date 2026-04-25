import { AppShell } from '@/components/layout/AppShell';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiFetch, ApiError } from '@/lib/api';
import { formatPoints, formatTokenFromRaw } from '@/lib/fmt';
import { cn } from '@/lib/cn';
import type { LaunchAirdropPhasePublicRow, OnChainDetail, UserVestingEntry } from '@/types/api';
import { useCountdown } from '@/hooks/useCountdown';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Copy,
  CheckCircle2,
  Sparkles,
  Settings2,
  Gift,
  Users,
  UserPlus,
  Lock,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { RequireInvestor } from '@/routes/guards';
import { useUserStore } from '@/stores/useUserStore';

/* ── localStorage helpers for "done today" per-action state ─────────── */
function todayKey(workId: number, action: string) {
  const d = new Date().toISOString().slice(0, 10);
  return `airdrop-done:${workId}:${action}:${d}`;
}
function isDoneToday(workId: number, action: string) {
  return localStorage.getItem(todayKey(workId, action)) === '1';
}
function markDoneToday(workId: number, action: string) {
  localStorage.setItem(todayKey(workId, action), '1');
}

/* ── Team-up BottomSheet ─────────────────────────────────────────────── */
function TeamUpSheet({
  open,
  onClose,
  onSubmit,
  loading,
  pointsSymbol,
  perAmount,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (uid1: string, uid2: string) => void;
  loading: boolean;
  pointsSymbol: string;
  perAmount: number;
}) {
  const { t } = useTranslation();
  const [uid1, setUid1] = useState('');
  const [uid2, setUid2] = useState('');
  return (
    <BottomSheet open={open} onClose={onClose} title={t('airdrop.teamUpTitle')}>
      <div className="space-y-3 pb-4">
        <p className="text-xs text-text-secondary">{t('airdrop.teamUpNote', { n: perAmount, s: pointsSymbol })}</p>
        <div className="space-y-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-text-secondary">{t('airdrop.teamMember1')}</span>
            <Input
              value={uid1}
              onChange={(e) => setUid1(e.target.value.trim())}
              placeholder={t('airdrop.inviteMemberPlaceholder')}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-text-secondary">{t('airdrop.teamMember2')}</span>
            <Input
              value={uid2}
              onChange={(e) => setUid2(e.target.value.trim())}
              placeholder={t('airdrop.inviteMemberPlaceholder')}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            loading={loading}
            disabled={!uid1 || !uid2}
            onClick={() => onSubmit(uid1, uid2)}
          >
            {t('airdrop.teamUpConfirm')}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}

/* ── Main page ──────────────────────────────────────────────────────── */
export default function AirdropPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const qc = useQueryClient();
  const isCreator = useUserStore((s) => s.is_creator_of(Number(id)));

  const [inviteCopied, setInviteCopied] = useState(false);
  const [teamUpOpen, setTeamUpOpen] = useState(false);

  // Per-action "done today" state (re-check on mount)
  const [doneToday, setDoneToday] = useState<Record<string, boolean>>({});
  const workIdRef = useRef<number>(0);

  const { data: detail } = useQuery({
    queryKey: ['launch', 'on-chain', 'detail', id],
    queryFn: () => apiFetch<OnChainDetail>(`/launch/on-chain/detail?project_id=${id}`),
    enabled: !!id,
  });

  const workId = detail?.work_id ?? Number(id);
  const symbol = detail?.symbol ?? '';

  // Sync workId ref + load localStorage done-today flags
  useEffect(() => {
    if (!workId) return;
    workIdRef.current = workId;
    setDoneToday({
      checkin: isDoneToday(workId, 'checkin'),
      invite: isDoneToday(workId, 'invite'),
      team: isDoneToday(workId, 'team'),
    });
  }, [workId]);

  const { data: pointsData, refetch: refetchPoints } = useQuery({
    queryKey: ['user', 'points', workId],
    queryFn: () =>
      apiFetch<{ points: number; points_symbol: string }>(`/user/points?work_id=${workId}`),
    enabled: !!workId,
  });

  const { data: phases } = useQuery({
    queryKey: ['launch', 'airdrop', 'phases', id],
    queryFn: () => apiFetch<LaunchAirdropPhasePublicRow[]>(`/launch/project/${id}/airdrop/phases`),
    enabled: !!id,
  });

  const { data: vestingList } = useQuery({
    queryKey: ['rwa', 'my', 'vesting', id],
    queryFn: () => apiFetch<UserVestingEntry[]>(`/rwa/my/vesting?project_id=${id}`),
    enabled: !!id,
  });

  const activePhase = phases?.find(
    (ph) => ph.timeline_state === 'active' || ph.timeline_state === 'pending',
  ) ?? phases?.[0];

  const countdown = useCountdown(activePhase?.end_at ?? null);
  const pointsSymbol = pointsData?.points_symbol ?? `${symbol}s`;
  const pointsBalance = pointsData?.points ?? 0;

  const distributedPct =
    activePhase
      ? Math.min(100, (activePhase.distributed_points / activePhase.total_points_cap) * 100)
      : 0;

  /* ── Per-action mutations ── */
  function makeAirdropMutation(action: string, delta: number) {
    return useMutation({
      mutationFn: () =>
        apiFetch(`/rwa/airdrop/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ work_id: workId }),
        }),
      onSuccess: async () => {
        markDoneToday(workIdRef.current, action === 'checkin' ? 'checkin' : action === 'invite-claim' ? 'invite' : 'team');
        setDoneToday((p) => ({
          ...p,
          [action === 'checkin' ? 'checkin' : action === 'invite-claim' ? 'invite' : 'team']: true,
        }));
        await refetchPoints();
        await qc.invalidateQueries({ queryKey: ['launch', 'airdrop', 'phases', id] });
        toast.success(`+${delta} ${pointsSymbol} 🎉`);
      },
      onError: (e) => {
        if (e instanceof ApiError && e.code === 4030) {
          toast.info(t('airdrop.alreadyDone'));
          markDoneToday(workIdRef.current, action === 'checkin' ? 'checkin' : action === 'invite-claim' ? 'invite' : 'team');
          setDoneToday((p) => ({ ...p, [action === 'checkin' ? 'checkin' : action === 'invite-claim' ? 'invite' : 'team']: true }));
        } else {
          toast.error(String(e));
        }
      },
    });
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const checkinM = makeAirdropMutation('checkin', activePhase?.daily_sign_amount ?? 5);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const inviteM = makeAirdropMutation('invite-claim', activePhase?.invite_per_day_amount ?? 10);
  const teamUpM = useMutation({
    mutationFn: ({ uid1, uid2 }: { uid1: string; uid2: string }) =>
      apiFetch('/rwa/airdrop/team-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_id: workId, member_uid_1: uid1, member_uid_2: uid2 }),
      }),
    onSuccess: async () => {
      markDoneToday(workIdRef.current, 'team');
      setDoneToday((p) => ({ ...p, team: true }));
      setTeamUpOpen(false);
      await refetchPoints();
      await qc.invalidateQueries({ queryKey: ['launch', 'airdrop', 'phases', id] });
      toast.success(`+${activePhase?.team_per_day_amount ?? 3} ${pointsSymbol} 🎉`);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 4030) {
        toast.info(t('airdrop.alreadyDone'));
        markDoneToday(workIdRef.current, 'team');
        setDoneToday((p) => ({ ...p, team: true }));
        setTeamUpOpen(false);
      } else {
        toast.error(String(e));
      }
    },
  });

  /* ── Copy invite link ── */
  function copyInviteLink() {
    const link = `https://mirror.fan/project/${id ?? ''}?invite=${workId}`;
    void navigator.clipboard.writeText(link).then(() => {
      setInviteCopied(true);
      toast.success(t('airdrop.inviteCopied'));
      setTimeout(() => setInviteCopied(false), 2500);
    });
  }

  /* ── Utility airdrop ── */
  const utilityVesting = vestingList?.filter(
    (v) => v.source === 'ip_points' || v.source === 'airdrop_utility' || v.source === 'exchange_converted',
  ) ?? [];
  const totalUtility = utilityVesting.reduce((s, v) => s + Number(v.amount_raw), 0);
  const claimedUtility = utilityVesting.filter((v) => v.claimed).length;

  return (
    <RequireInvestor>
      <AppShell hideTab>
        <div className="flex flex-1 flex-col overflow-y-auto pb-6">
          {/* Header */}
          <div className="flex h-12 shrink-0 items-center gap-2 px-2">
            <button
              type="button"
              className="rounded-lg p-2 text-text-secondary hover:bg-white/5"
              onClick={() => nav(-1)}
            >
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="flex-1 text-base font-semibold">
              {t('airdrop.ipPoints')} · {symbol}
            </h1>
            {isCreator ? (
              <button
                type="button"
                className="flex items-center gap-1 rounded-full bg-success-500/15 px-3 py-1.5 text-xs text-success-500"
                onClick={() => nav(`/studio/project/${id}/airdrop-phases`)}
              >
                <Settings2 className="size-3.5" />
                {t('airdrop.managePhases')}
              </button>
            ) : null}
          </div>

          {/* ── IP Points Section ── */}
          <section className="mx-3 mt-2 rounded-2xl bg-gradient-to-br from-accent-500/20 to-primary-500/15 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="size-4 text-primary-400" />
              <span className="text-sm font-semibold">{t('airdrop.ipPoints')}</span>
            </div>

            {/* Countdown */}
            {countdown && !countdown.ended ? (
              <div className="mb-3">
                <p className="text-[10px] text-text-secondary">{t('home.countdown')}</p>
                <p className="mt-0.5 font-mono text-3xl font-bold tracking-tight text-primary-400 tabular-nums">
                  {countdown.label}
                </p>
              </div>
            ) : null}

            {/* Progress bar */}
            {activePhase ? (
              <div className="mb-3">
                <div className="mb-1 flex justify-between text-[10px] text-text-secondary">
                  <span>
                    {t('airdrop.progress')}:{' '}
                    <span className="font-medium tabular-nums text-text-primary">
                      {formatPoints(activePhase.distributed_points, locale)} {pointsSymbol}
                    </span>
                  </span>
                  <span className="tabular-nums">
                    {distributedPct.toFixed(1)}% / {formatPoints(activePhase.total_points_cap, locale)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-500 to-primary-500 transition-all"
                    style={{ width: `${distributedPct}%` }}
                  />
                </div>
              </div>
            ) : null}

            {/* Your balance */}
            <div className="mb-4 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">
                {formatPoints(pointsBalance, locale)}
              </span>
              <span className="font-mono text-sm text-text-secondary">{pointsSymbol}</span>
              <span className="text-xs text-text-secondary">{t('airdrop.myBalance')}</span>
            </div>

            {/* Action rows */}
            {activePhase ? (
              <div className="space-y-2">
                {/* Check-in */}
                <ActionButton
                  icon={<CheckCircle2 className="size-4" />}
                  label={t('airdrop.checkin')}
                  reward={`+${activePhase.daily_sign_amount} ${pointsSymbol}`}
                  done={!!doneToday.checkin}
                  loading={checkinM.isPending}
                  color="primary"
                  onClick={() => checkinM.mutate()}
                />

                {/* Invite: copy link */}
                <ActionButton
                  icon={<UserPlus className="size-4" />}
                  label={t('airdrop.invite')}
                  reward={`+${activePhase.invite_per_day_amount} ${pointsSymbol} / ${t('airdrop.inviteCap', { n: activePhase.invite_daily_cap })}`}
                  done={false}
                  loading={inviteCopied}
                  color="accent"
                  doneLabel={t('airdrop.copied')}
                  onClick={copyInviteLink}
                  extraAction={
                    doneToday.invite ? (
                      <span className="text-[10px] text-text-secondary">{t('airdrop.inviteClaimedToday')}</span>
                    ) : (
                      <button
                        type="button"
                        disabled={inviteM.isPending}
                        onClick={() => inviteM.mutate()}
                        className="text-[10px] font-medium text-accent-400 hover:text-accent-300 underline"
                      >
                        {inviteM.isPending ? '…' : t('airdrop.claimInviteReward')}
                      </button>
                    )
                  }
                />

                {/* Team-up */}
                <ActionButton
                  icon={<Users className="size-4" />}
                  label={t('airdrop.team')}
                  reward={`+${activePhase.team_per_day_amount} ${pointsSymbol}`}
                  done={!!doneToday.team}
                  loading={teamUpM.isPending}
                  color="info"
                  onClick={() => setTeamUpOpen(true)}
                />
              </div>
            ) : (
              <div className="rounded-xl bg-white/8 px-3 py-3 text-center text-xs text-text-secondary">
                {t('airdrop.noActivePhase')}
              </div>
            )}

            {/* Promote row */}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={copyInviteLink}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2 text-xs font-medium hover:bg-white/15"
              >
                {inviteCopied ? (
                  <CheckCircle2 className="size-3.5 text-success-400" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {t('airdrop.copyInvite')}
              </button>
              <button
                type="button"
                onClick={() => nav(`/project/${id}/exchange`)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-500 to-primary-500 py-2 text-xs font-bold text-white"
              >
                <Sparkles className="size-3.5" />
                {pointsSymbol} → {symbol}
              </button>
            </div>
          </section>

          {/* ── Utility Airdrop Section ── */}
          <section className="mx-3 mt-3 mb-2 rounded-2xl bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="size-4 text-purple-400" />
                <h2 className="text-sm font-semibold">{t('airdrop.utility')}</h2>
              </div>
              {totalUtility > 0 ? (
                <span className="tabular-nums text-xs text-text-secondary">
                  {formatTokenFromRaw(String(totalUtility), locale, 2)} {symbol}
                </span>
              ) : null}
            </div>

            {/* Unlock rule note */}
            <div className="mb-3 rounded-xl bg-purple-500/8 px-3 py-2">
              <p className="text-[11px] leading-relaxed text-text-secondary">
                {t('airdrop.utilityNote')}
              </p>
              <p className="mt-1 text-[11px] font-medium text-purple-400">
                ⏱ {t('airdrop.utilityCycle')}
              </p>
            </div>

            {utilityVesting.length > 0 ? (
              <>
                <div className="mb-2 flex items-center justify-between text-[10px] text-text-secondary">
                  <span>{t('airdrop.unlockSchedule')}</span>
                  <span>{claimedUtility} / {utilityVesting.length} {t('airdrop.released')}</span>
                </div>
                <div className="space-y-1.5">
                  {utilityVesting.slice(0, 10).map((v, i) => (
                    <VestingRow
                      key={v.id}
                      period={i + 1}
                      amountRaw={v.amount_raw}
                      unlockAt={v.unlock_at}
                      claimed={v.claimed}
                      symbol={symbol}
                      locale={locale}
                    />
                  ))}
                  {utilityVesting.length > 10 ? (
                    <button
                      type="button"
                      className="w-full py-2 text-center text-xs font-medium text-accent-400 hover:text-accent-300"
                      onClick={() => nav(`/project/${id}/vesting`)}
                    >
                      {t('holders.loadMore')} →
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="mt-3 w-full rounded-xl bg-purple-500/15 py-2.5 text-sm font-medium text-purple-400 hover:bg-purple-500/20"
                  onClick={() => nav(`/project/${id}/vesting`)}
                >
                  {t('airdrop.goToVesting')} →
                </button>
              </>
            ) : (
              <div className="space-y-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <PlaceholderRow key={i} period={i + 1} />
                ))}
                <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-xs">
                  <Lock className="size-3.5 shrink-0 text-text-secondary/60" />
                  <p className="text-text-secondary leading-relaxed">
                    {t('airdrop.utilityUnlockHint')}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Team-up BottomSheet */}
        <TeamUpSheet
          open={teamUpOpen}
          onClose={() => setTeamUpOpen(false)}
          onSubmit={(uid1, uid2) => teamUpM.mutate({ uid1, uid2 })}
          loading={teamUpM.isPending}
          pointsSymbol={pointsSymbol}
          perAmount={activePhase?.team_per_day_amount ?? 3}
        />
      </AppShell>
    </RequireInvestor>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function ActionButton({
  icon,
  label,
  reward,
  done,
  loading,
  color,
  doneLabel,
  onClick,
  extraAction,
}: {
  icon: React.ReactNode;
  label: string;
  reward: string;
  done: boolean;
  loading: boolean;
  color: 'primary' | 'accent' | 'info';
  doneLabel?: string;
  onClick: () => void;
  extraAction?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const colorMap = {
    primary: { bg: 'bg-primary-500/12 border-primary-500/25 hover:bg-primary-500/20', text: 'text-primary-400', badge: 'bg-primary-500/20 text-primary-400' },
    accent:  { bg: 'bg-accent-500/12 border-accent-500/25 hover:bg-accent-500/20', text: 'text-accent-400', badge: 'bg-accent-500/20 text-accent-400' },
    info:    { bg: 'bg-info-500/12 border-info-500/25 hover:bg-info-500/20', text: 'text-info-400', badge: 'bg-info-500/20 text-info-400' },
  };
  const c = colorMap[color];

  return (
    <div className={cn('rounded-xl border px-3 py-2.5 transition-all', c.bg, done && 'opacity-70')}>
      <div className="flex items-center gap-2">
        <span className={c.text}>{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium">{label}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', c.badge)}>
              {reward}
            </span>
          </div>
          {extraAction ? <div className="mt-1">{extraAction}</div> : null}
        </div>
        <button
          type="button"
          disabled={done || loading}
          onClick={onClick}
          className={cn(
            'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            done
              ? 'bg-success-500/15 text-success-400'
              : loading
              ? 'bg-white/10 text-text-secondary'
              : cn('text-white', color === 'primary' ? 'bg-primary-500' : color === 'accent' ? 'bg-accent-500' : 'bg-info-500'),
          )}
        >
          {loading ? '…' : done ? (doneLabel ?? t('airdrop.done')) : t('common.go')}
        </button>
      </div>
    </div>
  );
}

function VestingRow({
  period,
  amountRaw,
  unlockAt,
  claimed,
  symbol,
  locale,
}: {
  period: number;
  amountRaw: string;
  unlockAt: number;
  claimed: boolean;
  symbol: string;
  locale: string;
}) {
  const { t } = useTranslation();
  const now = Math.floor(Date.now() / 1000);
  const unlocked = now >= unlockAt;
  const dateStr = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(unlockAt * 1000));

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl px-3 py-2 text-xs',
        claimed ? 'bg-white/5 opacity-55' : unlocked ? 'bg-success-500/10' : 'bg-white/5',
      )}
    >
      <span className="text-text-secondary">{t('airdrop.period', { n: period })}</span>
      <span className="tabular-nums font-medium">
        {formatTokenFromRaw(amountRaw, locale, 2)} {symbol}
      </span>
      <span
        className={cn(
          'text-[10px]',
          claimed ? 'text-success-400' : unlocked ? 'text-success-400' : 'text-text-secondary',
        )}
      >
        {claimed ? `✓ ${t('airdrop.released')}` : unlocked ? t('airdrop.releasable') : dateStr}
      </span>
    </div>
  );
}

function PlaceholderRow({ period }: { period: number }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-xs opacity-40">
      <span className="text-text-secondary">{t('airdrop.period', { n: period })}</span>
      <span className="tabular-nums text-text-secondary">—</span>
      <span className="text-[10px] text-text-secondary">{t('airdrop.locked')}</span>
    </div>
  );
}
