export type Candle = { time: number; open: number; high: number; low: number; close: number; volume?: number };

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    prev = prev === null ? v : v * k + prev * (1 - k);
    if (i >= period - 1) out[i] = prev;
  }
  return out;
}

export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = Array(values.length).fill(null);
  let gains = 0, losses = 0;
  for (let i = 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    if (i <= period) {
      gains += gain; losses += loss;
      if (i === period) {
        const rs = (gains / period) / (losses / period || 1e-12);
        out[i] = 100 - 100 / (1 + rs);
      }
    } else {
      const prev = out[i - 1];
      gains = (gains * (period - 1) + gain) / period * period; // keep same scale
      losses = (losses * (period - 1) + loss) / period * period;
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 1e6 : avgGain / avgLoss;
      out[i] = 100 - 100 / (1 + rs);
    }
  }
  return out;
}

export function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine: (number | null)[] = values.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? (emaFast[i]! - emaSlow[i]!) : null
  );
  const macdVals = macdLine.map(v => v == null ? 0 : v);
  const signalLine = ema(macdVals, signal);
  const histogram: (number | null)[] = macdLine.map((v, i) => (v != null && signalLine[i] != null) ? (v - signalLine[i]!) : null);
  return { macdLine, signalLine, histogram };
}

export function percentage(a: number, b: number) {
  return ((a - b) / b) * 100;
}

export type Signal = {
  direction: 'long' | 'short' | 'neutral',
  confidence: number,
  stopLoss?: number,
  takeProfit?: number,
  rationale: string
};

export function analyze(candles: Candle[]): Signal {
  if (candles.length < 60) return { direction: 'neutral', confidence: 0.3, rationale: '?????? ??? ?????' };
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const rsi14 = rsi(closes, 14);
  const { histogram } = macd(closes);

  const i = candles.length - 1;
  const price = closes[i];
  const e20 = ema20[i]!; const e50 = ema50[i]!;
  const r = rsi14[i]!; const hist = histogram[i]!;
  const trendUp = e20 != null && e50 != null && e20 > e50;
  const trendDown = e20 != null && e50 != null && e20 < e50;

  let direction: Signal['direction'] = 'neutral';
  let confidence = 0.5;
  let rationaleParts: string[] = [];

  if (trendUp && hist > 0 && r < 70) {
    direction = 'long';
    confidence = 0.7 + Math.min(0.2, (r < 60 ? 0.1 : 0));
    rationaleParts.push('????? ???? (EMA20 ??? EMA50)');
    rationaleParts.push('??? ?????? (MACD > 0)');
    if (r < 70) rationaleParts.push('RSI ??? ?? ?????? ???????');
  } else if (trendDown && hist < 0 && r > 30) {
    direction = 'short';
    confidence = 0.7 + Math.min(0.2, (r > 40 ? 0.1 : 0));
    rationaleParts.push('????? ???? (EMA20 ??? EMA50)');
    rationaleParts.push('??? ???? (MACD < 0)');
    if (r > 30) rationaleParts.push('RSI ???? ?? ?????? ??????');
  } else {
    direction = 'neutral';
    confidence = 0.45;
    rationaleParts.push('?????? ???????? ????? ????????');
  }

  // swing points for SL/TP
  const lookback = 10;
  const recentLow = Math.min(...lows.slice(-lookback));
  const recentHigh = Math.max(...highs.slice(-lookback));

  let stopLoss: number | undefined;
  let takeProfit: number | undefined;
  if (direction === 'long') {
    stopLoss = Math.min(recentLow, e50);
    const risk = price - stopLoss;
    takeProfit = price + risk * 1.5;
  } else if (direction === 'short') {
    stopLoss = Math.max(recentHigh, e50);
    const risk = stopLoss - price;
    takeProfit = price - risk * 1.5;
  }

  return {
    direction,
    confidence: Math.max(0, Math.min(1, confidence)),
    stopLoss,
    takeProfit,
    rationale: rationaleParts.join(' ? ')
  };
}
