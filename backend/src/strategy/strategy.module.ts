import { Module } from '@nestjs/common';
import { StrategyRegistry } from './strategy.registry';
import { StrategyController } from './strategy.controller';
import { Breakout1hV1Strategy } from './strategies/breakout-1h-v1.strategy';
import { PrePump15mV1Strategy } from './strategies/prepump-15m-v1.strategy';

@Module({
  controllers: [StrategyController],
  providers: [
    Breakout1hV1Strategy,
    PrePump15mV1Strategy,
    StrategyRegistry,
  ],
  exports: [StrategyRegistry],
})
export class StrategyModule {}
