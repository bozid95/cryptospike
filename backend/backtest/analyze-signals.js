/**
 * Script Analisis Sinyal & Performa Strategi dari Database PostgreSQL
 * Lokasi: backend/backtest/analyze-signals.js
 *
 * Menghitung winrate riil, breakdown status (TP1, TP2, TP3, TSL, SL),
 * performa berdasarkan arah posisi (LONG vs SHORT), serta rata-rata profit/loss.
 */
require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
});
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function analyze() {
  console.log(
    '════════════════════════════════════════════════════════════════',
  );
  console.log(
    '       ANALISIS PERFORMA SINYAL CRYPTOSPIKE (DATABASE RIIL)     ',
  );
  console.log(
    '════════════════════════════════════════════════════════════════\n',
  );

  const allSignals = await prisma.signal.findMany({
    orderBy: { sentAt: 'desc' },
  });

  console.log(`Total Sinyal di Database: ${allSignals.length}`);

  // 1. Grouping berdasarkan Strategy
  const byStrategy = {};

  for (const s of allSignals) {
    const stratKey = s.strategy || 'UNKNOWN';
    if (!byStrategy[stratKey]) {
      byStrategy[stratKey] = {
        total: 0,
        active: 0,
        tp1: 0,
        tp2: 0,
        tp3: 0,
        tsl: 0,
        sl: 0,
        cancelled: 0,
        longs: { total: 0, win: 0, loss: 0, pnl: 0 },
        shorts: { total: 0, win: 0, loss: 0, pnl: 0 },
        profits: [],
      };
    }

    const st = byStrategy[stratKey];
    st.total++;

    const isClosed = [
      'TP1_HIT',
      'TP2_HIT',
      'TP3_HIT',
      'TSL_HIT',
      'SL_HIT',
    ].includes(s.status);
    const isWin = ['TP1_HIT', 'TP2_HIT', 'TP3_HIT', 'TSL_HIT'].includes(
      s.status,
    );
    const pnl = s.profitPct || 0;

    if (s.status === 'ACTIVE') st.active++;
    else if (s.status === 'TP1_HIT') st.tp1++;
    else if (s.status === 'TP2_HIT') st.tp2++;
    else if (s.status === 'TP3_HIT') st.tp3++;
    else if (s.status === 'TSL_HIT') st.tsl++;
    else if (s.status === 'SL_HIT') st.sl++;
    else if (s.status === 'CANCELLED') st.cancelled++;

    if (s.profitPct !== null && s.profitPct !== undefined) {
      st.profits.push(s.profitPct);
    }

    // Breakdown sisi LONG vs SHORT untuk sinyal tertutup
    if (isClosed) {
      if (s.side === 'LONG') {
        st.longs.total++;
        if (isWin) st.longs.win++;
        else st.longs.loss++;
        st.longs.pnl += pnl;
      } else {
        st.shorts.total++;
        if (isWin) st.shorts.win++;
        else st.shorts.loss++;
        st.shorts.pnl += pnl;
      }
    }
  }

  // 2. Tampilkan Hasil Analisis per Strategi
  for (const [name, data] of Object.entries(byStrategy)) {
    const closedCount = data.tp1 + data.tp2 + data.tp3 + data.tsl + data.sl;
    const winCount = data.tp1 + data.tp2 + data.tp3 + data.tsl;
    const winrate =
      closedCount > 0
        ? ((winCount / closedCount) * 100).toFixed(1) + '%'
        : '0.0%';
    const totalPnl = data.profits.reduce((a, b) => a + b, 0).toFixed(2);
    const avgProfit =
      data.profits.length > 0
        ? (totalPnl / data.profits.length).toFixed(2) + '%'
        : '0.0%';

    console.log(
      `\n────────────────────────────────────────────────────────────────`,
    );
    console.log(`Strategi: [ ${name} ]`);
    console.log(
      `────────────────────────────────────────────────────────────────`,
    );
    console.log(
      `• Total Dibuat : ${data.total} | Aktif Berjalan: ${data.active} | Selesai: ${closedCount}`,
    );
    console.log(
      `• Winrate Riil : ${winrate} (${winCount} Menang / ${data.sl} Kalah)`,
    );
    console.log(
      `• Akumulasi PnL: ${totalPnl}% | Rata-rata PnL per Sinyal: ${avgProfit}`,
    );
    console.log(`• Rincian Target:`);
    console.log(`   - TP1 Hit : ${data.tp1}`);
    console.log(`   - TP2 Hit : ${data.tp2}`);
    console.log(`   - TP3 Hit : ${data.tp3} (Target Maksimal)`);
    console.log(`   - TSL Hit : ${data.tsl} (Trailing Stop Breakeven/Profit)`);
    console.log(`   - SL Hit  : ${data.sl} (Stop Loss Trigger)`);

    const longWr =
      data.longs.total > 0
        ? ((data.longs.win / data.longs.total) * 100).toFixed(1) + '%'
        : 'N/A';
    const shortWr =
      data.shorts.total > 0
        ? ((data.shorts.win / data.shorts.total) * 100).toFixed(1) + '%'
        : 'N/A';
    console.log(`• Performa Berdasarkan Arah Posisi:`);
    console.log(
      `   - LONG  : ${data.longs.win}W / ${data.longs.loss}L (${longWr}) | Total PnL: ${data.longs.pnl.toFixed(2)}%`,
    );
    console.log(
      `   - SHORT : ${data.shorts.win}W / ${data.shorts.loss}L (${shortWr}) | Total PnL: ${data.shorts.pnl.toFixed(2)}%`,
    );
  }

  // 3. Posisi Riil Exchange yang telah Ditutup
  const closedPositions = await prisma.closedPosition.findMany({
    orderBy: { closedAt: 'desc' },
  });

  console.log(
    `\n════════════════════════════════════════════════════════════════`,
  );
  console.log(
    `Riwayat Posisi Ditutup di Binance Exchange: ${closedPositions.length}`,
  );
  if (closedPositions.length > 0) {
    const totalRealizedPnl = closedPositions.reduce(
      (a, b) => a + (b.realizedPnl || 0),
      0,
    );
    console.log(`Total Realized PnL ($) : $${totalRealizedPnl.toFixed(2)}`);
    console.log(`5 Posisi Terakhir:`);
    closedPositions.slice(0, 5).forEach((p) => {
      console.log(
        `  - ${p.symbol} (${p.side}): PnL $${p.realizedPnl.toFixed(2)} (${p.roe}%) | Alasan: ${p.closeReason}`,
      );
    });
  }
  console.log(
    '════════════════════════════════════════════════════════════════\n',
  );
}

analyze()
  .catch((err) => console.error('Gagal menjalankan analisis:', err))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
