# Rekomendasi Skema Database + Fokus Binance API

## A. Kolom Redundan yang Bisa Dihapus/Diperbaiki

### 1. `signal` vs `signalType` → Cukup 1 kolom

**Masalah:** Di kode Go, `signal` berisi `"STRONG BUY"` / `"STRONG SELL"` dan `signalType` berisi `"LONG"` / `"SHORT"`. Ini redundan karena BUY = LONG dan SELL = SHORT.

**Rekomendasi:** Gabung jadi 2 kolom yang jelas:
| Kolom | Isi | Contoh |
|---|---|---|
| `side` | Arah posisi | `"LONG"` / `"SHORT"` |
| `strength` | Kekuatan signal | `"STRONG"` / `"NORMAL"` |

> Kolom lama `signal` (`"STRONG BUY"`) dan `signalType` (`"LONG"`) → digabung jadi `side` + `strength`.

---

### 2. `duration` → Bisa dihitung, tidak perlu disimpan

**Masalah:** `duration` berisi `"2h 15m"` yang dihitung dari `sentAt` dan waktu sekarang. Ini bisa di-compute saat query.

**Rekomendasi:** Hapus kolom `duration`. Hitung di application layer:
```typescript
// Di NestJS service
const duration = dayjs(hitTime).diff(dayjs(sentAt), 'minute');
```

---

### 3. `currentPrice` → Snapshot yang langsung basi

**Masalah:** `current_price` di-update terus oleh lifecycle monitor. Nilainya langsung basi setelah di-write. Frontend sudah ambil harga realtime dari WebSocket.

**Rekomendasi:** Hapus kolom `currentPrice` dari tabel `signals`. Harga realtime sudah tersedia dari Binance WebSocket dan di-cache di memory. Cukup kirim via API `/api/prices`.

---

### 4. `confidence` → Bisa diturunkan dari `score`

**Masalah:** `confidence` (`"HIGH"`, `"MEDIUM"`, `"LOW"`) selalu ditentukan berdasarkan `score`. Ini redundan.

**Rekomendasi:** Hapus kolom `confidence`. Hitung di frontend/service:
```typescript
function getConfidence(score: number): string {
  if (score >= 80) return 'HIGH';
  if (score >= 60) return 'MEDIUM';
  return 'LOW';
}
```

---

## B. Skema Signal yang Sudah Dioptimasi

```prisma
model Signal {
  id           String    @id @default(uuid())
  symbol       String                              // "BTCUSDT", "ETHUSDT"
  side         String                              // "LONG" atau "SHORT"
  strength     String    @default("NORMAL")        // "STRONG" atau "NORMAL"
  entryPrice   Float     @map("entry_price")
  tp1          Float
  tp2          Float?
  tp3          Float?
  sl           Float
  score        Float?                              // 0-100
  strategy     String?                             // "breakout_1h_v1", "prepump_15m_v2"
  triggerSource String?  @map("trigger_source")    // "candle_1h", "pre_pump_scanner"
  reasons      String?                             // Alasan signal
  status       String    @default("ACTIVE")        // ACTIVE, TP1_HIT, TP2_HIT, TP3_HIT, TSL_HIT, SL_HIT
  profitPct    Float?    @map("profit_pct")
  sentAt       DateTime  @default(now()) @map("sent_at")
  hitTime      DateTime? @map("hit_time")

  @@index([status])
  @@index([strategy])
  @@index([sentAt])
  @@index([symbol, status])
  @@map("signals")
}
```

### Perbandingan: Sebelum vs Sesudah

| Kolom | Sebelum | Sesudah | Alasan |
|---|---|---|---|
| `signal` | `"STRONG BUY"` | ❌ Dihapus | Diganti `side` + `strength` |
| `signalType` | `"LONG"` | ❌ Dihapus | Diganti `side` |
| `side` | — | ✅ `"LONG"` / `"SHORT"` | Lebih jelas |
| `strength` | — | ✅ `"STRONG"` / `"NORMAL"` | Terpisah dari arah |
| `confidence` | `"HIGH"` | ❌ Dihapus | Dihitung dari `score` |
| `duration` | `"2h 15m"` | ❌ Dihapus | Dihitung dari `sentAt` - `hitTime` |
| `currentPrice` | `65432.50` | ❌ Dihapus | Ambil dari WebSocket cache |
| `entryPrice` | nullable | ✅ **NOT NULL** | Entry wajib ada |
| `sl` | nullable | ✅ **NOT NULL** | SL wajib ada |
| `tp1` | nullable | ✅ **NOT NULL** | TP1 minimal wajib |
| `tp2`, `tp3` | nullable | Tetap nullable | Opsional |

> **Hasil: dari 19 kolom → 13 kolom.** Lebih bersih, tidak ada data duplikat.

---

## C. Fokus Binance API — Integrasi yang Perlu Dimigrasi

Berdasarkan riset kode Go, berikut semua endpoint Binance yang digunakan:

### 1. Market Data (Public — Tidak Perlu API Key)

