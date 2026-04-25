import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { shortenAddress } from '@/lib/fmt';
import { useUserStore } from '@/stores/useUserStore';
import { useUIStore } from '@/stores/useUIStore';
import { Bell, Globe, Search, Sparkles, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

export function TopBar({ className }: { className?: string }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const loc = useLocation();
  const studio = loc.pathname.startsWith('/studio');
  const wallet = useUserStore((s) => s.wallet_address);
  const logged = useUserStore((s) => s.is_logged_in());
  const setSheet = useUIStore((s) => s.setBottomSheet);
  const setDebug = useUIStore((s) => s.setDebugOpen);

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'badge'],
    queryFn: async () => {
      const rows = await apiFetch<Array<{ read: boolean }>>('/notifications');
      return rows.filter((r) => !r.read).length;
    },
    refetchInterval: 30_000,
    enabled: true,
  });

  return (
    <header
      className={cn(
        'flex h-12 shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-canvas/80 px-2 backdrop-blur',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          className="rounded-lg p-2 text-text-secondary hover:bg-white/5"
          onClick={() => setSheet('language')}
          aria-label={t('common.language')}
        >
          <Globe className="size-5" />
        </button>
        <span className="truncate bg-accent-gradient bg-clip-text text-sm font-bold text-transparent">MIRROR</span>
        {studio ? (
          <span className="ml-1 flex items-center gap-1 rounded-full bg-success-500/20 px-2 py-0.5 text-[10px] font-bold text-success-500">
            <Sparkles className="size-3" />
            {t('creator.badge')}
          </span>
        ) : null}
      </div>
      {logged && wallet ? (
        <button
          type="button"
          onClick={() => nav('/wallet')}
          className="max-w-[120px] truncate font-mono text-[11px] text-text-secondary"
        >
          {shortenAddress(wallet)}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setSheet('connect')}
          className="rounded-full bg-white/10 px-3 py-1 text-xs text-primary-500"
        >
          {t('app.connect')}
        </button>
      )}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className="rounded-lg p-2 text-text-secondary hover:bg-white/5"
          onClick={() => nav('/search')}
          aria-label={t('common.search')}
        >
          <Search className="size-5" />
        </button>
        <button
          type="button"
          className="relative rounded-lg p-2 text-text-secondary hover:bg-white/5"
          onClick={() => nav('/notifications')}
        >
          <Bell className="size-5" />
          {(unread ?? 0) > 0 ? (
            <span className="absolute right-1 top-1 size-2 rounded-full bg-primary-500" />
          ) : null}
        </button>
        <button
          type="button"
          className="rounded-lg p-2 text-text-secondary hover:bg-white/5"
          onClick={() => setSheet(logged ? 'profile' : 'connect')}
          aria-label={t('profile.title')}
        >
          <User className="size-5" />
        </button>
        <button
          type="button"
          className="rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-orange-400/70 ring-1 ring-orange-400/30 hover:bg-orange-400/10"
          onClick={() => setDebug(true)}
          title={t('appDebug.title')}
        >
          DEV
        </button>
      </div>
    </header>
  );
}
