import { Module } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { BinanceModule } from '../binance/binance.module';
import { StrategyModule } from '../strategy/strategy.module';
import { SignalModule } from '../signal/signal.module';

@Module({
  imports: [BinanceModule, StrategyModule, SignalModule],
  providers: [ScannerService],
  exports: [ScannerService],
})
export class ScannerModule {}
