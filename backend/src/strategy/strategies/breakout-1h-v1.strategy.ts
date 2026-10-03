import { Injectable } from '@nestjs/common';
import {
  IStrategy,
  StrategyMeta,
  MarketData,
  StrategyResult,
} from '../strategy.interface';

@Injectable()
export class Breakout1hV1Strategy implements IStrategy {
  meta: StrategyMeta = {
    id: 'breakout_1h',
    displayName: 'Breakout 1H Candle Engine',
    description:
      'Mendeteksi lonjakan volume dan pergerakan breakout harga candle 1H.',
    version: 'v1',
    author: 'CryptoSpike Engine',
    timeframe: '1h',
    indicators: ['Volume Spike', 'Candle Range', 'Momentum'],
    defaultEnabled: true,
  };

  evaluate(data: MarketData): Promise<StrategyResult | null> {
    const { symbol, lastPrice, priceChangePct, quoteVolume } = data;

    // Minimum volume check ($5M quote volume)
    if (quoteVolume < 5000000) return Promise.resolve(null);

    // Deteksi jika pergerakan >= 2.5% atau <= -2.5%
    if (Math.abs(priceChangePct) < 2.5) return Promise.resolve(null);

    const isLong = priceChangePct > 0;
    const signalType = isLong ? 'LONG' : 'SHORT';
    const signal = isLong
      ? priceChangePct >= 4
        ? 'STRONG BUY'
        : 'BUY'
      : priceChangePct <= -4
        ? 'STRONG SELL'
        : 'SELL';

    // Kalkulasi TP & SL adaptif
    const tp1Pct = 0.015; // 1.5%
    const tp2Pct = 0.03; // 3.0%
    const tp3Pct = 0.045; // 4.5%
    const slPct = 0.012; // 1.2%

    const entryPrice = lastPrice;
    const tp1 = isLong ? entryPrice * (1 + tp1Pct) : entryPrice * (1 - tp1Pct);
    const tp2 = isLong ? entryPrice * (1 + tp2Pct) : entryPrice * (1 - tp2Pct);
    const tp3 = isLong ? entryPrice * (1 + tp3Pct) : entryPrice * (1 - tp3Pct);
    const sl = isLong ? entryPrice * (1 - slPct) : entryPrice * (1 + slPct);

    const score = Math.min(95, Math.round(50 + Math.abs(priceChangePct) * 8));

    return Promise.resolve({
      shouldSignal: true,
      signal,
      signalType,
      entryPrice,
      tp1,
      tp2,
      tp3,
      sl,
      score,
      confidence: score > 75 ? 'HIGH' : 'MEDIUM',
      reasons: [
        `24h Change: ${priceChangePct.toFixed(2)}%`,
        `Volume Quote: $${(quoteVolume / 1000000).toFixed(1)}M`,
        `Breakout momentum terdeteksi pada ${symbol}`,
      ],
    });
  }
}
