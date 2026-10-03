import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ConfigService, TradingConfigDto } from './config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getConfig() {
    return this.configService.getConfig();
  }

  @Post()
  saveConfig(@Body() body: TradingConfigDto) {
    return this.configService.saveConfig(body);
  }
}
