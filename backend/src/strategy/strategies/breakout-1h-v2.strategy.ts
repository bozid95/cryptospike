import { Injectable, Logger } from '@nestjs/common';
import {
  IStrategy,
  StrategyMeta,
  MarketData,
  StrategyResult,
} from '../strategy.interface';
import { BinanceService } from '../../binance/binance.service';

@Injectable()
export class Breakout1hV2Strategy implements IStrategy {
  private readonly logger = new Logger(Breakout1hV2Strategy.name);

  meta: StrategyMeta = {
    id: 'breakout_1h',
    displayName: 'Breakout 1H MTF Enhanced Engine',
    description:
      'Mendeteksi breakout 1H dengan konfirmasi Multi-Timeframe 4H Trend, RSI Oversold Protection, dan Dynamic ATR-based SL/TP.',
    version: 'v2',
    author: 'CryptoSpike Engine',
    timeframe: '1h',
    indicators: [
      '4H EMA20/50 Trend Alignment',
      '1H RSI Protection',
      'Adaptive Volatility SL/TP',
      'Volume Filter',
    ],
    defaultEnabled: false,
  };

  constructor(private readonly binanceService: BinanceService) {}

  private calcEMA(data: number[], period: number): number[] {
    if (data.length === 0) return [];
    const k = 2 / (period + 1);
    const ema = [data[0]];
    for (let i = 1; i < data.length; i++) {
      ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
  }

  private calcRSI(closes: number[], period = 14): number | null {
    if (closes.length < period + 1) return null;
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  async evaluate(data: MarketData): Promise<StrategyResult | null> {
    const { symbol, lastPrice, priceChangePct, quoteVolume } = data;

    // 1. Minimum volume filter ($100M quote volume - Bluechip & High Liquidity only)
    if (quoteVolume < 100000000) return null;

    // 2. Trigger awal pergerakan breakout signifikan (+2.5% atau -2.5%)
    if (Math.abs(priceChangePct) < 2.5) return null;

    const isLong = priceChangePct > 0;
    const reasons: string[] = [
      `24h Momentum: ${priceChangePct.toFixed(2)}%`,
      `Volume Quote: $${(quoteVolume / 1000000).toFixed(1)}M`,
    ];

    try {
      // 3. Multi-Timeframe Confirmation: Ambil klines 4H dan 1H dari Binance
      const [klines4h, klines1h] = await Promise.all([
        this.binanceService.getKlines(symbol, '4h', 55),
        this.binanceService.getKlines(symbol, '1h', 30),
      ]);

      const closes4h = klines4h.map((k) => k.close);
      const closes1h = klines1h.map((k) => k.close);

      // --- FILTER UNTUK LONG ---
      if (isLong) {
        // 1. Long wajib berada dalam HTF Bullish (4H Trend Alignment: Close > EMA20 dan EMA20 >= EMA50)
        if (closes4h.length >= 50) {
          const ema20 = this.calcEMA(closes4h, 20);
          const ema50 = this.calcEMA(closes4h, 50);
          const lastClose4h = closes4h[closes4h.length - 1];
          const lastEma20 = ema20[ema20.length - 1];
          const lastEma50 = ema50[ema50.length - 1];

          const is4hBullish =
            lastClose4h > lastEma20 && lastEma20 >= lastEma50 * 0.995;
          if (!is4hBullish) {
            // Abaikan sinyal LONG jika 4H berada dalam downtrend kuat (counter-trend trap)
            return null;
          }
          reasons.push(`4H Bullish Trend Confirmed (Price > EMA20 > EMA50)`);
        }

        // 2. Validasi Breakout Nyata pada 1H: Harga saat ini harus menembus swing high candle 1H sebelumnya
        if (klines1h.length >= 5) {
          const prevHigh1h = Math.max(
            klines1h[klines1h.length - 2].high,
            klines1h[klines1h.length - 3].high,
          );
          if (lastPrice <= prevHigh1h) {
            // Belum terjadi breakout struktur resistance 1H
            return null;
          }
          reasons.push(
            `1H Structural Breakout Above Resistance ($${prevHigh1h.toFixed(4)})`,
          );
        }

        // 3. Cek RSI 1H agar tidak membeli di pucuk overbought ekstrem (> 75)
        if (closes1h.length >= 15) {
          const rsi1h = this.calcRSI(closes1h, 14);
          if (rsi1h !== null && (rsi1h > 75 || rsi1h < 45)) {
            return null;
          }
          if (rsi1h !== null) {
            reasons.push(`1H RSI Strong Momentum: ${rsi1h.toFixed(1)}`);
          }
        }
      }

      // --- FILTER UNTUK SHORT ---
      if (!isLong) {
        // 1. 4H Trend Alignment untuk SHORT: Close < EMA20 dan EMA20 <= EMA50
        if (closes4h.length >= 50) {
          const ema20 = this.calcEMA(closes4h, 20);
          const ema50 = this.calcEMA(closes4h, 50);
          const lastClose4h = closes4h[closes4h.length - 1];
          const lastEma20 = ema20[ema20.length - 1];
          const lastEma50 = ema50[ema50.length - 1];

          const is4hBearish =
            lastClose4h < lastEma20 && lastEma20 <= lastEma50 * 1.005;
          if (!is4hBearish) {
            // Ditolak: Jangan short jika 4H masih uptrend
            return null;
          }
          reasons.push(`4H Bearish Trend Confirmed (Price < EMA20 < EMA50)`);
        }

        // 2. Validasi Breakdown Nyata pada 1H: Harga saat ini menembus swing low candle 1H sebelumnya
        if (klines1h.length >= 5) {
          const prevLow1h = Math.min(
            klines1h[klines1h.length - 2].low,
            klines1h[klines1h.length - 3].low,
          );
          if (lastPrice >= prevLow1h) {
            // Belum terjadi breakdown struktur support 1H
            return null;
          }
          reasons.push(
            `1H Structural Breakdown Below Support ($${prevLow1h.toFixed(4)})`,
          );
        }

        // 3. Proteksi SHORT: Hindari short koin yang oversold (RSI 1H < 35) atau overbought (> 55)
        if (closes1h.length >= 15) {
          const rsi1h = this.calcRSI(closes1h, 14);
          if (rsi1h !== null && (rsi1h < 35 || rsi1h > 55)) {
            return null;
          }
          if (rsi1h !== null) {
            reasons.push(`1H RSI Breakdown Momentum: ${rsi1h.toFixed(1)}`);
          }
        }
      }

      // 4. Dynamic Adaptive TP/SL Target
      // Berdasarkan temuan backtest, SL 1.2% terlalu sempit. SL diperlebar ke 1.8% untuk menghindari wick noise.
      const tp1Pct = 0.02; // 2.0%
      const tp2Pct = 0.038; // 3.8%
      const tp3Pct = 0.058; // 5.8%
      const slPct = 0.018; // 1.8% (Lebih tahan wick)

      const entryPrice = lastPrice;
      const tp1 = isLong
        ? entryPrice * (1 + tp1Pct)
        : entryPrice * (1 - tp1Pct);
      const tp2 = isLong
        ? entryPrice * (1 + tp2Pct)
        : entryPrice * (1 - tp2Pct);
      const tp3 = isLong
        ? entryPrice * (1 + tp3Pct)
        : entryPrice * (1 - tp3Pct);
      const sl = isLong ? entryPrice * (1 - slPct) : entryPrice * (1 + slPct);

      const score = Math.min(98, Math.round(65 + Math.abs(priceChangePct) * 6));

      // Filter Super Strong: Hanya terbitkan sinyal jika score >= 80 (momentum benar-benar masif)
      if (score < 80) {
        return null;
      }

      const signalType = isLong ? 'LONG' : 'SHORT';
      const signal = isLong ? 'STRONG BUY' : 'STRONG SELL';

      reasons.push(`Adaptive Target: TP1 +2.0%, TP2 +3.8%, SL 1.8%`);

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
        confidence: 'HIGH',
        reasons,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to evaluate MTF klines for ${symbol}: ${message}`,
      );
      // Fallback: jangan trigger jika konfirmasi MTF gagal
      return null;
    }
  }
}
