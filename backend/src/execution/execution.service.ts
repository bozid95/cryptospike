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
  tp3?: number;
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

      // 2. Cek filter spesifikasi exchange Binance (stepSize, tickSize, minNotional)
      const filters = await this.binanceService.getSymbolFilters(signal.symbol);

      // 3. Cek jumlah posisi yang sedang terbuka di Binance
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
        this.logger.warn(
          `Position for ${signal.symbol} already exists on Binance.`,
        );
        return null;
      }

      // 4. Ambil data saldo margin akun Binance Futures
      const account = await this.binanceService.getAccountDetail();
      const marginBalance = account?.totalMarginBalance || 0;

      if (marginBalance <= 10) {
        this.logger.warn(
          `Insufficient margin balance ($${marginBalance}). Minimum $10 required.`,
        );
        return null;
      }

      // 5. Hitung alokasi margin per trade berdasarkan riskPerTradePct
      const riskPct = config.riskPerTradePct || 2.0; // default 2%
      const marginToRisk = (marginBalance * riskPct) / 100;
      const leverage = config.leverage || 10;

      // Nilai Notional total = margin * leverage
      const notionalValue = marginToRisk * leverage;

      // Validasi MIN_NOTIONAL Binance (minimal $5 per trade)
      if (notionalValue < filters.minNotional) {
        this.logger.warn(
          `Notional value ($${notionalValue.toFixed(2)}) is below Binance minimum ($${filters.minNotional}). Skipping ${signal.symbol}`,
        );
        return null;
      }

      let rawQuantity = notionalValue / signal.entryPrice;
      const quantity = this.binanceService.roundStep(
        rawQuantity,
        filters.stepSize,
      );

      if (quantity <= 0) {
        this.logger.warn(
          `Quantity after stepSize rounding is 0 for ${signal.symbol}. Raw: ${rawQuantity}, step: ${filters.stepSize}`,
        );
        return null;
      }

      this.logger.log(
        `[EXECUTION] Opening ${signal.side} on ${signal.symbol} | Entry: ${signal.entryPrice} | Notional: $${notionalValue.toFixed(2)} | Margin: $${marginToRisk.toFixed(2)} (${riskPct}%) | Qty: ${quantity}`,
      );

      // 6. Atur leverage & margin type di Binance
      await this.binanceService.setMarginType(
        signal.symbol,
        config.marginType || 'ISOLATED',
      );
      await this.binanceService.setLeverage(signal.symbol, leverage);

      // 7. Eksekusi Market Entry Order
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

      // 8. Pasang Take Profit Parsial (TP1: 50%, TP2: 30%, TP3: 20%) & Stop Loss
      const exitSide = signal.side === 'LONG' ? 'SELL' : 'BUY';

      // Hitung alokasi qty parsial
      const qtyTP1 = this.binanceService.roundStep(
        quantity * 0.5,
        filters.stepSize,
      );
      const qtyTP2 = this.binanceService.roundStep(
        quantity * 0.3,
        filters.stepSize,
      );
      const qtyTP3 = this.binanceService.roundStep(
        Math.max(0, quantity - qtyTP1 - qtyTP2),
        filters.stepSize,
      );

      // A. Pasang TP1 (50% posisi)
      if (signal.tp1 && qtyTP1 > 0) {
        const roundedTP1 = this.binanceService.roundTick(
          signal.tp1,
          filters.tickSize,
        );
        try {
          await this.binanceService.placeOrder({
            symbol: signal.symbol,
            side: exitSide,
            type: 'TAKE_PROFIT_MARKET',
            stopPrice: roundedTP1,
            quantity: qtyTP1,
            reduceOnly: true,
          });
          this.logger.log(
            `[TP1 PLACED] ${signal.symbol} 50% (${qtyTP1}) @ ${roundedTP1}`,
          );
        } catch (e: any) {
          this.logger.warn(`Failed TP1: ${e.message}`);
        }
      }

      // B. Pasang TP2 (30% posisi)
      const tp2Price =
        signal.tp2 ||
        (signal.side === 'LONG' ? signal.tp1 * 1.015 : signal.tp1 * 0.985);
      if (tp2Price && qtyTP2 > 0) {
        const roundedTP2 = this.binanceService.roundTick(
          tp2Price,
          filters.tickSize,
        );
        try {
          await this.binanceService.placeOrder({
            symbol: signal.symbol,
            side: exitSide,
            type: 'TAKE_PROFIT_MARKET',
            stopPrice: roundedTP2,
            quantity: qtyTP2,
            reduceOnly: true,
          });
          this.logger.log(
            `[TP2 PLACED] ${signal.symbol} 30% (${qtyTP2}) @ ${roundedTP2}`,
          );
        } catch (e: any) {
          this.logger.warn(`Failed TP2: ${e.message}`);
        }
      }

      // C. Pasang TP3 (20% posisi)
      const tp3Price =
        signal.tp3 ||
        (signal.side === 'LONG' ? tp2Price * 1.02 : tp2Price * 0.98);
      if (tp3Price && qtyTP3 > 0) {
        const roundedTP3 = this.binanceService.roundTick(
          tp3Price,
          filters.tickSize,
        );
        try {
          await this.binanceService.placeOrder({
            symbol: signal.symbol,
            side: exitSide,
            type: 'TAKE_PROFIT_MARKET',
            stopPrice: roundedTP3,
            quantity: qtyTP3,
            reduceOnly: true,
          });
          this.logger.log(
            `[TP3 PLACED] ${signal.symbol} 20% (${qtyTP3}) @ ${roundedTP3}`,
          );
        } catch (e: any) {
          this.logger.warn(`Failed TP3: ${e.message}`);
        }
      }

      // D. Pasang Stop Loss Penuh Awal (STOP_MARKET)
      if (signal.sl) {
        const roundedSL = this.binanceService.roundTick(
          signal.sl,
          filters.tickSize,
        );
        try {
          await this.binanceService.placeOrder({
            symbol: signal.symbol,
            side: exitSide,
            type: 'STOP_MARKET',
            stopPrice: roundedSL,
            reduceOnly: true,
          });
          this.logger.log(
            `[INITIAL SL PLACED] ${signal.symbol} 100% SL @ ${roundedSL}`,
          );
        } catch (e: any) {
          this.logger.warn(`Failed SL: ${e.message}`);
        }
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
      this.logger.error(
        `Trade execution failed for ${signal.symbol}: ${message}`,
      );
      return null;
    }
  }
}
