import { Button } from '@/components/ui/Button';
import { LevelBadge } from '@/components/co-builder/LevelBadge';
import { levelToken } from '@/components/co-builder/levelTokens';
import { cn } from '@/lib/cn';
import type { MemberLevel, TierCardData } from '@/types/coBuilder';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';

export function TierCard({
  tier,
  active,
  myLevel,
  onBuy,
}: {
  tier: TierCardData;
  active?: boolean;
  myLevel: MemberLevel;
  onBuy: () => void;
}) {
  const { t } = useTranslation();
  const tk = levelToken(tier.level);
  const tagKey = tier.level;
  const name = t(`coBuilder.tier.${tagKey}.name`);
  const tag = t(`coBuilder.tier.${tagKey}.tag`);
  const td = (k: 'positioning' | 'entry' | 'entertain' | 'governance') =>
    t(`coBuilder.tierDetail.${tagKey}.${k}` as 'coBuilder.tierDetail.base.positioning');

  const isActivated =
    myLevel !== 'none' &&
    ['base', 'active', 'regional', 'ecosystem', 'global'].indexOf(myLevel) >=
      ['base', 'active', 'regional', 'ecosystem', 'global'].indexOf(tier.level);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-white/8 bg-surface/85 p-4',
        active && 'ring-2',
        active && tk.ring,
        tk.glow,
      )}
    >
      <div
        aria-hidden
        className={cn('pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b', tk.gradient)}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <LevelBadge level={tier.level} label={tag} size="sm" />
            {isActivated ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                <CheckCircle2 className="size-3" />
                {t('coBuilder.tier.activated')}
              </span>
            ) : null}
          </div>
          <h3 className={cn('mt-2 text-lg font-extrabold tracking-tight', tk.text)}>{name}</h3>
          <p className="mt-1 max-w-[230px] text-[11px] leading-relaxed text-text-secondary">
            {td('positioning')}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-wider text-text-secondary/70">
            {t('coBuilder.tier.entryFrom')}
          </span>
          <span className="text-2xl font-extrabold tabular-nums text-text-primary">
            {tier.base_contribution.toLocaleString()}
          </span>
          <span className="text-[10px] text-text-secondary">A</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-[10px]">
        <Tag label={t('coBuilder.tier.directShort')} value={`${tier.rebate_direct_pct}%`} />
        <Tag label={t('coBuilder.tier.indirectShort')} value={`${tier.rebate_indirect_pct}%`} />
        <Tag
          label={t('coBuilder.tier.identityShort')}
          value={tier.identity_pct > 0 ? `+${tier.identity_pct}%` : '—'}
          dim={tier.identity_pct === 0}
        />
      </div>

      <ul className="mt-3 space-y-1.5 text-[11px] text-text-secondary">
        <Bullet>{td('entertain')}</Bullet>
        <Bullet>{td('governance')}</Bullet>
        <Bullet>{td('entry')}</Bullet>
        {tier.has_floating ? <Bullet>{t('coBuilder.tier.hasFloat')}</Bullet> : null}
        {tier.can_view_team ? <Bullet>{t('coBuilder.tier.teamView')}</Bullet> : null}
      </ul>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[10px] text-text-secondary">
          {t('coBuilder.tier.rebateLabel')}:{' '}
          {t('coBuilder.tier.rebateLine', {
            d: tier.rebate_direct_pct,
            i: tier.rebate_indirect_pct,
          })}
        </p>
        <Button size="sm" variant={active ? 'primary' : 'secondary'} onClick={onBuy}>
          {t('coBuilder.tier.buyCta')}
        </Button>
      </div>
    </div>
  );
}

function Tag({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-0.5 rounded-xl bg-white/5 py-1.5 ring-1 ring-white/8',
        dim && 'opacity-50',
      )}
    >
      <span className="text-[9px] uppercase tracking-wider text-text-secondary">{label}</span>
      <span className="text-xs font-bold tabular-nums text-text-primary">{value}</span>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="relative pl-3.5 leading-snug">
      <span className="absolute left-0 top-1.5 size-1.5 rounded-full bg-accent-gradient" />
      {children}
    </li>
  );
}
