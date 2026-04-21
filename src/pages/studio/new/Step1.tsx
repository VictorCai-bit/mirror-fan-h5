import { AppShell } from '@/components/layout/AppShell';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import { ApiError, apiFetch } from '@/lib/api';
import { BasicsPanel } from '@/pages/studio/new/_panels/BasicsPanel';
import { useStudioStore } from '@/stores/useStudioStore';
import { useUIStore } from '@/stores/useUIStore';
import type { NewProjectDraft } from '@/types/api';
import { nanoid } from 'nanoid';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

function emptyDraft(localId: string): NewProjectDraft {
  return {
    localId,
    work_id: null,
    work_type: null,
    name: '',
    symbol: '',
    description: '',
    cover_image_url: '',
    language: 'zh-CN',
    target_financing_micro_usdt: '10000000000',
    ip_revenue_rights_valuation_micro_usdt: '100000000000000',
    fundraising_fraction_bps: 6000,
    airdrop_fraction_bps: 1000,
    step: 1,
    updatedAt: Date.now(),
  };
}

export default function StudioNewStep1() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const upsertDraft = useStudioStore((s) => s.upsertDraft);
  const setStep = useStudioStore((s) => s.setStep);
  const setCurrentDraftId = useStudioStore((s) => s.setCurrentDraftId);
  const sheet = useUIStore((s) => s.bottomSheet);
  const setSheet = useUIStore((s) => s.setBottomSheet);

  // Read store once at mount — no reactive subscription to drafts/currentDraftId
  // so that store updates don't re-trigger effects.
  const initRef = useRef(false);
  const [form, setForm] = useState<NewProjectDraft>(() => {
    const s = useStudioStore.getState();
    const id = s.currentDraftId;
    if (id && s.drafts[id]) return { ...s.drafts[id]! };
    if (id) return emptyDraft(id);
    return emptyDraft('');
  });

  // Unfinished drafts list for the "continue?" sheet — computed once on mount.
  const [unfinishedDrafts] = useState<NewProjectDraft[]>(() => {
    const s = useStudioStore.getState();
    return Object.values(s.drafts).filter(
      (d): d is NewProjectDraft => !!d && d.step < 5,
    );
  });

  // On mount: decide whether to show the draft-choice sheet or create a fresh draft.
  // useRef prevents this from running more than once even under StrictMode double-invoke.
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const s = useStudioStore.getState();
    const id = s.currentDraftId;
    if (id && s.drafts[id]) {
      // Already have an active draft — nothing to do.
      return;
    }
    if (unfinishedDrafts.length > 0) {
      setSheet('draftChoice');
    } else {
      const newId = nanoid();
      setCurrentDraftId(newId);
      setForm(emptyDraft(newId));
    }
  // Intentionally empty deps — runs once on mount only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced save to store whenever form changes.
  const debounceRef = useRef<number>();
  useEffect(() => {
    if (!form.localId) return;
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      upsertDraft({ ...form, step: 1, updatedAt: Date.now() });
    }, 400);
    return () => window.clearTimeout(debounceRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.localId, form.name, form.symbol, form.description, form.cover_image_url, form.language, form.work_id]);

  const [symErr, setSymErr] = useState<string | undefined>();

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

  const canTrySymbol =
    form.symbol.trim().length >= 2 && form.name.trim().length >= 1 && form.work_id != null;

  const pickDraft = (id: string) => {
    const s = useStudioStore.getState();
    const d = s.drafts[id];
    if (!d) return;
    setCurrentDraftId(id);
    setForm({ ...d });
    setSheet(null);
  };

  const newDraft = () => {
    const id = nanoid();
    setCurrentDraftId(id);
    setForm(emptyDraft(id));
    setSheet(null);
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-3 pb-8">
        <div>
          <p className="text-xs font-medium text-text-secondary">{t('studio.wizard.title')}</p>
          <p className="mt-0.5 text-[11px] text-text-secondary/80">{t('studio.wizard.step1Subtitle')}</p>
        </div>
        <Stepper steps={steps} current={1} onChange={(n) => nav(`/studio/new/step${n}`)} />

        <BasicsPanel
          value={form}
          onChange={(patch) => {
            if ('symbol' in patch) setSymErr(undefined);
            setForm((f) => ({ ...f, ...patch }));
          }}
          symbolError={symErr}
          showWorkPicker
        />

        <Button
          disabled={!form.localId || !canTrySymbol}
          onClick={async () => {
            if (form.symbol.trim().length < 2) {
              setSymErr(t('studio.symbolTooShort'));
              return;
            }
            if (!form.work_id) {
              toast.error(t('studio.needWork'));
              return;
            }
            try {
              const r = await apiFetch<{ available: boolean }>(
                `/launch/project/symbol-available?symbol=${encodeURIComponent(form.symbol.trim())}`,
              );
              if (!r.available) {
                setSymErr(String(t('errors.4011')));
                return;
              }
              setSymErr(undefined);
              upsertDraft({ ...form, step: 1, updatedAt: Date.now() });
              setStep(2);
              nav('/studio/new/step2');
            } catch (e) {
              setSymErr(e instanceof ApiError ? e.msg : String(e));
            }
          }}
        >
          {t('studio.wizard.next')}
        </Button>
      </div>

      <BottomSheet
        open={sheet === 'draftChoice'}
        onClose={() => {
          const hasId = !!useStudioStore.getState().currentDraftId;
          if (!hasId) newDraft();
          else setSheet(null);
        }}
        title={t('studioWizard.draftChoiceTitle')}
      >
        <div className="flex flex-col gap-2 pb-3">
          <p className="text-xs text-text-secondary">
            {t('studioWizard.draftChoiceBody', { n: unfinishedDrafts.length })}
          </p>
          {unfinishedDrafts.slice(0, 4).map((d) => {
            const mins = Math.max(1, Math.round((Date.now() - d.updatedAt) / 60000));
            return (
              <button
                key={d.localId}
                type="button"
                onClick={() => pickDraft(d.localId)}
                className="flex items-center justify-between rounded-2xl bg-surface px-3 py-2.5 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {d.name || t('studio.wizard.title')}
                  </p>
                  <p className="font-mono text-[10px] text-text-secondary">
                    {d.symbol || '—'} · {t('studio.step', { n: d.step })}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-text-secondary">
                  {t('studioWizard.updatedMinAgo', { mins })}
                </span>
              </button>
            );
          })}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={newDraft}>
              {t('studioWizard.draftStartNew')}
            </Button>
            {unfinishedDrafts[0] ? (
              <Button onClick={() => pickDraft(unfinishedDrafts[0]!.localId)}>
                {t('studioWizard.draftContinue')}
              </Button>
            ) : null}
          </div>
        </div>
      </BottomSheet>
    </AppShell>
  );
}
