import { cn } from '@/lib/cn';
import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

function formatNumber(n: number, max = 0) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: max }).format(n);
}

function AnimatedNumber({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 220, damping: 24 });
  const display = useTransform(spring, (v) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v),
  );
  useEffect(() => {
    mv.set(value);
  }, [mv, value]);
  return <motion.span className="tabular-nums">{display}</motion.span>;
}

export function DynamicPriceTicker({
  unitPrice,
  soldTotal,
  nextThresholdAt,
  thresholdStep,
  stepIncreasePct,
}: {
  unitPrice: number;
  soldTotal: number;
  nextThresholdAt: number;
  thresholdStep: number;
  stepIncreasePct: number;
}) {
  const prev = useRef(unitPrice);
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prev.current !== unitPrice && flashRef.current) {
      const node = flashRef.current;
      node.classList.remove('animate-pulse-once');
      void node.offsetWidth;
      node.classList.add('animate-pulse-once');
    }
    prev.current = unitPrice;
  }, [unitPrice]);

  const progressInWindow = soldTotal % thresholdStep;
  const pct = Math.min(100, (progressInWindow / thresholdStep) * 100);
  const remaining = thresholdStep - progressInWindow;

  return (
    <div
      ref={flashRef}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-surface/90 p-4',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            'radial-gradient(120% 80% at 0% 0%, rgba(255,61,139,0.18) 0%, transparent 50%), radial-gradient(120% 80% at 100% 100%, rgba(139,92,246,0.18) 0%, transparent 55%)',
        }}
      />
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-text-secondary">LIVE PRICE</p>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="text-3xl font-bold tabular-nums text-text-primary">
              <AnimatedNumber value={unitPrice} decimals={2} />
            </span>
            <span className="text-xs font-semibold text-text-secondary">USDT / A</span>
          </p>
          <p className="mt-1 text-[10px] text-text-secondary">
            +{(stepIncreasePct * 100).toFixed(0)}% every {formatNumber(thresholdStep)}A sold
          </p>
        </div>
        <span className="rounded-full bg-success-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success-400 ring-1 ring-success-500/30">
          ● Live
        </span>
      </div>
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-text-secondary">
          <span>Sold {formatNumber(soldTotal)}A</span>
          <span>
            Next step at {formatNumber(nextThresholdAt)}A · {formatNumber(remaining)}A to go
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
          <motion.div
            className="h-full rounded-full bg-accent-gradient"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 90, damping: 18 }}
          />
        </div>
      </div>
      <style>
        {`@keyframes pulseOnce {
          0% { box-shadow: 0 0 0 0 rgba(255,61,139,0.4); }
          50% { box-shadow: 0 0 36px 4px rgba(255,61,139,0.18); }
          100% { box-shadow: 0 0 0 0 rgba(255,61,139,0); }
        }
        .animate-pulse-once { animation: pulseOnce 1.2s ease-out; }`}
      </style>
    </div>
  );
}
