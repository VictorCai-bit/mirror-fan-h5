import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import { AirdropPanel } from '@/pages/studio/new/_panels/AirdropPanel';
import { useStudioStore } from '@/stores/useStudioStore';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function StudioNewStep3() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const currentDraftId = useStudioStore((s) => s.currentDraftId);
  const drafts = useStudioStore((s) => s.drafts);
  const upsertDraft = useStudioStore((s) => s.upsertDraft);
  const setStep = useStudioStore((s) => s.setStep);
  const draft = currentDraftId ? drafts[currentDraftId] : undefined;
  const [err, setErr] = useState<string | undefined>();

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
    const ph = draft.initial_airdrop_phase;
    if (!ph) {
      setErr(t('errors.4010'));
      return;
    }
    if (ph.end_at <= ph.start_at + 24 * 3600) {
      setErr(t('studio2.phases.minWindow'));
      return;
    }
    setErr(undefined);
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

        <AirdropPanel
          value={draft}
          symbol={draft.symbol || 'IP'}
          onChange={(patch) => upsertDraft({ ...draft, ...patch, step: 3, updatedAt: Date.now() })}
        />

        {err ? <p className="text-xs text-danger-500">{err}</p> : null}

        <Button onClick={onNext}>{t('studio.wizard.next')}</Button>
      </div>
    </AppShell>
  );
}
