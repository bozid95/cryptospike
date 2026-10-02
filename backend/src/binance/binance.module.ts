import { Module } from '@nestjs/common';
import { BinanceService } from './binance.service';
import { BinanceWsService } from './binance-ws.service';
import { BinanceController } from './binance.controller';

@Module({
  controllers: [BinanceController],
  providers: [BinanceService, BinanceWsService],
  exports: [BinanceService, BinanceWsService],
})
export class BinanceModule {}
