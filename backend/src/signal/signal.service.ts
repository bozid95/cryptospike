import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateSignalInput {
  symbol: string;
  side: 'LONG' | 'SHORT';
  strength?: string;
  entryPrice: number;
  tp1: number;
  tp2?: number;
  tp3?: number;
  sl: number;
  score?: number;
  strategy?: string;
  reasons?: string;
  triggerSource?: string;
}

@Injectable()
export class SignalService {
  private readonly logger = new Logger(SignalService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSignals(params: {
    status?: string;
    strategy?: string;
    limit?: number;
    offset?: number;
  }) {
    const { status, strategy, limit = 50, offset = 0 } = params;
    const where: Prisma.SignalWhereInput = {};
    if (status && status !== 'ALL') where.status = status;
    if (strategy && strategy !== 'ALL') where.strategy = strategy;

    const [items, total] = await Promise.all([
      this.prisma.signal.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.signal.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async getSignalById(id: string) {
    return this.prisma.signal.findUnique({ where: { id } });
  }

  async createSignal(input: CreateSignalInput) {
    // 1. Cek jika masih ada sinyal ACTIVE / TP1_HIT / TP2_HIT pada koin yang sama (mencegah sinyal ganda)
    const activeOrRunning = await this.prisma.signal.findFirst({
      where: {
        symbol: input.symbol,
        status: { in: ['ACTIVE', 'TP1_HIT', 'TP2_HIT'] },
      },
    });

    if (activeOrRunning) {
      return null;
    }

    // 2. Cooldown 30 Menit per Symbol: Jangan generate sinyal bertubi-tubi untuk koin yang sama dalam waktu singkat
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentSignal = await this.prisma.signal.findFirst({
      where: {
        symbol: input.symbol,
        sentAt: { gte: thirtyMinutesAgo },
      },
    });

    if (recentSignal) {
      return null;
    }

    const signal = await this.prisma.signal.create({
      data: {
        symbol: input.symbol,
        side: input.side,
        strength: input.strength || 'NORMAL',
        entryPrice: input.entryPrice,
        tp1: input.tp1,
        tp2: input.tp2,
        tp3: input.tp3,
        sl: input.sl,
        score: input.score,
        strategy: input.strategy,
        reasons: input.reasons,
        triggerSource: input.triggerSource,
        status: 'ACTIVE',
        sentAt: new Date(),
      },
    });

    this.logger.log(
      `Created new signal: [${signal.strategy ?? 'unknown'}] ${signal.symbol} ${signal.side} @ ${signal.entryPrice}`,
    );
    return signal;
  }

  async updateSignalStatus(id: string, status: string, profitPct?: number) {
    return this.prisma.signal.update({
      where: { id },
      data: {
        status,
        profitPct,
        hitTime: new Date(),
      },
    });
  }

  async getWinrateStats() {
    const signals = await this.prisma.signal.findMany({
      where: {
        status: { in: ['TP1_HIT', 'TP2_HIT', 'TP3_HIT', 'TSL_HIT', 'SL_HIT'] },
      },
    });

    const strategyMap = new Map<
      string,
      { total: number; win: number; profitSum: number }
    >();

    for (const s of signals) {
      const key = s.strategy || 'unknown';
      if (!strategyMap.has(key)) {
        strategyMap.set(key, { total: 0, win: 0, profitSum: 0 });
      }
      const item = strategyMap.get(key)!;
      item.total += 1;
      const isWin = s.status.includes('TP') || (s.profitPct && s.profitPct > 0);
      if (isWin) item.win += 1;
      item.profitSum += s.profitPct || 0;
    }

    const result = Array.from(strategyMap.entries()).map(
      ([strategy, stat]) => ({
        strategy,
        totalSignals: stat.total,
        winSignals: stat.win,
        winRate: stat.total > 0 ? (stat.win / stat.total) * 100 : 0,
        avgProfitPct: stat.total > 0 ? stat.profitSum / stat.total : 0,
      }),
    );

    return result;
  }
}
