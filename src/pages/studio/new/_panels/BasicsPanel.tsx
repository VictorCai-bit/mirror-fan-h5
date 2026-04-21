import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { apiFetch } from '@/lib/api';
import type { NewProjectDraft, Work } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export interface BasicsPanelProps {
  value: NewProjectDraft;
  onChange: (patch: Partial<NewProjectDraft>) => void;
  symbolError?: string;
  disabled?: boolean;
  /** Show the work picker (only for Step1 of wizard). */
  showWorkPicker?: boolean;
}

export function BasicsPanel({ value, onChange, symbolError, disabled, showWorkPicker }: BasicsPanelProps) {
  const { t } = useTranslation();

  const { data: works } = useQuery({
    queryKey: ['creator', 'works', 'unbound'],
    queryFn: () => apiFetch<Work[]>('/creator/works?un_bound=true'),
    enabled: !!showWorkPicker,
  });

  const descLen = value.description.length;

  return (
    <div className="flex flex-col gap-3">
      <Field label={t('studio.fields.projectName')}>
        <Input
          placeholder={t('studio.fields.projectNamePh')}
          value={value.name}
          disabled={disabled}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </Field>

      <Field label={t('studio.fields.tokenSymbol')}>
        <Input
          placeholder={t('studio.fields.tokenSymbolPh')}
          value={value.symbol}
          disabled={disabled}
          onChange={(e) => onChange({ symbol: e.target.value.toUpperCase() })}
          error={symbolError}
        />
      </Field>

      <Field label={t('studio.fields.coverUrl')} hint={t('studioWizard.step1CoverPh')}>
        <Input
          placeholder="https://…"
          value={value.cover_image_url}
          disabled={disabled}
          onChange={(e) => onChange({ cover_image_url: e.target.value })}
        />
      </Field>

      <Field label={t('studioWizard.step1TitleDesc')} hint={`${descLen}/500`}>
        <textarea
          rows={4}
          disabled={disabled}
          placeholder={t('studioWizard.step1TitleDescPh')}
          className={cn(
            'rounded-xl border border-white/10 bg-elevated px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-secondary/60 focus:border-primary-500/50',
            descLen > 500 && 'border-danger-500/60',
            disabled && 'opacity-60',
          )}
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value.slice(0, 600) })}
        />
      </Field>

      <Field label={t('studioWizard.step1Lang')}>
        <div className="flex gap-2">
          {(['zh-CN', 'en-US'] as const).map((l) => (
            <button
              key={l}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ language: l })}
              className={cn(
                'flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition',
                value.language === l
                  ? 'border-accent-500/50 bg-accent-500/15 text-text-primary'
                  : 'border-white/10 bg-elevated text-text-secondary hover:border-white/20',
              )}
            >
              {l === 'zh-CN' ? t('studioWizard.step1LangZh') : t('studioWizard.step1LangEn')}
            </button>
          ))}
        </div>
      </Field>

      {showWorkPicker ? (
        <Field label={t('studio.fields.bindWork')}>
          <select
            disabled={disabled}
            className="rounded-xl border border-white/10 bg-elevated px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500/50"
            value={value.work_id ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              const wid = v === '' ? null : Number(v);
              const w = (works ?? []).find((x) => x.id === wid);
              onChange({ work_id: wid, work_type: w?.work_type ?? null });
            }}
          >
            <option value="">{t('studio.fields.bindWorkPlaceholder')}</option>
            {(works ?? []).map((w) => (
              <option key={w.id} value={w.id}>
                {w.title} · {w.work_type}
              </option>
            ))}
          </select>
          {(works ?? []).length === 0 ? (
            <p className="text-[11px] text-warn-500">{t('studio.noUnboundWorks')}</p>
          ) : null}
        </Field>
      ) : null}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-xs text-text-secondary">
        <span>{label}</span>
        {hint ? <span className="text-[10px] text-text-secondary/70">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
