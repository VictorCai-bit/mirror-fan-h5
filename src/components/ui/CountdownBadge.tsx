import { useCountdown } from '@/hooks/useCountdown';
import { cn } from '@/lib/cn';

export function CountdownBadge({ endAt }: { endAt: number | null }) {
  const cd = useCountdown(endAt);
  if (!endAt || !cd) return null;
  const text = cd.label === '30d+' ? '30d+' : cd.label;
  return (
    <span className={cn('tabular-nums text-xs font-semibold text-primary-500')}>{text}</span>
  );
}
