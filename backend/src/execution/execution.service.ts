import { Injectable, Logger } from '@nestjs/common';
import { BinanceService } from '../binance/binance.service';
import { ConfigService } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';

export interface ExecutionOrderRequest {
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  tp1: number;
  tp2?: number;
  sl: number;
  strategy?: string;
  signalId?: string;
}

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(
    private readonly binanceService: BinanceService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Eksekusi trade otomatis di Binance Futures menggunakan saldo akun
   */
  async executeSignal(signal: ExecutionOrderRequest) {
    try {
      const config = await this.configService.getConfig();

      // 1. Cek apakah autoExecute aktif
      if (!config.autoExecute) {
        this.logger.debug(
          `AutoExecute is DISABLED in user config. Skipping trade for ${signal.symbol}`,
        );
        return null;
      }

      // 2. Cek jumlah posisi yang sedang terbuka di Binance
      const currentPositions = await this.binanceService.getPositions();
      if (currentPositions.length >= config.maxOpenPositions) {
        this.logger.warn(
          `Max open positions reached (${currentPositions.length}/${config.maxOpenPositions}). Skipping ${signal.symbol}`,
        );
        return null;
      }

      // Cek apakah symbol ini sudah ada posisi terbuka
      const existing = currentPositions.find((p) => p.symbol === signal.symbol);
      if (existing) {
        this.logger.warn(`Position for ${signal.symbol} already exists on Binance.`);
        return null;
      }

      // 3. Ambil data saldo margin akun Binance Futures
      const account = await this.binanceService.getAccountDetail();
      const marginBalance = account?.totalMarginBalance || 0;

      if (marginBalance <= 10) {
        this.logger.warn(
          `Insufficient margin balance ($${marginBalance}). Minimum $10 required.`,
        );
        return null;
      }

      // 4. Hitung alokasi margin per trade berdasarkan riskPerTradePct
      const riskPct = config.riskPerTradePct || 2.0; // misal 2%
      const marginToRisk = (marginBalance * riskPct) / 100;
      const leverage = config.leverage || 10;

      // Nilai posisi total (Notional Value) = margin * leverage
      const notionalValue = marginToRisk * leverage;
      let rawQuantity = notionalValue / signal.entryPrice;

      // Bulatkan presisi quantity (umumnya 1 s/d 3 desimal tergantung aset)
      let quantity = Math.round(rawQuantity * 100) / 100;
      if (quantity <= 0) {
        quantity = Math.round(rawQuantity * 1000) / 1000;
      }
      if (quantity <= 0) {
        this.logger.warn(`Calculated quantity is too small: ${rawQuantity}`);
        return null;
      }

      this.logger.log(
        `[EXECUTION] Opening ${signal.side} on ${signal.symbol} | Entry: ${signal.entryPrice} | Notional: $${notionalValue.toFixed(2)} | Margin: $${marginToRisk.toFixed(2)} (${riskPct}%) | Qty: ${quantity}`,
      );

      // 5. Atur leverage & margin type di Binance
      await this.binanceService.setMarginType(signal.symbol, config.marginType || 'ISOLATED');
      await this.binanceService.setLeverage(signal.symbol, leverage);

      // 6. Eksekusi Market Entry Order
      const orderSide = signal.side === 'LONG' ? 'BUY' : 'SELL';
      const entryOrder = await this.binanceService.placeOrder({
        symbol: signal.symbol,
        side: orderSide,
        type: 'MARKET',
        quantity,
      });

      this.logger.log(
        `[EXECUTION SUCCESS] Entry Order filled: ${entryOrder.orderId} for ${signal.symbol}`,
      );

      // 7. Pasang Take Profit & Stop Loss order di Binance
      const exitSide = signal.side === 'LONG' ? 'SELL' : 'BUY';

      try {
        if (signal.tp1) {
          await this.binanceService.placeOrder({
            symbol: signal.symbol,
            side: exitSide,
            type: 'TAKE_PROFIT_MARKET',
            stopPrice: signal.tp1,
            reduceOnly: true,
          });
          this.logger.log(`[TP SET] TP1 set at ${signal.tp1} for ${signal.symbol}`);
        }

        if (signal.sl) {
          await this.binanceService.placeOrder({
            symbol: signal.symbol,
            side: exitSide,
            type: 'STOP_MARKET',
            stopPrice: signal.sl,
            reduceOnly: true,
          });
          this.logger.log(`[SL SET] SL set at ${signal.sl} for ${signal.symbol}`);
        }
      } catch (bracketErr: any) {
        this.logger.warn(
          `Failed to place TP/SL bracket orders for ${signal.symbol}: ${bracketErr.message}`,
        );
      }

      // 8. Catat lock posisi di database
      try {
        const user = await this.prisma.user.findFirst();
        if (user) {
          await this.prisma.userPositionLock.upsert({
            where: {
              userId_symbol: {
                userId: user.id,
                symbol: signal.symbol,
              },
            },
            create: {
              userId: user.id,
              symbol: signal.symbol,
              status: 'OPEN',
              direction: signal.side,
              entryPrice: signal.entryPrice,
              externalOrderId: String(entryOrder.orderId || ''),
              openedAt: new Date(),
            },
            update: {
              status: 'OPEN',
              direction: signal.side,
              entryPrice: signal.entryPrice,
              externalOrderId: String(entryOrder.orderId || ''),
              openedAt: new Date(),
            },
          });
        }
      } catch (dbErr: any) {
        this.logger.warn(`Could not save position lock: ${dbErr.message}`);
      }

      return entryOrder;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Trade execution failed for ${signal.symbol}: ${message}`);
      return null;
    }
  }
}
