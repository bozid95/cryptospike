# Skema Database (Prisma) — Rencana Refactor

Berikut adalah skema database lengkap yang diusulkan untuk project NestJS + Prisma.  
Skema ini dibuat berdasarkan **riset terhadap kode Go yang sudah ada**, ditambah kolom-kolom baru untuk mendukung fitur **multi-versioning strategy** dan **signal history analytics**.

---

## Tabel yang Sudah Ada (Migrasi dari Go)

| Tabel Go Lama | Model Prisma Baru | Keterangan |
|---|---|---|
| `users` | `User` | User dan role |
| `user_sessions` | `UserSession` | Session token hash |
| `user_trading_configs` | `UserTradingConfig` | Konfigurasi trading per user (JSON) |
| `signals` | `Signal` | ⭐ Ditambah kolom `strategy`, `strategyVersion` |
| `notifications` | `Notification` | Event notifikasi |
| `donations` | `Donation` | Data donasi Saweria |
| `user_position_locks` | `UserPositionLock` | Lock posisi (anti-duplicate) |
| `user_presence` | `UserPresence` | Heartbeat online user |
| `announcements` | `Announcement` | Pengumuman publik |

---

## Prisma Schema Lengkap

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════════
// 1. USER & AUTH
// ═══════════════════════════════════════════

model User {
  id           String   @id @default(uuid()) @db.VarChar(50)
  username     String   @unique @db.VarChar(100)
  passwordSalt String   @map("password_salt")
  passwordHash String   @map("password_hash")
  role         String   @default("user") @db.VarChar(20)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")

  sessions      UserSession[]
  tradingConfig UserTradingConfig?
  positionLocks UserPositionLock[]

  @@map("users")
}

model UserSession {
  id        String   @id @db.VarChar(50)
  userId    String   @map("user_id") @db.VarChar(50)
  tokenHash String   @unique @map("token_hash")
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId], name: "idx_user_sessions_user_id")
  @@index([expiresAt], name: "idx_user_sessions_expires_at")
  @@map("user_sessions")
}

// ═══════════════════════════════════════════
// 2. TRADING CONFIG
// ═══════════════════════════════════════════

model UserTradingConfig {
  userId    String   @id @map("user_id") @db.VarChar(50)
  config    Json                                             
  updatedAt DateTime @default(now()) @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_trading_configs")
}

// ═══════════════════════════════════════════
// 3. SIGNAL (Optimized)
// ═══════════════════════════════════════════

model Signal {
  id              String    @id @default(uuid())
  symbol          String                              // e.g. "BTCUSDT", "ETHUSDT"
  side            String                              // "LONG" atau "SHORT"
  strength        String    @default("NORMAL")        // "STRONG" atau "NORMAL"
  entryPrice      Float     @map("entry_price")       // NOT NULL
  tp1             Float                               // NOT NULL
  tp2             Float?
  tp3             Float?
  sl              Float                               // NOT NULL
  score           Float?                              // Skor kualitas signal (0-100)

  // ⭐ BARU: Flag Strategy (1 kolom, nama sudah termasuk versi)
  strategy        String?                             // Nama strategy: "breakout_1h_v1", "prepump_15m_v2"

  reasons         String?                             // Alasan signal (text/JSON)
  triggerSource   String?   @map("trigger_source")    // "ticker_filter", "candle_1h", "pre_pump_scanner"
  status          String    @default("ACTIVE")        // ACTIVE, TP1_HIT, TP2_HIT, TP3_HIT, TSL_HIT, SL_HIT, CANCELLED
  profitPct       Float?    @map("profit_pct")        // Profit/loss percentage
  sentAt          DateTime  @default(now()) @map("sent_at")
  hitTime         DateTime? @map("hit_time")          // Waktu TP/SL tercapai

  @@index([status], name: "idx_signals_status")
  @@index([strategy], name: "idx_signals_strategy")
  @@index([sentAt], name: "idx_signals_sent_at")
  @@index([symbol, status], name: "idx_signals_symbol_status")
  @@map("signals")
}

