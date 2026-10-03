import { useState, useMemo } from "react";
import {
  RadioIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ZapIcon,
  SearchIcon,
  ClockIcon,
  CheckCircle2Icon,
  CheckIcon,
  XIcon,
  LockIcon,
  FlameIcon,
  FilterIcon,
  TrophyIcon,
  LayersIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { useCryptoSpike } from "@/context/trading-context";
import { NotificationBell } from "@/components/notification-bell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [selectedStrategy, setSelectedStrategy] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Daftar unik & ringkasan performa per strategi (Winrate Leaderboard)
  const strategyStats = useMemo(() => {
    const map = new Map<
      string,
      {
        strategy: string;
        total: number;
        running: number;
        hits: number;
        losses: number;
        realizedPnlUsd: number;
        floatingPnlUsd: number;
      }
    >();

    for (const sig of signals) {
      const strat = sig.strategy || "Unknown";
      if (!map.has(strat)) {
        map.set(strat, {
          strategy: strat,
          total: 0,
          running: 0,
          hits: 0,
          losses: 0,
          realizedPnlUsd: 0,
          floatingPnlUsd: 0,
        });
      }
      const item = map.get(strat)!;
      item.total++;

      const isClosed =
        sig.status === "TP3_HIT" ||
        sig.status === "SL_HIT" ||
        sig.status === "TSL_HIT" ||
        (sig.status as string) === "CLOSED" ||
        sig.status === "CANCELLED";

      const margin = sig.simulatedMargin ?? 10.0;

      if (!isClosed) {
        item.running++;

        // Hitung floating PnL untuk posisi yang masih running
        const isLong = sig.side === "LONG";
        let displayPrice = sig.currentPrice;
        if (!displayPrice && sig.entryPrice) {
          displayPrice = sig.entryPrice;
        }

        let floatingPct = typeof sig.profitPct === "number" ? sig.profitPct : 0;
        if (displayPrice && sig.entryPrice && sig.entryPrice > 0) {
          floatingPct = isLong
            ? ((displayPrice - sig.entryPrice) / sig.entryPrice) * 100
            : ((sig.entryPrice - displayPrice) / sig.entryPrice) * 100;
        }
        item.floatingPnlUsd += (margin * floatingPct) / 100;
      } else {
        // Hitung Realized PnL untuk posisi yang sudah closed
        const hasHitTp =
          sig.status === "TP1_HIT" ||
          sig.status === "TP2_HIT" ||
          sig.status === "TP3_HIT" ||
          sig.status === "TSL_HIT";

        const isLoss =
          sig.status === "SL_HIT" ||
          (typeof sig.profitPct === "number" && sig.profitPct < 0);

        if (hasHitTp) {
          item.hits++;
        } else if (isLoss) {
          item.losses++;
        }

        const pnl =
          typeof sig.realizedPnlUsd === "number"
            ? sig.realizedPnlUsd
            : (margin * (sig.profitPct || 0)) / 100;

        item.realizedPnlUsd += pnl;
      }
    }

    return Array.from(map.values())
      .map((st) => {
        const evaluated = st.hits + st.losses;
        const winrate =
          evaluated > 0 ? ((st.hits / evaluated) * 100).toFixed(1) : "0.0";
        const totalNetPnlUsd = st.realizedPnlUsd + st.floatingPnlUsd;

        return {
          ...st,
          winrate: parseFloat(winrate),
          realizedPnlUsd: parseFloat(st.realizedPnlUsd.toFixed(2)),
          floatingPnlUsd: parseFloat(st.floatingPnlUsd.toFixed(2)),
          totalNetPnlUsd: parseFloat(totalNetPnlUsd.toFixed(2)),
          evaluated,
        };
      })
      .sort((a, b) => b.winrate - a.winrate || b.total - a.total);
  }, [signals]);

  const availableStrategies = useMemo(() => {
    return strategyStats.map((s) => s.strategy);
  }, [strategyStats]);

  // Summary Metrics
  const summary = useMemo(() => {
    let longCount = 0;
    let shortCount = 0;
    let runningCount = 0;
    let closedCountOnly = 0;
    let hitCount = 0;
    let lossCount = 0;
    let totalRealizedProfitPct = 0;
    let totalFloatingProfitUsd = 0;

    for (const sig of signals) {
      if (sig.side === "LONG") longCount++;
      else shortCount++;

      const isClosed =
        sig.status === "TP3_HIT" ||
        sig.status === "SL_HIT" ||
        sig.status === "TSL_HIT" ||
        (sig.status as string) === "CLOSED" ||
        sig.status === "CANCELLED";

      const margin = sig.simulatedMargin ?? 10.0;

      if (!isClosed) {
        runningCount++;

        // Hitung floating profit USD live
        const isLong = sig.side === "LONG";
        let displayPrice = sig.currentPrice;
        if (!displayPrice && sig.entryPrice) {
          displayPrice = sig.entryPrice;
        }

        let floatingPct = typeof sig.profitPct === "number" ? sig.profitPct : 0;
        if (displayPrice && sig.entryPrice && sig.entryPrice > 0) {
          floatingPct = isLong
            ? ((displayPrice - sig.entryPrice) / sig.entryPrice) * 100
            : ((sig.entryPrice - displayPrice) / sig.entryPrice) * 100;
        }
        totalFloatingProfitUsd += (margin * floatingPct) / 100;
      } else {
        closedCountOnly++;

        // Hitung Win: HANYA jika SUDAH BENAR-BENAR MENYENTUH target TP (TP1/TP2/TP3/TSL)
        const hasHitTp =
          sig.status === "TP1_HIT" ||
          sig.status === "TP2_HIT" ||
          sig.status === "TP3_HIT" ||
          sig.status === "TSL_HIT";

        const isLoss =
          sig.status === "SL_HIT" ||
          (typeof sig.profitPct === "number" && sig.profitPct < 0);

        if (hasHitTp) {
          hitCount++;
          totalRealizedProfitPct += sig.profitPct || 0;
        } else if (isLoss) {
          lossCount++;
          totalRealizedProfitPct += sig.profitPct || 0;
        }
      }
    }

    // Evaluated Signals: sinyal yang sudah punya outcome (kena TP atau kena SL)
    const evaluatedCount = hitCount + lossCount;
    const winrate =
      evaluatedCount > 0
        ? ((hitCount / evaluatedCount) * 100).toFixed(1)
        : "0.0";

    // Simulasi Modal $1,000 USD dengan 1% Position Allocation ($10 per Signal)
    const SIMULATED_CAPITAL = 1000;
    const ALLOCATION_PCT = 0.01; // 1% alokasi per posisi
    const POSITION_SIZE_USD = SIMULATED_CAPITAL * ALLOCATION_PCT; // $10 per sinyal

    // Total keuntungan dollar dihitung dari akumulasi return tiap posisi $10
    const simulatedProfitUsd =
      (POSITION_SIZE_USD * totalRealizedProfitPct) / 100;
    const simulatedBalanceUsd = SIMULATED_CAPITAL + simulatedProfitUsd;
    const simulatedEquityUsd = simulatedBalanceUsd + totalFloatingProfitUsd;
    const netReturnOnCapitalPct =
      (simulatedProfitUsd / SIMULATED_CAPITAL) * 100;

    return {
      totalSignals: signals.length,
      runningCount,
      closedCount: closedCountOnly,
      hitCount,
      lossCount,
      winrate,
      totalRealizedProfitPct: parseFloat(totalRealizedProfitPct.toFixed(2)),
      simulatedCapital: SIMULATED_CAPITAL,
      positionSizeUsd: POSITION_SIZE_USD,
      simulatedProfitUsd: parseFloat(simulatedProfitUsd.toFixed(2)),
      simulatedBalanceUsd: parseFloat(simulatedBalanceUsd.toFixed(2)),
      totalFloatingProfitUsd: parseFloat(totalFloatingProfitUsd.toFixed(2)),
      simulatedEquityUsd: parseFloat(simulatedEquityUsd.toFixed(2)),
      netReturnOnCapitalPct: parseFloat(netReturnOnCapitalPct.toFixed(2)),
      longCount,
      shortCount,
    };
  }, [signals]);

  const filteredSignals = useMemo(() => {
    return signals.filter((sig) => {
      const isSignalRunning =
        sig.status === "ACTIVE" ||
        sig.status === "TP1_HIT" ||
        sig.status === "TP2_HIT";

      if (filter === "RUNNING" && !isSignalRunning) return false;
      if (filter === "CLOSED" && isSignalRunning) return false;

      // Filter by Strategy
      if (selectedStrategy !== "ALL" && sig.strategy !== selectedStrategy) {
        return false;
      }

      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      return (
        sig.symbol.toLowerCase().includes(q) ||
        sig.side.toLowerCase().includes(q) ||
        (sig.strategy && sig.strategy.toLowerCase().includes(q))
      );
    });
  }, [signals, filter, selectedStrategy, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredSignals.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedSignals = filteredSignals.slice(
    startIndex,
    startIndex + pageSize,
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-emerald-500/20 selection:text-emerald-500">
      {/* 1. Clean Responsive Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Brand Identity */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="flex size-8 sm:size-9 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm sm:text-base shrink-0 shadow-xs">
              ⚡
            </div>
            <div className="min-w-0 flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-base sm:text-lg text-foreground truncate">
                CryptoSpike
              </span>
              <Badge
                variant="outline"
                className="hidden xs:inline-flex text-[9px] sm:text-[10px] font-mono px-1.5 py-0 border-emerald-500/40 text-emerald-600 bg-emerald-500/10 font-bold shrink-0"
              >
                LIVE
              </Badge>
            </div>
          </div>

          {/* Right Actions: Live Indicator, Notifications, Login */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Live Scanner Pulse Badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-mono text-[11px] font-semibold">
              <span className="relative flex size-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline">Scanner Live</span>
            </div>

            {/* Notification Bell with Audio Chimes */}
            <NotificationBell />

            {/* Operator Login Button */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-9 px-2 sm:px-3 gap-1.5 text-xs font-semibold rounded-lg hover:border-emerald-500/40 hover:bg-emerald-500/5 cursor-pointer"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              <LockIcon className="size-3.5 text-muted-foreground" />
              Login
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section: Headline & Summary Cards */}
      <section className="border-b border-border/60 bg-muted/20 py-6 sm:py-10 px-3.5 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-5">
          <div className="text-center max-w-xl mx-auto space-y-1.5">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Binance Live Signals
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Automated high-probability futures signals with dynamic
              multi-target TP and Trailing Stop.
            </p>
          </div>

          {/* Development & Sample Data Disclaimer Notice */}
          <div className="max-w-2xl mx-auto bg-amber-500/10 border border-amber-500/30 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 text-left text-amber-600 dark:text-amber-400">
            <AlertTriangleIcon className="size-4 shrink-0 stroke-[2.2] text-amber-500" />
            <div className="text-xs space-y-0.5">
              <span className="font-bold uppercase tracking-wider text-[11px] block">
                Development Phase & Sample Data Testing
              </span>
              <p className="text-[11px] opacity-90 leading-relaxed font-sans">
                The system is currently in{" "}
                <strong>development & collecting sample signals</strong> for
                algorithm strategy testing. These signals are purely for
                technical evaluation,{" "}
                <strong>not financial advice, and do not follow them</strong>.
              </p>
            </div>
          </div>

          {/* 4 Cards Stat Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 max-w-5xl mx-auto">
            {/* Stat 1: Total Signals */}
            <Card className="border-border/80 shadow-xs bg-card">
              <CardContent className="p-3 sm:p-4 space-y-1">
                <span className="text-[11px] sm:text-xs text-muted-foreground font-medium flex items-center justify-between">
                  Total Signals
                  <RadioIcon className="size-3 sm:size-3.5 text-emerald-500" />
                </span>
                <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                  {summary.totalSignals}
                </div>
                <div className="text-[10px] sm:text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <span className="text-emerald-500 font-semibold">
                    {summary.runningCount} Active
                  </span>
                  <span>•</span>
                  <span>{summary.closedCount} Closed</span>
                </div>
              </CardContent>
            </Card>

            {/* Stat 2: Winrate */}
            <Card className="border-border/80 shadow-xs bg-card">
              <CardContent className="p-3 sm:p-4 space-y-1">
                <span className="text-[11px] sm:text-xs text-muted-foreground font-medium flex items-center justify-between">
                  Winrate
                  <CheckCircle2Icon className="size-3 sm:size-3.5 text-teal-500" />
                </span>
                <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600">
                  {summary.winrate}%
                </div>
                <div className="text-[10px] sm:text-[11px] font-mono text-muted-foreground flex items-center gap-1">
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

            {/* Stat 3: Realized & Floating Portfolio Performance */}
            <Card className="border-border/80 shadow-xs bg-card">
              <CardContent className="p-3 sm:p-4 space-y-1">
                <span className="text-[11px] sm:text-xs text-muted-foreground font-medium flex items-center justify-between">
                  Portfolio Performance
                  <FlameIcon className="size-3 sm:size-3.5 text-amber-500" />
                </span>
                <div
                  className={`text-xl sm:text-2xl font-bold font-mono ${
                    summary.simulatedProfitUsd >= 0
                      ? "text-emerald-500"
                      : "text-rose-500"
                  }`}
                >
                  {summary.simulatedProfitUsd >= 0 ? "+" : ""}$
                  {summary.simulatedProfitUsd.toFixed(2)}
                  <span className="text-xs font-normal text-muted-foreground ml-1.5 font-sans">
                    Realized
                  </span>
                </div>
                <div className="text-[10px] sm:text-[11px] font-mono text-muted-foreground flex items-center justify-between gap-1 pt-0.5 border-t border-border/40">
                  <span
                    className={
                      summary.totalFloatingProfitUsd >= 0
                        ? "text-emerald-500 font-semibold"
                        : "text-rose-500 font-semibold"
                    }
                    title="Floating Unrealized PnL across active running signals"
                  >
                    Float: {summary.totalFloatingProfitUsd >= 0 ? "+" : ""}$
                    {summary.totalFloatingProfitUsd.toFixed(2)}
                  </span>
                  <span
                    className="font-bold text-foreground"
                    title="Current Total Equity = Cash Balance + Floating PnL"
                  >
                    Eq: ${summary.simulatedEquityUsd.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Stat 4: Long/Short Sentiment */}
            <Card className="border-border/80 shadow-xs bg-card">
              <CardContent className="p-3 sm:p-4 space-y-1">
                <span className="text-[11px] sm:text-xs text-muted-foreground font-medium flex items-center justify-between">
                  Direction Bias
                  <ZapIcon className="size-3 sm:size-3.5 text-indigo-500" />
                </span>
                <div className="text-xl sm:text-2xl font-bold font-mono text-foreground flex items-center gap-1.5">
                  <span className="text-emerald-500">{summary.longCount}L</span>
                  <span className="text-muted-foreground text-sm font-normal">
                    /
                  </span>
                  <span className="text-rose-500">{summary.shortCount}S</span>
                </div>
                <div className="text-[10px] sm:text-[11px] font-mono text-muted-foreground">
                  {(
                    (summary.longCount / Math.max(summary.totalSignals, 1)) *
                    100
                  ).toFixed(0)}
                  % Long Ratio
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Strategy Winrate Info Bar (Sleek Compact Ticker) */}
          {strategyStats.length > 0 && (
            <div className="max-w-4xl mx-auto bg-card/60 backdrop-blur-xs border border-border/80 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground shrink-0">
                <TrophyIcon className="size-3.5 text-amber-500" />
                <span className="tracking-tight">Winrate by Strategy</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  (Live Audit)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {strategyStats.map((st) => {
                  const isSelected = selectedStrategy === st.strategy;
                  const isPositive = st.winrate >= 50;

                  return (
                    <button
                      key={st.strategy}
                      type="button"
                      onClick={() => {
                        setSelectedStrategy(isSelected ? "ALL" : st.strategy);
                        setCurrentPage(1);
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-500/15 border border-emerald-500/50 text-emerald-600 ring-1 ring-emerald-500/20 font-bold"
                          : "bg-muted/50 hover:bg-muted border border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                      title={`${st.hits} Win / ${st.losses} Loss from ${st.total} signals`}
                    >
                      <span className="font-sans font-medium text-[11px] text-foreground">
                        {st.strategy}
                      </span>
                      <span
                        className={`font-bold ${
                          isPositive ? "text-emerald-500" : "text-amber-500"
                        }`}
                      >
                        {st.winrate}%
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          st.totalNetPnlUsd >= 0
                            ? "text-emerald-500"
                            : "text-rose-500"
                        }`}
                      >
                        ({st.totalNetPnlUsd >= 0 ? "+" : ""}$
                        {st.totalNetPnlUsd.toFixed(2)})
                      </span>
                      <span className="text-[10px] text-muted-foreground/75 font-sans">
                        • {st.hits}W/{st.losses}L
                        {st.running > 0 && ` (${st.running} open)`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Main Content: Filter Tabs, Search & Signal Cards */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 py-5 sm:py-8 space-y-4 sm:space-y-6">
        {/* Responsive Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/80 self-start w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => {
                setFilter("ALL");
                setCurrentPage(1);
              }}
              className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filter === "ALL"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({signals.length})
            </button>
            <button
              onClick={() => {
                setFilter("RUNNING");
                setCurrentPage(1);
              }}
              className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
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
              className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filter === "CLOSED"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Closed ({summary.closedCount})
            </button>
          </div>

          {/* Right Toolbar: Strategy Filter & Search Box */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* Strategy Filter Dropdown */}
            {availableStrategies.length > 0 && (
              <div className="w-full sm:w-48">
                <Select
                  value={selectedStrategy}
                  onValueChange={(val) => {
                    setSelectedStrategy(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-card border-border/80">
                    <div className="flex items-center gap-1.5 truncate">
                      <FilterIcon className="size-3 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="All Strategies" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="ALL" className="text-xs">
                      All Strategies
                    </SelectItem>
                    {availableStrategies.map((strat) => (
                      <SelectItem
                        key={strat}
                        value={strat}
                        className="text-xs font-mono"
                      >
                        {strat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Search Box */}
            <div className="relative w-full sm:w-56">
              <SearchIcon className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filter pair (e.g. BTC, ETH)..."
                className="pl-9 h-9 text-xs rounded-xl bg-card"
              />
            </div>
          </div>
        </div>

        {/* Signal Cards Grid */}
        {paginatedSignals.length === 0 ? (
          <div className="p-10 text-center border rounded-2xl bg-card space-y-2">
            <RadioIcon className="size-8 mx-auto text-muted-foreground/60" />
            <h3 className="font-semibold text-sm text-foreground">
              No signals found
            </h3>
            <p className="text-xs text-muted-foreground">
              Try adjusting your filter or search keyword.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {paginatedSignals.map((sig) => {
              const isLong = sig.side === "LONG";
              const isRunning =
                sig.status === "ACTIVE" ||
                sig.status === "TP1_HIT" ||
                sig.status === "TP2_HIT";
              const isProfit = (sig.profitPct ?? 0) >= 0;

              // Hitung harga keluar (Exit Price) untuk sinyal yang sudah selesai jika currentPrice tidak tersimpan
              let displayPrice = sig.currentPrice;
              if (!displayPrice) {
                if (sig.status === "TP1_HIT" && sig.tp1) {
                  displayPrice = sig.tp1;
                } else if (sig.status === "TP2_HIT" && sig.tp2) {
                  displayPrice = sig.tp2;
                } else if (sig.status === "TP3_HIT" && sig.tp3) {
                  displayPrice = sig.tp3;
                } else if (sig.status === "SL_HIT" && sig.sl) {
                  displayPrice = sig.sl;
                } else if (sig.status === "TSL_HIT") {
                  displayPrice = sig.entryPrice;
                } else if (
                  typeof sig.profitPct === "number" &&
                  sig.entryPrice
                ) {
                  displayPrice = isLong
                    ? sig.entryPrice * (1 + sig.profitPct / 100)
                    : sig.entryPrice * (1 - sig.profitPct / 100);
                } else if (isRunning && sig.entryPrice) {
                  // Fallback: gunakan entryPrice sementara menunggu data ticker pertama dari WebSocket
                  displayPrice = sig.entryPrice;
                }
              }

              // Hitung PnL secara dinamis: jika sinyal belum memiliki profitPct tersimpan di DB
              let displayProfitPct = sig.profitPct;
              if (typeof displayProfitPct !== "number") {
                if (displayPrice && sig.entryPrice && sig.entryPrice > 0) {
                  displayProfitPct = isLong
                    ? ((displayPrice - sig.entryPrice) / sig.entryPrice) * 100
                    : ((sig.entryPrice - displayPrice) / sig.entryPrice) * 100;
                } else if (isRunning) {
                  displayProfitPct = 0.0;
                }
              }
              const isProfitPositive = (displayProfitPct ?? 0) >= 0;

              // Deteksi apakah TP1, TP2, TP3, atau SL sudah tersentuh (hit)
              const isTp3Hit =
                sig.status === "TP3_HIT" ||
                (displayPrice && sig.tp3
                  ? isLong
                    ? displayPrice >= sig.tp3
                    : displayPrice <= sig.tp3
                  : false);

              const isTp2Hit =
                isTp3Hit ||
                sig.status === "TP2_HIT" ||
                (displayPrice && sig.tp2
                  ? isLong
                    ? displayPrice >= sig.tp2
                    : displayPrice <= sig.tp2
                  : false);

              const isTp1Hit =
                isTp2Hit ||
                sig.status === "TP1_HIT" ||
                sig.status === "TSL_HIT" ||
                (displayPrice && sig.tp1
                  ? isLong
                    ? displayPrice >= sig.tp1
                    : displayPrice <= sig.tp1
                  : false);

              const isSlHit =
                sig.status === "SL_HIT" ||
                (displayPrice && sig.sl
                  ? isLong
                    ? displayPrice <= sig.sl
                    : displayPrice >= sig.sl
                  : false);

              return (
                <div
                  key={sig.id}
                  className={`rounded-2xl border bg-card p-3.5 sm:p-4 space-y-3 transition-all shadow-xs hover:shadow-md hover:border-emerald-500/30 ${
                    isRunning
                      ? "border-emerald-500/30 ring-1 ring-emerald-500/10"
                      : "border-border/80"
                  }`}
                >
                  {/* Card Header: Pair, Side Badge & Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="font-bold font-mono text-base tracking-tight text-foreground">
                        {sig.symbol}
                      </span>
                      <Badge
                        variant={isLong ? "default" : "destructive"}
                        className="text-[10px] font-mono px-1.5 py-0 font-bold flex items-center gap-0.5"
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
                      {(sig.volume24h ||
                        sig.reasons?.match(/Vol:\s*(\$[\d.]+M)/)?.[1]) && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 border-sky-500/30 text-sky-500 bg-sky-500/5 font-mono"
                          title="24h Trading Volume"
                        >
                          {sig.volume24h ||
                            sig.reasons?.match(/Vol:\s*(\$[\d.]+M)/)?.[1]}{" "}
                          Vol
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

                  {/* Price & Position Size Grid */}
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
                        {isRunning ? "Mark Price" : "Exit Price"}
                      </span>
                      <span
                        className={`font-bold text-xs ${
                          displayPrice
                            ? isProfit
                              ? "text-emerald-500"
                              : "text-rose-500"
                            : "text-foreground"
                        }`}
                      >
                        {displayPrice
                          ? `$${formatCryptoPrice(displayPrice)}`
                          : "-"}
                      </span>
                    </div>

                    {/* Sizing & Capital Allocation */}
                    <div className="pt-1.5 border-t border-border/40">
                      <span className="text-[10px] text-muted-foreground block font-sans">
                        Simulated Margin (1%)
                      </span>
                      <span className="font-semibold text-foreground text-[11px] flex items-center gap-1">
                        <span>${(sig.simulatedMargin ?? 10.0).toFixed(2)}</span>
                        <span className="text-[9px] text-muted-foreground font-sans px-1 py-0 rounded bg-muted">
                          10x
                        </span>
                      </span>
                    </div>
                    <div className="pt-1.5 border-t border-border/40">
                      <span className="text-[10px] text-muted-foreground block font-sans">
                        Position Size
                      </span>
                      <span
                        className="font-semibold text-foreground text-[11px] truncate block"
                        title={
                          sig.positionAmount
                            ? `${sig.positionAmount} ${sig.symbol.replace("USDT", "")} (~$${((sig.simulatedMargin ?? 10.0) * 10).toFixed(0)})`
                            : undefined
                        }
                      >
                        {sig.positionAmount
                          ? `${sig.positionAmount < 0.01 ? sig.positionAmount.toFixed(4) : sig.positionAmount.toFixed(2)} ${sig.symbol.replace("USDT", "")}`
                          : sig.entryPrice
                            ? `${(((sig.simulatedMargin ?? 10.0) * 10) / sig.entryPrice).toFixed(3)} ${sig.symbol.replace("USDT", "")}`
                            : `~$${((sig.simulatedMargin ?? 10.0) * 10).toFixed(0)}`}
                      </span>
                    </div>
                  </div>

                  {/* Target Levels: TP1, TP2, TP3 & SL (Structured 2x2 Grid) */}
                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 space-y-2 text-xs font-mono">
                    <span className="text-[10px] text-muted-foreground block font-sans font-medium uppercase tracking-wider">
                      Targets (TP & SL)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {/* TP1 */}
                      {sig.tp1 && (
                        <div
                          className={`relative flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition-all w-full ${
                            isTp1Hit
                              ? "bg-emerald-500/20 border border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/30"
                              : "bg-emerald-500/10 border border-emerald-500/20"
                          }`}
                        >
                          {isTp1Hit && (
                            <span
                              className="absolute -top-1.5 -right-1.5 size-3.5 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xs ring-1 ring-card"
                              title="TP1 Reached"
                            >
                              <CheckIcon className="size-2.5 stroke-[3]" />
                            </span>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold ${
                                isTp1Hit
                                  ? "text-emerald-500"
                                  : "text-emerald-600"
                              }`}
                            >
                              TP1
                            </span>
                            <span className="font-semibold text-foreground">
                              ${formatCryptoPrice(sig.tp1)}
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-600 font-bold shrink-0">
                            +
                            {isLong
                              ? (
                                  ((sig.tp1 - sig.entryPrice) /
                                    sig.entryPrice) *
                                  100
                                ).toFixed(1)
                              : (
                                  ((sig.entryPrice - sig.tp1) /
                                    sig.entryPrice) *
                                  100
                                ).toFixed(1)}
                            %
                          </span>
                        </div>
                      )}

                      {/* TP2 */}
                      {sig.tp2 && (
                        <div
                          className={`relative flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition-all w-full ${
                            isTp2Hit
                              ? "bg-teal-500/20 border border-teal-500/50 shadow-xs ring-1 ring-teal-500/30"
                              : "bg-teal-500/10 border border-teal-500/20"
                          }`}
                        >
                          {isTp2Hit && (
                            <span
                              className="absolute -top-1.5 -right-1.5 size-3.5 bg-teal-600 text-white rounded-full flex items-center justify-center shadow-xs ring-1 ring-card"
                              title="TP2 Reached"
                            >
                              <CheckIcon className="size-2.5 stroke-[3]" />
                            </span>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold ${
                                isTp2Hit ? "text-teal-500" : "text-teal-600"
                              }`}
                            >
                              TP2
                            </span>
                            <span className="font-semibold text-foreground">
                              ${formatCryptoPrice(sig.tp2)}
                            </span>
                          </div>
                          <span className="text-[10px] text-teal-600 font-bold shrink-0">
                            +
                            {isLong
                              ? (
                                  ((sig.tp2 - sig.entryPrice) /
                                    sig.entryPrice) *
                                  100
                                ).toFixed(1)
                              : (
                                  ((sig.entryPrice - sig.tp2) /
                                    sig.entryPrice) *
                                  100
                                ).toFixed(1)}
                            %
                          </span>
                        </div>
                      )}

                      {/* TP3 */}
                      {sig.tp3 && (
                        <div
                          className={`relative flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition-all w-full ${
                            isTp3Hit
                              ? "bg-cyan-500/20 border border-cyan-500/50 shadow-xs ring-1 ring-cyan-500/30"
                              : "bg-cyan-500/10 border border-cyan-500/20"
                          }`}
                        >
                          {isTp3Hit && (
                            <span
                              className="absolute -top-1.5 -right-1.5 size-3.5 bg-cyan-600 text-white rounded-full flex items-center justify-center shadow-xs ring-1 ring-card"
                              title="TP3 Reached"
                            >
                              <CheckIcon className="size-2.5 stroke-[3]" />
                            </span>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold ${
                                isTp3Hit ? "text-cyan-500" : "text-cyan-600"
                              }`}
                            >
                              TP3
                            </span>
                            <span className="font-semibold text-foreground">
                              ${formatCryptoPrice(sig.tp3)}
                            </span>
                          </div>
                          <span className="text-[10px] text-cyan-600 font-bold shrink-0">
                            +
                            {isLong
                              ? (
                                  ((sig.tp3 - sig.entryPrice) /
                                    sig.entryPrice) *
                                  100
                                ).toFixed(1)
                              : (
                                  ((sig.entryPrice - sig.tp3) /
                                    sig.entryPrice) *
                                  100
                                ).toFixed(1)}
                            %
                          </span>
                        </div>
                      )}

                      {/* SL */}
                      {sig.sl && (
                        <div
                          className={`relative flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition-all w-full ${
                            isSlHit
                              ? "bg-destructive/20 border border-destructive/50 shadow-xs ring-1 ring-destructive/30"
                              : "bg-destructive/10 border border-destructive/20"
                          }`}
                        >
                          {isSlHit && (
                            <span
                              className="absolute -top-1.5 -right-1.5 size-3.5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-xs ring-1 ring-card"
                              title="SL Triggered"
                            >
                              <XIcon className="size-2.5 stroke-[3]" />
                            </span>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-destructive">
                              SL
                            </span>
                            <span className="font-semibold text-destructive">
                              ${formatCryptoPrice(sig.sl)}
                            </span>
                          </div>
                          <span className="text-[10px] text-destructive font-bold shrink-0">
                            -
                            {isLong
                              ? Math.abs(
                                  ((sig.entryPrice - sig.sl) / sig.entryPrice) *
                                    100,
                                ).toFixed(1)
                              : Math.abs(
                                  ((sig.sl - sig.entryPrice) / sig.entryPrice) *
                                    100,
                                ).toFixed(1)}
                            %
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Strategy, PnL & Time */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                    <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground truncate max-w-[140px]">
                      {sig.strategy}
                    </span>

                    <div className="flex items-center gap-2">
                      {typeof displayProfitPct === "number" &&
                        (() => {
                          const margin = sig.simulatedMargin ?? 10.0;
                          // Jika sinyal sudah selesai (CLOSED/TP/SL), gunakan nilai riil dari DB (sig.realizedPnlUsd)
                          // Jika masih RUNNING/ACTIVE, selalu hitung floating PnL dinamis dari displayProfitPct live
                          const pnlUsd =
                            !isRunning &&
                            typeof sig.realizedPnlUsd === "number" &&
                            sig.realizedPnlUsd !== 0
                              ? sig.realizedPnlUsd
                              : (margin * displayProfitPct) / 100;
                          const isUsdPositive = pnlUsd >= 0;

                          // Tampilkan 2 desimal jika >= $0.01, atau 3 desimal jika sangat kecil agar tidak tampak $0.00
                          const formattedPnlUsd =
                            Math.abs(pnlUsd) > 0 && Math.abs(pnlUsd) < 0.01
                              ? pnlUsd.toFixed(3)
                              : pnlUsd.toFixed(2);

                          return (
                            <span
                              className={`font-mono font-bold text-xs flex items-center gap-1 ${
                                isProfitPositive
                                  ? "text-emerald-500"
                                  : "text-rose-500"
                              }`}
                              title={`Simulated from $${margin.toFixed(2)} margin (1% risk on $1,000 capital): ${isUsdPositive ? "+" : ""}$${formattedPnlUsd}`}
                            >
                              <span>
                                {isProfitPositive ? "+" : ""}
                                {displayProfitPct.toFixed(2)}%
                              </span>
                              <span className="text-[10px] font-semibold opacity-90">
                                ({isUsdPositive ? "+" : ""}${formattedPnlUsd})
                              </span>
                            </span>
                          );
                        })()}

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
      <footer className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground space-y-1 bg-card">
        <div>CryptoSpike • Realtime Algorithmic Trading Signals</div>
        <div className="text-[11px] text-muted-foreground/70">
          Disclaimer: Signals provided for technical research and market
          analysis only.
        </div>
      </footer>
    </div>
  );
}
