import { BottomSheet } from '@/components/ui/BottomSheet';
import { apiFetch } from '@/lib/api';
import type { FloatRule, FloatStage, InvitedWorkItem } from '@/types/coBuilder';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

const BUCKET_KEY: Record<InvitedWorkItem['rank_bucket'], string> = {
  top1: 'coBuilder.float.bucketTop1',
  top1_5: 'coBuilder.float.bucketTop1_5',
  top5_15: 'coBuilder.float.bucketTop5_15',
  top15_30: 'coBuilder.float.bucketTop15_30',
  rest: 'coBuilder.float.bucketRest',
};

export function FloatRuleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ['co-builder', 'float', 'rule'],
    queryFn: () => apiFetch<FloatRule>('/co-builder/float/rule'),
    enabled: open,
  });

  return (
    <BottomSheet open={open} onClose={onClose} title={t('coBuilder.float.ruleSheetTitle')}>
      <div className="space-y-3 pb-2 text-xs">
        {!data ? (
          <p className="py-6 text-center text-text-secondary">{t('common.loading')}</p>
        ) : (
          <>
            <Section title={t('coBuilder.float.ruleStage')}>
              <p className="font-semibold text-primary-500">
                {t(`coBuilder.floatRule.${data.current_stage}` as 'coBuilder.floatRule.stage1')}
              </p>
            </Section>

            <Section title={t('coBuilder.float.ruleWeights')}>
              <div className="grid grid-cols-3 gap-2">
                {(['stage1', 'stage2', 'stage3'] as FloatStage[]).map((s) => (
                  <div
                    key={s}
                    className={`rounded-xl border bg-white/4 px-2 py-2 ${
                      s === data.current_stage ? 'border-primary-500/40 ring-1 ring-primary-500/30' : 'border-white/8'
                    }`}
                  >
                    <p className="text-[10px] font-semibold text-text-secondary">
                      {t(`coBuilder.floatRule.${s}` as 'coBuilder.floatRule.stage1')}
                    </p>
                    <p className="mt-1 text-[11px] tabular-nums">
                      {(data.weights[s].market_cap * 100).toFixed(0)}% /{' '}
                      {(data.weights[s].active_user * 100).toFixed(0)}% /{' '}
                      {(data.weights[s].business_flow * 100).toFixed(0)}%
                    </p>
                    <p className="mt-0.5 text-[9px] text-text-secondary">{t('coBuilder.floatRule.dimensionHint')}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title={t('coBuilder.float.ruleNormalize')}>
              <pre className="whitespace-pre-wrap rounded-xl bg-white/4 px-3 py-2 text-[11px] leading-relaxed text-text-primary">
                {t('coBuilder.floatRule.formulaNormalize')}
              </pre>
            </Section>

            <Section title={t('coBuilder.float.ruleTotal')}>
              <pre className="whitespace-pre-wrap rounded-xl bg-white/4 px-3 py-2 text-[11px] leading-relaxed text-text-primary">
                {t('coBuilder.floatRule.formulaTotal')}
              </pre>
            </Section>

            <Section title={t('coBuilder.float.ruleBucket')}>
              <div className="space-y-1.5">
                {data.rank_buckets.map((b) => (
                  <div
                    key={b.key}
                    className="flex items-center justify-between rounded-lg bg-white/4 px-2 py-1.5"
                  >
                    <span className="text-text-primary">{t(BUCKET_KEY[b.key])}</span>
                    <span className="font-semibold text-primary-500 tabular-nums">
                      {b.pool_pct === 0 ? '— 0%' : `${(b.pool_pct * 100).toFixed(0)}%`}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title={t('coBuilder.float.ruleNotes')}>
              <ul className="space-y-1.5">
                {(['note1', 'note2', 'note3'] as const).map((k) => (
                  <li key={k} className="relative pl-3 text-text-secondary">
                    <span className="absolute left-0 top-1.5 size-1 rounded-full bg-accent-400" />
                    {t(`coBuilder.floatRule.${k}` as 'coBuilder.floatRule.note1')}
                  </li>
                ))}
              </ul>
            </Section>
          </>
        )}
      </div>
    </BottomSheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">{title}</p>
      {children}
    </div>
  );
}
