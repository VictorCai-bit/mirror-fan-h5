import { useEffect, useRef } from 'react';
import { createChart, type IChartApi } from 'lightweight-charts';
import type { Candle } from '@/types/api';

export function KLineChart({ data }: { data: Candle[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      layout: { background: { color: '#14122A' }, textColor: '#9CA3AF' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
      width: ref.current.clientWidth,
      height: 220,
      timeScale: { timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;
    const series = chart.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });
    series.setData(
      data.map((c) => ({
        time: c.t as unknown as import('lightweight-charts').Time,
        open: Number(c.o) / 1e6,
        high: Number(c.h) / 1e6,
        low: Number(c.l) / 1e6,
        close: Number(c.c) / 1e6,
      })),
    );
    chart.timeScale().fitContent();
    const ro = new ResizeObserver(() => {
      if (ref.current && chartRef.current) {
        chartRef.current.applyOptions({ width: ref.current.clientWidth });
      }
    });
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data]);

  return <div ref={ref} className="w-full" />;
}
