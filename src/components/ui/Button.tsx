import { cn } from '@/lib/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

const variants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-opacity disabled:opacity-40 disabled:pointer-events-none tabular-nums',
  {
    variants: {
      variant: {
        primary: 'bg-accent-gradient text-white px-5 py-2.5 shadow-lg shadow-primary-500/20',
        secondary: 'bg-surface text-text-primary border border-white/10 px-5 py-2.5',
        ghost: 'text-text-secondary px-3 py-2',
        danger: 'bg-danger-500 text-white px-5 py-2.5',
      },
      size: {
        sm: 'text-sm py-1.5 px-3',
        md: 'text-sm py-2.5 px-5',
        lg: 'text-base py-3 px-6',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof variants> {
  loading?: boolean;
}

export function Button({ className, variant, size, loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(variants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
      {children}
    </button>
  );
}
