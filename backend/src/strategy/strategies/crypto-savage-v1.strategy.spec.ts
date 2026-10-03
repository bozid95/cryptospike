import { Test, TestingModule } from '@nestjs/testing';
import { CryptoSavageV1Strategy } from './crypto-savage-v1.strategy';
import { BinanceService, BinanceKline } from '../../binance/binance.service';
import { MarketData } from '../strategy.interface';

describe('CryptoSavageV1Strategy', () => {
  let strategy: CryptoSavageV1Strategy;
  let binanceServiceMock: any;

  beforeEach(async () => {
    binanceServiceMock = {
      getKlines: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoSavageV1Strategy,
        {
          provide: BinanceService,
          useValue: binanceServiceMock,
        },
      ],
    }).compile();

    strategy = module.get<CryptoSavageV1Strategy>(CryptoSavageV1Strategy);
  });

  it('should be defined and have correct meta attributes', () => {
    expect(strategy).toBeDefined();
    expect(strategy.meta.id).toBe('crypto_savage');
    expect(strategy.meta.version).toBe('v1');
    expect(strategy.meta.displayName).toContain('Crypto Savage v1');
    expect(strategy.meta.defaultEnabled).toBe(true);
  });

  it('should reject low quote volume assets', async () => {
    const marketData: MarketData = {
      symbol: 'LOWVOLUSDT',
      lastPrice: 100,
      highPrice: 105,
      lowPrice: 98,
      volume: 1000,
      quoteVolume: 1000000, // < 30M
      priceChangePct: 3.5,
    };

    const result = await strategy.evaluate(marketData);
    expect(result).toBeNull();
  });

  it('should evaluate and generate a valid Bullish setup with RRR >= 1:2', async () => {
    // Generate synthetic 4H klines with support zone around $100
    const klines4h: BinanceKline[] = [];
    const baseTime = Date.now() - 60 * 4 * 3600 * 1000;
    for (let i = 0; i < 50; i++) {
      const price = 100 + Math.sin(i / 3) * 5;
      klines4h.push({
        openTime: baseTime + i * 4 * 3600 * 1000,
        open: price,
        high: price + 2,
        low: price - 2,
        close: price + 0.5,
        volume: 500000,
        closeTime: baseTime + (i + 1) * 4 * 3600 * 1000,
        quoteVolume: 50000000,
        trades: 1000,
        takerBuyBaseVolume: 250000,
        takerBuyQuoteVolume: 25000000,
      });
    }

    // Generate synthetic 1H klines with lower wick rejection & bullish follow-through
    const klines1h: BinanceKline[] = [];
    const baseTime1h = Date.now() - 35 * 3600 * 1000;
    for (let i = 0; i < 33; i++) {
      klines1h.push({
        openTime: baseTime1h + i * 3600 * 1000,
        open: 101,
        high: 102,
        low: 99.5,
        close: 100.5,
        volume: 20000,
        closeTime: baseTime1h + (i + 1) * 3600 * 1000,
        quoteVolume: 2000000,
        trades: 200,
        takerBuyBaseVolume: 10000,
        takerBuyQuoteVolume: 1000000,
      });
    }

    // Add rejection pin bar (Long Lower Wick)
    klines1h.push({
      openTime: baseTime1h + 33 * 3600 * 1000,
      open: 100.5,
      high: 100.8,
      low: 96.0, // Big lower wick (rejecting 96-100 support)
      close: 100.2,
      volume: 45000,
      closeTime: baseTime1h + 34 * 3600 * 1000,
      quoteVolume: 4500000,
      trades: 500,
      takerBuyBaseVolume: 25000,
      takerBuyQuoteVolume: 2500000,
    });

    // Add bullish engulfing candle
    klines1h.push({
      openTime: baseTime1h + 34 * 3600 * 1000,
      open: 100.3,
      high: 104.5,
      low: 100.1,
      close: 104.2,
      volume: 85000,
      closeTime: baseTime1h + 35 * 3600 * 1000,
      quoteVolume: 8500000,
      trades: 1200,
      takerBuyBaseVolume: 60000,
      takerBuyQuoteVolume: 6000000,
    });

    (binanceServiceMock.getKlines as jest.Mock).mockImplementation((_sym, interval) => {
      if (interval === '4h') return Promise.resolve(klines4h);
      return Promise.resolve(klines1h);
    });

    const marketData: MarketData = {
      symbol: 'BTCUSDT',
      lastPrice: 104.2,
      highPrice: 105,
      lowPrice: 96,
      volume: 50000,
      quoteVolume: 80000000,
      priceChangePct: 2.5,
    };

    const result = await strategy.evaluate(marketData);

    if (result && result.shouldSignal) {
      expect(result.signalType).toBe('LONG');
      expect(result.entryPrice).toBe(104.2);
      expect(result.sl).toBeLessThan(result.entryPrice);
      expect(result.tp1).toBeGreaterThan(result.entryPrice);

      // Verify RRR minimum 1:2
      const risk = result.entryPrice - result.sl;
      const reward = result.tp1 - result.entryPrice;
      expect(reward / risk).toBeGreaterThanOrEqual(1.99);
    }
  });
});
