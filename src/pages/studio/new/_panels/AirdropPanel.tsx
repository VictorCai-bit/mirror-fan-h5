import { cn } from '@/lib/cn';
import type { NewProjectDraft } from '@/types/api';
import { Gift, Lock, Star, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface AirdropPanelProps {
  value: NewProjectDraft;
  symbol?: string;
  /* onChange kept for API compat but ignored — all params are protocol-fixed */
  onChange?: (patch: Partial<NewProjectDraft>) => void;
  disabled?: boolean;
}

/** Protocol-fixed reward amounts (mirrors constants/userWorkTask.go) */
const FIXED_REWARDS = [
  {
    icon: Star,
    labelKey: 'studio.airdrop.signIn',
    amount: 5,
    color: 'text-accent-400',
    bg: 'bg-accent-500/10',
  },
  {
    icon: Gift,
    labelKey: 'studio.airdrop.invite',
    amount: 5,
    color: 'text-info-400',
    bg: 'bg-info-500/10',
  },
  {
    icon: Users,
    labelKey: 'studio.airdrop.team',
    amount: 3,
    color: 'text-success-400',
    bg: 'bg-success-500/10',
  },
] as const;

export function AirdropPanel({ symbol }: AirdropPanelProps) {
  const { t } = useTranslation();
  const unit = symbol ? `${symbol}s` : 'IPs';

  return (
    <div className="flex flex-col gap-3">
      {/* header */}
      <div className="flex items-center gap-1.5">
        <Lock className="size-3 text-text-secondary/60" />
        <p className="text-[11px] font-semibold text-text-secondary">
          {t('studio.airdrop.title')}
        </p>
        <span className="ml-auto text-[10px] text-text-secondary/50">
          {t('studio2.fp.allocFixed')}
        </span>
      </div>

      {/* allocation bar */}
      <div className="rounded-2xl bg-surface p-3 ring-1 ring-white/10">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[11px] text-text-secondary">{t('studio.airdrop.poolLabel')}</p>
          <span className="font-mono text-sm font-bold text-success-400">10%</span>
        </div>
        <p className="text-[10px] text-text-secondary/60">
          {t('studio.airdrop.poolHint', { unit })}
        </p>
      </div>

      {/* reward rules */}
      <div className="rounded-2xl bg-surface p-3 ring-1 ring-white/10">
        <p className="mb-3 text-[11px] font-semibold text-text-secondary">
          {t('studio.airdrop.rewardsTitle')}
        </p>
        <div className="flex flex-col gap-2">
          {FIXED_REWARDS.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.labelKey} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5', r.bg)}>
                <div className={cn('flex size-7 items-center justify-center rounded-lg bg-black/20')}>
                  <Icon className={cn('size-3.5', r.color)} />
                </div>
                <span className="flex-1 text-[11px] text-text-secondary">
                  {t(r.labelKey)}
                </span>
                <span className={cn('font-mono text-sm font-bold tabular-nums', r.color)}>
                  +{r.amount}
                  <span className="ml-0.5 text-[10px] font-normal opacity-70">{unit}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* timing hint */}
      <div className="rounded-xl bg-white/5 px-3 py-2.5">
        <p className="text-[10px] leading-relaxed text-text-secondary/70">
          {t('studio.airdrop.timingHint')}
        </p>
      </div>
    </div>
  );
}
