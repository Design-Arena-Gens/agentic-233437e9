import { NextRequest } from "next/server";

export type Interval = '1m'|'5m'|'15m'|'1h'|'4h'|'1d';
export type Market = 'crypto'|'stock'|'forex'|'commodity';

export function mapYahooSymbol(symbol: string, market: Market) {
  // reasonable defaults for forex/commodities
  if (market === 'forex' && !symbol.includes('=')) return symbol + '=X';
  if (market === 'commodity' && symbol.toUpperCase() === 'GOLD') return 'GC=F';
  return symbol;
}

export function yahooUrl(symbol: string, interval: Interval) {
  const range = (interval === '1m' || interval === '5m' || interval === '15m') ? '5d' : (interval === '1h' || interval === '4h') ? '1mo' : '6mo';
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
}

export function binanceUrl(symbol: string, interval: Interval) {
  return `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=500`;
}

export function toCandlesFromYahoo(json: any) {
  const r = json?.chart?.result?.[0];
  if (!r) return [] as {time:number,open:number,high:number,low:number,close:number,volume:number}[];
  const ts = r.timestamp || [];
  const o = r.indicators?.quote?.[0]?.open || [];
  const h = r.indicators?.quote?.[0]?.high || [];
  const l = r.indicators?.quote?.[0]?.low || [];
  const c = r.indicators?.quote?.[0]?.close || [];
  const v = r.indicators?.quote?.[0]?.volume || [];
  const out = [] as {time:number,open:number,high:number,low:number,close:number,volume:number}[];
  for (let i = 0; i < ts.length; i++) {
    if (o[i] == null || h[i] == null || l[i] == null || c[i] == null) continue;
    out.push({ time: ts[i] * 1000, open: o[i], high: h[i], low: l[i], close: c[i], volume: v[i] ?? 0 });
  }
  return out;
}

export function toCandlesFromBinance(rows: any[]) {
  return rows.map(r => ({
    time: r[0],
    open: parseFloat(r[1]),
    high: parseFloat(r[2]),
    low: parseFloat(r[3]),
    close: parseFloat(r[4]),
    volume: parseFloat(r[5])
  }));
}
