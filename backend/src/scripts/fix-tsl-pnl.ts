import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(
    '--- RECALCULATING TSL SIGNALS (50% PARTIAL TAKE PROFIT AT TP1) ---',
  );
  const tslSignals = await prisma.signal.findMany({
    where: {
      status: 'TSL_HIT',
    },
  });

  console.log(`Found ${tslSignals.length} TSL_HIT signal(s).`);

  for (const sig of tslSignals) {
    if (!sig.tp1 || !sig.entryPrice) continue;

    const isLong = sig.side === 'LONG';
    const tp1ProfitPct = isLong
      ? ((sig.tp1 - sig.entryPrice) / sig.entryPrice) * 100
      : ((sig.entryPrice - sig.tp1) / sig.entryPrice) * 100;

    // Sisa 50% di Breakeven, floor ke 0% agar slippage tidak minus
    const beProfitPct = Math.max(0, sig.profitPct ?? 0);
    const finalProfitPct = parseFloat(
      (tp1ProfitPct * 0.5 + beProfitPct * 0.5).toFixed(2),
    );

    const margin = sig.simulatedMargin ?? 10.0;
    const realizedPnlUsd = parseFloat(
      ((margin * finalProfitPct) / 100).toFixed(4),
    );

    console.log(
      `Updating ${sig.symbol} [${sig.id}]: old profitPct=${sig.profitPct}%, old PnL=$${sig.realizedPnlUsd} -> new profitPct=+${finalProfitPct}%, new PnL=+$${realizedPnlUsd}`,
    );

    await prisma.signal.update({
      where: { id: sig.id },
      data: {
        profitPct: finalProfitPct,
        realizedPnlUsd,
      },
    });
  }

  console.log('Finished updating TSL signals!');
}

main()
  .catch((e) => {
    console.error('Error in fix-tsl-pnl:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
