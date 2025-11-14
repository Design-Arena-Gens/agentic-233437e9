import { NextRequest } from 'next/server';
import { binanceUrl, yahooUrl, mapYahooSymbol, toCandlesFromBinance, toCandlesFromYahoo } from '@/lib/data';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
  const market = (searchParams.get('market') || 'crypto') as 'crypto'|'stock'|'forex'|'commodity';
  const interval = (searchParams.get('interval') || '1h') as '1m'|'5m'|'15m'|'1h'|'4h'|'1d';

  try {
    if (market === 'crypto') {
      const url = binanceUrl(symbol, interval);
      const res = await fetch(url, { next: { revalidate: 0 }, headers: { 'User-Agent': 'markets-ai/1.0' } });
      if (!res.ok) throw new Error(`Binance error: ${res.status}`);
      const json = await res.json();
      const candles = toCandlesFromBinance(json);
      return Response.json({ symbol, market, interval, candles });
    }

    // yahoo-based
    const ySymbol = mapYahooSymbol(symbol, market);
    const url = yahooUrl(ySymbol, interval);
    const res = await fetch(url, { next: { revalidate: 0 }, headers: { 'User-Agent': 'markets-ai/1.0' } });
    if (!res.ok) throw new Error(`Yahoo error: ${res.status}`);
    const json = await res.json();
    const candles = toCandlesFromYahoo(json);
    return Response.json({ symbol: ySymbol, market, interval, candles });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'fetch_failed' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
