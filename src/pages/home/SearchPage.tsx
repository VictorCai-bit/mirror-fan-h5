import { ProjectCard } from '@/components/card/ProjectCard';
import { AppShell } from '@/components/layout/AppShell';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { OnChainDetail, ProjectStatus, WorkType } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

const STATUS_OPTIONS: { key: '' | ProjectStatus; label: string }[] = [
  { key: '', label: 'searchExt.statusAll' },
  { key: 'on_chain', label: 'status.on_chain_coming' },
  { key: 'curve_active', label: 'status.curve_active' },
  { key: 'curve_completed', label: 'status.curve_completed' },
  { key: 'migrated', label: 'status.migrated' },
];
const TYPE_OPTIONS: ('' | WorkType)[] = ['', 'Fiction', 'Music', 'Cartoon', 'Movie', 'Film', 'VR_AR', 'More'];
const SORT_OPTIONS: { key: string; label: string }[] = [
  { key: 'new', label: 'searchExt.sortNew' },
  { key: 'hot', label: 'searchExt.sortHot' },
  { key: 'volume', label: 'searchExt.sortVolume' },
];

export default function SearchPage() {
  const { t } = useTranslation();
  const [sp, setSp] = useSearchParams();
  const kw = sp.get('keyword') ?? sp.get('q') ?? '';
  const status = sp.get('status') ?? '';
  const type = sp.get('type') ?? '';
  const sort = sp.get('sort') ?? 'new';

  const patch = (patches: Record<string, string | null>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patches)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    setSp(next, { replace: true });
  };

  const { data, isPending } = useQuery({
    queryKey: ['launch', 'on-chain', 'list', 'search', kw, status, type, sort],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set('limit', '50');
      qs.set('cursor', '0');
      if (kw.trim()) qs.set('keyword', kw.trim());
      if (status) qs.set('status', status);
      if (type) qs.set('type', type);
      if (sort) qs.set('sort', sort);
      return apiFetch<OnChainDetail[]>(`/launch/on-chain/list?${qs.toString()}`);
    },
  });

  const filtered = useMemo(() => data ?? [], [data]);

  return (
    <AppShell>
      <div className="flex flex-col gap-3 p-3 pb-8">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
          <Input
            className="pl-9"
            placeholder={t('search.placeholder')}
            value={kw}
            onChange={(e) => patch({ keyword: e.target.value })}
          />
        </div>

        <div>
          <p className="mb-1 text-[10px] uppercase text-text-secondary">
            {t('searchExt.sortNew').replace(/./g, '')}Status
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((s) => (
              <Chip
                key={s.key || 'all'}
                active={status === s.key}
                onClick={() => patch({ status: s.key || null })}
              >
                {t(s.label as 'common.ok')}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-1.5">
            {TYPE_OPTIONS.map((wt) => (
              <Chip
                key={wt || 'all'}
                active={type === wt}
                onClick={() => patch({ type: wt || null })}
              >
                {wt || t('searchExt.typeAll')}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <div className="inline-flex gap-1 rounded-full bg-black/30 p-1">
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => patch({ sort: s.key })}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] transition',
                  sort === s.key
                    ? 'bg-accent-gradient text-white'
                    : 'text-text-secondary hover:bg-white/5',
                )}
              >
                {t(s.label as 'common.ok')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {isPending
            ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-[130px] w-full rounded-2xl" />)
            : filtered.map((p) => <ProjectCard key={p.id} item={p} />)}
          {!isPending && filtered.length === 0 ? (
            <p className="py-10 text-center text-xs text-text-secondary">{t('home.emptyTitle')}</p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-[11px] font-medium transition',
        active
          ? 'bg-accent-500/25 text-accent-500 ring-1 ring-accent-500/40'
          : 'bg-white/5 text-text-secondary hover:bg-white/10',
      )}
    >
      {children}
    </button>
  );
}
