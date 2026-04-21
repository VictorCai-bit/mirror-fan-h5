import { cn } from '@/lib/cn';
import type { ProjectStatus } from '@/types/api';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-zinc-600 text-white',
  pending_review: 'bg-warn-500/20 text-warn-500',
  rejected: 'bg-danger-500/20 text-danger-500',
  approved: 'bg-info-500/20 text-info-500',
  on_chaining: 'bg-accent-500/20 text-accent-500',
  on_chain: 'bg-accent-500/20 text-accent-500',
  curve_active: 'bg-primary-500/20 text-primary-500',
  curve_completed: 'bg-info-500/20 text-info-500',
  migrating: 'bg-accent-500/20 text-accent-500',
  migrated: 'bg-success-500/20 text-success-500',
  cancelled: 'bg-danger-500/20 text-danger-500',
  abandoned: 'bg-danger-500/20 text-danger-500',
};

export function Badge({
  status,
  className,
  children,
}: {
  status?: ProjectStatus | string;
  className?: string;
  children: React.ReactNode;
}) {
  const key = status ?? 'draft';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        STATUS_STYLES[key] ?? 'bg-white/10 text-text-secondary',
        className,
      )}
    >
      {children}
    </span>
  );
}
