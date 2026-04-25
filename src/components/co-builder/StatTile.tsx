import { cn } from '@/lib/cn';

export function StatTile({
  label,
  value,
  hint,
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  trend?: { sign: 'up' | 'down' | 'flat'; text: string };
  className?: string;
}) {
  const trendCls =
    trend?.sign === 'up'
      ? 'text-success-400'
      : trend?.sign === 'down'
        ? 'text-danger-400'
        : 'text-text-secondary';
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-2xl border border-white/5 bg-surface/80 px-3 py-3',
        className,
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-text-secondary/80">{label}</p>
      <p className="truncate text-base font-bold tabular-nums text-text-primary">{value}</p>
      {hint ? <p className="text-[10px] text-text-secondary">{hint}</p> : null}
      {trend ? (
        <p className={cn('text-[10px] font-medium tabular-nums', trendCls)}>{trend.text}</p>
      ) : null}
    </div>
  );
}
