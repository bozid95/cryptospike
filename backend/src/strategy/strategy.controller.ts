import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { StrategyRegistry } from './strategy.registry';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/strategies')
export class StrategyController {
  constructor(private readonly registry: StrategyRegistry) {}

  @Get()
  getStrategies() {
    return this.registry.getAllStrategies();
  }

  @Post(':key/toggle')
  async toggleStrategy(
    @Param('key') key: string,
    @Body() body: { isEnabled: boolean },
  ) {
    return this.registry.toggleStrategy(key, body.isEnabled);
  }
}
