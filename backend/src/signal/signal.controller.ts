import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SignalService, CreateSignalInput } from './signal.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/signals')
export class SignalController {
  constructor(private readonly signalService: SignalService) {}

  @Get()
  getSignals(
    @Query('status') status?: string,
    @Query('strategy') strategy?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.signalService.getSignals({
      status,
      strategy,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('stats/winrate')
  getWinrateStats() {
    return this.signalService.getWinrateStats();
  }

  @Get(':id')
  getSignalById(@Param('id') id: string) {
    return this.signalService.getSignalById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  createSignal(@Body() body: CreateSignalInput) {
    return this.signalService.createSignal(body);
  }
}
