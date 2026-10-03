import { Injectable, Logger } from '@nestjs/common';
import {
  IStrategy,
  StrategyMeta,
  MarketData,
  StrategyResult,
} from '../strategy.interface';
import { BinanceService, BinanceKline } from '../../binance/binance.service';

interface SwingPoint {
  index: number;
  price: number;
  time: number;
}

interface SRZone {
  level: number;
  touches: number;
  type: 'SUPPORT' | 'RESISTANCE';
}

@Injectable()
export class CryptoSavageV1Strategy implements IStrategy {
  private readonly logger = new Logger(CryptoSavageV1Strategy.name);

  meta: StrategyMeta = {
    id: 'crypto_savage',
    displayName: 'Crypto Savage v1 (Price Action Multi-Confluence)',
    description:
      'Strategi Price Action murni berdasarkan Handbook Crypto Savage: Dynamic True S/R (HTF 4H), Multiple Rejection Wick, Engulfing Follow-Through, Trendline Breakout, 50 EMA Confluence, dan RSI Divergence dengan Target RRR minimal 1:2.',
    version: 'v1',
    author: 'Crypto Savage Handbook',
    timeframe: '1h',
    indicators: [
      'Dynamic True S/R Zone (4H/1H)',
      'Multiple Long Wick Rejection',
      'Momentum / Engulfing Follow-Through',
      'Counter-Trendline Breakout',
      '50 EMA Dynamic S/R',
      'RSI 14 Divergence',
      'Strict 1:2+ RRR Engine',
    ],
    defaultEnabled: true,
  };

  constructor(private readonly binanceService: BinanceService) {}

  // ==========================================
  // 1. MATHEMATICAL INDICATORS (EMA & RSI)
  // ==========================================
  private calcEMA(data: number[], period: number): number[] {
    if (data.length === 0) return [];
    const k = 2 / (period + 1);
    const ema = [data[0]];
    for (let i = 1; i < data.length; i++) {
      ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
  }

  private calcRSIArray(closes: number[], period = 14): number[] {
    if (closes.length < period + 1) return [];
    const rsiArr: number[] = new Array(period).fill(50);

    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;

    const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiArr.push(100 - 100 / (1 + firstRS));

    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
      if (avgLoss === 0) {
        rsiArr.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsiArr.push(100 - 100 / (1 + rs));
      }
    }
    return rsiArr;
  }

  // ==========================================
  // 2. SWING PIVOTS & DYNAMIC S/R (Bab 1, 2 & 9)
  // ==========================================
  private findSwings(
    klines: BinanceKline[],
    window = 2,
  ): { highs: SwingPoint[]; lows: SwingPoint[] } {
    const highs: SwingPoint[] = [];
    const lows: SwingPoint[] = [];

    for (let i = window; i < klines.length - window; i++) {
      let isHigh = true;
      let isLow = true;
      const currentHigh = klines[i].high;
      const currentLow = klines[i].low;

      for (let j = 1; j <= window; j++) {
        if (
          klines[i - j].high > currentHigh ||
          klines[i + j].high > currentHigh
        ) {
          isHigh = false;
        }
        if (klines[i - j].low < currentLow || klines[i + j].low < currentLow) {
          isLow = false;
        }
      }

      if (isHigh) {
        highs.push({ index: i, price: currentHigh, time: klines[i].openTime });
      }
      if (isLow) {
        lows.push({ index: i, price: currentLow, time: klines[i].openTime });
      }
    }

    return { highs, lows };
  }

  private findDynamicSRZones(
    klines: BinanceKline[],
    currentPrice: number,
    tolerance = 0.018, // 1.8% clustering zone
  ): { supports: SRZone[]; resistances: SRZone[] } {
    const { highs, lows } = this.findSwings(klines, 2);
    const zones: SRZone[] = [];

    // Grouping Lows into Support candidates
    for (const low of lows) {
      const existing = zones.find(
        (z) =>
          z.type === 'SUPPORT' &&
          Math.abs(z.level - low.price) / low.price < tolerance,
      );
      if (existing) {
        existing.touches += 1;
        existing.level = (existing.level + low.price) / 2;
      } else {
        zones.push({ level: low.price, touches: 1, type: 'SUPPORT' });
      }
    }

    // Grouping Highs into Resistance candidates
    for (const high of highs) {
      const existing = zones.find(
        (z) =>
          z.type === 'RESISTANCE' &&
          Math.abs(z.level - high.price) / high.price < tolerance,
      );
      if (existing) {
        existing.touches += 1;
        existing.level = (existing.level + high.price) / 2;
      } else {
        zones.push({ level: high.price, touches: 1, type: 'RESISTANCE' });
      }
    }

    const supports = zones
      .filter((z) => z.level < currentPrice * 1.01)
      .sort((a, b) => b.touches - a.touches);

    const resistances = zones
      .filter((z) => z.level > currentPrice * 0.99)
      .sort((a, b) => b.touches - a.touches);

    return { supports, resistances };
  }

