import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { CoBuilderLayout } from '@/pages/co-builder/CoBuilderLayout';
import { EntClaimSheet } from '@/components/co-builder/EntClaimSheet';
import { LevelBadge } from '@/components/co-builder/LevelBadge';
import { StatTile } from '@/components/co-builder/StatTile';
import { levelToken } from '@/components/co-builder/levelTokens';
import { apiFetch } from '@/lib/api';
import { tTierName, tTierTag } from '@/lib/coBuilderDisplay';
import { cn } from '@/lib/cn';
import { shortenAddress } from '@/lib/fmt';
import { useUserStore } from '@/stores/useUserStore';
import { useUIStore } from '@/stores/useUIStore';
import type { MemberSummary } from '@/types/coBuilder';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, Coins, Plus, Wallet2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface MemberSummaryWithFlags extends MemberSummary {
  has_floating: boolean;
  has_identity: boolean;
}

export default function MemberCenterPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const logged = useUserStore((s) => s.is_logged_in());
  const setSheet = useUIStore((s) => s.setBottomSheet);
  const [claimOpen, setClaimOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['co-builder', 'member', 'my'],
    queryFn: () => apiFetch<MemberSummaryWithFlags>('/co-builder/member/my'),
    enabled: logged,
  });

  if (!logged) {
    return (
      <CoBuilderLayout>
        <EmptyState onCta={() => setSheet('connect')} cta={t('coBuilder.hero.connectFirst')} />
      </CoBuilderLayout>
    );
  }

  if (isLoading || !data) {
    return (
      <CoBuilderLayout>
        <div className="space-y-3 px-3 pb-12 pt-1">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
      </CoBuilderLayout>
    );
  }

  if (data.level === 'none') {
    return (
      <CoBuilderLayout>
        <EmptyState onCta={() => nav('/co-builder/buy')} cta={t('coBuilder.member.empty.cta')} />
      </CoBuilderLayout>
    );
  }

  return (
    <CoBuilderLayout>
      <div className="space-y-4 px-3 pb-12 pt-1">
        <LevelHeroCard data={data} />
        <LevelProgressCard data={data} />
        <ContributionBreakdownCard data={data} onAddBase={() => nav('/co-builder/buy')} />
        <EntPanel data={data} onClaim={() => setClaimOpen(true)} />
        <EarningsTimeline data={data} />
      </div>

      <EntClaimSheet
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        claimable={data.ent.claimable}
        walletAddress={data.wallet_address}
      />
    </CoBuilderLayout>
  );
}

function EmptyState({ onCta, cta }: { onCta: () => void; cta: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-accent-gradient text-white shadow-2xl">
        <Coins className="size-8" />
      </span>
      <h3 className="text-base font-bold text-text-primary">{t('coBuilder.member.empty.title')}</h3>
      <p className="max-w-[260px] text-xs text-text-secondary">{t('coBuilder.member.empty.body')}</p>
      <Button variant="primary" onClick={onCta} className="mt-2">
        {cta}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

function LevelHeroCard({ data }: { data: MemberSummaryWithFlags }) {
  const { t } = useTranslation();
  const tk = levelToken(data.level);
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-white/8 bg-elevated/85 p-4',
        tk.glow,
      )}
    >
      <div className={cn('pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br', tk.gradient)} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-text-secondary">
            {t('coBuilder.member.level')}
          </p>
          <h2 className={cn('mt-1 text-xl font-extrabold', tk.text)}>{tTierName(data.level, t)}</h2>
          {data.wallet_address ? (
            <p className="mt-1 font-mono text-[11px] text-text-secondary">
              {shortenAddress(data.wallet_address)}
            </p>
          ) : null}
        </div>
        <LevelBadge level={data.level} label={tTierTag(data.level, t)} size="md" />
      </div>
    </div>
  );
}

