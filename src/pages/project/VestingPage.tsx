import { AppShell } from '@/components/layout/AppShell';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatTokenFromRaw } from '@/lib/fmt';
import type { UserVestingEntry } from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, CheckCircle2, Lock, Clock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { RequireInvestor } from '@/routes/guards';

type SourceFilter = 'all' | 'airdrop' | 'fixed_price' | 'exchange';

const SOURCE_LABELS: Record<string, string> = {
  airdrop: '空投',
  fixed_price: '固定认购',
  exchange: '积分兑换',
  exchange_converted: '积分兑换',
  admin_grant: '额外增发',
};

const SOURCE_COLORS: Record<string, string> = {
  airdrop: 'bg-accent-500/15 text-accent-400',
  fixed_price: 'bg-purple-500/15 text-purple-400',
  exchange: 'bg-info-500/15 text-info-400',
  exchange_converted: 'bg-info-500/15 text-info-400',
  admin_grant: 'bg-warning-500/15 text-warning-400',
};

function fmtCountdown(secs: number): string {
  if (secs <= 0) return '';
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}天 ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function VestingCard({
  v,
  selected,
  onToggle,
  locale,
}: {
  v: UserVestingEntry;
  selected: boolean;
  onToggle: () => void;
  locale: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const unlocked = v.unlock_at <= now;
  const remaining = v.unlock_at - now;
  const srcLabel = SOURCE_LABELS[v.source] ?? v.source;
  const srcColor = SOURCE_COLORS[v.source] ?? 'bg-white/8 text-text-secondary';

  return (
    <div
      className={cn(
        'rounded-2xl bg-surface p-3 ring-1 transition-all',
        v.claimed ? 'opacity-50 ring-white/6' :
        selected ? 'ring-primary-500/50' : 'ring-white/8',
      )}
    >
      <div className="flex items-start gap-2">
        {/* Checkbox */}
        <button
          type="button"
          disabled={!unlocked || v.claimed}
          onClick={onToggle}
          className={cn(
            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            v.claimed
              ? 'border-success-500 bg-success-500/20 text-success-400'
              : selected && unlocked
              ? 'border-primary-500 bg-primary-500'
              : unlocked
              ? 'border-white/30 hover:border-white/60'
              : 'border-white/15',
          )}
        >
          {v.claimed || selected ? <CheckCircle2 className="size-3" /> : null}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', srcColor)}>
              {srcLabel}
            </span>
            {v.claimed ? (
              <span className="rounded-full bg-success-500/15 px-2 py-0.5 text-[10px] text-success-400">
                已领取
              </span>
            ) : unlocked ? (
              <span className="rounded-full bg-primary-500/15 px-2 py-0.5 text-[10px] text-primary-400">
                可领取
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-text-secondary">
                <Lock className="size-2.5" /> 锁定中
              </span>
            )}
          </div>

          <p className="mt-1 text-base font-bold tabular-nums">
            {formatTokenFromRaw(v.amount_raw, locale, 2)}
            <span className="ml-1 text-xs text-text-secondary font-normal">{v.symbol}</span>
          </p>

          <div className="mt-1 flex items-center gap-2 text-[10px] text-text-secondary">
            <Clock className="size-2.5" />
            {unlocked ? (
              <span>
                {new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(v.unlock_at * 1000))} 解锁
              </span>
            ) : (
              <span className="tabular-nums">
                剩余 {fmtCountdown(remaining)} (
                {new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(v.unlock_at * 1000))})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VestingPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const qc = useQueryClient();
  const [sel, setSel] = useState<number[]>([]);
  const [preview, setPreview] = useState<{ total_amount_raw: string; count: number } | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const { data, isPending } = useQuery({
    queryKey: ['rwa', 'my', 'vesting', id],
    queryFn: () => apiFetch<UserVestingEntry[]>(`/rwa/my/vesting?project_id=${id}`),
    enabled: !!id,
  });

  const rows = useMemo(() => data ?? [], [data]);
  const now = Math.floor(Date.now() / 1000);

  const filtered = useMemo(() => {
    if (sourceFilter === 'all') return rows;
    if (sourceFilter === 'airdrop') return rows.filter((r) => r.source === 'airdrop');
    if (sourceFilter === 'fixed_price') return rows.filter((r) => r.source === 'fixed_price');
    if (sourceFilter === 'exchange') return rows.filter((r) => r.source === 'exchange' || r.source === 'exchange_converted');
    return rows;
  }, [rows, sourceFilter]);

  const unlockedUnclaimed = filtered.filter((r) => r.unlock_at <= now && !r.claimed);

  const pBatch = useMutation({
    mutationFn: () =>
      apiFetch<{ total_amount_raw: string; count: number }>('/rwa/vesting/batch-release/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: sel }),
      }),
    onSuccess: (d) => setPreview(d),
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  const cBatch = useMutation({
    mutationFn: () =>
      apiFetch('/rwa/vesting/batch-release/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: sel }),
      }),
    onSuccess: async () => {
      toast.success(t('vesting.claim'));
      setPreview(null);
      setSel([]);
      await qc.invalidateQueries({ queryKey: ['rwa', 'my', 'vesting', id] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  const symbol = rows[0]?.symbol ?? '';
  const claimedCount = rows.filter((r) => r.claimed).length;
  const totalCount = rows.length;

  return (
    <RequireInvestor>
      <AppShell hideTab>
        <div className="flex flex-1 flex-col overflow-y-auto pb-28">
          <div className="flex h-12 shrink-0 items-center gap-2 px-2">
            <button type="button" className="rounded-lg p-2 text-text-secondary hover:bg-white/5" onClick={() => nav(-1)}>
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="flex-1 text-base font-semibold">{t('project.vesting')} · {symbol}</h1>
            {totalCount > 0 ? (
              <span className="text-xs text-text-secondary">{claimedCount}/{totalCount} 已领</span>
            ) : null}
          </div>

          {/* Source filter chips */}
          <div className="flex gap-1.5 overflow-x-auto px-3 py-2 no-scrollbar">
            {(['all', 'airdrop', 'fixed_price', 'exchange'] as SourceFilter[]).map((f) => {
              const labels = { all: '全部', airdrop: '空投', fixed_price: '固定认购', exchange: '积分兑换' };
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSourceFilter(f)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    sourceFilter === f
                      ? 'bg-primary-500 text-white'
                      : 'bg-white/8 text-text-secondary hover:bg-white/12',
                  )}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>

          {/* Select all unlocked */}
          {unlockedUnclaimed.length > 1 && sel.length < unlockedUnclaimed.length ? (
            <div className="px-3 pb-2">
              <button
                type="button"
                onClick={() => setSel(unlockedUnclaimed.map((r) => r.id))}
                className="text-xs font-medium text-primary-400 hover:text-primary-300"
              >
                全选 {unlockedUnclaimed.length} 个可领取
              </button>
            </div>
          ) : sel.length > 0 ? (
            <div className="px-3 pb-2">
              <button
                type="button"
                onClick={() => setSel([])}
                className="text-xs font-medium text-text-secondary hover:text-text-primary"
              >
                取消全选
              </button>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 px-3">
            {isPending ? (
              [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
            ) : filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-text-secondary">暂无 Vesting 记录</p>
            ) : (
              filtered.map((v) => (
                <VestingCard
                  key={v.id}
                  v={v}
                  selected={sel.includes(v.id)}
                  onToggle={() => setSel((s) => (s.includes(v.id) ? s.filter((x) => x !== v.id) : [...s, v.id]))}
                  locale={locale}
                />
              ))
            )}
          </div>
        </div>

        {/* Sticky batch claim bar */}
        {sel.length > 0 ? (
          <div className="fixed inset-x-0 bottom-0 bg-canvas/90 px-4 pb-safe pt-3 backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between text-xs text-text-secondary">
              <span>已选 <span className="font-bold text-text-primary">{sel.length}</span> 条</span>
            </div>
            <Button className="w-full" loading={pBatch.isPending} onClick={() => pBatch.mutate()}>
              预览批量领取
            </Button>
          </div>
        ) : null}

        {/* Preview confirmation sheet */}
        <BottomSheet
          open={!!preview}
          onClose={() => setPreview(null)}
          title="确认批量领取"
        >
          {preview && (
            <div className="space-y-3 pb-4">
              <div className="rounded-2xl bg-surface p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">领取数量</span>
                  <span className="font-bold tabular-nums">{preview.count} 条</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">合计代币</span>
                  <span className="font-bold tabular-nums text-success-400">
                    {formatTokenFromRaw(preview.total_amount_raw, locale, 4)} {symbol}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setPreview(null)}>取消</Button>
                <Button loading={cBatch.isPending} onClick={() => cBatch.mutate()}>
                  确认领取
                </Button>
              </div>
            </div>
          )}
        </BottomSheet>
      </AppShell>
    </RequireInvestor>
  );
}
