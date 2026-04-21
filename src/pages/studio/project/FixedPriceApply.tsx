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
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

function initialForm(projectId: number): FixedPriceApplyBody {
  const now = Math.floor(Date.now() / 1000);
  return {
    project_id: projectId,
    price_usdt_per_token_raw: '150000',
    target_usdt_raw: '200000000000',
    sale_start_unix: now + 86400 * 3,
    sale_end_unix: now + 86400 * 10,
    vesting_num_slices: 4,
    vesting_slice_period_sec: 86400 * 30,
    vesting_percentages_bps_csv: '2500,2500,2500,2500',
    vesting_start_unix: now + 86400 * 11,
    note: '',
  };
}

function validateForm(f: FixedPriceApplyBody): string | null {
  if (!f.price_usdt_per_token_raw || BigInt(f.price_usdt_per_token_raw) <= 0n) return 'price';
  if (!f.target_usdt_raw || BigInt(f.target_usdt_raw) <= 0n) return 'target';
  if (f.sale_end_unix <= f.sale_start_unix) return 'sale_window';
  const csvParts = f.vesting_percentages_bps_csv.split(',').map((x) => Number(x.trim()));
  if (csvParts.length !== f.vesting_num_slices) return 'csv_len';
  const sum = csvParts.reduce((a, b) => a + b, 0);
  if (sum !== 10_000) return 'csv_sum';
  if (f.vesting_start_unix < f.sale_end_unix) return 'vesting_start';
  return null;
}

export default function StudioProjectFixedPriceApply() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const pid = Number(id);

  const [form, setForm] = useState<FixedPriceApplyBody>(initialForm(pid));

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
  const err = validateForm(form);

  return (
    <RequireCreator>
      <AppShell>
        <div className="flex flex-col gap-3 p-3 pb-8">
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg p-2 hover:bg-white/5" onClick={() => nav(-1)}>
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="text-lg font-semibold">{t('studio2.fp.title')}</h1>
          </div>

          <p className="rounded-xl bg-warn-500/10 p-2 text-[11px] text-warn-500">
            {t('studio2.fp.todoC')}
          </p>

          <section className="grid grid-cols-2 gap-2 rounded-2xl bg-surface p-3 ring-1 ring-white/10">
            <Field label={t('studio2.fp.price')}>
              <Input
                value={form.price_usdt_per_token_raw}
                onChange={(e) => set({ price_usdt_per_token_raw: e.target.value.replace(/[^0-9]/g, '') })}
                className="font-mono text-xs"
              />
            </Field>
            <Field label={t('studio2.fp.target')}>
              <Input
                value={form.target_usdt_raw}
                onChange={(e) => set({ target_usdt_raw: e.target.value.replace(/[^0-9]/g, '') })}
                className="font-mono text-xs"
              />
            </Field>
            <Field label={t('studio2.fp.saleStart')}>
              <Input
                value={String(form.sale_start_unix)}
                onChange={(e) => set({ sale_start_unix: Number(e.target.value) || 0 })}
                className="font-mono text-xs"
              />
            </Field>
            <Field label={t('studio2.fp.saleEnd')}>
              <Input
                value={String(form.sale_end_unix)}
                onChange={(e) => set({ sale_end_unix: Number(e.target.value) || 0 })}
                className="font-mono text-xs"
              />
            </Field>
            <Field label={t('studio2.fp.slices')}>
              <Input
                value={String(form.vesting_num_slices)}
                onChange={(e) => set({ vesting_num_slices: Number(e.target.value) || 0 })}
                className="font-mono text-xs"
              />
            </Field>
            <Field label={t('studio2.fp.slicePeriod')}>
              <Input
                value={String(form.vesting_slice_period_sec)}
                onChange={(e) => set({ vesting_slice_period_sec: Number(e.target.value) || 0 })}
                className="font-mono text-xs"
              />
            </Field>
            <div className="col-span-2">
              <Field label={t('studio2.fp.percentCsv')}>
                <Input
                  value={form.vesting_percentages_bps_csv}
                  onChange={(e) => set({ vesting_percentages_bps_csv: e.target.value })}
                  className="font-mono text-xs"
                />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label={t('studio2.fp.vestingStart')}>
                <Input
                  value={String(form.vesting_start_unix)}
                  onChange={(e) => set({ vesting_start_unix: Number(e.target.value) || 0 })}
                  className="font-mono text-xs"
                />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label={t('studio2.fp.note')}>
                <Input
                  value={form.note ?? ''}
                  onChange={(e) => set({ note: e.target.value })}
                />
              </Field>
            </div>
          </section>

          {err ? (
            <p className="text-[11px] text-danger-500">
              {t('errors.4010')} · {err}
            </p>
          ) : null}

          <Button loading={submit.isPending} disabled={!!err} onClick={() => submit.mutate()}>
            {t('studio2.fp.submit')}
          </Button>

          <section>
            <p className="mb-1.5 text-xs font-semibold text-text-secondary">
              {t('studio2.fp.appliedList')}
            </p>
            {isPending ? <Skeleton className="h-24 w-full rounded-2xl" /> : null}
            <div className="flex flex-col gap-2">
              {(applies ?? []).map((a) => (
                <div key={a.apply_id} className="rounded-2xl bg-surface p-3 ring-1 ring-white/10">
                  <div className="flex items-center justify-between">
                    <p className="truncate font-mono text-[11px] text-text-secondary">
                      {a.apply_id.slice(0, 12)}…
                    </p>
                    <Badge>{a.status}</Badge>
                  </div>
                  <p className="mt-1 text-[10px] text-text-secondary">
                    {formatDateTime(a.created_at, i18n.language)}
                  </p>
                  {a.note ? <p className="mt-1 text-xs text-text-primary">{a.note}</p> : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      </AppShell>
    </RequireCreator>
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
