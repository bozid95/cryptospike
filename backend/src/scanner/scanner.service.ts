import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import {
  BinanceWsService,
  BinanceWsTicker,
} from '../binance/binance-ws.service';
import { StrategyRegistry } from '../strategy/strategy.registry';
import { SignalService } from '../signal/signal.service';
import { EventsGateway } from '../gateway/events.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { BinanceService } from '../binance/binance.service';
import { ExecutionService } from '../execution/execution.service';
import { Subscription } from 'rxjs';

@Injectable()
export class ScannerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScannerService.name);
  private lastEvaluated = new Map<string, number>();
  private tickerSub?: Subscription;
  private monitorTimer?: NodeJS.Timeout;

  private openSymbols = new Set<string>();
  private latestPrices = new Map<string, number>();

  constructor(
    private readonly binanceWs: BinanceWsService,
    private readonly binanceService: BinanceService,
    private readonly strategyRegistry: StrategyRegistry,
    private readonly signalService: SignalService,
    private readonly gateway: EventsGateway,
    private readonly prisma: PrismaService,
    private readonly executionService: ExecutionService,
  ) {}

  onModuleInit() {
    this.startWsListener();
    this.startLifecycleMonitor();
  }

  onModuleDestroy() {
    if (this.tickerSub) {
      this.tickerSub.unsubscribe();
    }
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
    }
  }

  private startWsListener() {
    this.logger.log('Starting realtime market scanner listener...');

    this.tickerSub = this.binanceWs.ticker$.subscribe(
      (ticker: BinanceWsTicker) => {
        void this.handleIncomingTicker(ticker);
      },
    );
  }

  private async handleIncomingTicker(ticker: BinanceWsTicker) {
    const lastPrice = parseFloat(ticker.c);

    // Simpan harga real-time untuk keperluan evaluasi Lifecycle TP/SL semua sinyal (RnD & virtual)
    this.latestPrices.set(ticker.s, lastPrice);

    // 1. Streaming harga terfokus: Hanya broadcast jika koin tersebut sedang ada di posisi aktif pengguna
    if (this.openSymbols.has(ticker.s)) {
      this.gateway.broadcastPositionPrice({
        symbol: ticker.s,
        markPrice: lastPrice,
      });
    }

    // 2. Cooldown check per symbol (minimal 20 detik antar evaluasi per symbol)
    const now = Date.now();
    const last = this.lastEvaluated.get(ticker.s) || 0;
    if (now - last < 20000) return;

    const priceChangePct = parseFloat(ticker.P);
    const quoteVolume = parseFloat(ticker.q);

    // Filter dasar trigger: pergerakan signifikan
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

        // Eksekusi order posisi riil di Binance Futures memakai saldo
        void this.executionService.executeSignal({
          symbol: signal.symbol,
          side: signal.side as 'LONG' | 'SHORT',
          entryPrice: signal.entryPrice,
          tp1: signal.tp1,
          tp2: signal.tp2 ?? undefined,
          sl: signal.sl,
          strategy: strategyKey,
          signalId: signal.id,
        });
      }
    }
  }

  /**
   * Monitor status sinyal ACTIVE (Cek TP/SL)
   */
  private startLifecycleMonitor() {
    this.logger.log('Starting background TP/SL lifecycle monitor...');
    this.monitorTimer = setInterval(() => {
      void this.checkActiveSignals();
    }, 15000);
  }

  private async checkActiveSignals() {
    try {
      const activeSignals = await this.prisma.signal.findMany({
        where: {
          status: {
            in: ['ACTIVE', 'TP1_HIT', 'TP2_HIT'],
          },
        },
        take: 30,
      });

      if (activeSignals.length === 0) return;

      // Ambil open positions riil dari Binance
      const positions = await this.binanceService.getPositions();
      this.openSymbols = new Set(positions.map((p: any) => p.symbol));

      const posMap = new Map<string, any>(
        positions.map((p: any) => [p.symbol, p]),
      );

      for (const sig of activeSignals) {
        const livePos: any = posMap.get(sig.symbol);

        // Ambil harga terkini: utamakan markPrice live dari posisi Binance, atau fallback ke WebSocket ticker scanner
        const markPrice = livePos
          ? parseFloat(livePos.markPrice)
          : this.latestPrices.get(sig.symbol);

        // Jika harga saat ini belum tersedia sama sekali di memory, lewati ke sinyal berikutnya
        if (!markPrice || isNaN(markPrice)) {
          continue;
        }

        const isLong = sig.side === 'LONG';

        // 1. Cek TP1 HIT -> Geser Stop Loss ke Breakeven (Entry Price) [Risk-Free]
        if (sig.status === 'ACTIVE') {
          const hitTP1 = isLong ? markPrice >= sig.tp1 : markPrice <= sig.tp1;

          if (hitTP1) {
            const profitPct = isLong
              ? ((markPrice - sig.entryPrice) / sig.entryPrice) * 100
              : ((sig.entryPrice - markPrice) / sig.entryPrice) * 100;

            this.logger.log(
              `[TSL TRIGGER] ${sig.symbol} HIT TP1 (${sig.tp1})! Moving SL to Breakeven (${sig.entryPrice}) | Strategy: ${sig.strategy}`,
            );

            // Update database
            await this.prisma.signal.update({
              where: { id: sig.id },
              data: {
                status: 'TP1_HIT',
                profitPct: parseFloat(profitPct.toFixed(2)),
                hitTime: new Date(),
              },
            });

            // Geser SL di Binance ke harga Entry (jika posisi nyata ada di exchange)
            if (livePos) {
              const filters = await this.binanceService.getSymbolFilters(
                sig.symbol,
              );
              const breakevenSL = this.binanceService.roundTick(
                sig.entryPrice,
                filters.tickSize,
              );
              const exitSide = isLong ? 'SELL' : 'BUY';

              try {
                await this.binanceService.placeOrder({
                  symbol: sig.symbol,
                  side: exitSide,
                  type: 'STOP_MARKET',
                  stopPrice: breakevenSL,
                  reduceOnly: true,
                });
                this.logger.log(
                  `[TSL MOVED] SL moved to Breakeven ${breakevenSL} for ${sig.symbol}`,
                );
              } catch (err: any) {
                this.logger.warn(
                  `Failed moving SL to BE for ${sig.symbol}: ${err.message}`,
                );
              }
            }

            // Broadcast ke frontend websocket
            this.gateway.broadcastSignalUpdate({
              id: sig.id,
              status: 'TP1_HIT',
              profitPct: parseFloat(profitPct.toFixed(2)),
            });
          }
        }

        // 2. Cek TP2 HIT -> Geser Trailing Stop Loss ke Level TP1 [Lock Profit]
        if (sig.status === 'TP1_HIT' && sig.tp2) {
          const hitTP2 = isLong ? markPrice >= sig.tp2 : markPrice <= sig.tp2;

          if (hitTP2) {
            const profitPct = isLong
              ? ((markPrice - sig.entryPrice) / sig.entryPrice) * 100
              : ((sig.entryPrice - markPrice) / sig.entryPrice) * 100;

            this.logger.log(
              `[TSL TRIGGER] ${sig.symbol} HIT TP2 (${sig.tp2})! Trailing SL locked at TP1 (${sig.tp1}) | Strategy: ${sig.strategy}`,
            );

            await this.prisma.signal.update({
              where: { id: sig.id },
              data: {
                status: 'TP2_HIT',
                profitPct: parseFloat(profitPct.toFixed(2)),
                hitTime: new Date(),
              },
            });

            this.gateway.broadcastSignalUpdate({
              id: sig.id,
              status: 'TP2_HIT',
              profitPct: parseFloat(profitPct.toFixed(2)),
            });
          }
        }

        // 3. Cek TP3 HIT -> Target Maksimal (Full Target Take Profit)
        if (sig.status === 'TP2_HIT' && sig.tp3) {
          const hitTP3 = isLong ? markPrice >= sig.tp3 : markPrice <= sig.tp3;

          if (hitTP3) {
            const profitPct = isLong
              ? ((markPrice - sig.entryPrice) / sig.entryPrice) * 100
              : ((sig.entryPrice - markPrice) / sig.entryPrice) * 100;

            this.logger.log(
              `[TARGET HIT] ${sig.symbol} HIT TP3 (${sig.tp3})! Full target reached. Status: TP3_HIT | Strategy: ${sig.strategy}`,
            );

            // Jika ada posisi riil di Binance, tutup posisi
            if (livePos) {
              const positionAmt = parseFloat(livePos.positionAmt);
              if (positionAmt !== 0) {
                await this.binanceService.closePosition(sig.symbol, positionAmt);
              }
            }

            await this.prisma.signal.update({
              where: { id: sig.id },
              data: {
                status: 'TP3_HIT',
                profitPct: parseFloat(profitPct.toFixed(2)),
                hitTime: new Date(),
              },
            });

            this.gateway.broadcastSignalUpdate({
              id: sig.id,
              status: 'TP3_HIT',
              profitPct: parseFloat(profitPct.toFixed(2)),
            });
            continue;
          }
        }

        // 4. Cek SL HIT (Stop Loss Trigger) -> Otomatis Close Posisi / Sinyal
        let slThreshold = sig.sl;
        if (sig.status === 'TP1_HIT') {
          // Breakeven SL
          slThreshold = sig.entryPrice;
        } else if (sig.status === 'TP2_HIT') {
          // Locked SL di TP1
          slThreshold = sig.tp1;
        }

        const hitSL = isLong
          ? markPrice <= slThreshold
          : markPrice >= slThreshold;

        if (hitSL) {
          const finalProfitPct = isLong
            ? ((markPrice - sig.entryPrice) / sig.entryPrice) * 100
            : ((sig.entryPrice - markPrice) / sig.entryPrice) * 100;

          const isBreakevenOrProfit =
            sig.status === 'TP1_HIT' || sig.status === 'TP2_HIT';
          const newStatus = isBreakevenOrProfit ? 'TSL_HIT' : 'SL_HIT';

          this.logger.log(
            `[STOP LOSS HIT] ${sig.symbol} hit threshold ${slThreshold} (Mark: ${markPrice}). Status: ${newStatus} | Strategy: ${sig.strategy}`,
          );

          // Tutup posisi riil di Binance hanya jika posisi nyata ada
          if (livePos) {
            const positionAmt = parseFloat(livePos.positionAmt);
            if (positionAmt !== 0) {
              await this.binanceService.closePosition(sig.symbol, positionAmt);
            }
          }

          // Update database
          await this.prisma.signal.update({
            where: { id: sig.id },
            data: {
              status: newStatus,
              profitPct: parseFloat(finalProfitPct.toFixed(2)),
              hitTime: new Date(),
            },
          });

          // Broadcast ke frontend websocket
          this.gateway.broadcastSignalUpdate({
            id: sig.id,
            status: newStatus,
            profitPct: parseFloat(finalProfitPct.toFixed(2)),
          });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error monitoring active signals: ${message}`);
    }
  }
}
