"use client";
import { useEffect, useRef } from 'react';
import { createChart, ColorType, ISeriesApi } from 'lightweight-charts';
import type { Candle } from '@/lib/indicators';

export type IndicatorSeries = {
  ema20?: number[];
  ema50?: number[];
  rsi14?: number[];
  macd?: { macdLine: (number|null)[], signalLine: (number|null)[], histogram: (number|null)[] };
};

export default function Chart({ candles, overlay }: { candles: Candle[]; overlay?: IndicatorSeries }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (chartRef.current) return; // init once

    const chart = createChart(ref.current, {
      layout: { background: { type: ColorType.Solid, color: '#0f172a' }, textColor: '#cbd5e1' },
      grid: { horzLines: { color: 'rgba(148,163,184,0.1)' }, vertLines: { color: 'rgba(148,163,184,0.1)' } },
      rightPriceScale: { borderColor: 'rgba(148,163,184,0.25)' },
      timeScale: { borderColor: 'rgba(148,163,184,0.25)' },
      crosshair: { mode: 1 },
      width: ref.current.clientWidth,
      height: ref.current.clientHeight,
    });

    const series = chart.addCandlestickSeries({ upColor: '#10b981', downColor: '#ef4444', borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444' });
    candleSeriesRef.current = series;

    const handleResize = () => chart.applyOptions({ width: ref.current!.clientWidth, height: ref.current!.clientHeight });
    window.addEventListener('resize', handleResize);

    chartRef.current = chart;
    return () => { window.removeEventListener('resize', handleResize); chart.remove(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;
    const data = candles.map(c => ({ time: Math.floor(c.time / 1000), open: c.open, high: c.high, low: c.low, close: c.close }));
    candleSeriesRef.current.setData(data as any);
  }, [candles]);

  useEffect(() => {
    if (!chartRef.current) return;
    // could add line series for EMA overlays in the future
  }, [overlay]);

  return <div className="chartWrap" ref={ref} />;
}
