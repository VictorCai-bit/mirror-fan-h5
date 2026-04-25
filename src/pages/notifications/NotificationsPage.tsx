import { AppShell } from '@/components/layout/AppShell';
import { cn } from '@/lib/cn';
import { apiFetch } from '@/lib/api';
import type { Notification } from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Flag,
  Coins,
  Wallet,
  Megaphone,
  Star,
} from 'lucide-react';
import { useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const CATEGORY_META: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string }
> = {
  milestone: {
    icon: <Flag className="size-4" />,
    color: 'text-success-400',
    bg: 'bg-success-500/15',
  },
  project: {
    icon: <Star className="size-4" />,
    color: 'text-primary-400',
    bg: 'bg-primary-500/15',
  },
  wallet: {
    icon: <Wallet className="size-4" />,
    color: 'text-info-400',
    bg: 'bg-info-500/15',
  },
  airdrop: {
    icon: <Coins className="size-4" />,
    color: 'text-warning-400',
    bg: 'bg-warning-500/15',
  },
  system: {
    icon: <Megaphone className="size-4" />,
    color: 'text-accent-400',
    bg: 'bg-accent-500/15',
  },
};

function getCategoryMeta(category: string) {
  return (
    CATEGORY_META[category] ?? {
      icon: <Bell className="size-4" />,
      color: 'text-text-secondary',
      bg: 'bg-white/10',
    }
  );
}

function categoryLabel(category: string, t: TFunction) {
  const k = `notifications.cat.${category}` as const;
  if (['milestone', 'project', 'wallet', 'airdrop', 'system'].includes(category)) {
    return t(k);
  }
  return category;
}

function timeAgo(unix: number, locale: string, t: TFunction): string {
  const diff = Math.floor(Date.now() / 1000) - unix;
  if (diff < 60) return t('notifications.time.justNow');
  if (diff < 3600) return t('notifications.time.minutesAgo', { n: Math.floor(diff / 60) });
  if (diff < 86400) return t('notifications.time.hoursAgo', { n: Math.floor(diff / 3600) });
  if (diff < 86400 * 7) return t('notifications.time.daysAgo', { n: Math.floor(diff / 86400) });
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(
    new Date(unix * 1000),
  );
}

function NotifItem({
  n,
  onRead,
  locale,
  t,
}: {
  n: Notification;
  onRead: (id: string) => void;
  locale: string;
  t: TFunction;
}) {
  const nav = useNavigate();
  const meta = getCategoryMeta(n.category);
  const label = categoryLabel(n.category, t);

  function handleClick() {
    if (!n.read) onRead(n.id);
    if (n.link) nav(n.link);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group relative flex w-full items-start gap-3 rounded-2xl p-3.5 text-left transition-all',
        'ring-1 hover:ring-white/15 active:scale-[0.99]',
        n.read ? 'bg-surface/60 ring-white/5' : 'bg-surface ring-white/10',
      )}
    >
      {/* Unread dot */}
      {!n.read && (
        <span className="absolute right-3.5 top-3.5 size-2 rounded-full bg-primary-500" />
      )}

      {/* Category icon */}
      <span
        className={cn(
          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
          meta.bg,
          meta.color,
        )}
      >
        {meta.icon}
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1 pr-4">
        <div className="mb-0.5 flex items-center gap-2">
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
              meta.bg,
              meta.color,
            )}
          >
            {label}
          </span>
          <span className="text-[10px] text-text-secondary">{timeAgo(n.created_at, locale, t)}</span>
        </div>
        <p
          className={cn(
            'text-sm font-semibold leading-snug',
            n.read ? 'text-text-secondary' : 'text-text-primary',
          )}
        >
          {n.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{n.body}</p>
      </div>

      {/* Chevron if there's a link */}
      {n.link ? (
        <ChevronRight
          className={cn(
            'mt-1 size-4 shrink-0 transition-opacity',
            n.read ? 'text-white/20' : 'text-text-secondary group-hover:text-text-primary',
          )}
        />
      ) : null}
    </button>
  );
}

export default function NotificationsPage() {
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data, isPending } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => apiFetch<Notification[]>('/notifications'),
  });

  const mark = useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch('/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const all = data ?? [];
  const unreadIds = all.filter((n) => !n.read).map((n) => n.id);
  const unreadCount = unreadIds.length;
  const displayed = filter === 'unread' ? all.filter((n) => !n.read) : all;

  return (
    <AppShell hideTab>
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center gap-2 px-2">
          <button
            type="button"
            className="rounded-lg p-2 text-text-secondary hover:bg-white/5"
            onClick={() => nav(-1)}
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex flex-1 items-center gap-2">
            <h1 className="text-base font-semibold">{t('notifications.title')}</h1>
            {unreadCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => mark.mutate(unreadIds)}
              disabled={mark.isPending}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-white/5 hover:text-text-primary"
            >
              <CheckCheck className="size-3.5" />
              {t('notifications.markAllRead')}
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex shrink-0 gap-1 border-b border-white/8 px-4 pb-3">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all',
                filter === f
                  ? 'bg-primary-500/15 text-primary-400'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {f === 'all'
                ? t('notifications.tabAll', { suffix: all.length > 0 ? ` (${all.length})` : '' })
                : t('notifications.tabUnread', { suffix: unreadCount > 0 ? ` (${unreadCount})` : '' })}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex flex-col gap-2 px-3 py-3 pb-8">
          {isPending ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
            ))
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
              <Bell className="mb-3 size-10 opacity-20" />
              <p className="text-sm">
                {filter === 'unread' ? t('notifications.emptyUnread') : t('notifications.emptyAll')}
              </p>
            </div>
          ) : (
            displayed.map((n) => (
              <NotifItem
                key={n.id}
                n={n}
                locale={locale}
                t={t}
                onRead={(id) => mark.mutate([id])}
              />
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