function LevelProgressCard({ data }: { data: MemberSummaryWithFlags }) {
  const { t } = useTranslation();
  const noNext = data.next_level == null;

  if (noNext) {
    return (
      <div className="rounded-3xl border border-white/8 bg-surface/85 p-4">
        <p className="text-sm font-bold">{t('coBuilder.member.upgradeMaxed')}</p>
        <p className="mt-1 text-[11px] text-text-secondary">{t('coBuilder.member.apexBody')}</p>
      </div>
    );
  }

  const direct = data.upgrade_progress.direct_invite;
  const kpi = data.upgrade_progress.team_kpi;
  const directPct = direct.target ? Math.min(100, (direct.current / direct.target) * 100) : 0;
  const kpiPct = kpi.target ? Math.min(100, (kpi.current / kpi.target) * 100) : 0;

  return (
    <div className="rounded-3xl border border-white/8 bg-surface/85 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">
          {data.next_level
            ? t('coBuilder.member.upgradeTitle', { label: tTierName(data.next_level, t) })
            : null}
        </p>
        <span className="text-[10px] tabular-nums text-text-secondary">
          {Math.min(directPct, kpiPct).toFixed(0)}%
        </span>
      </div>
      <div className="mt-3 space-y-3">
        <ProgressRow
          label={t('coBuilder.member.direct')}
          current={direct.current}
          target={direct.target}
          pct={directPct}
        />
        <ProgressRow
          label={t('coBuilder.member.teamKpi')}
          current={kpi.current}
          target={kpi.target}
          pct={kpiPct}
        />
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  current,
  target,
  pct,
}: {
  label: string;
  current: number;
  target: number;
  pct: number;
}) {
  return (
    <div>
      <div className="flex justify-between text-[11px]">
        <span className="text-text-secondary">{label}</span>
        <span className="tabular-nums">
          {current.toLocaleString()} / {target.toLocaleString()}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
        <motion.div
          className="h-full rounded-full bg-accent-gradient"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 90, damping: 22 }}
        />
      </div>
    </div>
  );
}

function ContributionBreakdownCard({
  data,
  onAddBase,
}: {
  data: MemberSummaryWithFlags;
  onAddBase: () => void;
}) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const trend = data.contribution.total > 0 ? '+1,200' : '0';

  return (
    <div className="rounded-3xl border border-white/8 bg-surface/85 p-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] text-text-secondary">{t('coBuilder.member.contributionTitle')}</p>
          <p className="mt-0.5 text-3xl font-extrabold tabular-nums">
            {data.contribution.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            <span className="ml-1 text-base font-bold text-text-secondary">A</span>
          </p>
          <p className="mt-0.5 text-[10px] text-success-400 tabular-nums">
            {t('coBuilder.member.contributionUp', { n: trend })}
          </p>
        </div>
        <span className="rounded-full bg-white/8 px-2 py-1 text-[10px] tabular-nums text-text-secondary">
          {data.contribution.base.toLocaleString()} +{' '}
          {data.contribution.floating.toLocaleString()} +{' '}
          {data.contribution.identity.toLocaleString()}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Slice
          label={t('coBuilder.member.base')}
          value={data.contribution.base}
          color="bg-info-500"
          total={Math.max(1, data.contribution.total)}
        />
        <Slice
          label={t('coBuilder.member.floating')}
          value={data.contribution.floating}
          color="bg-accent-500"
          total={Math.max(1, data.contribution.total)}
        />
        <Slice
          label={t('coBuilder.member.identity')}
          value={data.contribution.identity}
          color="bg-primary-500"
          total={Math.max(1, data.contribution.total)}
        />
      </div>

      <div className="mt-3 space-y-2">
        <BreakdownRow
          label={t('coBuilder.member.base')}
          value={data.contribution.base}
          actionLabel={t('coBuilder.member.addBase')}
          onAction={onAddBase}
        />
        <BreakdownRow
          label={t('coBuilder.member.floating')}
          value={data.contribution.floating}
          actionLabel={data.has_floating ? t('coBuilder.member.addBase') : t('coBuilder.member.lockedFloat')}
          onAction={() => nav('/co-builder/member/float')}
          locked={!data.has_floating}
        />
        <BreakdownRow
          label={t('coBuilder.member.identity')}
          value={data.contribution.identity}
          actionLabel={t('coBuilder.member.lockedIdentity')}
          onAction={() => nav('/co-builder/buy')}
          locked={!data.has_identity}
        />
      </div>
    </div>
  );
}

