import { Controller, Get, Post, Body, Query, Logger } from '@nestjs/common';
import { BinanceService } from '../binance/binance.service';

@Controller('api/positions')
export class PositionController {
  private readonly logger = new Logger(PositionController.name);

  constructor(private readonly binanceService: BinanceService) {}

  @Get()
  async getOpenPositions() {
    const [rawPositions, rawOrders] = await Promise.all([
      this.binanceService.getPositions(),
      this.binanceService.getOpenOrders(),
    ]);

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
    return { success: true, result };
  }
}
