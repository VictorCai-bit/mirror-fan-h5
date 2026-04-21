import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import { ApiError, apiFetch } from '@/lib/api';
import { useStudioStore } from '@/stores/useStudioStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function StudioNewStep5() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const currentDraftId = useStudioStore((s) => s.currentDraftId);
  const drafts = useStudioStore((s) => s.drafts);
  const draft = currentDraftId ? drafts[currentDraftId] : undefined;
  const [agree, setAgree] = useState(false);

  const m = useMutation({
    mutationFn: async (submit: boolean) => {
      if (!draft?.work_id) {
        throw new Error(t('studio.needWork'));
      }
      const body = {
        work_id: draft.work_id,
        name: draft.name,
        symbol: draft.symbol,
        description: draft.description,
        cover_image_url: draft.cover_image_url,
        language: draft.language,
        target_financing_micro_usdt: draft.target_financing_micro_usdt,
        ip_revenue_rights_valuation_micro_usdt: draft.ip_revenue_rights_valuation_micro_usdt,
        fundraising_fraction_bps: draft.fundraising_fraction_bps,
        airdrop_fraction_bps: draft.airdrop_fraction_bps,
        dev_fund_fraction_bps: 10_000 - draft.fundraising_fraction_bps - draft.airdrop_fraction_bps,
        initial_airdrop_phase: draft.initial_airdrop_phase,
        is_draft: !submit,
        confirmations: { rules: agree },
      };
      const res = await apiFetch<{ project_id: number }>('/launch/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (submit) {
        await apiFetch(`/launch/project/${res.project_id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmations: { rules: true } }),
        });
      }
      return res.project_id;
    },
    onSuccess: async (pid) => {
      await qc.invalidateQueries({ queryKey: ['creator', 'my', 'projects'] });
      toast.success(t('studio.createSuccess'));
      nav(`/studio/project/${pid}`);
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.msg : e instanceof Error ? e.message : String(e);
      toast.error(msg);
    },
  });

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
          <p className="mt-0.5 text-[11px] text-text-secondary/80">{t('studio.wizard.step5Subtitle')}</p>
        </div>
        <Stepper steps={steps} current={5} onChange={(n) => nav(`/studio/new/step${n}`)} />
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          {t('studio.rulesConfirm')}
        </label>
        <Button
          variant="secondary"
          disabled={!draft.work_id}
          loading={m.isPending}
          onClick={() => {
            if (!draft.work_id) {
              toast.error(t('studio.needWork'));
              return;
            }
            m.mutate(false);
          }}
        >
          {t('studio.saveDraft')}
        </Button>
        <Button
          disabled={!agree || !draft.work_id}
          loading={m.isPending}
          onClick={() => {
            if (!draft.work_id) {
              toast.error(t('studio.needWork'));
              return;
            }
            m.mutate(true);
          }}
        >
          {t('studio.submit')}
        </Button>
        <Button variant="ghost" onClick={() => nav('/rules?from=wizard')}>
          {t('rules.title')}
        </Button>
      </div>
    </AppShell>
  );
}
