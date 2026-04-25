import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { CoBuilderLayout } from '@/pages/co-builder/CoBuilderLayout';
import { FloatRuleSheet } from '@/components/co-builder/FloatRuleSheet';
import { WorkScoreSheet } from '@/components/co-builder/WorkScoreSheet';
import { apiFetch } from '@/lib/api';
import { tInvitedWorkCategory, tInvitedWorkTitle } from '@/lib/coBuilderDisplay';
import { cn } from '@/lib/cn';
import { useUserStore } from '@/stores/useUserStore';
import { useUIStore } from '@/stores/useUIStore';
import type { InvitedWorkItem, MemberLevel } from '@/types/coBuilder';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Copy, ImageDown, Info, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ListResp {
  total: number;
  items: InvitedWorkItem[];
}

interface MemberSummaryLite {
  level: MemberLevel;
  has_floating: boolean;
}

const BUCKET_COLOR: Record<InvitedWorkItem['rank_bucket'], string> = {
  top1: 'bg-primary-500/20 text-primary-500 ring-primary-500/40',
  top1_5: 'bg-warning-500/20 text-warning-400 ring-warning-500/40',
  top5_15: 'bg-accent-500/20 text-accent-400 ring-accent-500/40',
  top15_30: 'bg-info-500/20 text-info-400 ring-info-500/40',
  rest: 'bg-white/8 text-text-secondary ring-white/15',
};

const BUCKET_KEY: Record<InvitedWorkItem['rank_bucket'], string> = {
  top1: 'coBuilder.float.bucketTop1',
  top1_5: 'coBuilder.float.bucketTop1_5',
  top5_15: 'coBuilder.float.bucketTop5_15',
  top15_30: 'coBuilder.float.bucketTop15_30',
  rest: 'coBuilder.float.bucketRest',
};

export default function FloatContributionPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const logged = useUserStore((s) => s.is_logged_in());
  const setSheet = useUIStore((s) => s.setBottomSheet);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [workId, setWorkId] = useState<number | null>(null);

  const { data: my } = useQuery({
    queryKey: ['co-builder', 'member', 'my'],
    queryFn: () => apiFetch<MemberSummaryLite>('/co-builder/member/my'),
    enabled: logged,
  });
  const { data, isLoading } = useQuery({
    queryKey: ['co-builder', 'float', 'list'],
    queryFn: () => apiFetch<ListResp>('/co-builder/float/list'),
    enabled: logged && !!my && (my.has_floating ?? false),
  });

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText('https://mirror.fan/co-builder/invite?ref=mock');
      toast.success(t('common.copied'));
    } catch {
      /* ignore */
    }
  };

  if (!logged) {
    return (
      <CoBuilderLayout>
        <Locked
          title={t('coBuilder.hero.connectFirst')}
          body={t('coBuilder.member.empty.body')}
          ctaLabel={t('coBuilder.hero.connectFirst')}
          onCta={() => setSheet('connect')}
        />
      </CoBuilderLayout>
    );
  }

  const noFloat = !my?.has_floating;

  return (
    <CoBuilderLayout>
      <div className="space-y-3 px-3 pb-12 pt-1">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => nav('/co-builder/member')}
            className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="size-3.5" />
            {t('coBuilder.pageTitleMember')}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2 py-1 text-[11px] text-text-primary"
            onClick={() => setRuleOpen(true)}
          >
            <Info className="size-3" />
            {t('coBuilder.float.ruleHint')}
          </button>
        </header>

        <div>
          <h2 className="text-base font-bold">{t('coBuilder.float.title')}</h2>
          <p className="text-[11px] text-text-secondary">{t('coBuilder.float.subtitle')}</p>
        </div>

        {/* Rule strip */}
        <div className="space-y-1.5 rounded-2xl bg-white/4 px-3 py-2.5 text-[11px] leading-relaxed text-text-secondary">
          {(t('coBuilder.float.rules', { returnObjects: true }) as string[]).map((s, i) => (
            <p key={i} className="flex gap-2">
              <span className="mt-0.5 inline-flex size-3.5 items-center justify-center rounded-full bg-accent-gradient text-[10px] font-bold text-white">
                {i + 1}
              </span>
              {s}
            </p>
          ))}
        </div>

        {/* Invite creators card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-elevated/85 p-4">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full opacity-50 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(255,61,139,0.4), transparent 70%)' }}
          />
          <div className="relative flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-accent-gradient text-white shadow-lg">
              <Sparkles className="size-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold">{t('coBuilder.float.inviteTitle')}</p>
              <p className="text-[11px] leading-relaxed text-text-secondary">
                {t('coBuilder.float.inviteSubtitle')}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" size="sm" className="flex-1" onClick={onCopy}>
              <Copy className="size-3.5" />
              {t('coBuilder.float.copyLink')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => toast(t('common.notAvailable'))}
            >
              <ImageDown className="size-3.5" />
              {t('coBuilder.float.savePoster')}
            </Button>
          </div>
        </div>

        {/* List */}
        {noFloat ? (
          <Locked
            title={t('coBuilder.float.lockedTitle')}
            body={t('coBuilder.float.lockedBody')}
            ctaLabel={t('coBuilder.float.lockedCta')}
            onCta={() => nav('/co-builder/buy')}
          />
        ) : isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="rounded-2xl bg-white/4 py-8 text-center text-xs text-text-secondary">
            {t('coBuilder.float.empty')}
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-[11px] text-text-secondary">
              <span>{t('coBuilder.float.listTitle')}</span>
              <span className="tabular-nums">{data.items.length}</span>
            </div>
            <div className="space-y-2">
              {data.items.map((w, i) => (
                <motion.button
                  key={w.work_id}
                  type="button"
                  onClick={() => setWorkId(w.work_id)}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.04 * i, duration: 0.28 }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-surface/80 px-3 py-3 text-left transition-colors hover:bg-elevated/80"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-white/8 text-base font-bold tabular-nums text-text-primary">
                    #{w.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">{tInvitedWorkTitle(w.work_id, t)}</p>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ring-1',
                          BUCKET_COLOR[w.rank_bucket],
                        )}
                      >
                        {t(BUCKET_KEY[w.rank_bucket])}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-secondary">
                      {t('coBuilder.float.tableScore')} {w.total_score.toFixed(3)} ·{' '}
                      {tInvitedWorkCategory(w.work_id, t)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-text-secondary">
                      {t('coBuilder.float.tableContribution')}
                    </p>
                    <p className="text-sm font-bold tabular-nums text-primary-500">
                      +{w.float_contribution.toLocaleString()}A
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </div>

      <FloatRuleSheet open={ruleOpen} onClose={() => setRuleOpen(false)} />
      <WorkScoreSheet workId={workId} onClose={() => setWorkId(null)} />
    </CoBuilderLayout>
  );
}

function Locked({
  title,
  body,
  ctaLabel,
  onCta,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  return (
    <div className="rounded-3xl border border-white/8 bg-surface/85 px-4 py-8 text-center">
      <p className="text-sm font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-[260px] text-[11px] text-text-secondary">{body}</p>
      <Button variant="primary" className="mt-3" onClick={onCta}>
        {ctaLabel}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
