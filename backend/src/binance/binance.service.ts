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
  private readonly defaultApiKey =
    'dhA11NTt2uFViDGybKvJv9g0IQc8PJilepPHV7uqgWH5H2opcwaJjGto1CgWiz13';
  private readonly defaultApiSecret =
    'wVVzZaysTZ3Pz4XhGDkPPRJAgvwIjw0sYJkxTlAsVHu6Q3tSP9TBpJmhCRdPBlIm';

  private getFuturesBaseUrl(): string {
    const isTestnet = process.env.BINANCE_TESTNET !== 'false';
    return isTestnet
      ? 'https://testnet.binancefuture.com'
      : 'https://fapi.binance.com';
  }

  private getCredentials() {
    const apiKey = process.env.BINANCE_API_KEY || this.defaultApiKey;
    const apiSecret = process.env.BINANCE_SECRET_KEY || this.defaultApiSecret;
    return { apiKey, apiSecret };
  }

  private timeOffset = 0;
  private lastTimeSync = 0;

  private async syncServerTime(): Promise<number> {
    const now = Date.now();
    // Re-sync setiap 10 menit
    if (this.lastTimeSync && now - this.lastTimeSync < 10 * 60 * 1000) {
      return now + this.timeOffset;
    }

    try {
      const baseUrl = this.getFuturesBaseUrl();
      const res = await axios.get<{ serverTime: number }>(
        `${baseUrl}/fapi/v1/time`,
        { timeout: 5000 },
      );
      if (res.data?.serverTime) {
        this.timeOffset = res.data.serverTime - now;
        this.lastTimeSync = now;
        this.logger.debug(
          `Binance server time synced. Offset: ${this.timeOffset}ms`,
        );
      }
    } catch (e: any) {
      this.logger.warn(`Failed to sync Binance server time: ${e.message}`);
    }

    return Date.now() + this.timeOffset;
  }

  private async getSignedQuery(
    params: Record<string, string | number | boolean | undefined> = {},
  ): Promise<{ query: string; signature: string }> {
    const { apiSecret } = this.getCredentials();
    const timestamp = await this.syncServerTime();

    const queryParts: string[] = [];
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined) {
        queryParts.push(`${key}=${encodeURIComponent(String(val))}`);
      }
    }

    queryParts.push(`timestamp=${timestamp}`);
    queryParts.push('recvWindow=60000');

    const query = queryParts.join('&');
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(query)
      .digest('hex');

    return { query, signature };
  }

  async getAccountBalances(): Promise<BinanceBalanceItem[]> {
    try {
      const { apiKey } = this.getCredentials();

      if (!apiKey) {
        this.logger.warn('Binance API key is not configured.');
        return [];
      }

      const baseUrl = this.getFuturesBaseUrl();
      const { query, signature } = await this.getSignedQuery();

      const response = await axios.get<BinanceBalanceItem[]>(
        `${baseUrl}/fapi/v2/balance?${query}&signature=${signature}`,
        {
          headers: { 'X-MBX-APIKEY': apiKey },
          timeout: 8000,
        },
      );

      // Ambil hanya aset yang memiliki saldo > 0
      return response.data.filter((b) => parseFloat(b.balance) > 0);
    } catch (err: any) {
      const errMsg =
        err.response?.data?.msg ||
        (err.response?.data ? JSON.stringify(err.response.data) : err.message);
      this.logger.error(`Failed to fetch Binance Futures balance: ${errMsg}`);
      return [];
    }
  }

  async getAccountDetail(): Promise<{
    totalMarginBalance: number;
    totalWalletBalance: number;
    totalAvailableBalance: number;
    assets: Array<{
      asset: string;
      walletBalance: string;
      marginBalance: string;
    }>;
  } | null> {
    try {
      const { apiKey } = this.getCredentials();
      if (!apiKey) return null;

      const baseUrl = this.getFuturesBaseUrl();
      const { query, signature } = await this.getSignedQuery();

      const response = await axios.get<{
        totalMarginBalance: string;
        totalWalletBalance: string;
        availableBalance: string;
        assets: Array<{
          asset: string;
          walletBalance: string;
          marginBalance: string;
        }>;
      }>(`${baseUrl}/fapi/v2/account?${query}&signature=${signature}`, {
        headers: { 'X-MBX-APIKEY': apiKey },
        timeout: 8000,
      });

      return {
        totalMarginBalance: parseFloat(response.data.totalMarginBalance),
        totalWalletBalance: parseFloat(response.data.totalWalletBalance),
        totalAvailableBalance: parseFloat(response.data.availableBalance),
        assets: response.data.assets.filter(
          (a) => parseFloat(a.walletBalance) > 0,
        ),
      };
    } catch (err: any) {
      const errMsg =
        err.response?.data?.msg ||
        (err.response?.data ? JSON.stringify(err.response.data) : err.message);
      this.logger.error(
        `Failed to fetch Binance Futures account detail: ${errMsg}`,
      );
      return null;
    }
  }

  async getTopVolumePairs(limit = 100): Promise<Binance24hTicker[]> {
    try {
      const baseUrl = this.getFuturesBaseUrl();
      const response = await axios.get<Binance24hTicker[]>(
        `${baseUrl}/fapi/v1/ticker/24hr`,
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
      const baseUrl = this.getFuturesBaseUrl();
      const response = await axios.get<RawKlineArray[]>(
        `${baseUrl}/fapi/v1/klines`,
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

  async getPositions(): Promise<any[]> {
    try {
      const { apiKey } = this.getCredentials();
      if (!apiKey) return [];

      const baseUrl = this.getFuturesBaseUrl();
      const { query, signature } = await this.getSignedQuery();

      const response = await axios.get<any[]>(
        `${baseUrl}/fapi/v2/positionRisk?${query}&signature=${signature}`,
        {
          headers: { 'X-MBX-APIKEY': apiKey },
          timeout: 8000,
        },
      );

      // Filter hanya posisi yang memiliki ukuran kontrak/posisi != 0
      return response.data.filter((p) => parseFloat(p.positionAmt) !== 0);
    } catch (err: any) {
      const errMsg =
        err.response?.data?.msg ||
        (err.response?.data ? JSON.stringify(err.response.data) : err.message);
      this.logger.error(`Failed to fetch Binance Futures positions: ${errMsg}`);
      return [];
    }
  }

  async getOpenOrders(symbol?: string): Promise<any[]> {
    try {
      const { apiKey } = this.getCredentials();
      if (!apiKey) return [];

      const baseUrl = this.getFuturesBaseUrl();
      const params: Record<string, string | undefined> = {};
      if (symbol) params.symbol = symbol;
      const { query, signature } = await this.getSignedQuery(params);

      const response = await axios.get<any[]>(
        `${baseUrl}/fapi/v1/openOrders?${query}&signature=${signature}`,
        {
          headers: { 'X-MBX-APIKEY': apiKey },
          timeout: 8000,
        },
      );
      return response.data;
    } catch (err: any) {
      const errMsg =
        err.response?.data?.msg ||
        (err.response?.data ? JSON.stringify(err.response.data) : err.message);
      this.logger.warn(`Failed to fetch open orders: ${errMsg}`);
      return [];
    }
  }

  async setLeverage(symbol: string, leverage: number) {
    try {
      const { apiKey } = this.getCredentials();
      if (!apiKey) return null;

      const baseUrl = this.getFuturesBaseUrl();
      const { query, signature } = await this.getSignedQuery({
        symbol,
        leverage,
      });

      const response = await axios.post(
        `${baseUrl}/fapi/v1/leverage?${query}&signature=${signature}`,
        null,
        { headers: { 'X-MBX-APIKEY': apiKey } },
      );
      return response.data;
    } catch (err: any) {
      const errMsg =
        err.response?.data?.msg ||
        (err.response?.data ? JSON.stringify(err.response.data) : err.message);
      this.logger.warn(`Set leverage failed for ${symbol}: ${errMsg}`);
      return null;
    }
  }

  async setMarginType(symbol: string, marginType: 'ISOLATED' | 'CROSSED') {
    try {
      const { apiKey } = this.getCredentials();
      if (!apiKey) return null;

      const baseUrl = this.getFuturesBaseUrl();
      const { query, signature } = await this.getSignedQuery({
        symbol,
        marginType,
      });

      const response = await axios.post(
        `${baseUrl}/fapi/v1/marginType?${query}&signature=${signature}`,
        null,
        { headers: { 'X-MBX-APIKEY': apiKey } },
      );
      return response.data;
    } catch (err: any) {
      // Error code -4046: "No need to change margin type" adalah normal jika sudah diset
      if (err.response?.data?.code === -4046) return null;
      const errMsg =
        err.response?.data?.msg ||
        (err.response?.data ? JSON.stringify(err.response.data) : err.message);
      this.logger.warn(`Set margin type failed for ${symbol}: ${errMsg}`);
      return null;
    }
  }

  async placeOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET';
    quantity?: number;
    price?: number;
    stopPrice?: number;
    reduceOnly?: boolean;
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
  }) {
    try {
      const { apiKey } = this.getCredentials();
      if (!apiKey) throw new Error('API key/secret missing');

      const baseUrl = this.getFuturesBaseUrl();
      const queryParams: Record<string, any> = {
        symbol: params.symbol,
        side: params.side,
        type: params.type,
      };

      if (params.quantity !== undefined) {
        queryParams.quantity = params.quantity;
      }
      if (params.price !== undefined) {
        queryParams.price = params.price;
      }
      if (params.stopPrice !== undefined) {
        queryParams.stopPrice = params.stopPrice;
      }
      if (params.reduceOnly) {
        queryParams.reduceOnly = true;
      }
      if (params.timeInForce) {
        queryParams.timeInForce = params.timeInForce;
      }

      const { query, signature } = await this.getSignedQuery(queryParams);

      const response = await axios.post(
        `${baseUrl}/fapi/v1/order?${query}&signature=${signature}`,
        null,
        {
          headers: { 'X-MBX-APIKEY': apiKey },
          timeout: 10000,
        },
      );
      return response.data;
    } catch (err: any) {
      const errMsg = err.response?.data?.msg || err.message;
      this.logger.error(`Place order failed for ${params.symbol}: ${errMsg}`);
      throw new Error(errMsg);
    }
  }

  // Cache symbol filter (tickSize, stepSize, minNotional)
  private symbolFilters = new Map<
    string,
    {
      tickSize: number;
      stepSize: number;
      minNotional: number;
      pricePrecision: number;
      quantityPrecision: number;
    }
  >();

  async getSymbolFilters(symbol: string) {
    if (this.symbolFilters.has(symbol)) {
      return this.symbolFilters.get(symbol)!;
    }

    try {
      const baseUrl = this.getFuturesBaseUrl();
      const res = await axios.get(`${baseUrl}/fapi/v1/exchangeInfo`);
      const symInfo = res.data.symbols.find((s: any) => s.symbol === symbol);

      if (!symInfo) {
        return {
          tickSize: 0.0001,
          stepSize: 0.001,
          minNotional: 5,
          pricePrecision: 4,
          quantityPrecision: 3,
        };
      }

      let tickSize = 0.0001;
      let stepSize = 0.001;
      let minNotional = 5;

      for (const f of symInfo.filters) {
        if (f.filterType === 'PRICE_FILTER') {
          tickSize = parseFloat(f.tickSize);
        } else if (f.filterType === 'LOT_SIZE') {
          stepSize = parseFloat(f.stepSize);
        } else if (f.filterType === 'MIN_NOTIONAL') {
          minNotional = parseFloat(f.notional || '5');
        }
      }

      const info = {
        tickSize,
        stepSize,
        minNotional,
        pricePrecision: symInfo.pricePrecision ?? 4,
        quantityPrecision: symInfo.quantityPrecision ?? 3,
      };

      this.symbolFilters.set(symbol, info);
      return info;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to fetch exchangeInfo for ${symbol}: ${message}`,
      );
      return {
        tickSize: 0.0001,
        stepSize: 0.001,
        minNotional: 5,
        pricePrecision: 4,
        quantityPrecision: 3,
      };
    }
  }

  roundStep(value: number, stepSize: number): number {
    const precision = Math.max(0, Math.round(-Math.log10(stepSize)));
    const stepped = Math.floor(value / stepSize) * stepSize;
    return parseFloat(stepped.toFixed(precision));
  }

  roundTick(price: number, tickSize: number): number {
    const precision = Math.max(0, Math.round(-Math.log10(tickSize)));
    const ticked = Math.round(price / tickSize) * tickSize;
    return parseFloat(ticked.toFixed(precision));
  }

  async cancelAllOpenOrders(symbol: string) {
    try {
      const { apiKey } = this.getCredentials();
      if (!apiKey) return null;

      const baseUrl = this.getFuturesBaseUrl();
      const { query, signature } = await this.getSignedQuery({ symbol });

      const response = await axios.delete(
        `${baseUrl}/fapi/v1/allOpenOrders?${query}&signature=${signature}`,
        {
          headers: { 'X-MBX-APIKEY': apiKey },
          timeout: 8000,
        },
      );
      return response.data;
    } catch (err: any) {
      const errMsg =
        err.response?.data?.msg ||
        (err.response?.data ? JSON.stringify(err.response.data) : err.message);
      this.logger.warn(`Cancel all orders failed for ${symbol}: ${errMsg}`);
      return null;
    }
  }

  async closePosition(symbol: string, positionAmt: number) {
    if (positionAmt === 0) return null;
    // Jika posisi LONG (>0), maka close dengan order SELL
    // Jika posisi SHORT (<0), maka close dengan order BUY
    const side = positionAmt > 0 ? 'SELL' : 'BUY';
    const quantity = Math.abs(positionAmt);

    await this.cancelAllOpenOrders(symbol);

    return this.placeOrder({
      symbol,
      side,
      type: 'MARKET',
      quantity,
      reduceOnly: true,
    });
  }
}
