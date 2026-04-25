import { BottomSheet } from '@/components/ui/BottomSheet';
import { apiFetch } from '@/lib/api';
import { tInvitedWorkCategory, tInvitedWorkTitle } from '@/lib/coBuilderDisplay';
import { cn } from '@/lib/cn';
import type { FloatRule, InvitedWorkItem } from '@/types/coBuilder';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export function WorkScoreSheet({
  workId,
  onClose,
}: {
  workId: number | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const open = workId != null;

  const { data: w } = useQuery({
    queryKey: ['co-builder', 'float', 'work', workId],
    queryFn: () => apiFetch<InvitedWorkItem>(`/co-builder/float/work-detail?work_id=${workId}`),
    enabled: open,
  });
  const { data: rule } = useQuery({
    queryKey: ['co-builder', 'float', 'rule'],
    queryFn: () => apiFetch<FloatRule>('/co-builder/float/rule'),
    enabled: open,
  });

  return (
    <BottomSheet open={open} onClose={onClose} title={t('coBuilder.float.workSheetTitle')}>
      <div className="space-y-3 pb-2 text-xs">
        {!w || !rule ? (
          <p className="py-6 text-center text-text-secondary">{t('common.loading')}</p>
        ) : (
          <>
            <div className="flex items-end justify-between rounded-2xl bg-elevated/80 px-3 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-secondary">
                  {tInvitedWorkCategory(w.work_id, t)}
                </p>
                <p className="text-base font-bold">{tInvitedWorkTitle(w.work_id, t)}</p>
                <p className="text-[10px] text-text-secondary">
                  {t('coBuilder.float.tableScore')} {w.total_score.toFixed(3)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-text-secondary">
                  {t('coBuilder.float.tableContribution')}
                </p>
                <p className="text-base font-bold tabular-nums text-primary-500">
                  +{w.float_contribution.toLocaleString()}A
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 rounded-2xl bg-white/4 px-2 py-2 text-[10px] font-semibold text-text-secondary">
              <span>{t('coBuilder.float.workMetric')}</span>
              <span className="text-right">{t('coBuilder.float.workRaw')}</span>
              <span className="text-right">{t('coBuilder.float.workNormalize')}</span>
              <span className="text-right">{t('coBuilder.float.workWeighted')}</span>
            </div>

            <Row
              label={t('coBuilder.float.mMarketCap')}
              raw={`${(w.metrics.market_cap_ratio * 100).toFixed(1)}%`}
              normalized={w.metrics.market_cap_score}
              weight={rule.weights[rule.current_stage].market_cap}
            />
            <Row
              label={t('coBuilder.float.mActiveUser')}
              raw={w.metrics.active_user_count.toLocaleString()}
              normalized={w.metrics.active_user_score}
              weight={rule.weights[rule.current_stage].active_user}
            />
            <Row
              label={t('coBuilder.float.mBusinessFlow')}
              raw={w.metrics.business_flow.toFixed(2)}
              normalized={w.metrics.business_flow_score}
              weight={rule.weights[rule.current_stage].business_flow}
            />

            <div className="rounded-2xl bg-elevated/80 px-3 py-2">
              <p className="text-[10px] text-text-secondary">{t('coBuilder.floatRule.formulaTotal')}</p>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}

function Row({
  label,
  raw,
  normalized,
  weight,
}: {
  label: string;
  raw: string;
  normalized: number;
  weight: number;
}) {
  const weighted = normalized * weight;
  return (
    <div
      className={cn(
        'grid grid-cols-4 items-center gap-2 rounded-2xl bg-white/4 px-2 py-2 ring-1 ring-white/8 text-[11px]',
      )}
    >
      <span className="text-text-secondary">{label}</span>
      <span className="text-right tabular-nums">{raw}</span>
      <span className="text-right tabular-nums">{normalized.toFixed(2)}</span>
      <span className="text-right tabular-nums font-semibold text-primary-500">
        {weighted.toFixed(2)}
        <span className="ml-1 text-[9px] text-text-secondary">×{(weight * 100).toFixed(0)}%</span>
      </span>
    </div>
  );
}
