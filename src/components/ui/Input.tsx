import { cn } from '@/lib/cn';
import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  suffix?: React.ReactNode;
}

export function Input({ className, error, suffix, ...props }: InputProps) {
  return (
    <div className="w-full">
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border bg-elevated px-3 py-2',
          error ? 'border-danger-500' : 'border-white/10',
        )}
      >
        <input
          className={cn(
            'min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none tabular-nums placeholder:text-text-secondary',
            className,
          )}
          {...props}
        />
        {suffix}
      </div>
      {error ? <p className="mt-1 text-xs text-danger-500">{error}</p> : null}
    </div>
  );
}