| Fungsi | Binance Endpoint | File Go | Deskripsi |
|---|---|---|---|
| WebSocket Ticker | `wss://fstream.binance.com/stream?streams=...@ticker` | `binance/ws.go` | Harga realtime semua pair |
| Kline 1H | `GET /fapi/v1/klines?interval=1h` | `engine/candle.go` | Candle scanner |
| Kline 15M | `GET /fapi/v1/klines?interval=15m` | `engine/scanner.go` | Pre-pump scanner |
| Mark Price | `GET /fapi/v1/premiumIndex` | `engine/lifecycle.go` | Lifecycle monitor (TP/SL check) |
| Top Pairs | `GET /fapi/v1/ticker/24hr` | `fetcher/api.go` | Ambil top pairs by volume |

### 2. Trading (Private — Perlu API Key)

| Fungsi | Binance SDK Method | File Go | Deskripsi |
|---|---|---|---|
| Get Account | `NewGetAccountService()` | `executor.go:522` | Cek balance & equity |
| Get Positions | `NewGetPositionRiskService()` | `executor.go:529` | Cek open positions |
| Exchange Info | `NewExchangeInfoService()` | `executor.go:568` | Tick size, step size, min qty |
| Set Leverage | `NewChangeLeverageService()` | `executor.go:636` | Set leverage per symbol |
| Set Margin | `NewChangeMarginTypeService()` | `executor.go:678` | Isolated / Cross |
| Market Order | `NewCreateOrderService()` | `executor.go:740` | Entry posisi |
| Algo SL Order | `NewCreateAlgoOrderService()` | `executor.go:754` | Stop Loss (StopMarket) |
| Algo TP Order | `NewCreateAlgoOrderService()` | `executor.go:786` | Take Profit |
| Cancel Orders | `NewCancelAllOpenOrdersService()` | `executor.go:656` | Cleanup orders |
| Cancel Algo | `NewCancelAllAlgoOpenOrdersService()` | `executor.go:659` | Cleanup algo orders |
| Spot Buy | `NewCreateOrderService()` (spot) | `executor.go` | Spot market buy |
| Spot OCO | `NewCreateOCOService()` (spot) | `executor.go` | OCO TP + SL |

### 3. NestJS Library yang Direkomendasikan

Untuk NestJS, kita **tidak perlu** library `go-binance`. Kita pakai:

```bash
npm install binance-connector-typescript  # Official Binance SDK
# atau
npm install binance-api-node              # Community SDK (lebih populer)
```

### 4. Arsitektur Binance Module di NestJS

```
backend/src/binance/
├── binance.module.ts           # NestJS module
├── binance-ws.service.ts       # WebSocket connection (harga realtime)
├── binance-market.service.ts   # REST: klines, mark price, exchange info
├── binance-futures.service.ts  # Trading: order, leverage, margin
├── binance-spot.service.ts     # Spot trading
└── binance.types.ts            # TypeScript types
```

#### `binance-ws.service.ts` — WebSocket Harga Realtime

```typescript
@Injectable()
export class BinanceWsService implements OnModuleInit, OnModuleDestroy {
  private ws: WebSocket;
  private prices: Map<string, PriceInfo> = new Map();

  onModuleInit() {
    this.connect();
  }

  private connect() {
    const pairs = this.configService.get('PAIRS');
    const streams = pairs.map(p => `${p.toLowerCase()}@ticker`).join('/');
    const url = `wss://fstream.binance.com/stream?streams=${streams}`;
    
    this.ws = new WebSocket(url);
    this.ws.on('message', (data) => this.handleMessage(data));
    this.ws.on('close', () => this.reconnect());
  }

  private handleMessage(raw: Buffer) {
    const msg = JSON.parse(raw.toString());
    if (!msg.data?.e?.includes('24hrTicker')) return;

    const ticker = msg.data;
    this.prices.set(ticker.s, {
      price: parseFloat(ticker.c),
      changePct: parseFloat(ticker.P),
    });

    // Kirim ke Strategy Service untuk evaluasi
    this.strategyService.onTickerUpdate(ticker);
  }

  /** Get cached price (untuk lifecycle monitor) */
  getPrice(symbol: string): number {
    return this.prices.get(symbol)?.price ?? 0;
  }
}
```

#### `binance-market.service.ts` — REST API Public

```typescript
@Injectable()
export class BinanceMarketService {
  
  /** Fetch klines (candle data) */
  async getKlines(symbol: string, interval: '1h' | '15m' | '4h', limit = 20) {
    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const { data } = await this.httpService.get(url).toPromise();
    return data.map(k => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      closeTime: k[6],
      takerBuyVolume: parseFloat(k[9]),
    }));
  }

  /** Fetch mark prices (untuk lifecycle monitor) */
  async getMarkPrices(): Promise<Map<string, number>> {
    const url = 'https://fapi.binance.com/fapi/v1/premiumIndex';
    const { data } = await this.httpService.get(url).toPromise();
    const prices = new Map<string, number>();
    for (const row of data) {
      prices.set(row.symbol, parseFloat(row.markPrice));
    }
    return prices;
  }
}
```

---

## D. Ringkasan Perubahan

> [!TIP]
> **Skema lebih ramping:** 6 kolom redundan dihapus dari tabel `signals`.
> **Binance API tetap sama:** Semua endpoint Binance yang dipakai di Go akan dimigrasi 1:1 ke NestJS.
> **Library JS:** Pakai `binance-api-node` atau official `binance-connector-typescript`.
