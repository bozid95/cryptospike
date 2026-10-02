export interface StrategyMeta {
  id: string; // e.g. "breakout_1h"
  displayName: string; // e.g. "Breakout 1H Candle"
  description: string; // e.g. "Mendeteksi candle 1H dengan pergerakan harga signifikan"
  version: string; // e.g. "v1", "v2"
  author: string;
  timeframe: string; // e.g. "1h", "15m"
  indicators: string[]; // e.g. ["EMA", "RSI", "Volume"]
  defaultEnabled: boolean;
}

export interface CandleData {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  takerBuyVolume?: number;
}

export interface MarketData {
  symbol: string;
  lastPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  priceChangePct: number;
  candles?: CandleData[];
  takerBuyVolume?: number;
  direction?: string;
  triggerSource?: string;
}

export interface StrategyResult {
  shouldSignal: boolean;
  signal: 'BUY' | 'SELL' | 'STRONG BUY' | 'STRONG SELL';
  signalType: 'LONG' | 'SHORT';
  entryPrice: number;
  tp1: number;
  tp2?: number;
  tp3?: number;
  sl: number;
  score: number; // 0-100
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
}

export interface IStrategy {
  meta: StrategyMeta;
  evaluate(data: MarketData): Promise<StrategyResult | null>;
}
