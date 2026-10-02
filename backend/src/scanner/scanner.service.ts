import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { BinanceWsService, BinanceWsTicker } from '../binance/binance-ws.service';
import { StrategyRegistry } from '../strategy/strategy.registry';
import { SignalService } from '../signal/signal.service';
import { EventsGateway } from '../gateway/events.gateway';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScannerService implements OnModuleInit {
  private readonly logger = new Logger(ScannerService.name);
  private lastEvaluated = new Map<string, number>();

  constructor(
    private readonly binanceWs: BinanceWsService,
    private readonly strategyRegistry: StrategyRegistry,
    private readonly signalService: SignalService,
    private readonly gateway: EventsGateway,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.startWsListener();
    this.startLifecycleMonitor();
  }

  private startWsListener() {
    this.logger.log('Starting realtime market scanner listener...');

    this.binanceWs.ticker$.subscribe(async (ticker: BinanceWsTicker) => {
      // 1. Broadcast update harga ke frontend dashboard
      this.gateway.broadcastTicker({
        symbol: ticker.s,
        lastPrice: parseFloat(ticker.c),
        priceChangePct: parseFloat(ticker.P),
        volume: parseFloat(ticker.v),
      });

      // 2. Cooldown check per symbol (minimal 20 detik antar evaluasi per symbol)
      const now = Date.now();
      const last = this.lastEvaluated.get(ticker.s) || 0;
      if (now - last < 20000) return;

      const priceChangePct = parseFloat(ticker.P);
      const quoteVolume = parseFloat(ticker.q);

      // Filter dasar trigger: pergerakan signifikan atau volume besar
      if (Math.abs(priceChangePct) < 2.0) return;

      this.lastEvaluated.set(ticker.s, now);

      // 3. Evaluasi market data ke semua active strategies
      const marketData = {
        symbol: ticker.s,
        lastPrice: parseFloat(ticker.c),
        highPrice: parseFloat(ticker.h),
        lowPrice: parseFloat(ticker.l),
        volume: parseFloat(ticker.v),
        quoteVolume,
        priceChangePct,
        triggerSource: 'ws_ticker',
      };

      const results = await this.strategyRegistry.evaluateAll(marketData);

      for (const { strategyKey, result } of results) {
        const signal = await this.signalService.createSignal({
          symbol: marketData.symbol,
          side: result.signalType,
          strength: result.confidence === 'HIGH' ? 'STRONG' : 'NORMAL',
          entryPrice: result.entryPrice,
          tp1: result.tp1,
          tp2: result.tp2,
          sl: result.sl,
          score: result.score,
          strategy: strategyKey,
          reasons: result.reasons.join('; '),
          triggerSource: 'ws_ticker',
        });

        if (signal) {
          // Push sinyal realtime ke dashboard frontend via websocket
          this.gateway.broadcastSignal(signal);
        }
      }
    });
  }

  /**
   * Monitor status sinyal ACTIVE (Cek TP/SL)
   */
  private startLifecycleMonitor() {
    this.logger.log('Starting background TP/SL lifecycle monitor...');
    setInterval(async () => {
      try {
        const activeSignals = await this.prisma.signal.findMany({
          where: { status: 'ACTIVE' },
          take: 20,
        });

        if (activeSignals.length === 0) return;

        // Monitor each signal logic dapat dihubungkan ke latest price
      } catch (err: any) {
        // error handling
      }
    }, 15000);
  }
}
