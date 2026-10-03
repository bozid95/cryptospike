import { Module } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { BinanceModule } from '../binance/binance.module';
import { StrategyModule } from '../strategy/strategy.module';
import { SignalModule } from '../signal/signal.module';
import { ExecutionModule } from '../execution/execution.module';

@Module({
  imports: [BinanceModule, StrategyModule, SignalModule, ExecutionModule],
  providers: [ScannerService],
  exports: [ScannerService],
})
export class ScannerModule {}
