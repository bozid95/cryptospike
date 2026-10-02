import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface BinanceKline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteVolume: number;
  trades: number;
  takerBuyBaseVolume: number;
  takerBuyQuoteVolume: number;
}

export interface Binance24hTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

type RawKlineArray = [
  number, // 0: Open time
  string, // 1: Open
  string, // 2: High
  string, // 3: Low
  string, // 4: Close
  string, // 5: Volume
  number, // 6: Close time
  string, // 7: Quote asset volume
  number, // 8: Number of trades
  string, // 9: Taker buy base asset volume
  string, // 10: Taker buy quote asset volume
  string, // 11: Ignore
];

@Injectable()
export class BinanceService {
  private readonly logger = new Logger(BinanceService.name);
  private readonly baseUrl = 'https://fapi.binance.com';

  async getTopVolumePairs(limit = 100): Promise<Binance24hTicker[]> {
    try {
      const response = await axios.get<Binance24hTicker[]>(
        `${this.baseUrl}/fapi/v1/ticker/24hr`,
      );
      const tickers = response.data
        .filter((t) => t.symbol.endsWith('USDT'))
        .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, limit);
      return tickers;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to fetch 24hr tickers: ${message}`);
      return [];
    }
  }

  async getKlines(
    symbol: string,
    interval = '1h',
    limit = 24,
  ): Promise<BinanceKline[]> {
    try {
      const response = await axios.get<RawKlineArray[]>(
        `${this.baseUrl}/fapi/v1/klines`,
        {
          params: { symbol, interval, limit },
        },
      );
      return response.data.map((c: RawKlineArray) => ({
        openTime: c[0],
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5]),
        closeTime: c[6],
        quoteVolume: parseFloat(c[7]),
        trades: c[8],
        takerBuyBaseVolume: parseFloat(c[9]),
        takerBuyQuoteVolume: parseFloat(c[10]),
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to fetch klines for ${symbol}: ${message}`);
      return [];
    }
  }
}