  // ==========================================
  // 3. CANDLE ACTION: REJECTIONS & ENGULFING (Bab 3 & 8)
  // ==========================================
  private analyzeCandleRejection(kline: BinanceKline): {
    isBullishRejection: boolean;
    isBearishRejection: boolean;
    wickPct: number;
    bodyPct: number;
  } {
    const range = kline.high - kline.low;
    if (range === 0) {
      return {
        isBullishRejection: false,
        isBearishRejection: false,
        wickPct: 0,
        bodyPct: 0,
      };
    }

    const body = Math.abs(kline.close - kline.open);
    const bodyPct = body / range;

    const lowerWick = Math.min(kline.open, kline.close) - kline.low;
    const upperWick = kline.high - Math.max(kline.open, kline.close);

    const lowerWickPct = lowerWick / range;
    const upperWickPct = upperWick / range;

    // Long lower wick (ekor bawah panjang >= 45% range candle) = penolakan seller (bullish)
    const isBullishRejection = lowerWickPct >= 0.45 && bodyPct <= 0.45;

    // Long upper wick (ekor atas panjang >= 45% range candle) = penolakan buyer (bearish)
    const isBearishRejection = upperWickPct >= 0.45 && bodyPct <= 0.45;

    return {
      isBullishRejection,
      isBearishRejection,
      wickPct: Math.max(lowerWickPct, upperWickPct),
      bodyPct,
    };
  }

  private analyzeEngulfingFollowThrough(
    current: BinanceKline,
    previous: BinanceKline,
  ): {
    isBullishFollowThrough: boolean;
    isBearishFollowThrough: boolean;
  } {
    const isCurrentBull = current.close > current.open;
    const isCurrentBear = current.close < current.open;
    const currentBody = Math.abs(current.close - current.open);
    const prevBody = Math.abs(previous.close - previous.open);

    // Bullish Follow Through: Candle hijau solid menelan candle sebelumnya
    const isBullishFollowThrough =
      isCurrentBull &&
      current.close > previous.high &&
      currentBody >= prevBody * 0.9;

    // Bearish Follow Through: Candle merah solid menelan candle sebelumnya
    const isBearishFollowThrough =
      isCurrentBear &&
      current.close < previous.low &&
      currentBody >= prevBody * 0.9;

    return { isBullishFollowThrough, isBearishFollowThrough };
  }

