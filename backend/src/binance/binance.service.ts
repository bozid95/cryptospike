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

@Injectable()
export class BinanceService {
  private readonly logger = new Logger(BinanceService.name);
  private readonly baseUrl = 'https://fapi.binance.com';

  async getTopVolumePairs(limit = 100): Promise<Binance24hTicker[]> {
    try {
      const response = await axios.get<Binance24hTicker[]>(`${this.baseUrl}/fapi/v1/ticker/24hr`);
      const tickers = response.data
        .filter((t) => t.symbol.endsWith('USDT'))
        .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, limit);
      return tickers;
    } catch (err: any) {
      this.logger.error(`Failed to fetch 24hr tickers: ${err.message}`);
      return [];
    }
  }

  async getKlines(symbol: string, interval = '1h', limit = 24): Promise<BinanceKline[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/fapi/v1/klines`, {
        params: { symbol, interval, limit },
      });
      return response.data.map((c: any[]) => ({
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
    } catch (err: any) {
      this.logger.error(`Failed to fetch klines for ${symbol}: ${err.message}`);
      return [];
    }
  }
}
