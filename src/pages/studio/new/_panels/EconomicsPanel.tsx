import { Input } from '@/components/ui/Input';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { NewProjectDraft } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Protocol-fixed allocation — not adjustable by creator */
const FIXED_ALLOC = [
  { labelKey: 'studio2.fp.allocPublic',  bps: 6000, color: 'bg-accent-500',  textColor: 'text-accent-400' },
  { labelKey: 'studio2.fp.allocDev',     bps: 3000, color: 'bg-info-500',    textColor: 'text-info-400' },
  { labelKey: 'studio2.fp.allocAirdrop', bps: 1000, color: 'bg-success-500', textColor: 'text-success-400' },
] as const;

const FIXED_BPS = 6000; // public sale ratio hardcoded

/** micro-USDT (6 decimals) ↔ display USDT string */
function microToUsdt(raw: string | undefined): string {
  const n = Number(raw || 0);
  if (!n) return '';
  return (n / 1_000_000).toFixed(2).replace(/\.00$/, '');
}
function usdtToMicro(val: string): string {
  const n = parseFloat(val);
  if (isNaN(n) || n <= 0) return '0';
  return String(Math.round(n * 1_000_000));
}

export interface EconomicsPanelProps {
  value: NewProjectDraft;
  onChange: (patch: Partial<NewProjectDraft>) => void;
  disabled?: boolean;
}

type MintPreview = {
  initial_price: number;
  alpha: number;
  beta: number;
  total_supply: number;
  public_supply: number;
  airdrop_pool: number;
  dev_fund_pool: number;
  expected_migrate_usdt: number;
};

export function EconomicsPanel({ value, onChange, disabled }: EconomicsPanelProps) {
  const { t } = useTranslation();

  const { data: preview } = useQuery({
    queryKey: [
      'mint',
      'preview',
      value.target_financing_micro_usdt,
      value.ip_revenue_rights_valuation_micro_usdt,
    ],
    queryFn: () =>
      apiFetch<MintPreview>('/launch/project/mint-price-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_financing_micro_usdt: value.target_financing_micro_usdt,
          fundraising_fraction_bps: FIXED_BPS,
          ip_revenue_rights_valuation_micro_usdt: value.ip_revenue_rights_valuation_micro_usdt,
        }),
      }),
    enabled: Boolean(value.target_financing_micro_usdt && value.ip_revenue_rights_valuation_micro_usdt),
  });

  return (
    <div className="flex flex-col gap-3">
      <Field label={t('creator.econ.targetLabel')} hint={t('creator.econ.targetHint')}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
          <Input
            disabled={disabled}
            value={microToUsdt(value.target_financing_micro_usdt)}
            onChange={(e) =>
              onChange({ target_financing_micro_usdt: usdtToMicro(e.target.value) })
            }
            className="pl-6 font-mono text-xs"
            placeholder="80000"
          />
        </div>
      </Field>
      <Field label={t('creator.econ.ipValuationLabel')} hint={t('creator.econ.ipValuationHint')}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
          <Input
            disabled={disabled}
            value={microToUsdt(value.ip_revenue_rights_valuation_micro_usdt)}
            onChange={(e) =>
              onChange({ ip_revenue_rights_valuation_micro_usdt: usdtToMicro(e.target.value) })
            }
            className="pl-6 font-mono text-xs"
            placeholder="400000000"
          />
        </div>
      </Field>

      {/* fixed allocation — protocol-level, not configurable */}
      <div className={cn('rounded-2xl bg-surface p-3 ring-1 ring-white/10', disabled && 'opacity-60')}>
        <div className="mb-3 flex items-center gap-1.5">
          <Lock className="size-3 text-text-secondary/60" />
          <span className="text-[11px] font-semibold text-text-secondary">{t('studio2.fp.alloc')}</span>
          <span className="ml-auto text-[10px] text-text-secondary/50">{t('studio2.fp.allocFixed')}</span>
        </div>

        {/* proportion bar */}
        <div className="mb-3 flex h-2 w-full overflow-hidden rounded-full">
          {FIXED_ALLOC.map((a) => (
            <div key={a.labelKey} className={cn('h-full', a.color)} style={{ width: `${a.bps / 100}%` }} />
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {FIXED_ALLOC.map((a) => (
            <div key={a.labelKey} className="flex items-center gap-2">
              <div className={cn('size-2 shrink-0 rounded-full', a.color)} />
              <span className="flex-1 text-[11px] text-text-secondary">{t(a.labelKey)}</span>
              <span className={cn('font-mono text-sm font-bold tabular-nums', a.textColor)}>
                {a.bps / 100}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {preview ? (
        <div className="rounded-2xl bg-surface p-3 ring-1 ring-white/10">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t('studio.preview.initialPrice')} value={String(preview.initial_price)} />
            <Stat label={t('studio.preview.totalSupply')} value={preview.total_supply.toLocaleString()} />
            <Stat label={t('studio.preview.public')} value={preview.public_supply.toLocaleString()} />
            <Stat label={t('studio.preview.airdrop')} value={preview.airdrop_pool.toLocaleString()} />
            <Stat label={t('studio.preview.devFund')} value={preview.dev_fund_pool.toLocaleString()} />
            <Stat label={t('studio.preview.migrate')} value={`$${preview.expected_migrate_usdt.toLocaleString()}`} />
          </div>
        </div>
      ) : (
        <p className="text-center text-xs text-text-secondary">{t('common.loading')}</p>
      )}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-text-secondary/70">{label}</p>
      <p className="truncate font-mono text-xs font-medium text-text-primary">{value}</p>
    </div>
  );
}
