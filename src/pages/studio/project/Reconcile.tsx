import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FileListItem, FileUpload, type UploadedFile } from '@/components/ui/FileUpload';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/fmt';
import { RequireCreator } from '@/routes/guards';
import type { ReconcileRevenueLogRow } from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const TYPES = ['copyright', 'platform', 'commercial', 'box_office', 'other'] as const;
const TYPE_LABEL: Record<(typeof TYPES)[number], string> = {
  copyright: 'studio2.reconcile.typeCopyright',
  platform: 'studio2.reconcile.typePlatform',
  commercial: 'studio2.reconcile.typeCommercial',
  box_office: 'studio2.reconcile.typeBoxOffice',
  other: 'studio2.reconcile.typeOther',
};

export default function StudioProjectReconcile() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();

  const [type, setType] = useState<(typeof TYPES)[number]>('copyright');
  const [amount, setAmount] = useState('500');
  const [desc, setDesc] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const { data, isPending } = useQuery({
    queryKey: ['rwa', 'project', 'reconciles', id, 'mine'],
    queryFn: () => apiFetch<ReconcileRevenueLogRow[]>(`/rwa/project/${id}/reconciles?mine=true`),
    enabled: !!id,
  });

  const save = useMutation({
    mutationFn: (isDraft: boolean) =>
      apiFetch(`/rwa/project/${id}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revenue_type: type,
          amount_usd: amount,
          description: desc,
          evidence_urls: files.map((f) => f.url),
          is_draft: isDraft,
        }),
      }),
    onSuccess: async (_, isDraft) => {
      toast.success(isDraft ? t('studio2.reconcile.saveDraft') : t('studio2.reconcile.publish'));
      setAmount('');
      setDesc('');
      setFiles([]);
      await qc.invalidateQueries({ queryKey: ['rwa', 'project', 'reconciles', id, 'mine'] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  return (
    <RequireCreator>
      <AppShell>
        <div className="flex flex-col gap-3 p-3 pb-8">
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg p-2 hover:bg-white/5" onClick={() => nav(-1)}>
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="text-lg font-semibold">{t('studio.reconcile')}</h1>
          </div>

          <section className="flex flex-col gap-2 rounded-2xl bg-surface p-3 ring-1 ring-white/10">
            <p className="text-xs font-semibold text-text-secondary">
              {t('studio2.reconcile.newTitle')}
            </p>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-text-secondary">
                {t('studio2.reconcile.revType')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((x) => (
                  <button
                    key={x}
                    type="button"
                    onClick={() => setType(x)}
                    className={cn(
                      'rounded-full px-3 py-1 text-[11px] transition',
                      type === x
                        ? 'bg-accent-gradient text-white'
                        : 'bg-black/30 text-text-secondary hover:bg-white/10',
                    )}
                  >
                    {t(TYPE_LABEL[x] as 'common.ok')}
                  </button>
                ))}
              </div>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-text-secondary">
                {t('studio2.reconcile.amount')}
              </span>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="font-mono text-xs"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-text-secondary">{t('studio2.reconcile.desc')}</span>
              <textarea
                rows={3}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="rounded-xl border border-white/10 bg-elevated px-3 py-2 text-sm outline-none focus:border-accent-500/50"
              />
            </label>

            <div>
              <p className="mb-1 text-[11px] text-text-secondary">
                {t('studio2.reconcile.evidence')}
              </p>
              <FileUpload multiple onChange={(f) => setFiles((prev) => [...prev, ...f])} />
              {files.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <FileListItem key={`${f.url}-${i}`} f={f} />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                loading={save.isPending}
                disabled={!amount}
                onClick={() => save.mutate(true)}
              >
                {t('studio2.reconcile.saveDraft')}
              </Button>
              <Button
                loading={save.isPending}
                disabled={!amount || desc.trim().length < 5}
                onClick={() => save.mutate(false)}
              >
                {t('studio2.reconcile.publish')}
              </Button>
            </div>
          </section>

          <section>
            <p className="mb-1.5 text-xs font-semibold text-text-secondary">
              {t('studio2.reconcile.history')}
            </p>
            {isPending ? <Skeleton className="h-24 w-full rounded-2xl" /> : null}
            {!isPending && (data ?? []).length === 0 ? (
              <p className="py-6 text-center text-xs text-text-secondary">
                {t('studio2.reconcile.empty')}
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              {(data ?? []).map((r) => (
                <div key={r.id} className="rounded-2xl bg-surface p-3 ring-1 ring-white/10">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {TYPE_LABEL[r.revenue_type as (typeof TYPES)[number]]
                        ? t(TYPE_LABEL[r.revenue_type as (typeof TYPES)[number]] as 'common.ok')
                        : r.revenue_type}
                    </p>
                    <Badge>{r.status}</Badge>
                  </div>
                  <p className="mt-1 font-mono text-sm tabular-nums text-text-primary">
                    ${Number(r.amount_usd).toLocaleString(i18n.language)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-text-secondary">
                    {r.description}
                  </p>
                  <p className="mt-1 text-[10px] text-text-secondary">
                    {formatDateTime(r.created_at, i18n.language)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </AppShell>
    </RequireCreator>
  );
}
