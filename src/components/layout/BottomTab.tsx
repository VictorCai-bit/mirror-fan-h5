import { cn } from '@/lib/cn';
import { Crown, LineChart, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

export function BottomTab() {
  const { t } = useTranslation();
  return (
    <nav className="grid h-14 shrink-0 grid-cols-3 border-t border-white/10 bg-base/95 pb-[env(safe-area-inset-bottom)] pt-1 text-[10px] text-text-secondary backdrop-blur">
      <NavLink
        to="/"
        className={({ isActive }) =>
          cn('flex flex-col items-center justify-center gap-0.5', isActive && 'text-primary-500')
        }
      >
        <LineChart className="size-5" />
        {t('nav.entertainFi')}
      </NavLink>
      <NavLink
        to="/vip"
        className={({ isActive }) =>
          cn('flex flex-col items-center justify-center gap-0.5', isActive && 'text-primary-500')
        }
      >
        <Crown className="size-5" />
        {t('nav.vip')}
      </NavLink>
      <NavLink
        to="/promotion"
        className={({ isActive }) =>
          cn('flex flex-col items-center justify-center gap-0.5', isActive && 'text-primary-500')
        }
      >
        <Share2 className="size-5" />
        {t('nav.promotion')}
      </NavLink>
    </nav>
  );
}
