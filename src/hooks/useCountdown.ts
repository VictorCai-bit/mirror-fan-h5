import { useEffect, useState } from 'react';

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** e.g. "30d+" when > 30 days */
  label: string;
  ended: boolean;
}

function compute(endAtUnix: number, now: number): CountdownParts {
  const end = endAtUnix * 1000;
  const diff = Math.max(0, end - now);
  const daysTotal = Math.floor(diff / 86400000);
  if (daysTotal > 30) {
    return {
      days: daysTotal,
      hours: 0,
      minutes: 0,
      seconds: 0,
      label: '30d+',
      ended: false,
    };
  }
  const ended = now >= end;
  const s = Math.floor(diff / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const label = `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return { days, hours, minutes, seconds, label, ended };
}

export function useCountdown(endAtUnix: number | null, onEnd?: () => void): CountdownParts | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endAtUnix == null) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [endAtUnix]);

  useEffect(() => {
    if (endAtUnix == null) return;
    const p = compute(endAtUnix, Date.now());
    if (p.ended) onEnd?.();
  }, [endAtUnix, now, onEnd]);

  if (endAtUnix == null) return null;
  const p = compute(endAtUnix, now);
  if (p.ended && onEnd) {
    // fire once when transition — simplified: caller refetches
  }
  return p;
}
