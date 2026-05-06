import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/fmt';
import { RequireCreator } from '@/routes/guards';
import type { CreatorFixedPriceSaleBody, CreatorFixedPriceSaleRow } from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Info,
  Lock,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

/* ── constants ────────────────────────────────────────────────────────── */

const MAX_STEPS = 3;
const MIN_TARGET_USDT = 10_000;
const MAX_WINDOW_DAYS = 15;
const MIN_WINDOW_DAYS = 3;

/* ── helpers ──────────────────────────────────────────────────────────── */

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

function microToDisplay(raw: string, decimals = 6): string {
  const n = Number(raw);
  if (isNaN(n) || !raw) return '';
  return (n / 10 ** decimals).toFixed(decimals).replace(/\.?0+$/, '');
}

function displayToMicro(val: string, decimals = 6): string {
  const n = parseFloat(val);
  if (isNaN(n) || n <= 0) return '0';
  return String(Math.round(n * 10 ** decimals));
}

function computeAllocations(
  targetRaw: string,
  priceRaw: string,
  publicBps: number,
  devBps: number,
  airdropBps: number,
): { total: number; pub: number; dev: number; airdrop: number } | null {
  const target = Number(targetRaw);
  const price = Number(priceRaw);
  if (!target || !price || price <= 0) return null;
  const pubTokens = (target / price) * (publicBps / 10000);
  const totalTokens = pubTokens / (publicBps / 10000);
  return {
    total: totalTokens,
    pub: totalTokens * (publicBps / 10000),
    dev: totalTokens * (devBps / 10000),
    airdrop: totalTokens * (airdropBps / 10000),
  };
}

function buildCsv(inputs: string[], n: number): string {
  const vals = inputs.slice(0, n - 1).map((v) => Math.round(Number(v) * 100));
  const sum = vals.reduce((a, b) => a + b, 0);
  const last = 10000 - sum;
  return [...vals, last].join(',');
}

function csvToDisplayArr(csv: string, n: number): string[] {
  const parts = csv.split(',').map((x) => String(Number(x.trim()) / 100));
  while (parts.length < n) parts.push('');
  return parts.slice(0, n);
}

function daysBetween(start: number, end: number): number {
  return Math.floor((end - start) / 86400);
}

/* ── initial draft ────────────────────────────────────────────────────── */

function buildInitial(projectId: number): CreatorFixedPriceSaleBody {
  const now = Math.floor(Date.now() / 1000);
  return {
    project_id: projectId,
    price_usdt_per_token_raw: '150000',       // $0.15
    target_usdt_raw: '200000000000',           // $200,000
    public_bps: 6000,
    dev_bps: 3000,
    airdrop_bps: 1000,
    sale_start_unix: now + 86400 * 3,
    sale_end_unix: now + 86400 * 10,
    vesting_start_unix: now + 86400 * 11,
    vesting_num_slices: 4,
    vesting_slice_period_sec: 86400 * 30,
    vesting_percentages_bps_csv: '2500,2500,2500,2500',
    asset_proof_url: '',
    is_draft: true,
  };
}

/* ── status color ─────────────────────────────────────────────────────── */

function statusColor(s: CreatorFixedPriceSaleRow['status']): string {
  switch (s) {
    case 'draft_config': return 'text-text-secondary';
    case 'submitted': return 'text-warn-500';
    case 'published': return 'text-info-500';
    case 'subscribing': return 'text-primary-500';
    case 'finalized': return 'text-success-500';
    case 'vesting': return 'text-accent-500';
    case 'done': return 'text-success-500';
    case 'cancelled': return 'text-danger-500';
    default: return 'text-text-secondary';
  }
}

/* ── main component ───────────────────────────────────────────────────── */