  // ==========================================
  // 4. RSI DIVERGENCE DETECTION (Bab 15)
  // ==========================================
  private detectRSIDivergence(
    klines: BinanceKline[],
    rsiArr: number[],
  ): { hasBullishDiv: boolean; hasBearishDiv: boolean; rsiValue: number } {
    if (klines.length < 15 || rsiArr.length < 15) {
      return { hasBullishDiv: false, hasBearishDiv: false, rsiValue: 50 };
    }

    const len = klines.length;
    const currentRSI = rsiArr[rsiArr.length - 1];

    // Ambil lembah harga & RSI dalam 15 candle terakhir untuk Bullish Div
    let lowestPrice1 = klines[len - 1].low;
    let rsiAtLow1 = rsiArr[len - 1];
    let lowIdx1 = len - 1;

    for (let i = len - 2; i >= len - 6; i--) {
      if (klines[i].low < lowestPrice1) {
        lowestPrice1 = klines[i].low;
        rsiAtLow1 = rsiArr[i];
        lowIdx1 = i;
      }
    }

    let lowestPrice2 = Infinity;
    let rsiAtLow2 = 50;
    for (let i = lowIdx1 - 3; i >= Math.max(0, len - 16); i--) {
      if (klines[i].low < lowestPrice2) {
        lowestPrice2 = klines[i].low;
        rsiAtLow2 = rsiArr[i];
      }
    }

    // Bullish Div: Harga membentuk Lower Low, tetapi RSI membentuk Higher Low
    const hasBullishDiv =
      lowestPrice1 < lowestPrice2 &&
      rsiAtLow1 > rsiAtLow2 &&
      (rsiAtLow1 <= 42 || rsiAtLow2 <= 42);

    // Ambil puncak harga & RSI dalam 15 candle terakhir untuk Bearish Div
    let highestPrice1 = klines[len - 1].high;
    let rsiAtHigh1 = rsiArr[len - 1];
    let highIdx1 = len - 1;

    for (let i = len - 2; i >= len - 6; i--) {
      if (klines[i].high > highestPrice1) {
        highestPrice1 = klines[i].high;
        rsiAtHigh1 = rsiArr[i];
        highIdx1 = i;
      }
    }

    let highestPrice2 = -Infinity;
    let rsiAtHigh2 = 50;
    for (let i = highIdx1 - 3; i >= Math.max(0, len - 16); i--) {
      if (klines[i].high > highestPrice2) {
        highestPrice2 = klines[i].high;
        rsiAtHigh2 = rsiArr[i];
      }
    }

    // Bearish Div: Harga membentuk Higher High, tetapi RSI membentuk Lower High
    const hasBearishDiv =
      highestPrice1 > highestPrice2 &&
      rsiAtHigh1 < rsiAtHigh2 &&
      (rsiAtHigh1 >= 58 || rsiAtHigh2 >= 58);

    return { hasBullishDiv, hasBearishDiv, rsiValue: currentRSI };
  }

  // ==========================================
  // 5. COUNTER-TRENDLINE BREAKOUT (Bab 5 & 11)
  // ==========================================
  private detectCounterTrendlineBreak(
    klines: BinanceKline[],
    isBullishAttempt: boolean,
  ): boolean {
    const len = klines.length;
    if (len < 10) return false;

    if (isBullishAttempt) {
      // Breakout ke atas dari counter downtrend line
      // Periksa 3 puncak minor sebelumnya: jika candle terakhir close di atas garis penghubung puncak
      const p1 = klines[len - 6].high;
      const p2 = klines[len - 3].high;
      const currentClose = klines[len - 1].close;

      const slope = (p2 - p1) / 3;
      const expectedTrendlinePrice = p2 + slope * 2;

      return currentClose > expectedTrendlinePrice && p1 > p2;
    } else {
      // Breakout ke bawah dari counter uptrend line
      const v1 = klines[len - 6].low;
      const v2 = klines[len - 3].low;
      const currentClose = klines[len - 1].close;

      const slope = (v2 - v1) / 3;
      const expectedTrendlinePrice = v2 + slope * 2;

      return currentClose < expectedTrendlinePrice && v2 > v1;
    }
  }

