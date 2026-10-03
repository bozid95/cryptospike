import { useState, useMemo } from "react";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  RadioIcon,
  Trash2Icon,
  TargetIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CheckCircle2Icon,
  ShieldAlertIcon,
  ZapIcon,
  ClockIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  PlayIcon,
} from "lucide-react";

import { useCryptoSpike } from "@/context/trading-context";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableToolbar } from "@/components/ui/table-toolbar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Helper presisi desimal maksimal sesuai standar Binance (hingga 8 angka di belakang koma untuk coin micin/sats)
function formatCryptoPrice(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0.00";
  if (val === 0) return "0.00";

  // Jika harga di bawah $0.0001 (seperti SHIB, PEPE, dll) tampilkan hingga 8 digit
  if (val < 0.0001) {
    return val.toLocaleString("en-US", {
      minimumFractionDigits: 6,
      maximumFractionDigits: 8,
    });
  }
  // Jika harga di bawah $1 (seperti DOGE, ADA, XRP) tampilkan hingga 6 digit
  if (val < 1) {
    return val.toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    });
  }
  // Jika harga di bawah $100 tampilkan hingga 4 digit
  if (val < 100) {
    return val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  // Untuk aset besar (BTC, ETH, BNB > $100) tampilkan 2 digit
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function SignalsCrud() {
  const { signals, updateSignalStatus, deleteSignal, isAuthenticated } =
    useCryptoSpike();
  const [filter, setFilter] = useState<"ALL" | "RUNNING" | "CLOSED">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Scanner & Signals Summary Metrics
  const summary = useMemo(() => {
    let longCount = 0;
    let shortCount = 0;
    let runningCount = 0;
    let closedCount = 0;
    let tp1Count = 0;
    let tp2Count = 0;
    let tp3Count = 0;
    let slCount = 0;
    let totalRealizedProfitPct = 0;

    for (const sig of signals) {
      if (sig.side === "LONG") longCount++;
      else shortCount++;

      const isClosed =
        sig.status === "TP3_HIT" ||
        sig.status === "SL_HIT" ||
        sig.status === "TSL_HIT" ||
        (sig.status as string) === "CLOSED" ||
        sig.status === "CANCELLED";

      if (!isClosed) {
        runningCount++;
      } else {
        closedCount++;
      }

      // Hitung TP hits & Winrate (termasuk yang masih running tapi sudah menyentuh TP1/TP2)
      if (sig.status === "TP1_HIT") {
        tp1Count++;
        totalRealizedProfitPct += sig.profitPct ?? 0;
      } else if (sig.status === "TP2_HIT") {
        tp2Count++;
        totalRealizedProfitPct += sig.profitPct ?? 0;
      } else if (sig.status === "TP3_HIT") {
        tp3Count++;
        totalRealizedProfitPct += sig.profitPct ?? 0;
      } else if (sig.status === "TSL_HIT") {
        tp1Count++;
        totalRealizedProfitPct += sig.profitPct ?? 0;
      } else if (sig.status === "SL_HIT") {
        slCount++;
        totalRealizedProfitPct += sig.profitPct ?? 0;
      }
    }

    const totalTpHits = tp1Count + tp2Count + tp3Count;
    const evaluatedCount = totalTpHits + slCount;
    const winrate =
      evaluatedCount > 0
        ? ((totalTpHits / evaluatedCount) * 100).toFixed(1)
        : "0.0";

    return {
      totalSignals: signals.length,
      longCount,
      shortCount,
      runningCount,
      closedCount,
      totalTpHits,
      tp1Count,
      tp2Count,
      tp3Count,
      slCount,
      winrate,
      avgProfitPct:
        evaluatedCount > 0
          ? (totalRealizedProfitPct / evaluatedCount).toFixed(2)
          : "0.00",
    };
  }, [signals]);

  const runningSignals = signals.filter(
    (s) =>
      s.status === "ACTIVE" || s.status === "TP1_HIT" || s.status === "TP2_HIT",
  );
  const closedSignals = signals.filter(
    (s) =>
      s.status !== "ACTIVE" && s.status !== "TP1_HIT" && s.status !== "TP2_HIT",
  );

  const filteredSignals = useMemo(() => {
    return signals.filter((sig) => {
      const isSignalRunning =
        sig.status === "ACTIVE" ||
        sig.status === "TP1_HIT" ||
        sig.status === "TP2_HIT";

      // 1. Filter status segment
      if (filter === "RUNNING" && !isSignalRunning) return false;
      if (filter === "CLOSED" && isSignalRunning) return false;

      // 2. Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchSymbol = sig.symbol.toLowerCase().includes(query);
        const matchStrategy = sig.strategy.toLowerCase().includes(query);
        const matchSide = sig.side.toLowerCase().includes(query);
        if (!matchSymbol && !matchStrategy && !matchSide) return false;
      }
      return true;
    });
  }, [signals, filter, searchTerm]);

  // Pagination calculation
  const totalItems = filteredSignals.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedSignals = filteredSignals.slice(startIndex, endIndex);

  const handleStatusUpdate = (
    id: string,
    status:
      | "ACTIVE"
      | "TP1_HIT"
      | "TP2_HIT"
      | "TP3_HIT"
      | "TSL_HIT"
      | "SL_HIT"
      | "CANCELLED",
    profit: number,
  ) => {
    updateSignalStatus(id, status, profit);
  };

  const handleDelete = (id: string) => {
    deleteSignal(id);
  };

  return (
    <div className="space-y-4">
      {/* 4 Standalone Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Signals & Scanner Output */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">
                Total Signals Detected
              </span>
              <div className="text-xl font-bold font-mono text-foreground">
                {summary.totalSignals}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                <span className="text-emerald-500 font-semibold font-mono">
                  {summary.runningCount} Active
                </span>
                <span>•</span>
                <span className="text-muted-foreground font-mono">
                  {summary.closedCount} Closed
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-500">
              <RadioIcon className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Winrate & Target Hit */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">
                Target Winrate (TP1+)
              </span>
              <div className="text-xl font-bold font-mono text-emerald-500">
                {summary.winrate}%
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                <span className="text-emerald-500 font-semibold font-mono">
                  {summary.totalTpHits} TP Hit
                </span>
                <span>•</span>
                <span className="text-rose-500 font-semibold font-mono">
                  {summary.slCount} SL Hit
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-500">
              <TargetIcon className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Rincian Target TP1 / TP2 / TP3 */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">
                TP Target Breakdown
              </span>
              <div className="text-xl font-bold font-mono text-foreground flex items-center gap-1.5">
                <span>{summary.totalTpHits}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Targets Hit
                </span>
              </div>
              <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 pt-0.5">
                <span className="text-emerald-600 font-medium">
                  TP1: {summary.tp1Count}
                </span>
                <span>•</span>
                <span className="text-teal-600 font-medium">
                  TP2: {summary.tp2Count}
                </span>
                <span>•</span>
                <span className="text-cyan-600 font-medium">
                  TP3: {summary.tp3Count}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-full bg-blue-500/10 text-blue-500">
              <CheckCircle2Icon className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Long vs Short Ratio */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">
                Signal Direction Ratio
              </span>
              <div className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
                <span className="text-emerald-500">{summary.longCount}L</span>
                <span className="text-muted-foreground text-sm font-normal">
                  /
                </span>
                <span className="text-rose-500">{summary.shortCount}S</span>
              </div>
              <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 pt-0.5">
                <span className="text-emerald-500 flex items-center gap-0.5">
                  <TrendingUpIcon className="size-3" />
                  {(
                    (summary.longCount / Math.max(summary.totalSignals, 1)) *
                    100
                  ).toFixed(0)}
                  % Long
                </span>
                <span>•</span>
                <span className="text-rose-500 flex items-center gap-0.5">
                  <TrendingDownIcon className="size-3" />
                  {(
                    (summary.shortCount / Math.max(summary.totalSignals, 1)) *
                    100
                  ).toFixed(0)}
                  % Short
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-full bg-indigo-500/10 text-indigo-500">
              <ZapIcon className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-xs">
        <CardHeader className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <RadioIcon className="size-5 text-emerald-500" />
              Live Signals & Realized PnL Tracker
            </CardTitle>
            <CardDescription className="text-xs">
              Monitor active running signals vs closed signal history with
              realized Profit/Loss tracking.
            </CardDescription>
          </div>
        </CardHeader>

        {/* Sub-Navigation & Filter Bar via TableToolbar */}
        <TableToolbar<"ALL" | "RUNNING" | "CLOSED">
          tabs={[
            {
              id: "ALL",
              label: "All",
              count: signals.length,
            },
            {
              id: "RUNNING",
              label: "Running",
              count: runningSignals.length,
              badge: (
                <span className="relative flex h-2 w-2 ml-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              ),
            },
            {
              id: "CLOSED",
              label: "Closed / Completed",
              count: closedSignals.length,
            },
          ]}
          activeTab={filter}
          onTabChange={(tabId) => {
            setFilter(tabId);
            setCurrentPage(1);
          }}
          searchTerm={searchTerm}
          onSearchChange={(val) => {
            setSearchTerm(val);
            setCurrentPage(1);
          }}
          searchPlaceholder="Search pair, strategy, or side..."
          rightActions={
            <>
              <span>Showing</span>
              <span className="font-semibold text-foreground">
                {totalItems > 0 ? startIndex + 1 : 0}-{endIndex}
              </span>
              <span>of</span>
              <span className="font-semibold text-foreground">
                {totalItems}
              </span>
              <span>signals</span>
            </>
          }
        />

        <CardContent className="p-3.5 sm:p-6 pt-3 sm:pt-4 space-y-4">
          {/* 1. Mobile Cards View (Visible on Mobile only) */}
          <div className="block md:hidden space-y-3">
            {paginatedSignals.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm border rounded-xl bg-card">
                No signals matching current filter criteria.
              </div>
            ) : (
              paginatedSignals.map((sig) => {
                const isLong = sig.side === "LONG";
                const isRunning = sig.status === "ACTIVE";
                const isProfit = (sig.profitPct ?? 0) >= 0;

                return (
                  <div
                    key={sig.id}
                    className={`p-3.5 rounded-xl border bg-card shadow-xs space-y-3 transition-all ${
                      isRunning
                        ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                        : "border-border"
                    }`}
                  >
                    {/* Header Card: Symbol, Side, Status, Time */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold font-mono text-base tracking-tight text-foreground">
                          {sig.symbol}
                        </span>
                        <Badge
                          variant={isLong ? "default" : "destructive"}
                          className="text-[10px] font-mono px-1.5 py-0 font-semibold"
                        >
                          {sig.side}
                        </Badge>
                        {sig.strength === "STRONG" && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 border-amber-500/30 text-amber-500 font-mono"
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

                    {/* Pricing Grid (Entry & Current) */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono p-2.5 rounded-lg bg-muted/40 border border-border/50">
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-sans">
                          Entry Price
                        </span>
                        <span className="font-semibold text-foreground text-xs">
                          ${formatCryptoPrice(sig.entryPrice)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-sans">
                          Current Price
                        </span>
                        <span
                          className={`font-semibold text-xs ${
                            isProfit ? "text-emerald-500" : "text-rose-500"
                          }`}
                        >
                          {sig.currentPrice
                            ? `$${formatCryptoPrice(sig.currentPrice)}`
                            : "-"}
                        </span>
                      </div>
                    </div>

                    {/* Target Levels (TP1, TP2, TP3 & SL) */}
                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40 space-y-1.5 text-xs font-mono">
                      <span className="text-[10px] text-muted-foreground block font-sans font-medium">
                        Target Levels (TP1, TP2, TP3 & SL)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {/* TP1 */}
                        {sig.tp1 && (
                          <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[11px]">
                            <span className="text-[10px] font-bold text-emerald-600">
                              TP1
                            </span>
                            <span className="font-semibold text-foreground">
                              ${formatCryptoPrice(sig.tp1)}
                            </span>
                            <span className="text-[10px] text-emerald-600">
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
                          <div className="flex items-center gap-1 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded text-[11px]">
                            <span className="text-[10px] font-bold text-teal-600">
                              TP2
                            </span>
                            <span className="font-semibold text-foreground">
                              ${formatCryptoPrice(sig.tp2)}
                            </span>
                            <span className="text-[10px] text-teal-600">
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
                          <div className="flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded text-[11px]">
                            <span className="text-[10px] font-bold text-cyan-600">
                              TP3
                            </span>
                            <span className="font-semibold text-foreground">
                              ${formatCryptoPrice(sig.tp3)}
                            </span>
                            <span className="text-[10px] text-cyan-600">
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
                          <div className="flex items-center gap-1 bg-destructive/10 border border-destructive/20 px-1.5 py-0.5 rounded text-[11px]">
                            <span className="text-[10px] font-bold text-destructive">
                              SL
                            </span>
                            <span className="font-semibold text-destructive">
                              ${formatCryptoPrice(sig.sl)}
                            </span>
                            <span className="text-[10px] text-destructive">
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

                    {/* Strategy & PnL Bar */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="font-mono text-[11px] font-medium text-foreground/80 truncate max-w-[170px]">
                          {sig.strategy}
                        </span>
                      </div>

                      {typeof sig.profitPct === "number" && (
                        <div className="flex items-center gap-1 font-mono font-bold text-xs">
                          <span
                            className={
                              isProfit ? "text-emerald-600" : "text-rose-600"
                            }
                          >
                            {isProfit ? "+" : ""}
                            {sig.profitPct.toFixed(2)}%
                          </span>
                          <span className="text-[10px] text-muted-foreground font-sans font-normal">
                            ({isRunning ? "Floating" : "Closed"})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                        <ClockIcon className="size-3 text-muted-foreground/60" />
                        {new Date(
                          sig.createdAt || sig.sentAt,
                        ).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {isAuthenticated && (
                        <div className="flex items-center gap-1.5">
                          {isRunning && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs font-semibold px-2.5 gap-1 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                              onClick={() => {
                                const currentPnL = sig.profitPct ?? 0;
                                handleStatusUpdate(
                                  sig.id,
                                  currentPnL >= 0 ? "TP1_HIT" : "SL_HIT",
                                  currentPnL,
                                );
                              }}
                            >
                              Close Position
                            </Button>
                          )}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
                              >
                                <Trash2Icon className="size-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Signal?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Delete {sig.symbol} ({sig.side}) from
                                  database?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground"
                                  onClick={() => handleDelete(sig.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 2. Desktop Table View (Visible on Tablet/Desktop only) */}
          <div className="hidden md:block rounded-md border overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60 border-b">
                  <TableHead className="w-[140px] px-4 py-3 font-semibold text-xs">
                    Pair & Side
                  </TableHead>
                  <TableHead className="w-[160px] px-4 py-3 font-semibold text-xs">
                    Entry / Current Price
                  </TableHead>
                  <TableHead className="w-[200px] px-4 py-3 font-semibold text-xs">
                    Targets (TP & SL)
                  </TableHead>
                  <TableHead className="w-[130px] px-4 py-3 font-semibold text-xs">
                    Position Status
                  </TableHead>
                  <TableHead className="w-[150px] px-4 py-3 font-semibold text-xs">
                    Profit / Loss (PnL)
                  </TableHead>
                  <TableHead className="w-[150px] px-4 py-3 font-semibold text-xs">
                    Strategy Source
                  </TableHead>
                  <TableHead className="w-[165px] px-4 py-3 font-semibold text-xs">
                    Time (Created & Updated)
                  </TableHead>
                  {isAuthenticated && (
                    <TableHead className="w-[140px] px-4 py-3 text-right font-semibold text-xs">
                      Monitor Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSignals.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAuthenticated ? 8 : 7}
                      className="h-32 text-center text-muted-foreground text-sm"
                    >
                      No signals matching current filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSignals.map((sig) => {
                    const isLong = sig.side === "LONG";
                    const isRunning = sig.status === "ACTIVE";
                    const isProfit = (sig.profitPct ?? 0) >= 0;

                    return (
                      <TableRow
                        key={sig.id}
                        className="bg-card hover:bg-muted/40"
                      >
                        {/* 1. Pair & Side */}
                        <TableCell className="align-middle py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-sm tracking-tight text-foreground">
                              {sig.symbol}
                            </span>
                            <Badge
                              variant={isLong ? "default" : "destructive"}
                              className="text-[10px] font-mono px-1.5 py-0 font-semibold leading-normal"
                            >
                              {sig.side}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground/80 font-mono mt-1 tracking-tight">
                            ID: {sig.id}
                          </div>
                        </TableCell>

                        {/* 2. Entry & Current Price */}
                        <TableCell className="align-middle py-3.5 font-mono text-xs tabular-nums">
                          <div className="flex items-center gap-1.5 leading-tight">
                            <span className="text-[11px] text-muted-foreground/75 font-sans font-medium">
                              Entry
                            </span>
                            <span className="font-semibold text-foreground">
                              ${formatCryptoPrice(sig.entryPrice)}
                            </span>
                          </div>
                          {sig.currentPrice ? (
                            <div className="flex items-center gap-1.5 text-[11px] mt-1 leading-tight">
                              <span className="font-sans font-medium text-muted-foreground/75 flex items-center gap-1">
                                {isRunning && (
                                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                )}
                                Last
                              </span>
                              <span
                                className={`font-semibold ${
                                  isRunning
                                    ? isProfit
                                      ? "text-emerald-500"
                                      : "text-rose-500"
                                    : "text-foreground/85"
                                }`}
                              >
                                ${formatCryptoPrice(sig.currentPrice)}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-muted-foreground/60 mt-1 leading-tight font-sans">
                              Tracking...
                            </div>
                          )}
                        </TableCell>

                        {/* 3. Target TP1, TP2, TP3 & SL dengan % Terhadap Entry Point */}
                        <TableCell className="align-middle py-3.5 font-mono text-xs tabular-nums">
                          <div className="space-y-1">
                            {/* TP1 */}
                            <div className="flex items-center gap-1.5 text-emerald-600 font-medium leading-tight">
                              <span className="text-[10px] text-muted-foreground font-sans font-semibold w-7">
                                TP1
                              </span>
                              <span>${formatCryptoPrice(sig.tp1)}</span>
                              <span className="font-bold text-[10px] bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20 leading-none">
                                {isLong
                                  ? `+${(((sig.tp1 - sig.entryPrice) / sig.entryPrice) * 100).toFixed(2)}%`
                                  : `+${(((sig.entryPrice - sig.tp1) / sig.entryPrice) * 100).toFixed(2)}%`}
                              </span>
                            </div>

                            {/* TP2 */}
                            {sig.tp2 && (
                              <div className="flex items-center gap-1.5 text-teal-600 font-medium leading-tight">
                                <span className="text-[10px] text-muted-foreground font-sans font-semibold w-7">
                                  TP2
                                </span>
                                <span>${formatCryptoPrice(sig.tp2)}</span>
                                <span className="font-bold text-[10px] bg-teal-500/10 px-1 py-0.5 rounded border border-teal-500/20 leading-none">
                                  {isLong
                                    ? `+${(((sig.tp2 - sig.entryPrice) / sig.entryPrice) * 100).toFixed(2)}%`
                                    : `+${(((sig.entryPrice - sig.tp2) / sig.entryPrice) * 100).toFixed(2)}%`}
                                </span>
                              </div>
                            )}

                            {/* TP3 */}
                            {sig.tp3 && (
                              <div className="flex items-center gap-1.5 text-cyan-600 font-medium leading-tight">
                                <span className="text-[10px] text-muted-foreground font-sans font-semibold w-7">
                                  TP3
                                </span>
                                <span>${formatCryptoPrice(sig.tp3)}</span>
                                <span className="font-bold text-[10px] bg-cyan-500/10 px-1 py-0.5 rounded border border-cyan-500/20 leading-none">
                                  {isLong
                                    ? `+${(((sig.tp3 - sig.entryPrice) / sig.entryPrice) * 100).toFixed(2)}%`
                                    : `+${(((sig.entryPrice - sig.tp3) / sig.entryPrice) * 100).toFixed(2)}%`}
                                </span>
                              </div>
                            )}

                            {/* Stop Loss */}
                            <div className="flex items-center gap-1.5 text-destructive font-medium leading-tight pt-0.5">
                              <span className="text-[10px] text-muted-foreground font-sans font-semibold w-7">
                                SL
                              </span>
                              <span>${formatCryptoPrice(sig.sl)}</span>
                              <span className="font-bold text-[10px] bg-destructive/10 px-1 py-0.5 rounded border border-destructive/20 leading-none">
                                {isLong
                                  ? `-${Math.abs(((sig.entryPrice - sig.sl) / sig.entryPrice) * 100).toFixed(2)}%`
                                  : `-${Math.abs(((sig.sl - sig.entryPrice) / sig.entryPrice) * 100).toFixed(2)}%`}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* 4. Execution State (RUNNING vs CLOSED) */}
                        {/* 4. Execution State (RUNNING vs TP1_HIT / TP2_HIT / TP3_HIT / SL_HIT) */}
                        <TableCell className="align-middle py-3.5">
                          {sig.status === "ACTIVE" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 font-mono text-[11px] font-semibold leading-none">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              ACTIVE
                            </span>
                          )}
                          {sig.status === "TP1_HIT" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-600 font-mono text-[11px] font-bold leading-none">
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                              TP1 HIT ✓
                            </span>
                          )}
                          {sig.status === "TP2_HIT" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-teal-500/40 bg-teal-500/15 text-teal-600 font-mono text-[11px] font-bold leading-none">
                              <span className="size-1.5 rounded-full bg-teal-500" />
                              TP2 HIT ✓✓
                            </span>
                          )}
                          {sig.status === "TP3_HIT" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-cyan-500/40 bg-cyan-500/20 text-cyan-600 font-mono text-[11px] font-bold leading-none">
                              <span className="size-1.5 rounded-full bg-cyan-500" />
                              TP3 HIT (MAX) 🎯
                            </span>
                          )}
                          {sig.status === "TSL_HIT" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-600 font-mono text-[11px] font-medium leading-none">
                              TSL HIT (Locked Profit)
                            </span>
                          )}
                          {sig.status === "SL_HIT" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-600 font-mono text-[11px] font-medium leading-none">
                              SL HIT ✗
                            </span>
                          )}
                          {sig.status === "CANCELLED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border bg-muted/80 text-muted-foreground font-mono text-[11px] font-medium leading-none">
                              CANCELLED
                            </span>
                          )}
                        </TableCell>

                        {/* 5. Realized / Floating PnL */}
                        <TableCell className="align-middle py-3.5">
                          {typeof sig.profitPct === "number" &&
                          sig.profitPct !== null ? (
                            <div className="flex flex-col gap-0.5">
                              <div
                                className={`inline-flex items-center gap-1 font-mono font-bold text-xs tabular-nums ${
                                  isProfit
                                    ? "text-emerald-600"
                                    : "text-destructive"
                                }`}
                              >
                                {isProfit ? (
                                  <ArrowUpRightIcon className="size-3.5 shrink-0 stroke-[2.5]" />
                                ) : (
                                  <ArrowDownRightIcon className="size-3.5 shrink-0 stroke-[2.5]" />
                                )}
                                <span>
                                  {isProfit ? "+" : ""}
                                  {sig.profitPct.toFixed(2)}%
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground/80 leading-tight">
                                {isRunning
                                  ? "Floating (Open)"
                                  : "Realized (Closed)"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs font-mono">
                              -
                            </span>
                          )}
                        </TableCell>

                        {/* 6. Strategy Trigger */}
                        <TableCell className="align-middle py-3.5 font-mono text-xs text-muted-foreground">
                          <div className="font-semibold text-foreground text-xs leading-snug">
                            {sig.strategy}
                          </div>
                          <div className="text-[11px] text-muted-foreground/75 mt-0.5 leading-snug">
                            {sig.triggerSource}
                          </div>
                        </TableCell>

                        {/* 7. Waktu Dibuat & Waktu Diperbaharui */}
                        <TableCell className="align-middle py-3.5 font-mono text-xs">
                          <div className="space-y-1">
                            {/* Created At */}
                            <div className="flex items-center gap-1.5 text-muted-foreground leading-tight">
                              <span className="text-[10px] uppercase font-sans font-semibold text-muted-foreground/70 w-8">
                                Set:
                              </span>
                              <ClockIcon className="size-3 text-muted-foreground/60 shrink-0" />
                              <span className="text-foreground text-[11px] font-medium">
                                {new Date(
                                  sig.createdAt || sig.sentAt,
                                ).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                              <span className="text-[10px] text-muted-foreground/70">
                                {new Date(
                                  sig.createdAt || sig.sentAt,
                                ).toLocaleDateString("en-US")}
                              </span>
                            </div>

                            {/* Updated At */}
                            <div className="flex items-center gap-1.5 text-muted-foreground leading-tight">
                              <span className="text-[10px] uppercase font-sans font-semibold text-muted-foreground/70 w-8">
                                Mod:
                              </span>
                              <RefreshCwIcon className="size-2.5 text-primary/70 shrink-0" />
                              <span className="text-foreground text-[11px] font-medium">
                                {new Date(
                                  sig.updatedAt ||
                                    sig.hitTime ||
                                    sig.closedAt ||
                                    sig.sentAt,
                                ).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                              <span className="text-[10px] text-muted-foreground/70">
                                {new Date(
                                  sig.updatedAt ||
                                    sig.hitTime ||
                                    sig.closedAt ||
                                    sig.sentAt,
                                ).toLocaleDateString("en-US")}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* 8. Action / Simulasi Close (Hanya jika admin login) */}
                        {isAuthenticated && (
                          <TableCell className="align-middle text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isRunning && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={`h-7 text-xs font-semibold px-2.5 gap-1.5 transition-all ${
                                    (sig.profitPct ?? 0) >= 0
                                      ? "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                                      : "border-rose-500/40 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                                  }`}
                                  onClick={() => {
                                    const currentPnL = sig.profitPct ?? 0;
                                    // Tutup mengikuti floating PnL riil (jika profit dicatat TP_HIT, jika loss dicatat SL_HIT)
                                    const status =
                                      currentPnL >= 0 ? "TP1_HIT" : "SL_HIT";
                                    handleStatusUpdate(
                                      sig.id,
                                      status,
                                      currentPnL,
                                    );
                                  }}
                                  title={`Close signal at current PnL (${(sig.profitPct ?? 0) >= 0 ? "+" : ""}${(sig.profitPct ?? 0).toFixed(2)}%)`}
                                >
                                  <span>Close</span>
                                  <span className="font-mono text-[11px] font-bold">
                                    {(sig.profitPct ?? 0) >= 0 ? "+" : ""}
                                    {(sig.profitPct ?? 0).toFixed(2)}%
                                  </span>
                                </Button>
                              )}

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    title="Delete Signal"
                                  >
                                    <Trash2Icon className="size-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete This Signal?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete signal{" "}
                                      <span className="font-semibold text-foreground">
                                        {sig.symbol} ({sig.side})
                                      </span>{" "}
                                      from the database logs?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => handleDelete(sig.id)}
                                    >
                                      Yes, Delete Signal
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Standard Pagination Bar via TablePagination */}
          <TablePagination
            currentPage={validCurrentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="signals"
          />
        </CardContent>
      </Card>
    </div>
  );
}
