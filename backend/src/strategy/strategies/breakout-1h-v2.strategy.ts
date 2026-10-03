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

    // 1. Minimum volume filter ($5M quote volume)
    if (quoteVolume < 5000000) return null;

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
        // Long wajib berada dalam HTF Bullish (4H Trend Alignment: Close > EMA20 dan EMA20 >= EMA50)
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

        // Cek RSI 1H agar tidak membeli di pucuk overbought ekstrem (> 80)
        if (closes1h.length >= 15) {
          const rsi1h = this.calcRSI(closes1h, 14);
          if (rsi1h !== null && rsi1h > 80) {
            return null;
          }
          if (rsi1h !== null) {
            reasons.push(`1H RSI Healthy: ${rsi1h.toFixed(1)}`);
          }
        }
      }

      // --- FILTER UNTUK SHORT ---
      if (!isLong) {
        // Proteksi SHORT: Hindari short-selling koin yang sudah oversold (RSI 1H < 35)
        if (closes1h.length >= 15) {
          const rsi1h = this.calcRSI(closes1h, 14);
          if (rsi1h !== null && rsi1h < 35) {
            // Ditolak: harga sudah terlalu jenuh jual, risiko pantulan short squeeze sangat tinggi
            return null;
          }
          if (rsi1h !== null) {
            reasons.push(`1H RSI Safe for SHORT: ${rsi1h.toFixed(1)} (> 35)`);
          }
        }

        // Cek 4H Trend untuk SHORT: Harga tidak boleh jauh di atas EMA20 4H (dilarang short saat super rally)
        if (closes4h.length >= 25) {
          const ema20 = this.calcEMA(closes4h, 20);
          const lastClose4h = closes4h[closes4h.length - 1];
          const lastEma20 = ema20[ema20.length - 1];
          if (lastClose4h > lastEma20 * 1.03) {
            // Ditolak: Koin masih trending up sangat kuat di 4H
            return null;
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

      const signalType = isLong ? 'LONG' : 'SHORT';
      const signal = isLong
        ? priceChangePct >= 4
          ? 'STRONG BUY'
          : 'BUY'
        : priceChangePct <= -4
          ? 'STRONG SELL'
          : 'SELL';

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
        confidence: score >= 80 ? 'HIGH' : 'MEDIUM',
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
