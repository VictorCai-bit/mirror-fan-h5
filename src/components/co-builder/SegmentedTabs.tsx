import { cn } from '@/lib/cn';
import { motion } from 'framer-motion';
import { useId } from 'react';

export interface SegmentedTab {
  key: string;
  label: string;
}

export function SegmentedTabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: SegmentedTab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  const layoutId = useId();
  return (
    <div
      className={cn(
        'mx-3 my-2 flex items-center gap-1 rounded-full border border-white/10 bg-elevated/70 p-1 text-xs backdrop-blur',
        className,
      )}
    >
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              'relative flex-1 rounded-full px-3 py-1.5 text-center transition-colors',
              on ? 'text-white' : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {on ? (
              <motion.span
                layoutId={`co-builder-segmented-${layoutId}`}
                className="absolute inset-0 rounded-full bg-accent-gradient shadow-[0_4px_12px_rgba(255,61,139,0.35)]"
                transition={{ type: 'spring', stiffness: 480, damping: 38 }}
              />
            ) : null}
            <span className="relative z-10 font-semibold">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
