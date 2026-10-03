import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { BinanceModule } from './binance/binance.module';
import { StrategyModule } from './strategy/strategy.module';
import { SignalModule } from './signal/signal.module';
import { ScannerModule } from './scanner/scanner.module';
import { GatewayModule } from './gateway/gateway.module';
import { AppConfigModule } from './config/config.module';
import { ExecutionModule } from './execution/execution.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    BinanceModule,
    StrategyModule,
    SignalModule,
    ScannerModule,
    GatewayModule,
    AppConfigModule,
    ExecutionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
