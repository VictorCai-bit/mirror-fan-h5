import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { CoBuilderLayout } from '@/pages/co-builder/CoBuilderLayout';
import { LevelBadge } from '@/components/co-builder/LevelBadge';
import { StatTile } from '@/components/co-builder/StatTile';
import { levelToken } from '@/components/co-builder/levelTokens';
import { apiFetch } from '@/lib/api';
import { tTierName, tTierTag } from '@/lib/coBuilderDisplay';
import { cn } from '@/lib/cn';
import { useUserStore } from '@/stores/useUserStore';
import { useUIStore } from '@/stores/useUIStore';
import type { CommunitySummary } from '@/types/coBuilder';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Coins, Copy, ImageDown, QrCode, Share2, Users2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function CommunityPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const logged = useUserStore((s) => s.is_logged_in());
  const setSheet = useUIStore((s) => s.setBottomSheet);

  const { data, isLoading } = useQuery({
    queryKey: ['co-builder', 'community', 'my'],
    queryFn: () => apiFetch<CommunitySummary>('/co-builder/community/my'),
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
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      </CoBuilderLayout>
    );
  }

  if (data.level === 'none') {
    return (
      <CoBuilderLayout>
        <EmptyState onCta={() => nav('/co-builder/buy')} cta={t('coBuilder.community.empty.cta')} />
      </CoBuilderLayout>
    );
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(data.invite_link);
      toast.success(t('common.copied'));
    } catch {
      /* ignore */
    }
  };

  return (
    <CoBuilderLayout>
      <div className="space-y-3 px-3 pb-12 pt-1">
        <div>
          <h2 className="text-base font-bold">{t('coBuilder.community.title')}</h2>
          <p className="text-[11px] text-text-secondary">{t('coBuilder.community.subtitle')}</p>
        </div>

        <RebateRuleCard data={data} />

        {/* Share */}
        <div className="rounded-3xl border border-white/8 bg-elevated/85 p-4">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-accent-gradient text-white">
              <Share2 className="size-4" />
            </span>
            <p className="text-sm font-bold">{t('coBuilder.community.shareTitle')}</p>
          </div>
          <p className="mt-1 text-[11px] text-text-secondary">{t('coBuilder.community.inviteSlogan')}</p>
          <div className="mt-3 flex gap-2">
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/4 py-3">
              <QrCode className="size-12 text-text-secondary" />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Button variant="primary" size="sm" onClick={onCopy}>
                <Copy className="size-3.5" />
                {t('coBuilder.community.shareCopy')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toast(t('common.notAvailable'))}
              >
                <ImageDown className="size-3.5" />
                {t('coBuilder.community.shareSavePoster')}
              </Button>
            </div>
          </div>
        </div>

        {/* Commission tiles */}
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label={t('coBuilder.community.todayCommission')}
            value={`+${data.today_commission.toFixed(2)}`}
            hint="USDT"
            trend={{ sign: 'up', text: '+12 vs yesterday' }}
          />
          <StatTile
            label={t('coBuilder.community.totalCommission')}
            value={data.total_commission.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            hint="USDT"
          />
          <StatTile
            label={t('coBuilder.community.directCount')}
            value={data.direct_invite_count}
            hint=" "
          />
          <StatTile
            label={t('coBuilder.community.teamKpi')}
            value={data.team_kpi_total.toLocaleString()}
            hint="USDT"
          />
        </div>

        {/* Team list */}
        {data.can_view_team ? (
          <TeamCard data={data} />
        ) : (
          <Locked
            title={t('coBuilder.community.teamLocked')}
            ctaLabel={t('coBuilder.community.teamLockedCta')}
            onCta={() => nav('/co-builder/buy')}
          />
        )}
      </div>
    </CoBuilderLayout>
  );
}

function RebateRuleCard({ data }: { data: CommunitySummary }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-3xl border border-white/8 bg-surface/85 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">{t('coBuilder.community.rebateTitle')}</p>
        <LevelBadge level={data.level} label={tTierTag(data.level, t)} size="sm" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <RatePill label={t('coBuilder.community.rebateDirect')} pct={data.rebate_direct_pct} accent />
        <RatePill label={t('coBuilder.community.rebateIndirect')} pct={data.rebate_indirect_pct} />
      </div>
      {data.next_level ? (
        <p className="mt-3 rounded-xl bg-white/4 px-3 py-2 text-[10px] leading-relaxed text-text-secondary">
          ⤴︎{' '}
          {t('coBuilder.community.nextHint', {
            label: tTierName(data.next_level, t),
            d: data.next_rebate_direct_pct ?? '-',
            i: data.next_rebate_indirect_pct ?? '-',
          })}
        </p>
      ) : null}
    </div>
  );
}

function RatePill({ label, pct, accent }: { label: string; pct: number; accent?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1 rounded-2xl px-3 py-3 ring-1',
        accent
          ? 'bg-accent-gradient text-white ring-white/10 shadow-lg'
          : 'bg-white/5 text-text-primary ring-white/8',
      )}
    >
      <span className={cn('text-[10px] uppercase tracking-wider', accent ? 'text-white/80' : 'text-text-secondary')}>
        {label}
      </span>
      <span className="text-2xl font-extrabold tabular-nums">{pct}%</span>
    </div>
  );
}

function TeamCard({ data }: { data: CommunitySummary }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-3xl border border-white/8 bg-surface/85 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-2xl bg-info-500/15 text-info-400">
            <Users2 className="size-4" />
          </span>
          <p className="text-sm font-bold">{t('coBuilder.community.teamTitle')}</p>
        </div>
        <span className="text-[10px] text-text-secondary tabular-nums">{data.team_list.length}</span>
      </div>
      {data.team_list.length === 0 ? (
        <p className="mt-3 text-center text-[11px] text-text-secondary">
          {t('coBuilder.community.teamEmpty')}
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {data.team_list.map((m, i) => {
            const tk = levelToken(m.level);
            return (
              <motion.div
                key={m.uid}
                initial={{ x: 8, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white/4 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-2xl font-bold',
                      tk.surface,
                      tk.text,
                    )}
                  >
                    {m.nickname.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{m.nickname}</p>
                    <p className="text-[10px] text-text-secondary">
                      {m.rebate_relation === 'direct'
                        ? t('coBuilder.community.teamRelationDirect')
                        : t('coBuilder.community.teamRelationIndirect')}
                      {' · '}
                      {m.level}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-text-secondary">
                    {t('coBuilder.community.teamContribution')}
                  </p>
                  <p className="text-sm font-bold tabular-nums">{m.team_contribution.toLocaleString()}A</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onCta, cta }: { onCta: () => void; cta: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-accent-gradient text-white shadow-2xl">
        <Coins className="size-8" />
      </span>
      <h3 className="text-base font-bold text-text-primary">{t('coBuilder.community.empty.title')}</h3>
      <p className="max-w-[260px] text-xs text-text-secondary">{t('coBuilder.community.empty.body')}</p>
      <Button variant="primary" onClick={onCta} className="mt-2">
        {cta}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

function Locked({
  title,
  ctaLabel,
  onCta,
}: {
  title: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  return (
    <div className="rounded-3xl border border-white/8 bg-surface/85 px-4 py-6 text-center">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <Button variant="primary" size="sm" className="mt-3" onClick={onCta}>
        {ctaLabel}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
