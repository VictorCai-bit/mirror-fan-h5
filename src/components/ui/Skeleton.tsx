import { cn } from '@/lib/cn';
import { useEffect, useState } from 'react';

export function Skeleton({ className }: { className?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 600);
    return () => window.clearTimeout(t);
  }, []);
  if (!show) return <div className={cn('min-h-[12px]', className)} />;
  return <div className={cn('animate-pulse rounded-lg bg-white/10', className)} />;
}
