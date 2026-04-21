import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import { MilestonePreviewPanel } from '@/pages/studio/new/_panels/MilestonePreviewPanel';
import { useStudioStore } from '@/stores/useStudioStore';
import type { WorkType } from '@/types/api';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function StudioNewStep4() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const currentDraftId = useStudioStore((s) => s.currentDraftId);
  const drafts = useStudioStore((s) => s.drafts);
  const upsertDraft = useStudioStore((s) => s.upsertDraft);
  const setStep = useStudioStore((s) => s.setStep);
  const draft = currentDraftId ? drafts[currentDraftId] : undefined;
  const workType: WorkType = draft?.work_type ?? 'Fiction';

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

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-3 pb-8">
        <div>
          <p className="text-xs font-medium text-text-secondary">{t('studio.wizard.title')}</p>
          <p className="mt-0.5 text-[11px] text-text-secondary/80">
            {t('studio.wizard.step4Subtitle', { type: workType })}
          </p>
        </div>
        <Stepper steps={steps} current={4} onChange={(n) => nav(`/studio/new/step${n}`)} />

        <MilestonePreviewPanel workType={workType} />

        <Button
          onClick={() => {
            upsertDraft({ ...draft, step: 4, updatedAt: Date.now() });
            setStep(5);
            nav('/studio/new/step5');
          }}
        >
          {t('studio.wizard.next')}
        </Button>
      </div>
    </AppShell>
  );
}
