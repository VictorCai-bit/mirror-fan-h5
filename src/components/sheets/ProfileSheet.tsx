import { BottomSheet } from '@/components/ui/BottomSheet';
import { useUIStore } from '@/stores/useUIStore';
import { useUserStore } from '@/stores/useUserStore';
import { shortenAddress } from '@/lib/fmt';
import { ArrowRight, LogOut, PenLine, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function ProfileSheet() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const sheet = useUIStore((s) => s.bottomSheet);
  const setSheet = useUIStore((s) => s.setBottomSheet);
  const uid = useUserStore((s) => s.uid);
  const wallet = useUserStore((s) => s.wallet_address);
  const disconnect = useUserStore((s) => s.disconnect);
  const creatorOf = useUserStore((s) => s.creator_of);

  const open = sheet === 'profile';

  const go = (path: string) => {
    setSheet(null);
    nav(path);
  };

  return (
    <BottomSheet open={open} onClose={() => setSheet(null)} title={t('profile.title')}>
      <div className="flex flex-col gap-2 pb-4">
        <div className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5">
          <div className="flex size-10 items-center justify-center rounded-full bg-accent-gradient text-sm font-bold text-white">
            {uid?.slice(-2) ?? '??'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text-primary">{uid ?? '—'}</p>
            <p className="truncate font-mono text-[11px] text-text-secondary">
              {wallet ? shortenAddress(wallet) : '—'}
            </p>
          </div>
        </div>

        <Row
          icon={<Wallet className="size-4" />}
          label={t('profile.goWallet')}
          sub={t('profile.goWalletSub')}
          onClick={() => go('/wallet')}
        />
        <Row
          icon={<PenLine className="size-4" />}
          label={t('profile.goStudio')}
          sub={t('profile.goStudioSub', { n: creatorOf.length })}
          onClick={() => go('/studio')}
        />
        <Row
          icon={<LogOut className="size-4 text-danger-500" />}
          label={t('profile.disconnect')}
          sub={t('profile.disconnectSub')}
          onClick={() => {
            disconnect();
            setSheet(null);
            nav('/');
            toast.success(t('profile.disconnected'));
          }}
          tone="danger"
        />
      </div>
    </BottomSheet>
  );
}

function Row({
  icon,
  label,
  sub,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
  tone?: 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5 text-left transition hover:bg-white/10"
    >
      <span
        className={
          tone === 'danger'
            ? 'flex size-8 items-center justify-center rounded-full bg-danger-500/15 text-danger-500'
            : 'flex size-8 items-center justify-center rounded-full bg-white/10 text-accent-500'
        }
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={tone === 'danger' ? 'text-sm font-medium text-danger-500' : 'text-sm font-medium text-text-primary'}>
          {label}
        </p>
        {sub ? <p className="truncate text-[11px] text-text-secondary">{sub}</p> : null}
      </div>
      <ArrowRight className="size-4 text-text-secondary" />
    </button>
  );
}
