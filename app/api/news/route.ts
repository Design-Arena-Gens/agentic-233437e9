import { NextRequest } from 'next/server';

export const revalidate = 0;

const FEEDS: Record<string,string> = {
  general: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL,MSFT,SPY,EURUSD=X,BTC-USD&region=US&lang=en-US',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || '';
  const feedUrl = symbol ? `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US` : FEEDS.general;
  try {
    const res = await fetch(feedUrl, { headers: { 'User-Agent': 'markets-ai/1.0' } });
    if (!res.ok) throw new Error('news_fetch_failed');
    const xml = await res.text();
    // Minimal RSS parse for titles/links
    const items = [...xml.matchAll(/<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<\/item>/g)].slice(0, 10)
      .map(m => ({ title: m[1], link: m[2], date: m[3] }));
    return Response.json({ items });
  } catch (e:any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
