import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FileListItem, FileUpload, type UploadedFile } from '@/components/ui/FileUpload';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { RequireCreator } from '@/routes/guards';
import type {
  MilestoneNodeStatus,
  MilestoneProjectNode,
  MilestoneTemplateNode,
  OnChainDetail,
} from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const STATUS_KEY: Record<MilestoneNodeStatus, string> = {
  empty: 'milestoneNode.statusEmpty',
  submitted: 'milestoneNode.statusSubmitted',
  pending_review: 'milestoneNode.statusPending',
  rejected: 'milestoneNode.statusRejected',
  approved: 'milestoneNode.statusApproved',
  public_display: 'milestoneNode.statusPublic',
  claimable: 'milestoneNode.statusClaimable',
  unlocked: 'milestoneNode.statusUnlocked',
};

const REQ_LABEL: Record<'image' | 'video' | 'pdf', string> = {
  image: 'studioWizard.step4ReqImage',
  video: 'studioWizard.step4ReqVideo',
  pdf: 'studioWizard.step4ReqPdf',
};

export default function StudioMilestoneNodeDetail() {
  const { id, step } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const nodeIdx = Number(step);

  const { data: project } = useQuery({
    queryKey: ['launch', 'on-chain', 'detail', id],
    queryFn: () => apiFetch<OnChainDetail>(`/launch/on-chain/detail?project_id=${id}`),
    enabled: !!id,
  });
  const { data: nodes, isPending } = useQuery({
    queryKey: ['rwa', 'project', 'milestones', id],
    queryFn: () => apiFetch<MilestoneProjectNode[]>(`/rwa/project/${id}/milestones`),
    enabled: !!id,
  });
  const { data: tpl } = useQuery({
    queryKey: ['milestone', 'templates', project?.work_type],
    queryFn: () =>
      apiFetch<MilestoneTemplateNode[]>(
        `/rwa/milestone/templates?work_type=${encodeURIComponent(project?.work_type ?? '')}`,
      ),
    enabled: !!project?.work_type,
  });

  const node = (nodes ?? []).find((n) => n.node_index === nodeIdx);
  const tplNode = (tpl ?? []).find((n) => n.node_index === nodeIdx);

  const [desc, setDesc] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);

  useEffect(() => {
    if (node?.description) setDesc(node.description);
  }, [node?.description]);

  const editable =
    !node || node.status === 'empty' || node.status === 'rejected' || node.status === 'submitted';

  const m = useMutation({
    mutationFn: () =>
      apiFetch(`/rwa/project/${id}/milestone/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_index: nodeIdx,
          description: desc,
          attachments: files.map((f) => ({ url: f.url, type: f.type, size: f.size })),
        }),
      }),
    onSuccess: async () => {
      toast.success(t('milestone.submit'));
      await qc.invalidateQueries({ queryKey: ['rwa', 'project', 'milestones', id] });
      nav(`/studio/project/${id}/milestone`);
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
            <h1 className="text-lg font-semibold">{t('milestone.node', { n: nodeIdx })}</h1>
            {node ? (
              <Badge>{t(STATUS_KEY[node.status] as 'common.ok')}</Badge>
            ) : null}
          </div>

          {isPending ? <Skeleton className="h-48 w-full rounded-2xl" /> : null}

          {tplNode ? (
            <section className="rounded-2xl bg-surface p-3 text-xs ring-1 ring-white/10">
              <p className="font-semibold text-text-secondary">{t('milestoneNode.templateTitle')}</p>
              <p className="mt-1 text-text-primary">{tplNode.title}</p>
              <p className="mt-1 font-mono text-[10px] text-accent-500">
                {tplNode.bps} bps ·{' '}
                {t('milestoneNode.reqMix', {
                  types: tplNode.required_attachments
                    .map((r) => t(REQ_LABEL[r] as 'common.ok'))
                    .join(' · '),
                })}
              </p>
            </section>
          ) : null}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-text-secondary">{t('studio2.milestone.descPh')}</span>
            <textarea
              rows={4}
              disabled={!editable}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className={cn(
                'rounded-xl border border-white/10 bg-elevated px-3 py-2 text-sm outline-none focus:border-accent-500/50',
                !editable && 'opacity-60',
              )}
            />
          </label>

          {editable ? (
            <div>
              <p className="mb-1.5 text-xs text-text-secondary">
                {t('studio2.milestone.attachments')}
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
          ) : null}

          {node?.evidence?.length ? (
            <div>
              <p className="mb-1.5 text-xs text-text-secondary">{t('studio2.milestone.history')}</p>
              <div className="flex flex-wrap gap-2">
                {node.evidence.map((e, i) => (
                  <div
                    key={`${e.url}-${i}`}
                    className="max-w-full truncate rounded-lg bg-surface px-3 py-1.5 font-mono text-[10px]"
                  >
                    {e.type} · {Math.round(e.size / 1024)}KB
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {editable ? (
            <Button
              loading={m.isPending}
              disabled={desc.trim().length < 10}
              onClick={() => m.mutate()}
            >
              {t('studio2.milestone.submitReview')}
            </Button>
          ) : null}
        </div>
      </AppShell>
    </RequireCreator>
  );
}
