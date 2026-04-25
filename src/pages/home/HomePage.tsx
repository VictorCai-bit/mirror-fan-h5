import { ProjectCard } from '@/components/card/ProjectCard';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/api';
import type { OnChainDetail, WorkType } from '@/types/api';
import { useUserStore } from '@/stores/useUserStore';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useDrag } from '@use-gesture/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { motion, AnimatePresence } from 'framer-motion';

const ALL_TYPES: WorkType[] = ['Fiction', 'Music', 'Cartoon', 'Movie', 'Film', 'VR_AR', 'More'];
const SORT_OPTIONS = ['featured', 'new', 'hot', 'volume'] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

const BANNER_SLIDES = [
  { key: 'b1' as const, from: 'from-accent-500/40', to: 'to-primary-500/20' },
  { key: 'b2' as const, from: 'from-info-500/40', to: 'to-accent-500/10' },
  { key: 'b3' as const, from: 'from-success-500/30', to: 'to-accent-500/10' },
] as const;

export default function HomePage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const logged = useUserStore((s) => s.is_logged_in());

  const [tab, setTab] = useState<'Ticket' | 'RWA' | 'Token'>('Token');
  const [scope, setScope] = useState<'all' | 'joined' | 'created'>('all');
  const [type, setType] = useState<WorkType | ''>('');
  const [sort, setSort] = useState<SortOption>('featured');
  const [bannerIdx, setBannerIdx] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setBannerIdx((i) => (i + 1) % BANNER_SLIDES.length), 4000);
    return () => clearInterval(timer);
  }, []);

  const bind = useDrag(
    ({ last, movement: [, my] }) => {
      if (last && my > 60) void refetch();
    },
    { filterTaps: true },
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isError, error, refetch, isPending } =
    useInfiniteQuery({
      queryKey: ['launch', 'on-chain', 'list', { type, scope, sort }],
      initialPageParam: 0,
      queryFn: async ({ pageParam }) => {
        const qs = new URLSearchParams();
        qs.set('limit', '10');
        qs.set('cursor', String(pageParam));
        qs.set('sort', sort);
        if (type) qs.set('type', type);
        if (scope !== 'all') qs.set('scope', scope === 'joined' ? 'joined' : 'created');
        return apiFetch<OnChainDetail[]>(`/launch/on-chain/list?${qs.toString()}`);
      },
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.length < 10) return undefined;
        return allPages.reduce((s, p) => s + p.length, 0);
      },
    });

  const items = useMemo(() => (data?.pages ?? []).flat(), [data]);

  const handleSentinel = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(handleSentinel, { rootMargin: '120px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [handleSentinel]);

  const banner = BANNER_SLIDES[bannerIdx] ?? BANNER_SLIDES[0];

  return (
    <AppShell>
      <div className="flex min-h-0 flex-1 flex-col" {...bind()}>

        {/* Banner */}
        <div className="px-3 pt-3">
          <div
            className={cn(
              'relative h-[110px] overflow-hidden rounded-2xl bg-gradient-to-br',
              banner.from,
              banner.to,
            )}
          >
            {/* BG glow blob */}
            <div className="absolute -right-8 -top-8 size-36 rounded-full bg-white/5 blur-3xl" />
            <AnimatePresence mode="wait">
              <motion.div
                key={banner.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0 flex flex-col justify-center px-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  {t(`home.bannerSlide.${banner.key}.title` as 'home.bannerSlide.b1.title')}
                </p>
                <p className="mt-1 text-sm font-medium leading-snug text-white/90">
                  {t(`home.bannerSlide.${banner.key}.body` as 'home.bannerSlide.b1.body')}
                </p>
              </motion.div>
            </AnimatePresence>
            {/* Dot indicators */}
            <div className="absolute bottom-2.5 right-3 flex gap-1">
              {BANNER_SLIDES.map((b, i) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setBannerIdx(i)}
                  className={cn(
                    'h-1 rounded-full transition-all',
                    i === bannerIdx ? 'w-4 bg-white' : 'w-1 bg-white/30',
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Tab: Ticket / RWA / Token */}
        <div className="flex gap-2 px-3 pt-3">
          {(['Ticket', 'RWA', 'Token'] as const).map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setTab(x)}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs font-medium transition-all',
                tab === x
                  ? 'bg-accent-gradient text-white shadow-md shadow-accent-500/20'
                  : 'bg-white/8 text-text-secondary hover:bg-white/12',
              )}
            >
              {x === 'Ticket' ? t('home.tabTicket') : x === 'RWA' ? t('home.tabRwa') : t('home.tabToken')}
            </button>
          ))}
        </div>

        {/* Single scrollable filter bar: [scope] · [sort] · [type] */}
        <div className="flex gap-1.5 overflow-x-auto px-3 pt-2.5 pb-0.5 [&::-webkit-scrollbar]:hidden">
          {/* Scope (only when logged) */}
          {logged ? (
            <>
              {(['all', 'joined', 'created'] as const).map((s) => (
                <Chip
                  key={s}
                  active={scope === s}
                  onClick={() => setScope(s)}
                >
                  {s === 'all' ? t('home.scopeAll') : s === 'joined' ? t('home.scopeJoined') : t('home.scopeCreated')}
                </Chip>
              ))}
              <Divider />
            </>
          ) : null}

          {/* Sort */}
          {SORT_OPTIONS.map((s) => (
            <Chip key={s} active={sort === s} onClick={() => setSort(s)} variant="sort">
              {t(`home.sort.${s}` as 'home.sort.featured')}
            </Chip>
          ))}
          <Divider />

          {/* Type */}
          {ALL_TYPES.map((wt) => (
            <Chip
              key={wt}
              active={type === wt}
              onClick={() => setType((prev) => (prev === wt ? '' : wt))}
              variant="type"
            >
              {wt}
            </Chip>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 pt-2">
          {isError && items.length === 0 ? (
            <ErrorBanner message={(error as Error).message} onRetry={() => void refetch()} />
          ) : null}

          {tab !== 'Token' ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="flex size-16 items-center justify-center rounded-full bg-white/5 text-2xl">🚀</div>
              <p className="text-sm text-text-secondary">{t('nav.comingSoon')}</p>
            </div>
          ) : isPending ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[148px] w-full rounded-2xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="flex size-16 items-center justify-center rounded-full bg-white/5 text-2xl">📭</div>
              <p className="text-text-secondary">{t('home.emptyTitle')}</p>
              <button
                type="button"
                className="rounded-full bg-accent-gradient px-4 py-2 text-xs font-medium text-white"
                onClick={() => nav('/rules')}
              >
                {t('home.emptyCta')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((p) => (
                <ProjectCard key={p.id} item={p} />
              ))}
              <div ref={sentinelRef} className="h-px" />
              {isFetchingNextPage ? (
                <p className="py-2 text-center text-xs text-text-secondary">{t('home.loadingMore')}</p>
              ) : !hasNextPage && items.length > 0 ? (
                <p className="py-2 text-center text-xs text-text-secondary">{t('home.noMore')}</p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Chip({
  active,
  onClick,
  children,
  variant = 'scope',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'scope' | 'sort' | 'type';
}) {
  const activeClass =
    variant === 'sort'
      ? 'bg-white/15 text-text-primary'
      : variant === 'type'
        ? 'bg-accent-500/20 text-accent-400 ring-1 ring-accent-500/40'
        : 'font-semibold text-primary-400';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all',
        active ? activeClass : 'text-text-secondary hover:text-text-primary',
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="my-auto h-3 w-px shrink-0 bg-white/15" />;
}