// ═══════════════════════════════════════════
// 4. STRATEGY CONFIG
// ═══════════════════════════════════════════

model StrategyConfig {
  strategyId String   @id @map("strategy_id")         // ID = Nama lengkap (e.g. "breakout_1h_v1")
  isEnabled  Boolean  @default(false) @map("is_enabled")
  updatedAt  DateTime @default(now()) @updatedAt @map("updated_at")

  @@map("strategy_configs")
}

// ═══════════════════════════════════════════
// 5. NOTIFICATION
// ═══════════════════════════════════════════

model Notification {
  id        String   @id @default(uuid())
  type      String?                          
  symbol    String?
  side      String?                          // "LONG" atau "SHORT"
  price     Float?
  profitPct Float?   @map("profit_pct")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("notifications")
}

// ═══════════════════════════════════════════
// 6. DONATION (Saweria)
// ═══════════════════════════════════════════

model Donation {
  id           String   @id @default(uuid()) @db.Uuid
  donatorName  String?  @map("donator_name")
  donatorEmail String?  @map("donator_email")
  amount       Decimal  @db.Decimal(18, 2)
  message      String?
  createdAt    DateTime @default(now()) @map("created_at")

  @@map("donations")
}

// ═══════════════════════════════════════════
// 7. USER POSITION LOCK (Anti-duplicate)
// ═══════════════════════════════════════════

model UserPositionLock {
  userId          String    @map("user_id") @db.VarChar(50)
  symbol          String    @db.VarChar(32)
  status          String    @db.VarChar(16)               
  exchange        String    @default("") @db.VarChar(32)  
  environment     String    @default("") @db.VarChar(32)  
  direction       String    @default("") @db.VarChar(16)  
  signal          String    @default("")                   
  entryPrice      Decimal   @default(0) @map("entry_price") @db.Decimal(20, 8)
  externalOrderId String    @default("") @map("external_order_id")
  lockToken       String    @default("") @map("lock_token") @db.VarChar(100)
  reservedUntil   DateTime? @map("reserved_until")
  openedAt        DateTime? @map("opened_at")
  releasedAt      DateTime? @map("released_at")
  releaseReason   String    @default("") @map("release_reason")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @default(now()) @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([userId, symbol])
  @@index([status, symbol], name: "idx_user_position_locks_status_symbol")
  @@map("user_position_locks")
}

// ═══════════════════════════════════════════
// 8. USER PRESENCE (Online tracking)
// ═══════════════════════════════════════════

model UserPresence {
  sessionId String   @id @map("session_id")
  lastSeen  DateTime @map("last_seen")

  @@map("user_presence")
}

// ═══════════════════════════════════════════
// 9. ANNOUNCEMENT
// ═══════════════════════════════════════════

