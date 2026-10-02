import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IStrategy, StrategyResult, MarketData } from './strategy.interface';
import { Breakout1hV1Strategy } from './strategies/breakout-1h-v1.strategy';
import { PrePump15mV1Strategy } from './strategies/prepump-15m-v1.strategy';

@Injectable()
export class StrategyRegistry implements OnModuleInit {
  private readonly logger = new Logger(StrategyRegistry.name);
  private strategies: Map<string, IStrategy> = new Map();
  private enabledMap: Map<string, boolean> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly breakout1hV1: Breakout1hV1Strategy,
    private readonly prepump15mV1: PrePump15mV1Strategy,
  ) {}

  async onModuleInit() {
    this.register(this.breakout1hV1);
    this.register(this.prepump15mV1);

    await this.loadStrategyStates();
  }

  register(strategy: IStrategy) {
    const key = `${strategy.meta.id}_${strategy.meta.version}`;
    this.strategies.set(key, strategy);
    this.enabledMap.set(key, strategy.meta.defaultEnabled);
    this.logger.log(`Strategy registered: ${key} (${strategy.meta.displayName})`);
  }

  async loadStrategyStates() {
    try {
      const configs = await this.prisma.strategyConfig.findMany();
      for (const conf of configs) {
        if (this.strategies.has(conf.strategyId)) {
          this.enabledMap.set(conf.strategyId, conf.isEnabled);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not load strategy configs from DB: ${err.message}`);
    }
  }

  getAllStrategies() {
    return Array.from(this.strategies.entries()).map(([key, s]) => ({
      ...s.meta,
      key,
      isEnabled: this.enabledMap.get(key) ?? false,
    }));
  }

  async toggleStrategy(key: string, enabled: boolean) {
    if (!this.strategies.has(key)) {
      throw new Error(`Strategy ${key} not found`);
    }
    this.enabledMap.set(key, enabled);
    await this.prisma.strategyConfig.upsert({
      where: { strategyId: key },
      update: { isEnabled: enabled },
      create: { strategyId: key, isEnabled: enabled },
    });
    this.logger.log(`Strategy ${key} set to ${enabled ? 'ENABLED' : 'DISABLED'}`);
    return { key, isEnabled: enabled };
  }

  async evaluateAll(marketData: MarketData): Promise<Array<{ strategyKey: string; result: StrategyResult }>> {
    const results: Array<{ strategyKey: string; result: StrategyResult }> = [];

    for (const [key, strategy] of this.strategies.entries()) {
      if (!this.enabledMap.get(key)) continue;

      try {
        const res = await strategy.evaluate(marketData);
        if (res && res.shouldSignal) {
          results.push({ strategyKey: key, result: res });
        }
      } catch (err: any) {
        this.logger.error(`Error evaluating ${key}: ${err.message}`);
      }
    }

    return results;
  }
}
