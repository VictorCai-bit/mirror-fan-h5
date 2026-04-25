import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError, apiFetch } from '@/lib/api';
import { formatDateTime } from '@/lib/fmt';
import { RequireCreator } from '@/routes/guards';
import type { FixedPriceApplyBody, FixedPriceApplyRow } from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Calendar } from 'lucide-react';
import { useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

/* ── date helpers ─────────────────────────────────────────────────────── */

function unixToLocal(unix: number): string {
  if (!unix) return '';
  const d = new Date(unix * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function localToUnix(val: string): number {
  if (!val) return 0;
  return Math.floor(new Date(val).getTime() / 1000);
}

/* ── USDT helpers (micro-USDT ↔ human USDT string) ──────────────────── */
// raw = micro-USDT (6 decimals): "150000" → "$0.15"
function rawPriceToDisplay(raw: string): string {
  const n = Number(raw);
  if (isNaN(n)) return '';
  return (n / 1_000_000).toFixed(6).replace(/\.?0+$/, '');
}
function displayPriceToRaw(val: string): string {
  const n = parseFloat(val);
  if (isNaN(n) || n <= 0) return '0';
  return String(Math.round(n * 1_000_000));
}

// target: micro-USDT large number: "200000000000" → "200000"
function rawTargetToDisplay(raw: string): string {
  const n = Number(raw);
  if (isNaN(n)) return '';
  return (n / 1_000_000).toFixed(2).replace(/\.00$/, '');
}
function displayTargetToRaw(val: string): string {
  const n = parseFloat(val);
  if (isNaN(n) || n <= 0) return '0';
  return String(Math.round(n * 1_000_000));
}

/* ── slice period presets (seconds) ───────────────────────────────────── */
const PERIOD_SECS = [86400 * 7, 86400 * 14, 86400 * 30, 86400 * 60, 86400 * 90, 86400 * 180] as const;

/* ── initial state ─────────────────────────────────────────────────────── */
function initialForm(projectId: number): FixedPriceApplyBody {
  const now = Math.floor(Date.now() / 1000);
  return {
    project_id: projectId,
    price_usdt_per_token_raw: '150000',       // $0.15
    target_usdt_raw: '200000000000',           // $200,000
    sale_start_unix: now + 86400 * 3,
    sale_end_unix:   now + 86400 * 10,
    vesting_num_slices: 4,
    vesting_slice_period_sec: 86400 * 30,
    vesting_percentages_bps_csv: '2500,2500,2500,2500',
    vesting_start_unix: now + 86400 * 11,
    note: '',
  };
}

function validateForm(f: FixedPriceApplyBody, t: TFunction): string | null {
  if (!f.price_usdt_per_token_raw || BigInt(f.price_usdt_per_token_raw) <= 0n) return t('fixedPriceApply.err.priceZero');
  if (!f.target_usdt_raw || BigInt(f.target_usdt_raw) <= 0n) return t('fixedPriceApply.err.targetZero');
  if (!f.sale_start_unix) return t('fixedPriceApply.err.pickSaleStart');
  if (!f.sale_end_unix) return t('fixedPriceApply.err.pickSaleEnd');
  if (f.sale_end_unix <= f.sale_start_unix) return t('fixedPriceApply.err.endAfterStart');
  const csvParts = f.vesting_percentages_bps_csv.split(',').map((x) => Number(x.trim()));
  if (csvParts.length !== f.vesting_num_slices) return t('fixedPriceApply.err.csvSegments', { n: f.vesting_num_slices });
  const sum = csvParts.reduce((a, b) => a + b, 0);
  if (sum !== 10_000) return t('fixedPriceApply.err.bpsSum', { sum });
  if (!f.vesting_start_unix) return t('fixedPriceApply.err.pickVestStart');
  if (f.vesting_start_unix < f.sale_end_unix) return t('fixedPriceApply.err.vestAfterSale');
  return null;
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function StudioProjectFixedPriceApply() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const pid = Number(id);

  const [form, setForm] = useState<FixedPriceApplyBody>(initialForm(pid));

  // Display-layer state (human-readable strings)
  const [priceDisplay, setPriceDisplay]   = useState(() => rawPriceToDisplay('150000'));
  const [targetDisplay, setTargetDisplay] = useState(() => rawTargetToDisplay('200000000000'));

  const { data: applies, isPending } = useQuery({
    queryKey: ['studio', 'fp', 'applies', id],
    queryFn: () => apiFetch<FixedPriceApplyRow[]>(`/studio/fixed-price/applies?project_id=${id}`),
    enabled: !!id,
  });

  const submit = useMutation({
    mutationFn: () =>
      apiFetch('/studio/fixed-price/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      }),
    onSuccess: async () => {
      toast.success(t('studio2.fp.submit'));
      await qc.invalidateQueries({ queryKey: ['studio', 'fp', 'applies', id] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  const set = (patch: Partial<FixedPriceApplyBody>) => setForm((f) => ({ ...f, ...patch }));
  const err = validateForm(form, t);

  return (
    <RequireCreator>
      <AppShell>
        <div className="flex flex-col gap-4 p-3 pb-10">
          {/* Header */}
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg p-2 hover:bg-white/5" onClick={() => nav(-1)}>
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="text-base font-semibold">{t('studio2.fp.title')}</h1>
          </div>

          <p className="rounded-xl bg-warning-500/10 p-3 text-[11px] text-warning-400">
            {t('studio2.fp.todoC')}
          </p>

          {/* Pricing & raise */}
          <Section title={t('fixedPriceApply.sectionPrice')}>
            <Field label={t('fixedPriceApply.priceField')}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
                <Input
                  value={priceDisplay}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, '');
                    setPriceDisplay(v);
                    set({ price_usdt_per_token_raw: displayPriceToRaw(v) });
                  }}
                  className="pl-6 font-mono"
                  placeholder="0.15"
                />
              </div>
            </Field>
            <Field label={t('fixedPriceApply.targetField')}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
                <Input
                  value={targetDisplay}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, '');
                    setTargetDisplay(v);
                    set({ target_usdt_raw: displayTargetToRaw(v) });
                  }}
                  className="pl-6 font-mono"
                  placeholder="200000"
                />
              </div>
            </Field>
          </Section>

          {/* Sale window */}
          <Section title={t('fixedPriceApply.sectionWindow')}>
            <Field label={t('fixedPriceApply.startTime')}>
              <DateInput
                value={unixToLocal(form.sale_start_unix)}
                onChange={(v) => set({ sale_start_unix: localToUnix(v) })}
              />
            </Field>
            <Field label={t('fixedPriceApply.endTime')}>
              <DateInput
                value={unixToLocal(form.sale_end_unix)}
                min={unixToLocal(form.sale_start_unix)}
                onChange={(v) => set({ sale_end_unix: localToUnix(v) })}
              />
            </Field>
            {form.sale_start_unix > 0 && form.sale_end_unix > form.sale_start_unix && (
              <p className="col-span-2 text-[10px] text-text-secondary">
                {t('fixedPriceApply.windowDuration', { n: Math.round((form.sale_end_unix - form.sale_start_unix) / 86400) })}
              </p>
            )}
          </Section>

          {/* Vesting plan */}
          <Section title={t('fixedPriceApply.sectionVesting')}>
            <Field label={t('fixedPriceApply.slices')}>
              <Input
                type="number"
                min={1}
                max={12}
                value={String(form.vesting_num_slices)}
                onChange={(e) => set({ vesting_num_slices: Math.max(1, Number(e.target.value) || 1) })}
              />
            </Field>
            <Field label={t('fixedPriceApply.periodBetween')}>
              <select
                value={String(form.vesting_slice_period_sec)}
                onChange={(e) => set({ vesting_slice_period_sec: Number(e.target.value) })}
                className="w-full rounded-xl bg-elevated px-3 py-2.5 text-sm text-text-primary ring-1 ring-white/10 focus:outline-none focus:ring-accent-500/50"
              >
                {PERIOD_SECS.map((sec) => (
                  <option key={sec} value={sec}>
                    {t('fixedPriceApply.periodDays', { n: sec / 86400 })}
                  </option>
                ))}
              </select>
            </Field>
            <div className="col-span-2">
              <Field label={t('fixedPriceApply.bpsField', { n: form.vesting_num_slices })}>
                <Input
                  value={form.vesting_percentages_bps_csv}
                  onChange={(e) => set({ vesting_percentages_bps_csv: e.target.value })}
                  placeholder="2500,2500,2500,2500"
                  className="font-mono text-xs"
                />
                <VestingPreview
                  csv={form.vesting_percentages_bps_csv}
                  slices={form.vesting_num_slices}
                  periodSec={form.vesting_slice_period_sec}
                  startUnix={form.vesting_start_unix}
                  locale={i18n.language}
                />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label={t('fixedPriceApply.vestingStart')}>
                <DateInput
                  value={unixToLocal(form.vesting_start_unix)}
                  min={unixToLocal(form.sale_end_unix)}
                  onChange={(v) => set({ vesting_start_unix: localToUnix(v) })}
                />
              </Field>
            </div>
          </Section>

          {/* Note to ops */}
          <Section title={t('fixedPriceApply.sectionNote')}>
            <div className="col-span-2">
              <textarea
                value={form.note ?? ''}
                onChange={(e) => set({ note: e.target.value })}
                rows={3}
                placeholder={t('fixedPriceApply.notePlaceholder')}
                className="w-full rounded-xl bg-elevated px-3 py-2.5 text-sm text-text-primary ring-1 ring-white/10 focus:outline-none focus:ring-accent-500/50 resize-none"
              />
            </div>
          </Section>

          {/* Error */}
          {err ? (
            <p className="rounded-xl bg-danger-500/10 px-3 py-2 text-[11px] text-danger-400">{err}</p>
          ) : null}

          <Button loading={submit.isPending} disabled={!!err} onClick={() => submit.mutate()}>
            {t('studio2.fp.submit')}
          </Button>

          {/* Application history */}
          <section>
            <p className="mb-2 text-xs font-semibold text-text-secondary">{t('studio2.fp.appliedList')}</p>
            {isPending ? <Skeleton className="h-24 w-full rounded-2xl" /> : null}
            <div className="flex flex-col gap-2">
              {(applies ?? []).map((a) => (
                <div key={a.apply_id} className="rounded-2xl bg-surface p-3 ring-1 ring-white/8">
                  <div className="flex items-center justify-between">
                    <p className="truncate font-mono text-[11px] text-text-secondary">
                      {a.apply_id.slice(0, 16)}…
                    </p>
                    <Badge>{a.status}</Badge>
                  </div>
                  <p className="mt-1 text-[10px] text-text-secondary">
                    {formatDateTime(a.created_at, i18n.language)}
                  </p>
                  {a.note ? <p className="mt-1 text-xs">{a.note}</p> : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      </AppShell>
    </RequireCreator>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-white/8">
      <div className="border-b border-white/8 px-4 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-400">{title}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3 p-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="col-span-1 flex flex-col gap-1.5">
      <span className="text-[10px] font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

function DateInput({
  value,
  min,
  onChange,
}: {
  value: string;
  min?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <input
        type="datetime-local"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-elevated px-3 py-2.5 text-sm text-text-primary ring-1 ring-white/10 focus:outline-none focus:ring-accent-500/50"
      />
      <Calendar className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-text-secondary" />
    </div>
  );
}

function VestingPreview({
  csv,
  slices,
  periodSec,
  startUnix,
  locale,
}: {
  csv: string;
  slices: number;
  periodSec: number;
  startUnix: number;
  locale: string;
}) {
  const { t } = useTranslation();
  const parts = csv.split(',').map((x) => Number(x.trim()));
  if (parts.length !== slices || parts.some(isNaN)) return null;
  const sum = parts.reduce((a, b) => a + b, 0);
  return (
    <div className="mt-2 space-y-1">
      {parts.map((bps, i) => {
        const unlockAt = startUnix ? startUnix + i * periodSec : 0;
        const dateStr = unlockAt
          ? new Date(unlockAt * 1000).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
          : '—';
        return (
          <div key={i} className="flex items-center justify-between text-[10px]">
            <span className="text-text-secondary">
              {t('fixedPriceApply.vestingRow', { i: i + 1, date: dateStr })}
            </span>
            <span className={sum === 10000 ? 'text-success-400' : 'text-warning-400'}>
              {(bps / 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
      {sum !== 10000 && (
        <p className="text-[10px] text-danger-400">{t('fixedPriceApply.bpsMismatch', { sum })}</p>
      )}
    </div>
  );
}
