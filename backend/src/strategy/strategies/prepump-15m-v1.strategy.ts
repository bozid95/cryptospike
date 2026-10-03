import { Injectable, Logger } from '@nestjs/common';
import {
  IStrategy,
  StrategyMeta,
  MarketData,
  StrategyResult,
} from '../strategy.interface';
import { BinanceService, BinanceKline } from '../../binance/binance.service';

@Injectable()
export class PrePump15mV1Strategy implements IStrategy {
  private readonly logger = new Logger(PrePump15mV1Strategy.name);

  meta: StrategyMeta = {
    id: 'prepump_15m',
    displayName: 'Pre-Pump & Pre-Dump 15M Detector',
    description:
      'Mendeteksi akumulasi/distribusi awal dengan konfirmasi HTF 4H Trend Alignment dan 15M Volume Spike.',
    version: 'v1',
    author: 'CryptoSpike Engine',
    timeframe: '15m',
    indicators: [
      '4H HTF Trend Alignment',
      'Taker Buy Ratio',
      '15M Relative Volume Spike (RVOL >= 1.5x)',
      'Consolidation Compression',
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

  async evaluate(data: MarketData): Promise<StrategyResult | null> {
    const { symbol, lastPrice, takerBuyVolume, volume, quoteVolume } = data;

    // 1. Likuiditas minimum filter ($100M)
    if (quoteVolume < 100000000) return null;

    // 2. Filter taker volume anomaly
    if (!takerBuyVolume || !volume || volume === 0) return null;

    const takerRatio = takerBuyVolume / volume;
    const isBullishTaker = takerRatio >= 0.65; // Buyer dominan akumulasi
    const isBearishTaker = takerRatio <= 0.35; // Seller dominan distribusi

    if (!isBullishTaker && !isBearishTaker) return null;

    try {
      // 3. Multi-Timeframe Confirmation: Ambil klines 4H dan 15M dari Binance
      const [klines4h, klines15m] = await Promise.all([
        this.binanceService.getKlines(symbol, '4h', 55),
        this.binanceService.getKlines(symbol, '15m', 25),
      ]);

      if (klines4h.length < 30 || klines15m.length < 20) return null;

      const closes4h = klines4h.map((k: BinanceKline) => k.close);
      const ema20_4h = this.calcEMA(closes4h, 20);
      const ema50_4h = this.calcEMA(closes4h, 50);
      const lastEma20_4h = ema20_4h[ema20_4h.length - 1];
      const lastEma50_4h = ema50_4h[ema50_4h.length - 1];
      const lastClose4h = closes4h[closes4h.length - 1];

      // 4. Volume Spike 15M: Bandingkan volume 15M terkini dengan rata-rata 20 candle sebelumnya
      const lastVol15m = klines15m[klines15m.length - 1].volume;
      const prev20Vol15m = klines15m.slice(
        Math.max(0, klines15m.length - 21),
        klines15m.length - 1,
      );
      const avgVol15m =
        prev20Vol15m.length > 0
          ? prev20Vol15m.reduce((acc, k) => acc + k.volume, 0) /
            prev20Vol15m.length
          : lastVol15m;
      const rvol15m = avgVol15m > 0 ? lastVol15m / avgVol15m : 1.0;

      // Wajib ada lonjakan volume nyata pada timeframe 15m (RVOL >= 1.4x)
      if (rvol15m < 1.4) {
        return null;
      }

      // 5. Evaluasi Sinyal LONG (Pre-Pump)
      if (isBullishTaker) {
        // HTF Confirmation: Jangan long jika 4H berada dalam deep downtrend
        const is4hBullish =
          lastClose4h >= lastEma50_4h * 0.99 ||
          lastEma20_4h >= lastEma50_4h * 0.995;
        if (!is4hBullish) return null;

        const entryPrice = lastPrice;
        const tp1 = entryPrice * 1.02;
        const tp2 = entryPrice * 1.038;
        const tp3 = entryPrice * 1.056;
        const sl = entryPrice * 0.985;
        const score = Math.min(98, Math.round(takerRatio * 100 + rvol15m * 5));

        if (score < 90) return null;

        return {
          shouldSignal: true,
          signal: 'STRONG BUY',
          signalType: 'LONG',
          entryPrice,
          tp1,
          tp2,
          tp3,
          sl,
          score,
          confidence: 'HIGH',
          reasons: [
            `Taker Buy Ratio: ${(takerRatio * 100).toFixed(1)}% (Agresif akumulasi)`,
            `15M Volume Spike Confirmed (RVOL: ${rvol15m.toFixed(2)}x)`,
            `4H HTF Bullish Structure Aligned`,
          ],
        };
      }

      // 6. Evaluasi Sinyal SHORT (Pre-Dump)
      if (isBearishTaker) {
        // HTF Confirmation: Jangan short jika 4H berada dalam strong uptrend
        const is4hBearish =
          lastClose4h <= lastEma50_4h * 1.01 ||
          lastEma20_4h <= lastEma50_4h * 1.005;
        if (!is4hBearish) return null;

        const entryPrice = lastPrice;
        const tp1 = entryPrice * 0.98;
        const tp2 = entryPrice * 0.962;
        const tp3 = entryPrice * 0.944;
        const sl = entryPrice * 1.015;
        const score = Math.min(
          98,
          Math.round((1 - takerRatio) * 100 + rvol15m * 5),
        );

        if (score < 90) return null;

        return {
          shouldSignal: true,
          signal: 'STRONG SELL',
          signalType: 'SHORT',
          entryPrice,
          tp1,
          tp2,
          tp3,
          sl,
          score,
          confidence: 'HIGH',
          reasons: [
            `Taker Sell Ratio: ${((1 - takerRatio) * 100).toFixed(1)}% (Agresif distribusi)`,
            `15M Volume Spike Confirmed (RVOL: ${rvol15m.toFixed(2)}x)`,
            `4H HTF Bearish Structure Aligned`,
          ],
        };
      }

      return null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed evaluating MTF PrePump for ${symbol}: ${message}`,
      );
      return null;
    }
  }
}

