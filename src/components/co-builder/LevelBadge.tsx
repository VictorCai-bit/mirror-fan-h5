import { cn } from '@/lib/cn';
import { levelToken } from './levelTokens';
import type { MemberLevel } from '@/types/coBuilder';
import { Gem, Lock, ShieldCheck, Sparkles, Star, Sun } from 'lucide-react';

const ICONS: Record<MemberLevel, React.ComponentType<{ className?: string }>> = {
  none: Lock,
  base: Sparkles,
  active: Star,
  regional: ShieldCheck,
  ecosystem: Sun,
  global: Gem,
};

export function LevelBadge({
  level,
  label,
  size = 'md',
  className,
}: {
  level: MemberLevel;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const tk = levelToken(level);
  const Icon = ICONS[level] ?? Sparkles;
  const sizeClasses =
    size === 'sm' ? 'text-[10px] px-2 py-0.5' : size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2.5 py-0.5';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold ring-1 backdrop-blur',
        tk.surface,
        tk.text,
        tk.ring,
        sizeClasses,
        className,
      )}
    >
      <Icon className={cn(size === 'sm' ? 'size-3' : 'size-3.5')} />
      {label}
    </span>
  );
}
