import { Controller, Get, Post, Body, Query, Logger } from '@nestjs/common';
import { BinanceService } from '../binance/binance.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/positions')
export class PositionController {
  private readonly logger = new Logger(PositionController.name);

  constructor(
    private readonly binanceService: BinanceService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getOpenPositions() {
    const [rawPositions, rawOrders, activeSignals] = await Promise.all([
      this.binanceService.getPositions(),
      this.binanceService.getOpenOrders(),
      this.prisma.signal.findMany({
        where: {
          status: {
            in: ['ACTIVE', 'TP1_HIT', 'TP2_HIT'],
          },
        },
        orderBy: { sentAt: 'desc' },
      }),
    ]);

    // Map active signal terbaru berdasarkan symbol
    const signalMap = new Map<string, any>();
    for (const sig of activeSignals) {
      if (!signalMap.has(sig.symbol)) {
        signalMap.set(sig.symbol, sig);
      }
    }

    return rawPositions.map((p) => {
      const positionAmt = parseFloat(p.positionAmt);
      const entryPrice = parseFloat(p.entryPrice);
      const markPrice = parseFloat(p.markPrice);
      const unRealizedProfit = parseFloat(p.unRealizedProfit);
      const leverage = parseInt(p.leverage, 10);
      const notional = Math.abs(positionAmt * markPrice);
      const initialMargin = leverage > 0 ? notional / leverage : 0;
      const roe =
        initialMargin > 0 ? (unRealizedProfit / initialMargin) * 100 : 0;

      // Cari order TP/SL yang sedang terpasang di Binance untuk simbol ini
      const matchingOrders = rawOrders
        .filter((o) => o.symbol === p.symbol)
        .map((o) => ({
          orderId: o.orderId,
          type: o.type,
          side: o.side,
          price: parseFloat(o.price),
          origQty: parseFloat(o.origQty),
          reduceOnly: o.reduceOnly,
        }));

      const matchedSignal = signalMap.get(p.symbol);

      return {
        symbol: p.symbol,
        side: positionAmt > 0 ? 'LONG' : 'SHORT',
        positionAmt: Math.abs(positionAmt),
        entryPrice,
        markPrice,
        liquidationPrice: parseFloat(p.liquidationPrice),
        leverage,
        marginType: p.marginType,
        unRealizedProfit,
        roe: parseFloat(roe.toFixed(2)),
        notional: parseFloat(notional.toFixed(2)),
        initialMargin: parseFloat(initialMargin.toFixed(2)),
        orders: matchingOrders,
        strategy: matchedSignal?.strategy || 'MANUAL / UNKNOWN',
        signalId: matchedSignal?.id || null,
        signalStatus: matchedSignal?.status || null,
        tp1: matchedSignal?.tp1 || null,
        tp2: matchedSignal?.tp2 || null,
        tp3: matchedSignal?.tp3 || null,
        sl: matchedSignal?.sl || null,
        createdAt:
          matchedSignal?.sentAt ||
          (p.updateTime
            ? new Date(p.updateTime).toISOString()
            : new Date().toISOString()),
        updatedAt: p.updateTime
          ? new Date(p.updateTime).toISOString()
          : new Date().toISOString(),
        updateTime: p.updateTime,
      };
    });
  }

  @Post('close')
  async closePosition(
    @Body() body: { symbol: string; positionAmt: number; side?: string },
  ) {
    this.logger.log(`Manual close position requested for ${body.symbol}`);
    // Jika body.side === 'LONG', amt bernilai positif; jika SHORT, amt bernilai negatif
    const signedAmt =
      body.side === 'SHORT'
        ? -Math.abs(body.positionAmt)
        : Math.abs(body.positionAmt);

    const result = await this.binanceService.closePosition(
      body.symbol,
      signedAmt,
    );

    // Dapatkan data posisi sebelum ditutup untuk disimpan ke tabel closed_positions
    try {
      const positions = await this.binanceService.getPositions();
      const pos = positions.find((p) => p.symbol === body.symbol);
      const entryPrice = pos ? parseFloat(pos.entryPrice) : 0;
      const markPrice = pos ? parseFloat(pos.markPrice) : 0;
      const unRealizedProfit = pos ? parseFloat(pos.unRealizedProfit) : 0;
      const leverage = pos ? parseInt(pos.leverage, 10) : 10;
      const notional = Math.abs(body.positionAmt * (markPrice || entryPrice));
      const initialMargin = leverage > 0 ? notional / leverage : 0;
      const roe =
        initialMargin > 0 ? (unRealizedProfit / initialMargin) * 100 : 0;

      await this.prisma.closedPosition.create({
        data: {
          symbol: body.symbol,
          side: body.side === 'SHORT' ? 'SHORT' : 'LONG',
          entryPrice: entryPrice || markPrice,
          exitPrice: markPrice || entryPrice,
          positionAmt: Math.abs(body.positionAmt),
          realizedPnl: unRealizedProfit,
          roe: parseFloat(roe.toFixed(2)),
          leverage,
          strategy: 'MANUAL',
          closeReason: 'Manual Operator Close',
        },
      });
    } catch (dbErr) {
      this.logger.warn(
        `Failed to persist closed position for ${body.symbol}: ${dbErr}`,
      );
    }

    return { success: true, result };
  }

  @Get('history')
  async getClosedPositionsHistory(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const take = limit ? parseInt(limit, 10) : 200;
    const skip = offset ? parseInt(offset, 10) : 0;

    const [items, total] = await Promise.all([
      this.prisma.closedPosition.findMany({
        orderBy: { closedAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.closedPosition.count(),
    ]);

    return { items, total };
  }

  @Post('history/clear')
  async clearClosedPositionsHistory() {
    await this.prisma.closedPosition.deleteMany({});
    return { success: true };
  }
}
