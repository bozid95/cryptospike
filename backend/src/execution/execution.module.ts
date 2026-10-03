import { Module } from '@nestjs/common';
import { BinanceModule } from '../binance/binance.module';
import { AppConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ExecutionService } from './execution.service';
import { PositionController } from '../position/position.controller';

@Module({
  imports: [BinanceModule, AppConfigModule, PrismaModule],
  controllers: [PositionController],
  providers: [ExecutionService],
  exports: [ExecutionService],
})
export class ExecutionModule {}
