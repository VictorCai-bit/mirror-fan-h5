const USDT_DECIMALS = 6;
const ENT_DECIMALS = 18;
const TOKEN_DECIMALS = 6;

export function formatUsdtFromRaw(raw: string, locale: string): string {
  const n = Number(raw) / 10 ** USDT_DECIMALS;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatTokenFromRaw(raw: string, locale: string, maxFrac = 4): string {
  const n = Number(raw) / 10 ** TOKEN_DECIMALS;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFrac,
  }).format(n);
}

export function formatEntFromRaw(raw: string, locale: string): string {
  const n = Number(raw) / 10 ** ENT_DECIMALS;
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(n);
}

export function formatPoints(n: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(n);
}

export function formatPercentFromBps(bps: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(bps / 10_000);
}

export function formatDateTime(ts: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(ts * 1000);
}

export function formatRelativeShort(ts: number, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const sec = ts - Math.floor(Date.now() / 1000);
  const abs = Math.abs(sec);
  if (abs < 60) return rtf.format(sec, 'second');
  if (abs < 3600) return rtf.format(Math.round(sec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(sec / 3600), 'hour');
  return rtf.format(Math.round(sec / 86400), 'day');
}

export function usdtToRaw(amount: string): string {
  const n = Number(amount.replace(/,/g, ''));
  if (!Number.isFinite(n)) return '0';
  return String(Math.round(n * 10 ** USDT_DECIMALS));
}

export function shortenAddress(addr: string, left = 6, right = 4): string {
  if (addr.length <= left + right) return addr;
  return `${addr.slice(0, left)}…${addr.slice(-right)}`;
}
