import { useState, useMemo } from "react";
import {
  RadioIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ZapIcon,
  ShieldAlertIcon,
  ActivityIcon,
  BellIcon,
  SearchIcon,
  ClockIcon,
  CheckCircle2Icon,
  LockIcon,
  SparklesIcon,
  ExternalLinkIcon,
  FlameIcon,
} from "lucide-react";
import { useCryptoSpike } from "@/context/trading-context";
import { NotificationBell } from "@/components/notification-bell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/table-pagination";

function formatCryptoPrice(val: number): string {
  if (val === 0) return "0.00";
  if (val < 0.0001) {
    return val.toLocaleString("en-US", {
      minimumFractionDigits: 6,
      maximumFractionDigits: 8,
    });
  }
  if (val < 1) {
    return val.toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    });
  }
  if (val < 100) {
    return val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PublicSignalsView() {
  const { signals } = useCryptoSpike();
  const [filter, setFilter] = useState<"ALL" | "RUNNING" | "CLOSED">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Summary Metrics
  const summary = useMemo(() => {
    let longCount = 0;
    let shortCount = 0;
    let runningCount = 0;
    let hitCount = 0;
    let lossCount = 0;
    let totalRealizedProfitPct = 0;

    for (const sig of signals) {
      if (sig.side === "LONG") longCount++;
      else shortCount++;

      if (sig.status === "ACTIVE") {
        runningCount++;
      } else if (
        sig.status?.includes("TP") ||
        (typeof sig.profitPct === "number" && sig.profitPct > 0)
      ) {
        hitCount++;
        totalRealizedProfitPct += sig.profitPct || 0;
      } else if (
        sig.status === "SL_HIT" ||
        (typeof sig.profitPct === "number" && sig.profitPct < 0)
      ) {
        lossCount++;
        totalRealizedProfitPct += sig.profitPct || 0;
      }
    }

    const closedCount = hitCount + lossCount;
    const winrate =
      closedCount > 0 ? ((hitCount / closedCount) * 100).toFixed(1) : "0.0";

    return {
      totalSignals: signals.length,
      runningCount,
      closedCount,
      hitCount,
      lossCount,
      winrate,
      totalRealizedProfitPct: parseFloat(totalRealizedProfitPct.toFixed(2)),
      longCount,
      shortCount,
    };
  }, [signals]);

  const filteredSignals = useMemo(() => {
    return signals.filter((sig) => {
      if (filter === "RUNNING" && sig.status !== "ACTIVE") return false;
      if (filter === "CLOSED" && sig.status === "ACTIVE") return false;
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      return (
        sig.symbol.toLowerCase().includes(q) ||
        sig.side.toLowerCase().includes(q) ||
        (sig.strategy && sig.strategy.toLowerCase().includes(q))
      );
    });
  }, [signals, filter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredSignals.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedSignals = filteredSignals.slice(
    startIndex,
    startIndex + pageSize,
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-emerald-500/20 selection:text-emerald-500">
      {/* 1. Public Top Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-lg shadow-sm shadow-emerald-500/20">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-lg bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                  CryptoSpike
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] px-1.5 py-0 border-emerald-500/40 text-emerald-600 bg-emerald-500/10 font-bold"
                >
                  PUBLIC LIVE FEED
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Automated Price Action & High-Probability Trading Signals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Live Ticker Pulse */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-mono text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline">LIVE SCANNER</span>
            </div>

            {/* Notification Bell Dropdown */}
            <NotificationBell />

            {/* Link Operator Login */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 gap-1.5 text-xs font-semibold rounded-lg hover:border-emerald-500/50 hover:bg-emerald-500/5 cursor-pointer"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              <LockIcon className="size-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Operator</span> Login
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section: Headline & Live Statistics */}
      <section className="border-b border-border/60 bg-gradient-to-b from-card/80 to-background/40 py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 border border-border/80 text-xs font-mono text-muted-foreground">
              <SparklesIcon className="size-3.5 text-amber-500" />
              <span>Realtime Binance Futures Signal Stream</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Live Algorithmic Signals
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Sinyal trading otomatis berbasis Price Action (S/R, Trendline
              Breakout, Confluence) dengan target Take Profit bertahap dan
              Trailing Stop Loss aktif.
            </p>
          </div>

          {/* 4 Cards Stat Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto pt-2">
            {/* Stat 1: Total Signals */}
            <Card className="border-border/80 shadow-xs bg-card/60 backdrop-blur">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                  Signals Discovered
                  <RadioIcon className="size-3.5 text-emerald-500" />
                </span>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {summary.totalSignals}
                </div>
                <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                  <span className="text-emerald-500 font-semibold">
                    {summary.runningCount} Active
                  </span>
                  <span>•</span>
                  <span>{summary.closedCount} Completed</span>
                </div>
              </CardContent>
            </Card>

            {/* Stat 2: Realized Winrate */}
            <Card className="border-border/80 shadow-xs bg-card/60 backdrop-blur">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                  Realized Winrate
                  <CheckCircle2Icon className="size-3.5 text-teal-500" />
                </span>
                <div className="text-2xl font-bold font-mono text-emerald-600">
                  {summary.winrate}%
                </div>
                <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                  <span className="text-emerald-600 font-semibold">
                    {summary.hitCount} Win
                  </span>
                  <span>/</span>
                  <span className="text-rose-500 font-semibold">
                    {summary.lossCount} Loss
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Stat 3: Net Cumulative Gain */}
            <Card className="border-border/80 shadow-xs bg-card/60 backdrop-blur">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                  Total Tracked PnL
                  <FlameIcon className="size-3.5 text-amber-500" />
                </span>
                <div
                  className={`text-2xl font-bold font-mono ${
                    summary.totalRealizedProfitPct >= 0
                      ? "text-emerald-500"
                      : "text-rose-500"
                  }`}
                >
                  {summary.totalRealizedProfitPct >= 0 ? "+" : ""}
                  {summary.totalRealizedProfitPct.toFixed(2)}%
                </div>
                <div className="text-[11px] text-muted-foreground font-sans">
                  Cumulative ROI Closed
                </div>
              </CardContent>
            </Card>

            {/* Stat 4: Long / Short Sentiment */}
            <Card className="border-border/80 shadow-xs bg-card/60 backdrop-blur">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                  Market Direction
                  <ZapIcon className="size-3.5 text-indigo-500" />
                </span>
                <div className="text-2xl font-bold font-mono text-foreground flex items-center gap-2">
                  <span className="text-emerald-500">{summary.longCount}L</span>
                  <span className="text-muted-foreground text-sm font-normal">
                    /
                  </span>
                  <span className="text-rose-500">{summary.shortCount}S</span>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  {(
                    (summary.longCount / Math.max(summary.totalSignals, 1)) *
                    100
                  ).toFixed(0)}
                  % Bullish Bias
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. Main Content: Filter Tabs, Search & Signal Cards Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/80 self-start">
            <button
              onClick={() => {
                setFilter("ALL");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filter === "ALL"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Signals ({signals.length})
            </button>
            <button
              onClick={() => {
                setFilter("RUNNING");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === "RUNNING"
                  ? "bg-background text-emerald-600 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Running ({summary.runningCount})
            </button>
            <button
              onClick={() => {
                setFilter("CLOSED");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filter === "CLOSED"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              History Closed ({summary.closedCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative sm:w-72">
            <SearchIcon className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search pair (e.g. BTC, QTUM)..."
              className="pl-9 h-9 text-xs rounded-xl bg-card"
            />
          </div>
        </div>

        {/* Signal Cards Grid */}
        {paginatedSignals.length === 0 ? (
          <div className="p-12 text-center border rounded-2xl bg-card space-y-3">
            <RadioIcon className="size-8 mx-auto text-muted-foreground/60" />
            <h3 className="font-semibold text-base text-foreground">
              No signals found
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No trading signals currently match your filter criteria or search
              keyword.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedSignals.map((sig) => {
              const isLong = sig.side === "LONG";
              const isRunning = sig.status === "ACTIVE";
              const isProfit = (sig.profitPct ?? 0) >= 0;

              return (
                <div
                  key={sig.id}
                  className={`rounded-2xl border bg-card p-4 space-y-3.5 transition-all shadow-xs hover:shadow-md hover:border-emerald-500/30 ${
                    isRunning
                      ? "border-emerald-500/30 ring-1 ring-emerald-500/10"
                      : "border-border/80"
                  }`}
                >
                  {/* Card Header: Pair, Direction Badge & Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold font-mono text-base tracking-tight text-foreground">
                        {sig.symbol}
                      </span>
                      <Badge
                        variant={isLong ? "default" : "destructive"}
                        className="text-[10px] font-mono px-2 py-0.5 font-bold flex items-center gap-0.5"
                      >
                        {isLong ? (
                          <TrendingUpIcon className="size-3" />
                        ) : (
                          <TrendingDownIcon className="size-3" />
                        )}
                        {sig.side}
                      </Badge>
                      {sig.strength === "STRONG" && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 border-amber-500/40 text-amber-500 font-mono"
                        >
                          STRONG
                        </Badge>
                      )}
                    </div>

                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] px-2 py-0.5 flex items-center gap-1 ${
                        isRunning
                          ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
                          : sig.status.includes("TP")
                            ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5"
                            : sig.status === "SL_HIT"
                              ? "border-rose-500/30 text-rose-600 bg-rose-500/5"
                              : "border-muted text-muted-foreground"
                      }`}
                    >
                      {isRunning && (
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                      {sig.status.replace("_HIT", "")}
                    </Badge>
                  </div>

                  {/* Price Banner: Entry vs Current */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">
                        Entry Price
                      </span>
                      <span className="font-bold text-foreground text-xs">
                        ${formatCryptoPrice(sig.entryPrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">
                        Current Mark
                      </span>
                      <span
                        className={`font-bold text-xs ${
                          sig.currentPrice
                            ? isProfit
                              ? "text-emerald-500"
                              : "text-rose-500"
                            : "text-foreground"
                        }`}
                      >
                        {sig.currentPrice
                          ? `$${formatCryptoPrice(sig.currentPrice)}`
                          : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Target Levels (TP1, TP2, TP3 & SL) */}
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-2 text-xs font-mono">
                    <span className="text-[10px] text-muted-foreground block font-sans font-medium uppercase tracking-wider">
                      Target Exit Levels
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {/* TP1 */}
                      {sig.tp1 && (
                        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[11px]">
                          <span className="text-[10px] font-bold text-emerald-600">
                            TP1
                          </span>
                          <span className="font-semibold text-foreground">
                            ${formatCryptoPrice(sig.tp1)}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold">
                            (
                            {isLong
                              ? `+${(((sig.tp1 - sig.entryPrice) / sig.entryPrice) * 100).toFixed(1)}%`
                              : `+${(((sig.entryPrice - sig.tp1) / sig.entryPrice) * 100).toFixed(1)}%`}
                            )
                          </span>
                        </div>
                      )}

                      {/* TP2 */}
                      {sig.tp2 && (
                        <div className="flex items-center gap-1 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-md text-[11px]">
                          <span className="text-[10px] font-bold text-teal-600">
                            TP2
                          </span>
                          <span className="font-semibold text-foreground">
                            ${formatCryptoPrice(sig.tp2)}
                          </span>
                          <span className="text-[10px] text-teal-600 font-bold">
                            (
                            {isLong
                              ? `+${(((sig.tp2 - sig.entryPrice) / sig.entryPrice) * 100).toFixed(1)}%`
                              : `+${(((sig.entryPrice - sig.tp2) / sig.entryPrice) * 100).toFixed(1)}%`}
                            )
                          </span>
                        </div>
                      )}

                      {/* TP3 */}
                      {sig.tp3 && (
                        <div className="flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md text-[11px]">
                          <span className="text-[10px] font-bold text-cyan-600">
                            TP3
                          </span>
                          <span className="font-semibold text-foreground">
                            ${formatCryptoPrice(sig.tp3)}
                          </span>
                          <span className="text-[10px] text-cyan-600 font-bold">
                            (
                            {isLong
                              ? `+${(((sig.tp3 - sig.entryPrice) / sig.entryPrice) * 100).toFixed(1)}%`
                              : `+${(((sig.entryPrice - sig.tp3) / sig.entryPrice) * 100).toFixed(1)}%`}
                            )
                          </span>
                        </div>
                      )}

                      {/* SL */}
                      {sig.sl && (
                        <div className="flex items-center gap-1 bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-md text-[11px]">
                          <span className="text-[10px] font-bold text-destructive">
                            SL
                          </span>
                          <span className="font-semibold text-destructive">
                            ${formatCryptoPrice(sig.sl)}
                          </span>
                          <span className="text-[10px] text-destructive font-bold">
                            (-
                            {isLong
                              ? `${Math.abs(((sig.entryPrice - sig.sl) / sig.entryPrice) * 100).toFixed(1)}%`
                              : `${Math.abs(((sig.sl - sig.entryPrice) / sig.entryPrice) * 100).toFixed(1)}%`}
                            )
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Strategy, Live PnL & Timestamp */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                    <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[11px]">
                      <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-sans">
                        {sig.strategy}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {typeof sig.profitPct === "number" && (
                        <span
                          className={`font-mono font-bold text-xs ${
                            isProfit ? "text-emerald-500" : "text-rose-500"
                          }`}
                        >
                          {isProfit ? "+" : ""}
                          {sig.profitPct.toFixed(2)}%
                        </span>
                      )}

                      <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                        <ClockIcon className="size-3 text-muted-foreground/60" />
                        {new Date(
                          sig.createdAt || sig.sentAt,
                        ).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        <div className="pt-2">
          <TablePagination
            currentPage={validCurrentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredSignals.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="signals"
          />
        </div>
      </main>

      {/* 4. Public Footer */}
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground space-y-1 bg-card/40">
        <div>
          CryptoSpike Realtime Signal Scanner • High Frequency Price Action
          Algorithmic Trading
        </div>
        <div className="text-[11px] text-muted-foreground/75">
          Disclaimer: Data sinyal disediakan murni untuk keperluan riset
          analisis teknikal dan tidak menjamin keuntungan finansial.
        </div>
      </footer>
    </div>
  );
}
