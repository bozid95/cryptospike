import { Controller, Get, Post, Body, Query, Logger } from '@nestjs/common';
import { BinanceService } from '../binance/binance.service';

@Controller('api/positions')
export class PositionController {
  private readonly logger = new Logger(PositionController.name);

  constructor(private readonly binanceService: BinanceService) {}

  @Get()
  async getOpenPositions() {
    const raw = await this.binanceService.getPositions();
    return raw.map((p) => {
      const positionAmt = parseFloat(p.positionAmt);
      const entryPrice = parseFloat(p.entryPrice);
      const markPrice = parseFloat(p.markPrice);
      const unRealizedProfit = parseFloat(p.unRealizedProfit);
      const leverage = parseInt(p.leverage, 10);
      const notional = Math.abs(positionAmt * markPrice);
      const initialMargin = leverage > 0 ? notional / leverage : 0;
      const roe =
        initialMargin > 0 ? (unRealizedProfit / initialMargin) * 100 : 0;

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