function Slice({
  label,
  value,
  color,
  total,
}: {
  label: string;
  value: number;
  color: string;
  total: number;
}) {
  const pct = (value / total) * 100;
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-white/4 px-2 py-2 ring-1 ring-white/8">
      <p className="text-[10px] text-text-secondary">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value.toLocaleString()}</p>
      <span className={cn('h-1 w-full rounded-full', color)} style={{ opacity: pct === 0 ? 0.25 : 1 }} />
      <p className="text-[9px] tabular-nums text-text-secondary">{pct.toFixed(0)}%</p>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  actionLabel,
  onAction,
  locked,
}: {
  label: string;
  value: number;
  actionLabel: string;
  onAction: () => void;
  locked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-elevated/70 px-3 py-2">
      <div>
        <p className="text-[11px] text-text-secondary">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{value.toLocaleString()}A</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors',
          locked
            ? 'bg-white/6 text-text-secondary'
            : 'bg-primary-500/15 text-primary-500 hover:bg-primary-500/25',
        )}
      >
        {!locked ? <Plus className="size-3" /> : null}
        {actionLabel}
      </button>
    </div>
  );
}

function EntPanel({ data, onClaim }: { data: MemberSummaryWithFlags; onClaim: () => void }) {
  const { t } = useTranslation();
  const noClaim = data.ent.claimable <= 0;
  return (
    <div className="rounded-3xl border border-white/8 bg-gradient-to-br from-accent-500/15 via-primary-500/8 to-transparent p-4 ring-1 ring-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-accent-gradient text-white">
            <Coins className="size-4" />
          </span>
          <p className="text-sm font-bold">{t('coBuilder.member.entTitle')}</p>
        </div>
        <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-text-secondary">
          USDT 1 ENT ≈ $0.42
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <StatTile
          label={t('coBuilder.member.entAccumulated')}
          value={`${data.ent.accumulated.toFixed(3)} ENT`}
          hint={t('coBuilder.member.entToday') + ` +${data.ent.today_produced.toFixed(3)}`}
        />
        <StatTile
          label={t('coBuilder.member.entClaimable')}
          value={`${data.ent.claimable.toFixed(3)} ENT`}
          hint={
            <span className="inline-flex items-center gap-1">
              <Wallet2 className="size-3" />
              {data.wallet_address ? shortenAddress(data.wallet_address) : t('coBuilder.member.walletLabel')}
            </span>
          }
        />
      </div>
      <Button
        className="mt-3 w-full"
        variant="primary"
        disabled={noClaim}
        onClick={onClaim}
      >
        {t('coBuilder.member.claimCta')}
      </Button>
    </div>
  );
}

function EarningsTimeline({ data }: { data: MemberSummaryWithFlags }) {
  const { t } = useTranslation();
  const items = [
    { k: 'today', label: t('coBuilder.member.entToday'), v: data.ent.today_produced },
    { k: 'yesterday', label: t('coBuilder.member.entYesterday'), v: data.ent.last_day_produced },
    { k: 'monthly', label: t('coBuilder.member.entMonthly'), v: data.ent.monthly_produced },
  ];
  const max = Math.max(...items.map((x) => x.v), 0.001);
  return (
    <div className="rounded-3xl border border-white/8 bg-surface/85 p-4">
      <div className="flex items-end justify-between">
        <p className="text-sm font-bold">ENT Timeline</p>
        <ChevronRight className="size-4 text-text-secondary" />
      </div>
      <div className="mt-3 flex items-end gap-2">
        {items.map((it) => (
          <div key={it.k} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="relative h-20 w-full overflow-hidden rounded-xl bg-white/4">
              <motion.div
                className="absolute inset-x-0 bottom-0 rounded-xl bg-accent-gradient"
                initial={{ height: 0 }}
                animate={{ height: `${(it.v / max) * 100}%` }}
                transition={{ type: 'spring', damping: 18, stiffness: 110 }}
              />
            </div>
            <p className="text-[10px] text-text-secondary">{it.label}</p>
            <p className="text-xs font-semibold tabular-nums">{it.v.toFixed(3)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