export default function StudioProjectFixedPriceApply() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'zh-CN';
  const qc = useQueryClient();
  const pid = Number(id);

  const [showWizard, setShowWizard] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CreatorFixedPriceSaleBody>(() => buildInitial(pid));

  // display-layer
  const [priceDisplay, setPriceDisplay] = useState(() => microToDisplay('150000'));
  const [targetDisplay, setTargetDisplay] = useState(() => microToDisplay('200000000000', 6));
  const [sliceInputs, setSliceInputs] = useState<string[]>(['25', '25', '25']);

  const { data: sales, isPending } = useQuery({
    queryKey: ['creator', 'fp', 'sales', id],
    queryFn: () =>
      apiFetch<CreatorFixedPriceSaleRow[]>(`/rwa/fixed-price/sales?work_id=${id}&creator=true`),
    enabled: !!id,
  });

  const saveDraft = useMutation({
    mutationFn: (body: CreatorFixedPriceSaleBody) => {
      if (editingSaleId) {
        return apiFetch(`/rwa/fixed-price/sales/${editingSaleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      return apiFetch('/rwa/fixed-price/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    onSuccess: async (data: unknown) => {
      const d = data as { sale_id?: string };
      if (d?.sale_id && !editingSaleId) setEditingSaleId(d.sale_id);
      toast.success(t('fixedPriceApply.draftSaved'));
      await qc.invalidateQueries({ queryKey: ['creator', 'fp', 'sales', id] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  const submitForReview = useMutation({
    mutationFn: async () => {
      const body = { ...form, is_draft: false };
      let saleId = editingSaleId;
      if (!saleId) {
        const res = await apiFetch<{ sale_id: string }>('/rwa/fixed-price/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        saleId = res.sale_id;
      }
      return apiFetch(`/rwa/fixed-price/sales/${saleId}/submit`, { method: 'POST' });
    },
    onSuccess: async () => {
      toast.success(t('fixedPriceApply.submitted'));
      setShowWizard(false);
      setEditingSaleId(null);
      setStep(1);
      setForm(buildInitial(pid));
      await qc.invalidateQueries({ queryKey: ['creator', 'fp', 'sales', id] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  const set = (patch: Partial<CreatorFixedPriceSaleBody>) =>
    setForm((f) => ({ ...f, ...patch }));

  const openNew = () => {
    setEditingSaleId(null);
    setStep(1);
    setForm(buildInitial(pid));
    setPriceDisplay(microToDisplay('150000'));
    setTargetDisplay(microToDisplay('200000000000', 6));
    setSliceInputs(['25', '25', '25']);
    setShowWizard(true);
  };

  const openEdit = (sale: CreatorFixedPriceSaleRow) => {
    setEditingSaleId(sale.sale_id);
    const f: CreatorFixedPriceSaleBody = {
      project_id: pid,
      price_usdt_per_token_raw: sale.price_usdt_per_token_raw,
      target_usdt_raw: sale.target_usdt_raw,
      public_bps: sale.public_bps,
      dev_bps: sale.dev_bps,
      airdrop_bps: sale.airdrop_bps,
      sale_start_unix: sale.sale_start_unix,
      sale_end_unix: sale.sale_end_unix,
      vesting_start_unix: sale.vesting_start_unix,
      vesting_num_slices: sale.vesting_num_slices,
      vesting_slice_period_sec: sale.vesting_slice_period_sec,
      vesting_percentages_bps_csv: sale.vesting_percentages_bps_csv,
      asset_proof_url: sale.asset_proof_url ?? '',
      is_draft: true,
    };
    setForm(f);
    setPriceDisplay(microToDisplay(sale.price_usdt_per_token_raw));
    setTargetDisplay(microToDisplay(sale.target_usdt_raw, 6));
    const arr = csvToDisplayArr(sale.vesting_percentages_bps_csv, sale.vesting_num_slices);
    setSliceInputs(arr.slice(0, sale.vesting_num_slices - 1));
    setStep(1);
    setShowWizard(true);
  };

  if (showWizard) {
    return (
      <RequireCreator>
        <AppShell>
          <WizardView
            step={step}
            form={form}
            priceDisplay={priceDisplay}
            targetDisplay={targetDisplay}
            sliceInputs={sliceInputs}
            locale={locale}
            saving={saveDraft.isPending}
            submitting={submitForReview.isPending}
            onBack={() => {
              if (step === 1) { setShowWizard(false); } else { setStep(s => s - 1); }
            }}
            onNext={() => setStep(s => s + 1)}
            onSaveDraft={() => saveDraft.mutate(form)}
            onSubmit={() => submitForReview.mutate()}
            onSetForm={set}
            onSetPrice={(v) => {
              setPriceDisplay(v);
              set({ price_usdt_per_token_raw: displayToMicro(v) });
            }}
            onSetTarget={(v) => {
              setTargetDisplay(v);
              set({ target_usdt_raw: displayToMicro(v, 6) });
            }}
            onSetSliceInputs={(arr) => {
              setSliceInputs(arr);
              set({ vesting_percentages_bps_csv: buildCsv(arr, form.vesting_num_slices) });
            }}
          />
        </AppShell>
      </RequireCreator>
    );
  }

  return (
    <RequireCreator>
      <AppShell>
        <div className="flex flex-col gap-3 p-3 pb-10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg p-2 hover:bg-white/5"
              onClick={() => nav(-1)}
            >
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="flex-1 text-base font-semibold">{t('studio2.fp.title')}</h1>
            <button
              type="button"
              onClick={openNew}
              className="flex items-center gap-1.5 rounded-full bg-accent-gradient px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-accent-500/20"
            >
              <Plus className="size-3.5" />
              {t('studio2.fp.newIssuance')}
            </button>
          </div>

          {isPending ? (
            <div className="flex flex-col gap-2">
              {[0, 1].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
            </div>
          ) : (
            <SaleList sales={sales ?? []} onEdit={openEdit} locale={locale} t={t} />
          )}
        </div>
      </AppShell>
    </RequireCreator>
  );
}

/* ── SaleList ─────────────────────────────────────────────────────────── */

function SaleList({
  sales,
  onEdit,
  locale,
  t,
}: {
  sales: CreatorFixedPriceSaleRow[];
  onEdit: (s: CreatorFixedPriceSaleRow) => void;
  locale: string;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const drafts = sales.filter((s) => s.status === 'draft_config' || s.status === 'submitted');
  const published = sales.filter((s) => s.status !== 'draft_config' && s.status !== 'submitted');

  return (
    <div className="flex flex-col gap-4">
      {drafts.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            {t('studio2.fp.sectionDrafts')}
          </p>
          {drafts.map((s) => <SaleCard key={s.sale_id} sale={s} onEdit={onEdit} locale={locale} t={t} />)}
        </section>
      )}

      {published.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            {t('studio2.fp.sectionPublished')}
          </p>
          {published.map((s) => <SaleCard key={s.sale_id} sale={s} onEdit={onEdit} locale={locale} t={t} />)}
        </section>
      )}

      {sales.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <TrendingUp className="size-10 text-text-secondary/40" />
          <p className="text-sm text-text-secondary">{t('studio2.fp.empty')}</p>
          <p className="text-xs text-text-secondary/60">{t('studio2.fp.emptyHint')}</p>
        </div>
      )}
    </div>
  );
}

function SaleCard({
  sale,
  onEdit,
  locale,
  t,
}: {
  sale: CreatorFixedPriceSaleRow;
  onEdit: (s: CreatorFixedPriceSaleRow) => void;
  locale: string;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const nav = useNavigate();
  const priceStr = microToDisplay(sale.price_usdt_per_token_raw);
  const targetStr = microToDisplay(sale.target_usdt_raw, 6);
  const windowDays = daysBetween(sale.sale_start_unix, sale.sale_end_unix);

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface p-3 ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-xs font-semibold', statusColor(sale.status))}>
          {sale.status === 'draft_config' ? t('studio2.fp.statusDraft')
            : sale.status === 'submitted' ? t('studio2.fp.statusSubmitted')
            : sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
        </span>
        <span className="text-[10px] text-text-secondary">
          {formatDateTime(sale.created_at, locale)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <span className="text-text-secondary">{t('fixedPriceApply.priceField')}</span>
        <span className="font-mono text-text-primary">${priceStr} USDT</span>
        <span className="text-text-secondary">{t('fixedPriceApply.targetField')}</span>
        <span className="font-mono text-text-primary">${Number(targetStr).toLocaleString(locale)} USDT</span>
        <span className="text-text-secondary">{t('studio2.fp.window')}</span>
        <span className="text-text-primary">{windowDays} {t('studio2.fp.days')}</span>
        <span className="text-text-secondary">{t('studio2.fp.vesting')}</span>
        <span className="text-text-primary">
          {sale.vesting_num_slices} × {Math.round(sale.vesting_slice_period_sec / 86400)}{t('studio2.fp.days')}
        </span>
      </div>

      <div className="flex gap-2 pt-1">
        {sale.status === 'draft_config' && (
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={() => onEdit(sale)}
          >
            {t('studio2.fp.editDraft')}
          </Button>
        )}
        {(sale.status === 'subscribing' || sale.status === 'vesting' || sale.status === 'done') && (
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={() => nav(`/project/${sale.project_id}/fixed-price`)}
          >
            {t('studio2.fp.viewOrders')}
          </Button>
        )}
        {sale.status === 'submitted' && (
          <p className="flex-1 rounded-xl bg-warn-500/10 px-3 py-2 text-center text-[10px] text-warn-400">
            {t('studio2.fp.pendingAdmin')}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── WizardView ───────────────────────────────────────────────────────── */

function WizardView({
  step,
  form,
  priceDisplay,
  targetDisplay,
  sliceInputs,
  locale,
  saving,
  submitting,
  onBack,
  onNext,
  onSaveDraft,
  onSubmit,
  onSetForm,
  onSetPrice,
  onSetTarget,
  onSetSliceInputs,
}: {
  step: number;
  form: CreatorFixedPriceSaleBody;
  priceDisplay: string;
  targetDisplay: string;
  sliceInputs: string[];
  locale: string;
  saving: boolean;
  submitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onSetForm: (p: Partial<CreatorFixedPriceSaleBody>) => void;
  onSetPrice: (v: string) => void;
  onSetTarget: (v: string) => void;
  onSetSliceInputs: (arr: string[]) => void;
}) {
  const { t } = useTranslation();

  const stepError = useMemo(() => validateStep(step, form, sliceInputs, t), [step, form, sliceInputs, t]);

  return (
    <div className="flex flex-col gap-4 p-3 pb-10">
      {/* header */}
      <div className="flex items-center gap-2">
        <button type="button" className="rounded-lg p-2 hover:bg-white/5" onClick={onBack}>
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold">{t('studio2.fp.wizardTitle')}</p>
          <p className="text-[10px] text-text-secondary">
            Step {step} / {MAX_STEPS}
          </p>
        </div>
      </div>

      {/* stepper */}
      <div className="flex items-center gap-1">
        {Array.from({ length: MAX_STEPS }, (_, i) => i + 1).map((s) => (
          <div key={s} className="flex flex-1 items-center gap-1">
            <div
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-[10px] font-bold',
                s < step ? 'bg-accent-gradient text-white'
                  : s === step ? 'ring-2 ring-accent-500 text-accent-400'
                  : 'bg-white/10 text-text-secondary',
              )}
            >
              {s}
            </div>
            {s < MAX_STEPS && (
              <div className={cn('h-0.5 flex-1 rounded', s < step ? 'bg-accent-500' : 'bg-white/10')} />
            )}
          </div>
        ))}
      </div>

      {/* step content */}
      {step === 1 && (
        <Step1
          form={form}
          priceDisplay={priceDisplay}
          targetDisplay={targetDisplay}
          locale={locale}
          onSetPrice={onSetPrice}
          onSetTarget={onSetTarget}
        />
      )}
      {step === 2 && (
        <Step2 form={form} onSetForm={onSetForm} />
      )}
      {step === 3 && (
        <Step3
          form={form}
          sliceInputs={sliceInputs}
          locale={locale}
          onSetForm={onSetForm}
          onSetSliceInputs={onSetSliceInputs}
        />
      )}

      {/* error */}
      {stepError && (
        <div className="flex items-start gap-2 rounded-xl bg-danger-500/10 px-3 py-2">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-danger-400" />
          <p className="text-[11px] text-danger-400">{stepError}</p>
        </div>
      )}

      {/* actions */}
      <div className="flex gap-2">
        {step < MAX_STEPS ? (
          <Button
            className="flex-1"
            disabled={!!stepError}
            onClick={onNext}
          >
            {t('common.next')}
            <ChevronRight className="ml-1 size-4" />
          </Button>
        ) : (
          <>
            <Button
              variant="secondary"
              className="flex-1"
              disabled={saving}
              onClick={onSaveDraft}
            >
              {saving ? '…' : t('fixedPriceApply.saveDraft')}
            </Button>
            <Button
              className="flex-1"
              disabled={!!stepError || submitting}
              onClick={onSubmit}
            >
              {submitting ? '…' : t('studio2.fp.submitReview')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Step 1 ───────────────────────────────────────────────────────────── */

/* Fixed allocation — protocol-level, not configurable by creator */
const FIXED_ALLOC = [
  { key: 'allocPublic',  bps: 6000, color: 'bg-accent-500',  textColor: 'text-accent-400' },
  { key: 'allocDev',     bps: 3000, color: 'bg-info-500',    textColor: 'text-info-400' },
  { key: 'allocAirdrop', bps: 1000, color: 'bg-success-500', textColor: 'text-success-400' },
] as const;

function Step1({
  form,
  priceDisplay,
  targetDisplay,
  locale,
  onSetPrice,
  onSetTarget,
}: {
  form: CreatorFixedPriceSaleBody;
  priceDisplay: string;
  targetDisplay: string;
  locale: string;
  onSetPrice: (v: string) => void;
  onSetTarget: (v: string) => void;
}) {
  const { t } = useTranslation();

  const alloc = computeAllocations(
    form.target_usdt_raw,
    form.price_usdt_per_token_raw,
    6000, 3000, 1000,
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-accent-400">{t('studio2.fp.step1Title')}</p>

      <FormCard>
        <FormRow label={t('fixedPriceApply.priceField')}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">$</span>
            <Input
              inputMode="decimal"
              value={priceDisplay}
              onChange={(e) => onSetPrice(e.target.value.replace(/[^0-9.]/g, ''))}
              className="pl-6 font-mono text-xs"
              placeholder="0.15"
            />
          </div>
        </FormRow>

        <FormRow label={t('fixedPriceApply.targetField')}>
          <div className="flex flex-col gap-1.5">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">$</span>
              <Input
                inputMode="decimal"
                value={targetDisplay}
                onChange={(e) => onSetTarget(e.target.value.replace(/[^0-9.]/g, ''))}
                className="pl-6 font-mono text-xs"
                placeholder="200000"
              />
            </div>
            <div className="flex gap-1.5">
              {['50000', '100000', '200000', '500000'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onSetTarget(String(Number(preset)))}
                  className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-text-secondary hover:bg-accent-500/20 hover:text-accent-400"
                >
                  {Number(preset) >= 1000 ? `${Number(preset) / 1000}k` : preset}
                </button>
              ))}
            </div>
          </div>
        </FormRow>
      </FormCard>

      {/* fixed allocation — read-only */}
      <div className="rounded-2xl bg-surface p-3 ring-1 ring-white/10">
        <div className="mb-3 flex items-center gap-1.5">
          <Lock className="size-3 text-text-secondary/60" />
          <p className="text-[11px] font-semibold text-text-secondary">{t('studio2.fp.alloc')}</p>
          <span className="ml-auto text-[10px] text-text-secondary/50">{t('studio2.fp.allocFixed')}</span>
        </div>

        {/* proportion bar */}
        <div className="mb-3 flex h-2 w-full overflow-hidden rounded-full">
          {FIXED_ALLOC.map((a) => (
            <div key={a.key} className={cn('h-full', a.color)} style={{ width: `${a.bps / 100}%` }} />
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {FIXED_ALLOC.map((a) => (
            <div key={a.key} className="flex items-center gap-2">
              <div className={cn('size-2 shrink-0 rounded-full', a.color)} />
              <span className="flex-1 text-[11px] text-text-secondary">{t(`studio2.fp.${a.key}`)}</span>
              <span className={cn('font-mono text-sm font-bold tabular-nums', a.textColor)}>
                {a.bps / 100}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* token allocation preview */}
      {alloc && (
        <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/8">
          <div className="mb-2 flex items-center gap-1.5">
            <Info className="size-3 text-accent-400" />
            <p className="text-[10px] font-semibold text-accent-400">{t('studio2.fp.allocPreview')}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <span className="text-text-secondary">{t('studio2.fp.totalTokens')}</span>
            <span className="font-mono text-text-primary">{Math.round(alloc.total).toLocaleString(locale)}</span>
            <span className="text-text-secondary">{t('studio2.fp.allocPublic')}</span>
            <span className="font-mono text-text-primary">{Math.round(alloc.pub).toLocaleString(locale)}</span>
            <span className="text-text-secondary">{t('studio2.fp.allocDev')}</span>
            <span className="font-mono text-text-primary">{Math.round(alloc.dev).toLocaleString(locale)}</span>
            <span className="text-text-secondary">{t('studio2.fp.allocAirdrop')}</span>
            <span className="font-mono text-text-primary">{Math.round(alloc.airdrop).toLocaleString(locale)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Step 2 ───────────────────────────────────────────────────────────── */

function Step2({
  form,
  onSetForm,
}: {
  form: CreatorFixedPriceSaleBody;
  onSetForm: (p: Partial<CreatorFixedPriceSaleBody>) => void;
}) {
  const { t } = useTranslation();
  const windowDays = form.sale_end_unix && form.sale_start_unix
    ? daysBetween(form.sale_start_unix, form.sale_end_unix)
    : 0;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-accent-400">{t('studio2.fp.step2Title')}</p>

      <FormCard>
        <FormRow label={t('fixedPriceApply.startTime')}>
          <DateInput
            value={unixToLocal(form.sale_start_unix)}
            onChange={(v) => onSetForm({ sale_start_unix: localToUnix(v) })}
          />
        </FormRow>

        <FormRow label={t('fixedPriceApply.endTime')}>
          <DateInput
            value={unixToLocal(form.sale_end_unix)}
            min={unixToLocal(form.sale_start_unix)}
            onChange={(v) => onSetForm({ sale_end_unix: localToUnix(v) })}
          />
        </FormRow>

        <FormRow label={t('studio2.fp.vestingStart')}>
          <DateInput
            value={unixToLocal(form.vesting_start_unix)}
            min={unixToLocal(form.sale_end_unix)}
            onChange={(v) => onSetForm({ vesting_start_unix: localToUnix(v) })}
          />
        </FormRow>
      </FormCard>

      {windowDays > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2">
          <Clock className="size-3.5 text-accent-400" />
          <p className="text-[11px] text-text-secondary">
            {t('fixedPriceApply.windowDuration', { n: windowDays })}
            {windowDays > MAX_WINDOW_DAYS && (
              <span className="ml-1 text-danger-400">({t('studio2.fp.maxWindow', { n: MAX_WINDOW_DAYS })})</span>
            )}
          </p>
        </div>
      )}

      <div className="rounded-xl bg-info-500/8 px-3 py-2">
        <p className="text-[10px] text-info-400">{t('studio2.fp.windowHint')}</p>
      </div>
    </div>
  );
}

/* ── Step 3 ───────────────────────────────────────────────────────────── */

function Step3({
  form,
  sliceInputs,
  locale,
  onSetForm,
  onSetSliceInputs,
}: {
  form: CreatorFixedPriceSaleBody;
  sliceInputs: string[];
  locale: string;
  onSetForm: (p: Partial<CreatorFixedPriceSaleBody>) => void;
  onSetSliceInputs: (arr: string[]) => void;
}) {
  const { t } = useTranslation();
  const n = form.vesting_num_slices;

  const normalizedInputs = useMemo(() => {
    const arr = [...sliceInputs];
    while (arr.length < n - 1) arr.push('');
    return arr.slice(0, n - 1);
  }, [sliceInputs, n]);

  const bpsVals = normalizedInputs.map((v) => Math.round(Number(v) * 100));
  const sum = bpsVals.reduce((a, b) => a + b, 0);
  const lastBps = 10000 - sum;
  const allVals = [...bpsVals, lastBps];

  const intervalDays = Math.round(form.vesting_slice_period_sec / 86400);

  const updateSlice = (idx: number, val: string) => {
    const arr = [...normalizedInputs];
    arr[idx] = val;
    onSetSliceInputs(arr);
  };

  const presetIntervals = [7, 14, 30, 60, 90, 180];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-accent-400">{t('studio2.fp.step3Title')}</p>

      <FormCard>
        <FormRow label={t('studio2.fp.sliceCount')}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold hover:bg-white/15"
              onClick={() => {
                const next = Math.max(1, n - 1);
                onSetForm({ vesting_num_slices: next });
                onSetSliceInputs(normalizedInputs.slice(0, next - 1));
              }}
            >
              −
            </button>
            <span className="min-w-[2ch] text-center text-sm font-semibold tabular-nums">{n}</span>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold hover:bg-white/15"
              onClick={() => {
                const next = Math.min(12, n + 1);
                onSetForm({ vesting_num_slices: next });
                const newInputs = [...normalizedInputs];
                while (newInputs.length < next - 1) newInputs.push('');
                onSetSliceInputs(newInputs);
              }}
            >
              +
            </button>
            <span className="text-[10px] text-text-secondary">(1–12)</span>
          </div>
        </FormRow>

        <FormRow label={t('studio2.fp.intervalDays')}>
          <div className="flex flex-col gap-1.5">
            <Input
              inputMode="numeric"
              value={intervalDays}
              onChange={(e) => {
                const d = parseInt(e.target.value, 10);
                if (!isNaN(d) && d > 0) {
                  onSetForm({ vesting_slice_period_sec: d * 86400 });
                }
              }}
              className="font-mono text-xs"
            />
            <div className="flex flex-wrap gap-1">
              {presetIntervals.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onSetForm({ vesting_slice_period_sec: d * 86400 })}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] transition',
                    intervalDays === d
                      ? 'bg-accent-500/30 text-accent-400'
                      : 'bg-white/8 text-text-secondary hover:bg-white/15',
                  )}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </FormRow>
      </FormCard>

      {/* per-slice inputs */}
      <div className="flex flex-col gap-2 rounded-2xl bg-surface p-3 ring-1 ring-white/10">
        <p className="text-[11px] font-semibold text-text-secondary">{t('studio2.fp.slicePcts')}</p>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: n }, (_, i) => {
            const isLast = i === n - 1;
            return (
              <div key={i} className="flex items-center gap-1.5 rounded-xl bg-black/20 px-2 py-2">
                <span className="w-8 text-[10px] text-text-secondary">
                  {t('studio2.fp.sliceN', { n: i + 1 })}
                </span>
                {isLast ? (
                  <span
                    className={cn(
                      'flex-1 font-mono text-xs tabular-nums',
                      lastBps > 0 ? 'text-success-400' : 'text-danger-400',
                    )}
                  >
                    {lastBps > 0 ? `${(lastBps / 100).toFixed(0)}%` : t('studio2.fp.sliceAuto')}
                  </span>
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={normalizedInputs[i] ?? ''}
                    onChange={(e) => updateSlice(i, e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="25"
                    className="w-0 flex-1 bg-transparent font-mono text-xs text-text-primary tabular-nums outline-none"
                  />
                )}
                {!isLast && <span className="text-[10px] text-text-secondary">%</span>}
              </div>
            );
          })}
        </div>
        {sum > 10000 && (
          <p className="text-[10px] text-danger-400">{t('fixedPriceApply.err.bpsSum', { sum })}</p>
        )}
        {lastBps <= 0 && sum <= 10000 && (
          <p className="text-[10px] text-danger-400">{t('studio2.fp.lastSliceZero')}</p>
        )}
      </div>

      {/* vesting preview */}
      <VestingPreview
        slices={n}
        allVals={allVals}
        periodSec={form.vesting_slice_period_sec}
        startUnix={form.vesting_start_unix}
        locale={locale}
      />
    </div>
  );
}

/* ── VestingPreview ───────────────────────────────────────────────────── */

function VestingPreview({
  slices,
  allVals,
  periodSec,
  startUnix,
  locale,
}: {
  slices: number;
  allVals: number[];
  periodSec: number;
  startUnix: number;
  locale: string;
}) {
  const { t } = useTranslation();
  if (!startUnix || allVals.some(isNaN)) return null;

  return (
    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/8">
      <div className="mb-2 flex items-center gap-1.5">
        <FileText className="size-3 text-accent-400" />
        <p className="text-[10px] font-semibold text-accent-400">{t('studio2.fp.vestingPreview')}</p>
      </div>
      <div className="flex flex-col gap-1">
        {Array.from({ length: slices }, (_, i) => {
          const unlockAt = startUnix + i * periodSec;
          const dateStr = new Date(unlockAt * 1000).toLocaleDateString(locale, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          const bps = allVals[i] ?? 0;
          return (
            <div key={i} className="flex items-center justify-between text-[10px]">
              <span className="text-text-secondary">
                {t('studio2.fp.sliceN', { n: i + 1 })} · {dateStr}
              </span>
              <span className={bps > 0 ? 'font-mono text-success-400' : 'font-mono text-danger-400'}>
                +{(bps / 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── validation ───────────────────────────────────────────────────────── */

function validateStep(
  step: number,
  form: CreatorFixedPriceSaleBody,
  sliceInputs: string[],
  t: ReturnType<typeof useTranslation>['t'],
): string | null {
  if (step === 1) {
    if (!form.price_usdt_per_token_raw || BigInt(form.price_usdt_per_token_raw) <= 0n)
      return t('fixedPriceApply.err.priceZero');
    const targetUsdt = Number(form.target_usdt_raw) / 1_000_000;
    if (targetUsdt < MIN_TARGET_USDT)
      return t('fixedPriceApply.err.targetTooLow', { min: MIN_TARGET_USDT.toLocaleString() });
    // allocation is protocol-fixed 60/30/10, no validation needed
  }
  if (step === 2) {
    if (!form.sale_start_unix) return t('fixedPriceApply.err.pickSaleStart');
    if (!form.sale_end_unix) return t('fixedPriceApply.err.pickSaleEnd');
    if (form.sale_end_unix <= form.sale_start_unix) return t('fixedPriceApply.err.endAfterStart');
    const days = daysBetween(form.sale_start_unix, form.sale_end_unix);
    if (days < MIN_WINDOW_DAYS)
      return t('studio2.fp.minWindow', { n: MIN_WINDOW_DAYS });
    if (days > MAX_WINDOW_DAYS)
      return t('studio2.fp.maxWindow', { n: MAX_WINDOW_DAYS });
    if (!form.vesting_start_unix) return t('fixedPriceApply.err.pickVestStart');
    if (form.vesting_start_unix < form.sale_end_unix) return t('fixedPriceApply.err.vestAfterSale');
  }
  if (step === 3) {
    const n = form.vesting_num_slices;
    const bpsVals = sliceInputs.slice(0, n - 1).map((v) => Math.round(Number(v) * 100));
    const sumPrev = bpsVals.reduce((a, b) => a + b, 0);
    const lastBps = 10000 - sumPrev;
    if (bpsVals.some(isNaN) || bpsVals.some((v) => v <= 0))
      return t('fixedPriceApply.err.bpsZeroSlice');
    if (lastBps <= 0)
      return t('studio2.fp.lastSliceZero');
  }
  return null;
}

/* ── small UI helpers ─────────────────────────────────────────────────── */

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-2xl bg-surface p-3 ring-1 ring-white/10">
      {children}
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-text-secondary">{label}</span>
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
        className="w-full rounded-xl bg-elevated px-3 py-2.5 text-xs text-text-primary ring-1 ring-white/10 focus:outline-none focus:ring-accent-500/50"
      />
      <Calendar className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-text-secondary" />
    </div>
  );
}
