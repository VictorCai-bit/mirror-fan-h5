import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import { AirdropPanel } from '@/pages/studio/new/_panels/AirdropPanel';
import { useStudioStore } from '@/stores/useStudioStore';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

/** Default airdrop phase values — mirrors backend constants (userWorkTask.go) */
function buildDefaultPhase() {
  const now = Math.floor(Date.now() / 1000);
  return {
    start_at: now + 3600,          // ~1 hour after launch
    end_at: now + 86400 * 90,      // 90-day window (ops can adjust)
    daily_sign_amount: 5,
    invite_per_day_amount: 5,
    invite_daily_cap: 0,           // unlimited
    team_per_day_amount: 3,
    team_daily_cap: 0,             // unlimited
    total_points_cap: 0,           // backend computes from 10% pool
  };
}

export default function StudioNewStep3() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const currentDraftId = useStudioStore((s) => s.currentDraftId);
  const drafts = useStudioStore((s) => s.drafts);
  const upsertDraft = useStudioStore((s) => s.upsertDraft);
  const setStep = useStudioStore((s) => s.setStep);
  const draft = currentDraftId ? drafts[currentDraftId] : undefined;

  const steps = useMemo(
    () => [
      { key: '1', label: t('studio.wizard.base') },
      { key: '2', label: t('studio.wizard.eco') },
      { key: '3', label: t('studio.wizard.air') },
      { key: '4', label: t('studio.wizard.ms') },
      { key: '5', label: t('studio.wizard.go') },
    ],
    [t],
  );

  if (!draft) {
    return (
      <AppShell>
        <div className="flex flex-col gap-4 p-6">
          <p className="text-sm text-text-secondary">{t('studio.draftMissing')}</p>
          <Button onClick={() => nav('/studio/new/step1')}>{t('studio.backToStep1')}</Button>
        </div>
      </AppShell>
    );
  }

  const onNext = () => {
    // Ensure initial_airdrop_phase is set with defaults (all values are protocol-fixed)
    if (!draft.initial_airdrop_phase) {
      upsertDraft({ ...draft, initial_airdrop_phase: buildDefaultPhase(), step: 3, updatedAt: Date.now() });
    }
    setStep(4);
    nav('/studio/new/step4');
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-3 pb-8">
        <div>
          <p className="text-xs font-medium text-text-secondary">{t('studio.wizard.title')}</p>
          <p className="mt-0.5 text-[11px] text-text-secondary/80">{t('studio.wizard.step3Subtitle')}</p>
        </div>
        <Stepper steps={steps} current={3} onChange={(n) => nav(`/studio/new/step${n}`)} />

        <AirdropPanel value={draft} symbol={draft.symbol || 'IP'} />

        <Button onClick={onNext}>{t('studio.wizard.next')}</Button>
      </div>
    </AppShell>
  );
}
