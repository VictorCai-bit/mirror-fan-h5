/** S-curve constants (§16.1) — simplified preview for mock swap / mint preview */

export const CURVE_ALPHA = 4.0;
export const CURVE_BETA = 2.5;
export const INITIAL_PRICE_USD = 0.01;
export const FEE_BPS = 100; // 1%

/** Rough price from sold fraction of public pool (0..1) for UI preview */
export function priceFromProgress(soldFraction: number): number {
  const x = Math.min(1, Math.max(0, soldFraction));
  const num = CURVE_ALPHA * x;
  const den = CURVE_BETA * (1 - x) + Number.EPSILON;
  return INITIAL_PRICE_USD * (1 + num / den);
}

export function estimateSwapOutUsdtToToken(
  usdtIn: number,
  currentSoldFraction: number,
  publicPoolFraction: number,
): { tokenOut: number; priceImpactBps: number } {
  const before = priceFromProgress(currentSoldFraction);
  const delta = usdtIn / 1_000_000; // treat as micro for ratio only in mock
  const afterFrac = Math.min(1, currentSoldFraction + delta * publicPoolFraction);
  const after = priceFromProgress(afterFrac);
  const avg = (before + after) / 2;
  const tokenOut = usdtIn / Math.max(avg, 1e-12);
  const priceImpactBps = Math.round(
    Math.abs(after - before) / Math.max(before, 1e-12) * 10_000,
  );
  return { tokenOut, priceImpactBps };
}
