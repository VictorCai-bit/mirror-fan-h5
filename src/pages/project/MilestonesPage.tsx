import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatPercentFromBps } from '@/lib/fmt';
import type { MilestoneProjectNode, MilestoneNodeStatus, OnChainDetail } from '@/types/api';
import { useCountdown } from '@/hooks/useCountdown';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronDown, CheckCircle2, XCircle, Clock, Circle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

const STATUS_CONFIG: Record<MilestoneNodeStatus, { icon: React.ReactNode; color: string; label: string }> = {
  claimable:      { icon: <CheckCircle2 className="size-4" />, color: 'text-success-400', label: '可提取' },
  unlocked:       { icon: <CheckCircle2 className="size-4" />, color: 'text-success-400', label: '已解锁' },
  public_display: { icon: <Clock className="size-4 animate-pulse" />, color: 'text-info-400', label: '公示中' },
  approved:       { icon: <CheckCircle2 className="size-4" />, color: 'text-success-400', label: '已通过' },
  submitted:      { icon: <Clock className="size-4" />, color: 'text-warning-400', label: '审核中' },
  pending_review: { icon: <Clock className="size-4" />, color: 'text-warning-400', label: '待审核' },
  rejected:       { icon: <XCircle className="size-4" />, color: 'text-danger-400', label: '已驳回' },
  empty:          { icon: <Circle className="size-4" />, color: 'text-text-secondary/40', label: '未达到' },
};

function NodeCountdown({ endAt }: { endAt: number }) {
  const cd = useCountdown(endAt);
  if (!cd) return null;
  return <span className="tabular-nums text-info-400">{cd.label}</span>;
}

function MilestoneNode({ node, isLast, locale }: { node: MilestoneProjectNode; isLast: boolean; locale: string }) {
  const [open, setOpen] = useState(
    node.status === 'public_display' || node.status === 'claimable'
  );
  const cfg = STATUS_CONFIG[node.status] ?? STATUS_CONFIG.empty;
  const hasDetail = node.description || (node.evidence && node.evidence.length > 0) || node.status === 'public_display';

  return (
    <div className="flex gap-3">
      {/* Left: line + icon */}
      <div className="flex flex-col items-center">
        <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-full bg-surface ring-2', cfg.color, {
          'ring-success-500/40': node.status === 'claimable' || node.status === 'unlocked' || node.status === 'approved',
          'ring-info-500/40': node.status === 'public_display',
          'ring-warning-500/40': node.status === 'submitted' || node.status === 'pending_review',
          'ring-danger-500/40': node.status === 'rejected',
          'ring-white/10': node.status === 'empty',
        })}>
          {cfg.icon}
        </div>
        {!isLast ? <div className="mt-1 w-0.5 flex-1 bg-white/10" /> : null}
      </div>

      {/* Right: card */}
      <div className={cn('mb-3 flex-1 rounded-2xl bg-surface ring-1 overflow-hidden', {
        'ring-success-500/25': node.status === 'claimable' || node.status === 'unlocked',
        'ring-info-500/25 shadow-sm shadow-info-500/10': node.status === 'public_display',
        'ring-warning-500/20': node.status === 'submitted',
        'ring-danger-500/25': node.status === 'rejected',
        'ring-white/6': node.status === 'empty' || node.status === 'approved',
      })}>
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
          onClick={() => hasDetail && setOpen((v) => !v)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-text-secondary">节点 {node.node_index}</span>
              <span className="text-sm font-medium">{node.title}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[10px]">
              <span className={cn('font-medium', cfg.color)}>{cfg.label}</span>
              <span className="text-text-secondary tabular-nums">
                {formatPercentFromBps(node.bps, locale)} 资金
              </span>
            </div>
          </div>
          {hasDetail ? (
            <ChevronDown className={cn('size-3.5 shrink-0 text-text-secondary transition-transform', open && 'rotate-180')} />
          ) : null}
        </button>

        {open && hasDetail ? (
          <div className="border-t border-white/6 px-3 pb-3 pt-2 space-y-2">
            {node.status === 'public_display' && node.public_display_until ? (
              <div className="flex items-center gap-2 rounded-xl bg-info-500/10 px-3 py-2 text-xs">
                <Clock className="size-3.5 text-info-400" />
                <span className="text-text-secondary">公示倒计时：</span>
                <NodeCountdown endAt={node.public_display_until} />
              </div>
            ) : null}

            {node.status === 'rejected' && node.description ? (
              <div className="rounded-xl bg-danger-500/10 px-3 py-2 text-xs text-danger-400">
                驳回原因：{node.description}
              </div>
            ) : node.description ? (
              <p className="text-xs text-text-secondary">{node.description}</p>
            ) : null}

            {node.evidence && node.evidence.length > 0 ? (
              <div>
                <p className="mb-1.5 text-[10px] font-medium text-text-secondary">凭证</p>
                <div className="flex flex-wrap gap-2">
                  {node.evidence.map((ev, idx) =>
                    ev.type === 'image' ? (
                      <a key={idx} href={ev.url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={ev.url}
                          alt=""
                          className="h-16 w-24 rounded-lg object-cover ring-1 ring-white/10"
                        />
                      </a>
                    ) : (
                      <a
                        key={idx}
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg bg-white/8 px-2.5 py-1.5 text-[11px] text-text-secondary ring-1 ring-white/10 hover:bg-white/12"
                      >
                        📄 {ev.type.toUpperCase()} {Math.round(ev.size / 1024)}KB
                      </a>
                    ),
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function MilestonesPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  const { data: detail } = useQuery({
    queryKey: ['launch', 'on-chain', 'detail', id],
    queryFn: () => apiFetch<OnChainDetail>(`/launch/on-chain/detail?project_id=${id}`),
    enabled: !!id,
  });

  const { data, isPending } = useQuery({
    queryKey: ['rwa', 'project', 'milestones', id],
    queryFn: () => apiFetch<MilestoneProjectNode[]>(`/rwa/project/${id}/milestones`),
    enabled: !!id,
  });

  const nodes = data ?? [];
  const unlockedCount = nodes.filter((n) => n.status === 'unlocked' || n.status === 'claimable').length;
  const totalBps = nodes.reduce((s, n) => s + n.bps, 0);
  const unlockedBps = nodes.filter((n) => n.status === 'unlocked' || n.status === 'claimable').reduce((s, n) => s + n.bps, 0);
  const progressPct = totalBps > 0 ? Math.round((unlockedBps / totalBps) * 100) : 0;

  return (
    <AppShell hideTab>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex h-12 shrink-0 items-center gap-2 px-2">
          <button type="button" className="rounded-lg p-2 text-text-secondary hover:bg-white/5" onClick={() => nav(-1)}>
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="flex-1 text-base font-semibold">
            {t('project.milestones')} · {detail?.symbol ?? ''}
          </h1>
        </div>

        {/* Overall progress */}
        {!isPending && nodes.length > 0 ? (
          <div className="mx-3 mb-3 rounded-2xl bg-surface p-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-text-secondary">创作进度</span>
              <span className="font-semibold text-success-400">{unlockedCount} / {nodes.length} 节点已解锁</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-success-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] tabular-nums text-text-secondary">{progressPct}% 资金已释放</p>
          </div>
        ) : null}

        <div className="px-3 pb-6">
          {isPending ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-2xl" />
              ))}
            </div>
          ) : nodes.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-secondary">暂无里程碑数据</p>
          ) : (
            nodes.map((node, idx) => (
              <MilestoneNode
                key={node.node_index}
                node={node}
                isLast={idx === nodes.length - 1}
                locale={locale}
              />
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
