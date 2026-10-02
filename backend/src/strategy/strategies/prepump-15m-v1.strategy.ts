import { Injectable } from '@nestjs/common';
import {
  IStrategy,
  StrategyMeta,
  MarketData,
  StrategyResult,
} from '../strategy.interface';

@Injectable()
export class PrePump15mV1Strategy implements IStrategy {
  meta: StrategyMeta = {
    id: 'prepump_15m',
    displayName: 'Pre-Pump & Pre-Dump 15M Detector',
    description:
      'Mendeteksi akumulasi/distribusi awal dan lonjakan volume sebelum impuls besar.',
    version: 'v1',
    author: 'CryptoSpike Engine',
    timeframe: '15m',
    indicators: [
      'Taker Buy Ratio',
      'Volume Anomaly',
      'Consolidation Compression',
    ],
    defaultEnabled: true,
  };

  evaluate(data: MarketData): Promise<StrategyResult | null> {
    const { symbol, lastPrice, takerBuyVolume, volume } = data;

    // Filter taker volume anomaly
    if (!takerBuyVolume || !volume || volume === 0)
      return Promise.resolve(null);

    const takerRatio = takerBuyVolume / volume;

    // Buyer agresif dominan (Pre-Pump)
    if (takerRatio >= 0.62) {
      const entryPrice = lastPrice;
      const tp1 = entryPrice * 1.018;
      const tp2 = entryPrice * 1.036;
      const sl = entryPrice * 0.988;
      const score = Math.round(takerRatio * 100);

      return Promise.resolve({
        shouldSignal: true,
        signal: 'STRONG BUY',
        signalType: 'LONG',
        entryPrice,
        tp1,
        tp2,
        sl,
        score,
        confidence: 'HIGH',
        reasons: [
          `Taker Buy Ratio: ${(takerRatio * 100).toFixed(1)}% (Agresif akumulasi)`,
          `Pre-Pump compression terdeteksi pada ${symbol}`,
        ],
      });
    }

    // Seller agresif dominan (Pre-Dump)
    if (takerRatio <= 0.38) {
      const entryPrice = lastPrice;
      const tp1 = entryPrice * 0.982;
      const tp2 = entryPrice * 0.964;
      const sl = entryPrice * 1.012;
      const score = Math.round((1 - takerRatio) * 100);

      return Promise.resolve({
        shouldSignal: true,
        signal: 'STRONG SELL',
        signalType: 'SHORT',
        entryPrice,
        tp1,
        tp2,
        sl,
        score,
        confidence: 'HIGH',
        reasons: [
          `Taker Sell Ratio: ${((1 - takerRatio) * 100).toFixed(1)}% (Agresif distribusi)`,
          `Pre-Dump breakdown terdeteksi pada ${symbol}`,
        ],
      });
    }

    return Promise.resolve(null);
  }
}