  // ==========================================
  // 6. STRATEGY EVALUATOR
  // ==========================================
  async evaluate(data: MarketData): Promise<StrategyResult | null> {
    const { symbol, lastPrice, quoteVolume } = data;

    // 1. Likuiditas minimum filter (Ebook menekankan broker liquid dan chart jelas)
    if (quoteVolume < 30000000) return null;

    try {
      // 2. Ambil data Multi-Timeframe:
      // - 4H (HTF): 50 candle untuk True S/R Zone & Primary Trend Direction
      // - 1H (LTF): 35 candle untuk Candlestick Analysis, Dynamic EMA 50, RSI Divergence, & Breakout
      const [klines4h, klines1h] = await Promise.all([
        this.binanceService.getKlines(symbol, '4h', 55),
        this.binanceService.getKlines(symbol, '1h', 35),
      ]);

      if (klines4h.length < 30 || klines1h.length < 25) {
        return null;
      }

      const closes4h = klines4h.map((k: BinanceKline) => k.close);
      const closes1h = klines1h.map((k: BinanceKline) => k.close);

      // Hitung EMA 50 (Dynamic S/R)
      const ema50_4h = this.calcEMA(closes4h, 50);
      const ema50_1h = this.calcEMA(closes1h, 50);
      const lastEma50_4h = ema50_4h[ema50_4h.length - 1];
      const lastEma50_1h = ema50_1h[ema50_1h.length - 1];

      // Analisa Candlestick 1H terkini (Rejection & Momentum)
      const lastCandle1h = klines1h[klines1h.length - 1];
      const prevCandle1h = klines1h[klines1h.length - 2];
      const prev2Candle1h = klines1h[klines1h.length - 3];

      const rejection1 = this.analyzeCandleRejection(prevCandle1h);
      const rejection2 = this.analyzeCandleRejection(prev2Candle1h);
      const followThrough = this.analyzeEngulfingFollowThrough(
        lastCandle1h,
        prevCandle1h,
      );

      // Hitung Dynamic S/R Zone dari 4H (True S/R)
      const { supports, resistances } = this.findDynamicSRZones(
        klines4h,
        lastPrice,
        0.02,
      );

      // RSI Array & Divergence
      const rsiArr1h = this.calcRSIArray(closes1h, 14);
      const divergence = this.detectRSIDivergence(klines1h, rsiArr1h);

      // Confluence Evaluation
      let longScore = 0;
      let shortScore = 0;
      const longReasons: string[] = [];
      const shortReasons: string[] = [];

      // --- A. EVALUASI SETUP LONG (BULLISH) ---
      // 1. Support Zone Interaction
      const nearSupport = supports.find(
        (s) => Math.abs(lastPrice - s.level) / lastPrice <= 0.022,
      );
      if (nearSupport) {
        longScore += 25;
        longReasons.push(
          `Near 4H Dynamic Support ($${nearSupport.level.toFixed(4)}) with ${nearSupport.touches} touches`,
        );
      }

      // 2. Rejection Wick (Pin bar di area bawah)
      if (rejection1.isBullishRejection || rejection2.isBullishRejection) {
        longScore += 20;
        longReasons.push(
          'Long Lower Wick Rejection detected on 1H (exhaustion of sellers)',
        );
      }

      // 3. Momentum / Engulfing Follow-Through
      if (followThrough.isBullishFollowThrough) {
        longScore += 25;
        longReasons.push(
          'Bullish Engulfing/Momentum Candle confirmed follow-through',
        );
      }

      // 4. EMA 50 Dynamic Support Confluence
      const aboveEma50_4h = lastPrice >= lastEma50_4h * 0.995;
      const bouncingEma50_1h =
        Math.abs(lastPrice - lastEma50_1h) / lastPrice <= 0.015 &&
        lastPrice >= lastEma50_1h;
      if (aboveEma50_4h || bouncingEma50_1h) {
        longScore += 15;
        longReasons.push('50 EMA Confluence acting as Dynamic Support');
      }

      // 5. RSI Divergence / Healthy RSI
      if (divergence.hasBullishDiv) {
        longScore += 15;
        longReasons.push(
          `Bullish RSI Divergence confirmed (RSI: ${divergence.rsiValue.toFixed(1)})`,
        );
      }

      // 6. Counter-Trendline Breakout
      if (this.detectCounterTrendlineBreak(klines1h, true)) {
        longScore += 15;
        longReasons.push('Counter-trendline resistance breakout confirmed');
      }

      // --- B. EVALUASI SETUP SHORT (BEARISH) ---
      // 1. Resistance Zone Interaction
      const nearResistance = resistances.find(
        (r) => Math.abs(r.level - lastPrice) / lastPrice <= 0.022,
      );
      if (nearResistance) {
        shortScore += 25;
        shortReasons.push(
          `Near 4H Dynamic Resistance ($${nearResistance.level.toFixed(4)}) with ${nearResistance.touches} touches`,
        );
      }

      // 2. Rejection Wick (Pin bar di area atas)
      if (rejection1.isBearishRejection || rejection2.isBearishRejection) {
        shortScore += 20;
        shortReasons.push(
          'Long Upper Wick Rejection detected on 1H (exhaustion of buyers)',
        );
      }

      // 3. Momentum / Engulfing Follow-Through
      if (followThrough.isBearishFollowThrough) {
        shortScore += 25;
        shortReasons.push(
          'Bearish Engulfing/Momentum Candle confirmed follow-through',
        );
      }

      // 4. EMA 50 Dynamic Resistance Confluence
      const belowEma50_4h = lastPrice <= lastEma50_4h * 1.005;
      const rejectingEma50_1h =
        Math.abs(lastPrice - lastEma50_1h) / lastPrice <= 0.015 &&
        lastPrice <= lastEma50_1h;
      if (belowEma50_4h || rejectingEma50_1h) {
        shortScore += 15;
        shortReasons.push('50 EMA Confluence acting as Dynamic Resistance');
      }

      // 5. RSI Divergence
      if (divergence.hasBearishDiv) {
        shortScore += 15;
        shortReasons.push(
          `Bearish RSI Divergence confirmed (RSI: ${divergence.rsiValue.toFixed(1)})`,
        );
      }

      // 6. Counter-Trendline Breakout
      if (this.detectCounterTrendlineBreak(klines1h, false)) {
        shortScore += 15;
        shortReasons.push('Counter-trendline support breakdown confirmed');
      }

      // ==========================================
      // 7. DECISION & RISK MANAGEMENT (1:2+ RRR)
      // ==========================================
      const isLongValid = longScore >= 70;
      const isShortValid = shortScore >= 70;

      if (!isLongValid && !isShortValid) {
        return null;
      }

      const isLong = longScore >= shortScore;
      const score = Math.min(99, isLong ? longScore : shortScore);
      const reasons = isLong ? longReasons : shortReasons;
      const signalType = isLong ? 'LONG' : 'SHORT';
      const signal = isLong
        ? score >= 85
          ? 'STRONG BUY'
          : 'BUY'
        : score >= 85
          ? 'STRONG SELL'
          : 'SELL';

      // Hitung SL berbasis Swing Rejection Wick terbaru
      let slDistancePct: number;
      if (isLong) {
        const lowestWick = Math.min(
          lastCandle1h.low,
          prevCandle1h.low,
          prev2Candle1h.low,
        );
        const naturalDistance = (lastPrice - lowestWick) / lastPrice;
        // Beri buffer 0.4% di luar wick, minimal SL 1.5%, maksimal 3.5%
        slDistancePct = Math.min(
          0.035,
          Math.max(0.015, naturalDistance + 0.004),
        );
      } else {
        const highestWick = Math.max(
          lastCandle1h.high,
          prevCandle1h.high,
          prev2Candle1h.high,
        );
        const naturalDistance = (highestWick - lastPrice) / lastPrice;
        slDistancePct = Math.min(
          0.035,
          Math.max(0.015, naturalDistance + 0.004),
        );
      }

      const entryPrice = lastPrice;
      const sl = isLong
        ? entryPrice * (1 - slDistancePct)
        : entryPrice * (1 + slDistancePct);

      // Ebook Crypto Savage Rule: Minimal Risk Reward Ratio 1:2
      // TP1 = 1:2 RRR, TP2 = 1:3 RRR, TP3 = 1:4 RRR
      const riskAmount = Math.abs(entryPrice - sl);
      const tp1 = isLong
        ? entryPrice + riskAmount * 2.0
        : entryPrice - riskAmount * 2.0;
      const tp2 = isLong
        ? entryPrice + riskAmount * 3.0
        : entryPrice - riskAmount * 3.0;
      const tp3 = isLong
        ? entryPrice + riskAmount * 4.0
        : entryPrice - riskAmount * 4.0;

      reasons.push(
        `Crypto Savage RRR: Risk ${(slDistancePct * 100).toFixed(2)}% | TP1 (+${(
          slDistancePct *
          2 *
          100
        ).toFixed(
          2,
        )}% [1:2]) | TP2 (+${(slDistancePct * 3 * 100).toFixed(2)}% [1:3])`,
      );

      this.logger.log(
        `[CryptoSavageV1] Signal generated for ${symbol} | ${signalType} | Score: ${score}`,
      );

      return {
        shouldSignal: true,
        signal,
        signalType,
        entryPrice,
        tp1,
        tp2,
        tp3,
        sl,
        score,
        confidence: score >= 85 ? 'HIGH' : 'MEDIUM',
        reasons,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed evaluating CryptoSavageV1 for ${symbol}: ${message}`,
      );
      return null;
    }
  }
}
