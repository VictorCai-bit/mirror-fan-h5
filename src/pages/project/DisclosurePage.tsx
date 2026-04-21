import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { ReconcileRevenueLogRow } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

const INCOME_TYPES = ['copyright', 'platform_split', 'commercial', 'ticket', 'other'];
const EXPENDITURE_TYPES = ['development', 'marketing', 'operations', 'other'];

type Tab = 'income' | 'expenditure';

const DISTRIBUTE_STATUS_CONFIG: Record<string, { label: string; cls: string } | undefined> = {
  pending:      { label: '待分配', cls: 'bg-text-secondary/15 text-text-secondary' },
  distributing: { label: '分配中', cls: 'bg-purple-500/20 text-purple-400' },
  processing:   { label: '处理中', cls: 'bg-purple-500/20 text-purple-400' },
  distributed:  { label: '已分配', cls: 'bg-success-500/20 text-success-400' },
  failed:       { label: '已失败', cls: 'bg-danger-500/20 text-danger-400' },
};

const REVENUE_TYPE_LABELS: Record<string, string> = {
  copyright:      '版权',
  platform_split: '平台分账',
  commercial:     '商业合作',
  ticket:         '票房',
  other:          '其他',
  development:    '开发',
  marketing:      '宣发',
  operations:     '运营',
};

function fileExt(url: string): string {
  const m = url.match(/\.([a-z0-9]+)(\?|$)/i);
  return m?.[1]?.toUpperCase() ?? 'FILE';
}

export default function DisclosurePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const [tab, setTab] = useState<Tab>('income');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data, isPending } = useQuery({
    queryKey: ['rwa', 'project', 'reconciles', id],
    queryFn: () => apiFetch<ReconcileRevenueLogRow[]>(`/rwa/project/${id}/reconciles`),
    enabled: !!id,
  });

  const rows = data ?? [];
  const incomeRows = rows.filter((r) => INCOME_TYPES.includes(r.revenue_type));
  const expenditureRows = rows.filter((r) => EXPENDITURE_TYPES.includes(r.revenue_type));
  const activeRows = tab === 'income' ? incomeRows : expenditureRows;
  const activeTypes: string[] = tab === 'income' ? INCOME_TYPES : EXPENDITURE_TYPES;

  const filtered = typeFilter === 'all' ? activeRows : activeRows.filter((r) => r.revenue_type === typeFilter);

  const totalIn = incomeRows.reduce((s, r) => s + parseFloat(r.amount_usd || '0'), 0);
  const totalOut = expenditureRows.reduce((s, r) => s + parseFloat(r.amount_usd || '0'), 0);

  return (
    <AppShell hideTab>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex h-12 shrink-0 items-center gap-2 px-2">
          <button type="button" className="rounded-lg p-2 text-text-secondary hover:bg-white/5" onClick={() => nav(-1)}>
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="flex-1 text-base font-semibold">财务披露</h1>
        </div>

        {/* Summary cards */}
        <div className="mx-3 mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-success-500/10 p-3">
            <p className="text-[10px] text-success-400">总收入</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">${totalIn.toLocaleString(locale)}</p>
          </div>
          <div className="rounded-2xl bg-danger-500/10 p-3">
            <p className="text-[10px] text-danger-400">总支出</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">${totalOut.toLocaleString(locale)}</p>
          </div>
        </div>

        {/* Tab strip */}
        <div className="flex border-b border-white/8 px-3">
          {(['income', 'expenditure'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setTypeFilter('all'); }}
              className={cn(
                'flex-1 py-2.5 text-sm font-medium transition-colors',
                tab === t
                  ? 'border-b-2 border-primary-500 text-text-primary'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {t === 'income' ? '收入' : '支出'}
            </button>
          ))}
        </div>

        {/* Type filter chips */}
        <div className="flex gap-1.5 overflow-x-auto px-3 py-2 no-scrollbar">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              typeFilter === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-white/8 text-text-secondary hover:bg-white/12',
            )}
          >
            全部
          </button>
          {activeTypes.map((tp) => (
            <button
              key={tp}
              type="button"
              onClick={() => setTypeFilter(tp)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                typeFilter === tp
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/8 text-text-secondary hover:bg-white/12',
              )}
            >
              {REVENUE_TYPE_LABELS[tp] ?? tp}
            </button>
          ))}
        </div>

        {/* Record list */}
        <div className="flex flex-col gap-2 px-3 pb-8">
          {isPending ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-secondary">暂无记录</p>
          ) : (
            filtered.map((row) => {
              const dsCfg = DISTRIBUTE_STATUS_CONFIG[row.distribute_status ?? 'pending'] ?? { label: '待分配', cls: 'bg-text-secondary/15 text-text-secondary' };
              const amount = parseFloat(row.amount_usd || '0');
              const isIncome = INCOME_TYPES.includes(row.revenue_type);

              return (
                <div key={row.id} className="rounded-2xl bg-surface p-3 ring-1 ring-white/6">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{row.description || '无描述'}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', dsCfg.cls)}>
                          {dsCfg.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-text-secondary">
                        <span className="rounded bg-white/8 px-1.5 py-0.5">
                          {REVENUE_TYPE_LABELS[row.revenue_type] ?? row.revenue_type}
                        </span>
                        <span>
                          {new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(row.created_at * 1000))}
                        </span>
                        {row.public_time ? (
                          <span className="text-success-400/70">
                            披露：{new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(row.public_time * 1000))}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className={cn('shrink-0 tabular-nums text-base font-bold', isIncome ? 'text-success-400' : 'text-danger-400')}>
                      {isIncome ? '+' : '-'}${amount.toLocaleString(locale)}
                    </p>
                  </div>

                  {row.evidence_urls.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {row.evidence_urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-lg bg-white/8 px-2 py-1 text-[11px] text-text-secondary ring-1 ring-white/10 hover:bg-white/14"
                        >
                          <ExternalLink className="size-3" />
                          {fileExt(url)}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}
