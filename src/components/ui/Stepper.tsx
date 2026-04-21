import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface StepperStep {
  key: string;
  label: string;
}

export function Stepper({
  steps,
  current,
  onChange,
}: {
  steps: StepperStep[];
  current: number;
  onChange?: (i: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-1 px-1">
      {steps.map((s, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        const future = idx > current;
        return (
          <button
            key={s.key}
            type="button"
            disabled={future}
            onClick={() => {
              if (done && onChange) onChange(idx);
            }}
            className={cn(
              'flex flex-1 flex-col items-center gap-1',
              future ? 'opacity-40' : '',
            )}
          >
            <span
              className={cn(
                'flex size-8 items-center justify-center rounded-full border text-xs font-semibold',
                done && 'border-transparent bg-accent-gradient text-white',
                active && 'border-primary-500 shadow-[0_0_0_3px_rgba(255,61,139,0.35)]',
                future && 'border-white/20 text-text-secondary',
              )}
            >
              {done ? <Check className="size-4" /> : idx}
            </span>
            <span className="line-clamp-2 text-center text-[10px] text-text-secondary">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
