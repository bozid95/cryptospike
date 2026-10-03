import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface TradingConfigDto {
  apiKey: string;
  apiSecret: string;
  environment: 'TESTNET' | 'PRODUCTION';
  leverage: number;
  marginType: 'ISOLATED' | 'CROSSED';
  maxOpenPositions: number;
  riskPerTradePct: number;
  autoExecute: boolean;
}

const DEFAULT_CONFIG: TradingConfigDto = {
  apiKey: 'dhA11NTt2uFViDGybKvJv9g0IQc8PJilepPHV7uqgWH5H2opcwaJjGto1CgWiz13',
  apiSecret: 'wVVzZaysTZ3Pz4XhGDkPPRJAgvwIjw0sYJkxTlAsVHu6Q3tSP9TBpJmhCRdPBlIm',
  environment: 'TESTNET',
  leverage: 10,
  marginType: 'ISOLATED',
  maxOpenPositions: 3,
  riskPerTradePct: 2.0,
  autoExecute: true,
};

@Injectable()
export class ConfigService implements OnModuleInit {
  private readonly logger = new Logger(ConfigService.name);
  private readonly defaultUserId = 'default-admin';

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Sinkronkan API key & Testnet dari database PostgreSQL saat backend startup
    try {
      const conf = await this.getConfig();
      if (conf.apiKey) process.env.BINANCE_API_KEY = conf.apiKey;
      if (conf.apiSecret) process.env.BINANCE_SECRET_KEY = conf.apiSecret;
      process.env.BINANCE_TESTNET =
        conf.environment === 'TESTNET' ? 'true' : 'false';
      this.logger.log(
        `Initialized Binance API credentials for ${conf.environment}`,
      );
    } catch (e: any) {
      this.logger.warn(`Could not initialize config on startup: ${e.message}`);
    }
  }

  async getConfig(): Promise<TradingConfigDto> {
    try {
      // Pastikan default user ada di DB
      let user = await this.prisma.user.findFirst();
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            id: this.defaultUserId,
            username: 'admin',
            passwordSalt: 'salt',
            passwordHash: 'hash',
            role: 'admin',
          },
        });
      }

      const userConfig = await this.prisma.userTradingConfig.findUnique({
        where: { userId: user.id },
      });

      if (!userConfig) {
        // Simpan default config ke DB pertama kali
        await this.prisma.userTradingConfig.create({
          data: {
            userId: user.id,
            config: DEFAULT_CONFIG as unknown as Prisma.InputJsonValue,
          },
        });
        return DEFAULT_CONFIG;
      }

      return userConfig.config as unknown as TradingConfigDto;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to read config from DB, returning fallback: ${message}`,
      );
      return DEFAULT_CONFIG;
    }
  }

  async saveConfig(newConfig: TradingConfigDto): Promise<TradingConfigDto> {
    let user = await this.prisma.user.findFirst();
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          id: this.defaultUserId,
          username: 'admin',
          passwordSalt: 'salt',
          passwordHash: 'hash',
          role: 'admin',
        },
      });
    }

    await this.prisma.userTradingConfig.upsert({
      where: { userId: user.id },
      update: {
        config: newConfig as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        config: newConfig as unknown as Prisma.InputJsonValue,
      },
    });

    // Update in-memory process environment agar BinanceService langsung memakai key baru ini
    if (newConfig.apiKey) {
      process.env.BINANCE_API_KEY = newConfig.apiKey;
    }
    if (newConfig.apiSecret) {
      process.env.BINANCE_SECRET_KEY = newConfig.apiSecret;
    }
    process.env.BINANCE_TESTNET =
      newConfig.environment === 'TESTNET' ? 'true' : 'false';

    this.logger.log(
      `Trading config saved to PostgreSQL database for user ${user.id}`,
    );
    return newConfig;
  }
}
