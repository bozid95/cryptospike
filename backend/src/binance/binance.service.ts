import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

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

export interface BinanceBalanceItem {
  accountAlias: string;
  asset: string;
  balance: string;
  crossWalletBalance: string;
  crossUnPnl: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  marginAvailable: boolean;
  updateTime: number;
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

  private getFuturesBaseUrl(): string {
    const isTestnet = process.env.BINANCE_TESTNET === 'true';
    return isTestnet
      ? 'https://testnet.binancefuture.com'
      : 'https://fapi.binance.com';
  }

  async getAccountBalances(): Promise<BinanceBalanceItem[]> {
    try {
      const apiKey = process.env.BINANCE_API_KEY;
      const apiSecret = process.env.BINANCE_SECRET_KEY;

      if (!apiKey || !apiSecret) {
        this.logger.warn('Binance API key or secret is not configured.');
        return [];
      }

      const baseUrl = this.getFuturesBaseUrl();
      const timestamp = Date.now();
      const query = `timestamp=${timestamp}`;
      const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(query)
        .digest('hex');

      const response = await axios.get<BinanceBalanceItem[]>(
        `${baseUrl}/fapi/v2/balance?${query}&signature=${signature}`,
        {
          headers: { 'X-MBX-APIKEY': apiKey },
          timeout: 8000,
        },
      );

      // Ambil hanya aset yang memiliki saldo > 0
      return response.data.filter((b) => parseFloat(b.balance) > 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to fetch Binance Futures balance: ${message}`);
      return [];
    }
  }

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
