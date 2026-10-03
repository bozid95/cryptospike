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
        // Simpan default config ke DB pertama kali dengan kolom eksplisit
        const created = await this.prisma.userTradingConfig.create({
          data: {
            userId: user.id,
            apiKey: DEFAULT_CONFIG.apiKey,
            apiSecret: DEFAULT_CONFIG.apiSecret,
            environment: DEFAULT_CONFIG.environment,
            leverage: DEFAULT_CONFIG.leverage,
            marginType: DEFAULT_CONFIG.marginType,
            maxOpenPositions: DEFAULT_CONFIG.maxOpenPositions,
            riskPerTradePct: DEFAULT_CONFIG.riskPerTradePct,
            autoExecute: DEFAULT_CONFIG.autoExecute,
          },
        });
        return {
          apiKey: created.apiKey,
          apiSecret: created.apiSecret,
          environment: (created.environment as any) || 'TESTNET',
          leverage: created.leverage,
          marginType: (created.marginType as any) || 'ISOLATED',
          maxOpenPositions: created.maxOpenPositions,
          riskPerTradePct: created.riskPerTradePct,
          autoExecute: created.autoExecute,
        };
      }

      return {
        apiKey: userConfig.apiKey || DEFAULT_CONFIG.apiKey,
        apiSecret: userConfig.apiSecret || DEFAULT_CONFIG.apiSecret,
        environment: (userConfig.environment as any) || DEFAULT_CONFIG.environment,
        leverage: userConfig.leverage ?? DEFAULT_CONFIG.leverage,
        marginType: (userConfig.marginType as any) || DEFAULT_CONFIG.marginType,
        maxOpenPositions: userConfig.maxOpenPositions ?? DEFAULT_CONFIG.maxOpenPositions,
        riskPerTradePct: userConfig.riskPerTradePct ?? DEFAULT_CONFIG.riskPerTradePct,
        autoExecute: userConfig.autoExecute ?? DEFAULT_CONFIG.autoExecute,
      };
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

    const saved = await this.prisma.userTradingConfig.upsert({
      where: { userId: user.id },
      update: {
        apiKey: newConfig.apiKey ?? '',
        apiSecret: newConfig.apiSecret ?? '',
        environment: newConfig.environment ?? 'TESTNET',
        leverage: Number(newConfig.leverage) || 10,
        marginType: newConfig.marginType ?? 'ISOLATED',
        maxOpenPositions: Number(newConfig.maxOpenPositions) || 3,
        riskPerTradePct: Number(newConfig.riskPerTradePct) || 2.0,
        autoExecute: Boolean(newConfig.autoExecute),
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        apiKey: newConfig.apiKey ?? '',
        apiSecret: newConfig.apiSecret ?? '',
        environment: newConfig.environment ?? 'TESTNET',
        leverage: Number(newConfig.leverage) || 10,
        marginType: newConfig.marginType ?? 'ISOLATED',
        maxOpenPositions: Number(newConfig.maxOpenPositions) || 3,
        riskPerTradePct: Number(newConfig.riskPerTradePct) || 2.0,
        autoExecute: Boolean(newConfig.autoExecute),
      },
    });

    // Update in-memory process environment agar BinanceService langsung memakai key baru ini
    if (saved.apiKey) {
      process.env.BINANCE_API_KEY = saved.apiKey;
    }
    if (saved.apiSecret) {
      process.env.BINANCE_SECRET_KEY = saved.apiSecret;
    }
    process.env.BINANCE_TESTNET =
      saved.environment === 'TESTNET' ? 'true' : 'false';

    this.logger.log(
      `Trading config saved to explicit PostgreSQL database columns for user ${user.id}`,
    );
    return {
      apiKey: saved.apiKey,
      apiSecret: saved.apiSecret,
      environment: saved.environment as any,
      leverage: saved.leverage,
      marginType: saved.marginType as any,
      maxOpenPositions: saved.maxOpenPositions,
      riskPerTradePct: saved.riskPerTradePct,
      autoExecute: saved.autoExecute,
    };
  }
}
