# Panduan Migrasi UI (Vanilla ke React + Shadcn)

## 1. Konsep Desain (Mempertahankan UI Lama)

Aplikasi saat ini menggunakan **Dark Theme khusus Trading** yang terinspirasi dari exchange seperti Binance. Kita akan menduplikasi skema warna ini persis ke konfigurasi Tailwind CSS (`tailwind.config.js` atau `globals.css`) di React nanti.

### Palet Warna (CSS Variables to Tailwind)

| CSS Lama     | Hex Lama  | Mapping Shadcn / Tailwind Baru       |
| ------------ | --------- | ------------------------------------ |
| `--bg`       | `#0b0e11` | `hsl(var(--background))`             |
| `--card`     | `#181a20` | `hsl(var(--card))`                   |
| `--border`   | `#2b2f36` | `hsl(var(--border))`                 |
| `--text`     | `#eaecef` | `hsl(var(--foreground))`             |
| `--text-dim` | `#848e9c` | `hsl(var(--muted-foreground))`       |
| `--accent`   | `#6366f1` | `hsl(var(--primary))`                |
| `--buy`      | `#0ecb81` | `class="text-green-500"` (Success)   |
| `--sell`     | `#f6465d` | `class="text-red-500"` (Destructive) |
| `--nav-bg`   | `#1e2329` | `hsl(var(--secondary))`              |

### Font

Font **Outfit** akan tetap dipertahankan. Di Next.js/Vite, kita import font ini via Google Fonts atau `@fontsource/outfit`.

---

## 2. Pemetaan Komponen (Vanilla HTML ke Shadcn)

Di project baru, Anda tidak perlu menulis CSS manual lagi. Semuanya diganti dengan komponen Shadcn:

| Elemen UI Lama   | Komponen Shadcn yang Dipakai              | Keterangan                                 |
| ---------------- | ----------------------------------------- | ------------------------------------------ |
| Navbar / Sidebar | `AppSidebar` (Sidebar block)              | Menu navigasi (Home, Signals, Insights)    |
| Tab Navigasi     | `Tabs`, `TabsList`, `TabsTrigger`         | Perpindahan antar halaman/section          |
| Compact Alert    | `Alert`, `AlertTitle`, `AlertDescription` | Info pengumuman/warning di bawah header    |
| Signal Card      | `Card`, `CardHeader`, `CardContent`       | Menampilkan detail sinyal (Entry, SL, TP)  |
| Status / Badge   | `Badge`                                   | Label "ACTIVE", "TP1_HIT", "LONG", "SHORT" |
| Buy/Sell Text    | Tailwind classes (`text-green-500`)       | Warna text dinamis sesuai arah posisi      |
| Button Action    | `Button`                                  | Tombol login, donasi, switch strategy      |
| Online Pill      | `Badge` (variant outline) + Ping dot      | Indikator user online                      |
| Chart (Chart.js) | `Recharts` / Shadcn `Chart`               | Visualisasi winrate & harga                |
| Modal/Popup      | `Dialog` atau `Sheet`                     | Popup konfirmasi/detail                    |

---

## 3. Struktur Layout (App Shell)

Layout lama (Sidebar + Header + Content) bisa langsung dibuat dengan library layout Shadcn yang baru.

```tsx
// Contoh kerangka layout utama di React
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function Layout({ children }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <main className="w-full bg-[#0b0e11] min-h-screen text-[#eaecef]">
        <header className="flex h-16 items-center border-b border-[#2b2f36] px-4">
          <SidebarTrigger />
          <div className="ml-4 font-bold text-xl">
            Crypto<span className="text-[#6366f1]">Spike</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-[#848e9c]">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            Signals Active
          </div>
        </header>
        <div className="p-4 md:p-6">
          {children} {/* Berisi routing ke tab Home, Signals, dll */}
        </div>
      </main>
    </SidebarProvider>
  );
}
```

---

## 4. Signal Card Migration (Core UI)

Bagian terpenting dari UI lama adalah daftar Sinyal. Di React, kita buatkan komponen `SignalCard.tsx`.

```tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SignalCard({ signal }) {
  const isLong = signal.side === "LONG";

  return (
    <Card className="bg-[#181a20] border-[#2b2f36] mb-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg">{signal.symbol}</h3>
          <Badge
            variant={isLong ? "default" : "destructive"}
            className={isLong ? "bg-[#0ecb81]" : "bg-[#f6465d]"}
          >
            {signal.side}
          </Badge>
        </div>
        <Badge variant="outline" className="text-[#848e9c] border-[#2b2f36]">
          {signal.strategy}
        </Badge>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[#848e9c]">Entry</p>
            <p className="font-semibold">{signal.entryPrice}</p>
          </div>
          <div>
            <p className="text-[#848e9c]">Stop Loss</p>
            <p className="font-semibold text-[#f6465d]">{signal.sl}</p>
          </div>
          {/* Target Profits ... */}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 5. Keuntungan Migrasi UI Ini

1. **Konsistensi:** Shadcn mengamankan komponen agar ukurannya konsisten (padding, margin, ring focus).
2. **Maintenance:** CSS lama Anda 1 file panjang (`dashboard.css`). Di React, styling dipecah per komponen menggunakan Tailwind, sehingga super mudah di-debug.
3. **Animasi:** Shadcn sudah mem-bundle animasi Radix UI (misal: modal muncul mulus, dropdown mulus).
4. **Mobile First:** Tailwind membuat responsivitas (merubah layout desktop jadi mobile) sangat mudah dengan utility class seperti `md:grid-cols-2`.
