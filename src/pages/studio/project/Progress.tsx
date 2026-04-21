import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FileListItem, FileUpload, type UploadedFile } from '@/components/ui/FileUpload';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError, apiFetch } from '@/lib/api';
import { formatDateTime } from '@/lib/fmt';
import { RequireCreator } from '@/routes/guards';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

interface ProgressRow {
  progress_id: string;
  project_id: number;
  title?: string;
  body: string;
  attachments: { url: string; type: string; size: number }[];
  is_draft: boolean;
  created_at: number;
}

export default function StudioProjectProgress() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const { data: list, isPending } = useQuery({
    queryKey: ['launch', 'project', 'progress', id],
    queryFn: () => apiFetch<ProgressRow[]>(`/launch/project/${id}/progress`),
    enabled: !!id,
  });

  const save = useMutation({
    mutationFn: (isDraft: boolean) =>
      apiFetch(`/launch/project/${id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || undefined,
          body,
          attachments: files.map((f) => ({ url: f.url, type: f.type, size: f.size })),
          is_draft: isDraft,
        }),
      }),
    onSuccess: async (_, isDraft) => {
      toast.success(isDraft ? t('studio2.progress.saveDraft') : t('studio2.progress.publish'));
      setTitle('');
      setBody('');
      setFiles([]);
      await qc.invalidateQueries({ queryKey: ['launch', 'project', 'progress', id] });
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
            <h1 className="text-lg font-semibold">{t('studio.progress')}</h1>
          </div>

          <section className="flex flex-col gap-2 rounded-2xl bg-surface p-3 ring-1 ring-white/10">
            <p className="text-xs font-semibold text-text-secondary">
              {t('studio2.progress.newTitle')}
            </p>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-text-secondary">
                {t('studio2.progress.titleLabel')}
              </span>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-text-secondary">
                {t('studio2.progress.bodyLabel')}
              </span>
              <textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={String(t('studio2.progress.bodyPh'))}
                className="rounded-xl border border-white/10 bg-elevated px-3 py-2 text-sm outline-none focus:border-accent-500/50"
              />
            </label>
            <FileUpload multiple onChange={(f) => setFiles((prev) => [...prev, ...f])} />
            {files.length ? (
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <FileListItem key={`${f.url}-${i}`} f={f} />
                ))}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                loading={save.isPending}
                disabled={body.trim().length < 1}
                onClick={() => save.mutate(true)}
              >
                {t('studio2.progress.saveDraft')}
              </Button>
              <Button
                loading={save.isPending}
                disabled={body.trim().length < 10}
                onClick={() => save.mutate(false)}
              >
                {t('studio2.progress.publish')}
              </Button>
            </div>
          </section>

          <section>
            <p className="mb-1.5 text-xs font-semibold text-text-secondary">
              {t('studio2.progress.history')}
            </p>
            {isPending ? <Skeleton className="h-24 w-full rounded-2xl" /> : null}
            {!isPending && (list ?? []).length === 0 ? (
              <p className="py-6 text-center text-xs text-text-secondary">
                {t('studio2.progress.empty')}
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              {(list ?? []).map((r) => (
                <div key={r.progress_id} className="rounded-2xl bg-surface p-3 ring-1 ring-white/10">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium">{r.title || '—'}</p>
                    <Badge>{r.is_draft ? t('reconcile.draft') : t('reconcile.publish')}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-text-secondary">
                    {r.body}
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
