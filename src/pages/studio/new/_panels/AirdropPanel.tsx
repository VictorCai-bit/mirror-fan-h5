import { Input } from '@/components/ui/Input';
import type { NewProjectDraft, PhaseDraft } from '@/types/api';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface AirdropPanelProps {
  value: NewProjectDraft;
  onChange: (patch: Partial<NewProjectDraft>) => void;
  symbol?: string;
  disabled?: boolean;
}

export function AirdropPanel({ value, onChange, symbol, disabled }: AirdropPanelProps) {
  const { t } = useTranslation();
  const now = Math.floor(Date.now() / 1000);
  const phase: PhaseDraft = value.initial_airdrop_phase ?? {
    start_at: now + 3600,
    end_at: now + 86400 * 14,
    daily_sign_amount: 5,
    invite_per_day_amount: 10,
    invite_daily_cap: 10,
    team_per_day_amount: 1,
    team_daily_cap: 3,
    total_points_cap: 1_000_000,
  };

  const setPhase = (p: Partial<PhaseDraft>) =>
    onChange({ initial_airdrop_phase: { ...phase, ...p } });

  const unit = symbol ? t('studioWizard.step3PointsUnit', { symbol }) : t('studioWizard.step3PointsUnit', { symbol: 'IP' });
  const estDays = useMemo(() => {
    const perDayMax =
      phase.daily_sign_amount + phase.invite_per_day_amount + phase.team_per_day_amount;
    if (!perDayMax) return 0;
    return Math.floor(phase.total_points_cap / Math.max(1, perDayMax));
  }, [phase]);

  return (
    <div className="flex flex-col gap-3">
      <Grid>
        <Field label={t('studio.fields.phaseStartUnix')}>
          <Input
            disabled={disabled}
            className="font-mono text-xs"
            value={String(phase.start_at)}
            onChange={(e) => setPhase({ start_at: Number(e.target.value) })}
          />
        </Field>
        <Field label={t('studio.fields.phaseEndUnix')}>
          <Input
            disabled={disabled}
            className="font-mono text-xs"
            value={String(phase.end_at)}
            onChange={(e) => setPhase({ end_at: Number(e.target.value) })}
          />
        </Field>
      </Grid>
      <Grid>
        <Field label={`${t('studio2.phases.sign')} (${unit})`}>
          <Input
            disabled={disabled}
            className="font-mono text-xs"
            value={String(phase.daily_sign_amount)}
            onChange={(e) => setPhase({ daily_sign_amount: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label={`${t('studio2.phases.inv')} (${unit})`}>
          <Input
            disabled={disabled}
            className="font-mono text-xs"
            value={String(phase.invite_per_day_amount)}
            onChange={(e) => setPhase({ invite_per_day_amount: Number(e.target.value) || 0 })}
          />
        </Field>
      </Grid>
      <Grid>
        <Field label={t('studio2.phases.invCap')}>
          <Input
            disabled={disabled}
            className="font-mono text-xs"
            value={String(phase.invite_daily_cap)}
            onChange={(e) => setPhase({ invite_daily_cap: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label={`${t('studio2.phases.team')} (${unit})`}>
          <Input
            disabled={disabled}
            className="font-mono text-xs"
            value={String(phase.team_per_day_amount)}
            onChange={(e) => setPhase({ team_per_day_amount: Number(e.target.value) || 0 })}
          />
        </Field>
      </Grid>
      <Grid>
        <Field label={t('studio2.phases.teamCap')}>
          <Input
            disabled={disabled}
            className="font-mono text-xs"
            value={String(phase.team_daily_cap)}
            onChange={(e) => setPhase({ team_daily_cap: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label={`${t('studio2.phases.total')} (${unit})`}>
          <Input
            disabled={disabled}
            className="font-mono text-xs"
            value={String(phase.total_points_cap)}
            onChange={(e) => setPhase({ total_points_cap: Number(e.target.value) || 0 })}
          />
        </Field>
      </Grid>
      <p className="text-[10px] text-text-secondary">
        {t('studioWizard.step3Days', { d: estDays })}
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}
