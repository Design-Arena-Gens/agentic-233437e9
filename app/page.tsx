"use client";
import useSWR from 'swr';
import Chart from '@/components/Chart';
import type { Candle } from '@/lib/indicators';
import { analyze, ema, rsi, macd } from '@/lib/indicators';
import { useEffect, useMemo, useState } from 'react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const PRESETS = [
  { label: '??????', symbol: 'BTCUSDT', market: 'crypto' },
  { label: '????????', symbol: 'ETHUSDT', market: 'crypto' },
  { label: '?????? 100', symbol: '^NDX', market: 'stock' },
  { label: 'S&P 500', symbol: '^GSPC', market: 'stock' },
  { label: '????', symbol: 'TSLA', market: 'stock' },
  { label: '???', symbol: 'AAPL', market: 'stock' },
  { label: '????/?????', symbol: 'EURUSD=X', market: 'forex' },
  { label: '???', symbol: 'GC=F', market: 'commodity' },
];

const TIMEFRAMES = ['1m','5m','15m','1h','4h','1d'] as const;

type Market = 'crypto'|'stock'|'forex'|'commodity';

enum DirColor { long = '#10b981', short = '#ef4444', neutral = '#94a3b8' }

export default function Page() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [market, setMarket] = useState<Market>('crypto');
  const [interval, setInterval] = useState<'1m'|'5m'|'15m'|'1h'|'4h'|'1d'>('1h');
  const [showEMA, setShowEMA] = useState(true);
  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(true);

  const { data, isLoading } = useSWR(`/api/price?symbol=${encodeURIComponent(symbol)}&market=${market}&interval=${interval}` , fetcher, { refreshInterval: market === 'crypto' && (interval==='1m'||interval==='5m') ? 5000 : 20000 });
  const candles: Candle[] = data?.candles || [];

  const overlay = useMemo(() => {
    const closes = candles.map(c=>c.close);
    return {
      ema20: showEMA ? ema(closes,20).map(x=>x??0) : undefined,
      ema50: showEMA ? ema(closes,50).map(x=>x??0) : undefined,
      rsi14: showRSI ? rsi(closes,14).map(x=>x??0) : undefined,
      macd: showMACD ? macd(closes) : undefined,
    };
  }, [candles, showEMA, showRSI, showMACD]);

  const signal = useMemo(() => analyze(candles), [candles]);

  const dirText = signal.direction === 'long' ? '????' : signal.direction === 'short' ? '???' : '?????';
  const dirColor = DirColor[signal.direction];

  return (
    <div className="container">
      <div className="header">
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span className="brand">???? ??????? ?????</span>
          <span className="badge">????? ???? + ?????? ????</span>
        </div>
        <a className="small" href="https://agentic-233437e9.vercel.app" target="_blank" rel="noreferrer">??????? ????????</a>
      </div>

      <div className="grid">
        <div className="panel">
          <div className="row" style={{marginBottom:8}}>
            <select value={market} onChange={e=>setMarket(e.target.value as Market)} style={{maxWidth:160}}>
              <option value="crypto">????? ?????</option>
              <option value="stock">???? ???????</option>
              <option value="forex">?????</option>
              <option value="commodity">???</option>
            </select>
            <input className="input" placeholder="????? (????: BTCUSDT ?? AAPL ?? EURUSD=X)" value={symbol} onChange={e=>setSymbol(e.target.value)} />
            <select value={interval} onChange={e=>setInterval(e.target.value as any)} style={{maxWidth:140}}>
              {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
            </select>
            <button className="btn" onClick={()=>{ /* SWR auto refresh */ }}>?????</button>
          </div>

          <div className="row" style={{marginBottom:8}}>
            {PRESETS.map(p => (
              <button key={p.symbol} className="btn ghost" onClick={()=>{setSymbol(p.symbol); setMarket(p.market as Market);}}>{p.label}</button>
            ))}
          </div>

          <Chart candles={candles} overlay={overlay} />

          <div className="row" style={{marginTop:8}}>
            <label className="toggle"><input type="checkbox" checked={showEMA} onChange={e=>setShowEMA(e.target.checked)} /> EMA 20/50</label>
            <label className="toggle"><input type="checkbox" checked={showRSI} onChange={e=>setShowRSI(e.target.checked)} /> RSI</label>
            <label className="toggle"><input type="checkbox" checked={showMACD} onChange={e=>setShowMACD(e.target.checked)} /> MACD</label>
          </div>
        </div>

        <div className="panel">
          <div className="kpis">
            <div className="stat"><span>???????</span><span style={{color:dirColor,fontWeight:700}}>{dirText}</span></div>
            <div className="stat"><span>?????</span><span>{Math.round(signal.confidence*100)}%</span></div>
            <div className="stat"><span>??? ???????</span><span>{signal.stopLoss ? signal.stopLoss.toFixed(4) : '-'}</span></div>
            <div className="stat"><span>??? ???????</span><span>{signal.takeProfit ? signal.takeProfit.toFixed(4) : '-'}</span></div>
          </div>
          <hr className="sep" />
          <div className="small">???? ???? ???? ????? ????? ??? ??? ??????? ???????: {interval}</div>
          <div style={{marginTop:8, lineHeight:1.8}}>{signal.rationale}</div>
          <hr className="sep" />
          <NewsPanel symbol={symbol} />
          <div className="small" style={{marginTop:8}}>?????: ???? ????? ?????????. ?? ?????? ??????? ?????.</div>
        </div>
      </div>
    </div>
  );
}

function NewsPanel({ symbol }: { symbol: string }) {
  const { data } = useSWR(`/api/news?symbol=${encodeURIComponent(symbol)}`, fetcher, { refreshInterval: 60000 });
  return (
    <div>
      <div style={{fontWeight:700, marginBottom:6}}>????? ??????</div>
      <div style={{display:'grid', gap:6}}>
        {data?.items?.length ? data.items.map((n:any) => (
          <a key={n.link} href={n.link} target="_blank" rel="noreferrer" className="small" style={{textDecoration:'none', color:'#93c5fd'}}>{n.title}</a>
        )) : <div className="small">?? ???? ????? ??????</div>}
      </div>
    </div>
  );
}