model Announcement {
  id       String  @id @default(uuid())
  title    String?
  message  String?
  icon     String?
  linkText String? @map("link_text")
  linkUrl  String? @map("link_url")
  isActive Boolean @default(true) @map("is_active")

  @@map("announcements")
}
```

---

## Kolom Baru untuk Multi-Versioning Strategy

Pada tabel `signals`, ada **3 kolom baru** yang menjadi kunci fitur multi-versioning:

| Kolom | Tipe | Contoh Nilai | Fungsi |
|---|---|---|---|
| `strategy` | `String?` | `"breakout_1h_v1"`, `"prepump_15m_v2"`, `"btc_session_v1"` | **Nama strategy** yang menghasilkan signal (sudah termasuk versi) |
| `trigger_source` | `String?` | `"candle_1h"`, `"pre_pump_scanner"`, `"ticker_filter"` | Sumber trigger asal |

### Contoh Data Signal dengan Flag Strategy

```
┌──────────┬────────────┬───────────────────┬─────────┬────────┐
│ Symbol   │ Signal     │ Strategy          │ Status  │ PnL %  │
├──────────┼────────────┼───────────────────┼─────────┼────────┤
│ ETHUSDT  │ STRONG BUY │ breakout_1h_v2    │ TP2_HIT │ +4.50  │
│ SOLUSDT  │ STRONG SELL│ prepump_15m_v1    │ SL_HIT  │ -2.10  │
│ BTCUSDT  │ BUY        │ btc_session_v1    │ TP1_HIT │ +1.80  │
│ ARBUSDT  │ STRONG BUY │ breakout_1h_v3    │ ACTIVE  │  0.00  │
│ DOGEUSDT │ SELL       │ prepump_15m_v2    │ TP3_HIT │ +8.20  │
└──────────┴────────────┴───────────────────┴─────────┴────────┘
```

---

## Query Winrate per Strategy

Dengan skema ini, menghitung winrate per strategy menjadi sangat mudah:

```sql
SELECT 
  strategy,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status IN ('TP1_HIT','TP2_HIT','TP3_HIT','TSL_HIT')) AS wins,
  COUNT(*) FILTER (WHERE status = 'SL_HIT') AS losses,
  ROUND(
    COUNT(*) FILTER (WHERE status IN ('TP1_HIT','TP2_HIT','TP3_HIT','TSL_HIT'))::numeric * 100 
    / NULLIF(COUNT(*) FILTER (WHERE status IN ('TP1_HIT','TP2_HIT','TP3_HIT','TSL_HIT','SL_HIT')), 0)
  , 2) AS winrate_pct,
  ROUND(AVG(profit_pct) FILTER (WHERE status IN ('TP1_HIT','TP2_HIT','TP3_HIT','TSL_HIT','SL_HIT')), 2) AS avg_pnl
FROM signals
WHERE strategy IS NOT NULL
GROUP BY strategy
ORDER BY winrate_pct DESC;
```

### Contoh Output:

```
┌───────────────────┬───────┬──────┬────────┬─────────────┬──────────┐
│ strategy          │ total │ wins │ losses │ winrate_pct │ avg_pnl  │
├───────────────────┼───────┼──────┼────────┼─────────────┼──────────┤
│ btc_session_v1    │ 58    │ 45   │ 13     │ 77.59       │ +2.15    │
│ breakout_1h_v2    │ 245   │ 178  │ 67     │ 72.65       │ +1.89    │
│ breakout_1h_v1    │ 180   │ 120  │ 60     │ 66.67       │ +1.45    │
│ prepump_15m_v1    │ 132   │ 89   │ 43     │ 67.42       │ +1.62    │
│ prepump_15m_v2    │ 95    │ 58   │ 37     │ 61.05       │ +1.10    │
└───────────────────┴───────┴──────┴────────┴─────────────┴──────────┘
```

> Dari tabel ini, Anda bisa langsung tahu bahwa `btc_session v1` dan `breakout_1h v2` adalah strategy yang paling powerful.

---

## Perbedaan dengan Skema Lama

| Aspek | Go Lama | Prisma Baru |
|---|---|---|
| Tabel `signals` | Tidak ada kolom `strategy` | ✅ Ada `strategy` + `trigger_source` |
| Index | Minim | ✅ Index pada `status`, `strategy`, `sent_at`, `symbol+status` |
| Relasi | Tidak ada FK eksplisit | ✅ FK dengan `onDelete: Cascade` |
| Signal features | Tabel terpisah `signal_features` (Go scratch) | Bisa ditambahkan nanti jika perlu |
| Migration | Manual SQL string di kode Go | ✅ Otomatis via `prisma migrate` |

---

## Catatan

> [!NOTE]
> Skema ini **100% kompatibel** dengan database PostgreSQL yang sudah ada. Nama tabel dan kolom menggunakan `@@map()` dan `@map()` agar sesuai dengan naming convention snake_case yang sudah dipakai di Go.

> [!WARNING]
> Jika mau konek ke database produksi yang sudah ada, kita perlu menjalankan `prisma db pull` dulu untuk membuat baseline, lalu menambahkan kolom baru (`strategy`, `strategy_version`, `trigger_source`) via migration.
