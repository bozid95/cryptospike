import { Module } from '@nestjs/common';
import { BinanceService } from './binance.service';
import { BinanceWsService } from './binance-ws.service';

@Module({
  providers: [BinanceService, BinanceWsService],
  exports: [BinanceService, BinanceWsService],
})
export class BinanceModule {}
