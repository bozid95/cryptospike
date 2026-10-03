import { useState, useMemo } from "react";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  RadioIcon,
  SearchIcon,
  Trash2Icon,
  TargetIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CheckCircle2Icon,
  ShieldAlertIcon,
  ZapIcon,
} from "lucide-react";

import { useCryptoSpike } from "@/mock/mock-context";
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

export function SignalsCrud() {
  const { signals, updateSignalStatus, deleteSignal } = useCryptoSpike();
  const [filter, setFilter] = useState<"ALL" | "RUNNING" | "CLOSED">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Scanner & Signals Summary Metrics
  const summary = useMemo(() => {
    let longCount = 0;
    let shortCount = 0;
    let runningCount = 0;
    let tp1Count = 0;
    let tp2Count = 0;
    let tp3Count = 0;
    let slCount = 0;
    let totalRealizedProfitPct = 0;

    for (const sig of signals) {
      if (sig.side === "LONG") longCount++;
      else shortCount++;

      if (sig.status === "ACTIVE") {
        runningCount++;
      } else if (sig.status === "TP1_HIT") {
        tp1Count++;
        totalRealizedProfitPct += sig.profitPct ?? 0;
      } else if (sig.status === "TP2_HIT") {
        tp2Count++;
        totalRealizedProfitPct += sig.profitPct ?? 0;
      } else if (sig.status === "TP3_HIT") {
        tp3Count++;
        totalRealizedProfitPct += sig.profitPct ?? 0;
      } else if (sig.status === "SL_HIT") {
        slCount++;
        totalRealizedProfitPct += sig.profitPct ?? 0;
      }
    }

    const totalTpHits = tp1Count + tp2Count + tp3Count;
    const closedCount = totalTpHits + slCount;
    const winrate =
      closedCount > 0 ? ((totalTpHits / closedCount) * 100).toFixed(1) : "100.0";

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
      avgProfitPct: closedCount > 0 ? (totalRealizedProfitPct / closedCount).toFixed(2) : "0.00",
    };
  }, [signals]);

  const runningSignals = signals.filter((s) => s.status === "ACTIVE");
  const closedSignals = signals.filter((s) => s.status !== "ACTIVE");

  const filteredSignals = useMemo(() => {
    return signals.filter((sig) => {
      // 1. Filter status segment
      if (filter === "RUNNING" && sig.status !== "ACTIVE") return false;
      if (filter === "CLOSED" && sig.status === "ACTIVE") return false;

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
    status: "TP1_HIT" | "SL_HIT",
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
        {/* Card 1: Total Sinyal & Scanner Output */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">
                Total Sinyal Terdeteksi
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
                Winrate Target (TP1+)
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
                Distribusi Target TP
              </span>
              <div className="text-xl font-bold font-mono text-foreground flex items-center gap-1.5">
                <span>{summary.totalTpHits}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Target Hit
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
                Rasio Arah Sinyal
              </span>
              <div className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
                <span className="text-emerald-500">{summary.longCount}L</span>
                <span className="text-muted-foreground text-sm font-normal">/</span>
                <span className="text-rose-500">{summary.shortCount}S</span>
              </div>
              <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 pt-0.5">
                <span className="text-emerald-500 flex items-center gap-0.5">
                  <TrendingUpIcon className="size-3" />
                  {((summary.longCount / Math.max(summary.totalSignals, 1)) * 100).toFixed(0)}% Long
                </span>
                <span>•</span>
                <span className="text-rose-500 flex items-center gap-0.5">
                  <TrendingDownIcon className="size-3" />
                  {((summary.shortCount / Math.max(summary.totalSignals, 1)) * 100).toFixed(0)}% Short
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
              Pantau posisi aktif (Running/Open) vs riwayat sinyal selesai
              (Closed) beserta perolehan Profit/Loss.
            </CardDescription>
          </div>

          {/* Filter Segmented Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg border bg-muted text-xs shrink-0">
            <button
              onClick={() => {
                setFilter("ALL");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                filter === "ALL"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semua ({signals.length})
            </button>
            <button
              onClick={() => {
                setFilter("RUNNING");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                filter === "RUNNING"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Running ({runningSignals.length})
            </button>
            <button
              onClick={() => {
                setFilter("CLOSED");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                filter === "CLOSED"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Closed / Selesai ({closedSignals.length})
            </button>
          </div>
        </CardHeader>

        {/* Search & Tool Bar with Solid Background */}
        <div className="px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 border-b bg-muted/50">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari pair, strategi, atau arah..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 pl-8 text-xs bg-background"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-muted-foreground font-mono">
            <span>Menampilkan</span>
            <span className="font-semibold text-foreground">
              {totalItems > 0 ? startIndex + 1 : 0}-{endIndex}
            </span>
            <span>dari</span>
            <span className="font-semibold text-foreground">{totalItems}</span>
            <span>sinyal</span>
          </div>
        </div>

        <CardContent className="p-6 pt-4 space-y-4">
          <div className="rounded-md border overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60 border-b">
                  <TableHead className="w-[140px] px-4 py-3 font-semibold text-xs">
                    Pair & Arah
                  </TableHead>
                  <TableHead className="w-[160px] px-4 py-3 font-semibold text-xs">
                    Entry / Current Price
                  </TableHead>
                  <TableHead className="w-[200px] px-4 py-3 font-semibold text-xs">
                    Targets (TP & SL)
                  </TableHead>
                  <TableHead className="w-[130px] px-4 py-3 font-semibold text-xs">
                    Status Posisi
                  </TableHead>
                  <TableHead className="w-[150px] px-4 py-3 font-semibold text-xs">
                    Profit / Loss (PnL)
                  </TableHead>
                  <TableHead className="w-[160px] px-4 py-3 font-semibold text-xs">
                    Strategi Source
                  </TableHead>
                  <TableHead className="w-[160px] px-4 py-3 text-right font-semibold text-xs">
                    Aksi Monitor
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSignals.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-32 text-center text-muted-foreground text-sm"
                    >
                      Tidak ada sinyal yang sesuai kriteria filter.
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
                              $
                              {sig.entryPrice.toLocaleString(undefined, {
                                minimumFractionDigits:
                                  sig.entryPrice < 10 ? 4 : 2,
                                maximumFractionDigits: 4,
                              })}
                            </span>
                          </div>
                          {sig.currentPrice && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1 leading-tight">
                              <span className="font-sans font-medium text-muted-foreground/75">
                                Last
                              </span>
                              <span className="font-medium text-foreground/85">
                                $
                                {sig.currentPrice.toLocaleString(undefined, {
                                  minimumFractionDigits:
                                    sig.currentPrice < 10 ? 4 : 2,
                                  maximumFractionDigits: 4,
                                })}
                              </span>
                            </div>
                          )}
                        </TableCell>

                        {/* 3. Target TP / SL dengan % Potensi */}
                        <TableCell className="align-middle py-3.5 font-mono text-xs tabular-nums">
                          <div className="flex items-center gap-2 text-emerald-600 font-medium leading-tight">
                            <span className="text-[11px] text-muted-foreground/75 font-sans font-medium w-6">
                              TP1
                            </span>
                            <span>
                              $
                              {sig.tp1.toLocaleString(undefined, {
                                minimumFractionDigits: sig.tp1 < 10 ? 4 : 2,
                                maximumFractionDigits: 4,
                              })}
                            </span>
                            <span className="font-semibold text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 leading-none">
                              {isLong
                                ? `+${(((sig.tp1 - sig.entryPrice) / sig.entryPrice) * 100).toFixed(2)}%`
                                : `+${(((sig.entryPrice - sig.tp1) / sig.entryPrice) * 100).toFixed(2)}%`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-destructive font-medium mt-1.5 leading-tight">
                            <span className="text-[11px] text-muted-foreground/75 font-sans font-medium w-6">
                              SL
                            </span>
                            <span>
                              $
                              {sig.sl.toLocaleString(undefined, {
                                minimumFractionDigits: sig.sl < 10 ? 4 : 2,
                                maximumFractionDigits: 4,
                              })}
                            </span>
                            <span className="font-semibold text-[10px] bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20 leading-none">
                              {isLong
                                ? `-${(((sig.entryPrice - sig.sl) / sig.entryPrice) * 100).toFixed(2)}%`
                                : `-${(((sig.sl - sig.entryPrice) / sig.entryPrice) * 100).toFixed(2)}%`}
                            </span>
                          </div>
                        </TableCell>

                        {/* 4. Execution State (RUNNING vs CLOSED) */}
                        <TableCell className="align-middle py-3.5">
                          {isRunning ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 font-mono text-[11px] font-semibold leading-none">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              RUNNING
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border bg-muted/80 text-muted-foreground font-mono text-[11px] font-medium leading-none">
                              CLOSED ({sig.status})
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

                        {/* 7. Action / Simulasi Close */}
                        <TableCell className="align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isRunning && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-emerald-600 hover:bg-emerald-50 font-medium px-2"
                                  onClick={() =>
                                    handleStatusUpdate(
                                      sig.id,
                                      "TP1_HIT",
                                      parseFloat(
                                        (
                                          (Math.abs(sig.tp1 - sig.entryPrice) /
                                            sig.entryPrice) *
                                          100
                                        ).toFixed(2),
                                      ),
                                    )
                                  }
                                  title="Simulasi Hit TP1"
                                >
                                  Hit TP1
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-destructive hover:bg-destructive/10 font-medium px-2"
                                  onClick={() =>
                                    handleStatusUpdate(
                                      sig.id,
                                      "SL_HIT",
                                      -parseFloat(
                                        (
                                          (Math.abs(sig.entryPrice - sig.sl) /
                                            sig.entryPrice) *
                                          100
                                        ).toFixed(2),
                                      ),
                                    )
                                  }
                                  title="Simulasi Hit SL"
                                >
                                  Hit SL
                                </Button>
                              </>
                            )}

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Hapus Sinyal"
                                >
                                  <Trash2Icon className="size-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Hapus Sinyal Ini?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus sinyal{" "}
                                    <span className="font-semibold text-foreground">
                                      {sig.symbol} ({sig.side})
                                    </span>{" "}
                                    dari log database?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDelete(sig.id)}
                                  >
                                    Ya, Hapus Sinyal
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Standard Pagination Bar with Solid Background & Clear Padding */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 rounded-lg border bg-muted/50 mt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                Baris per halaman:
              </span>
              <Select
                value={`${pageSize}`}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[76px] text-xs bg-background font-semibold">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent side="top" className="bg-popover">
                  {[5, 10, 20, 50].map((size) => (
                    <SelectItem
                      key={size}
                      value={`${size}`}
                      className="text-xs"
                    >
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground font-medium">
                Halaman{" "}
                <span className="text-foreground font-semibold font-mono">
                  {validCurrentPage}
                </span>{" "}
                dari{" "}
                <span className="text-foreground font-semibold font-mono">
                  {totalPages}
                </span>
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 bg-background hover:bg-muted"
                  onClick={() => setCurrentPage(1)}
                  disabled={validCurrentPage <= 1}
                  title="Halaman Pertama"
                >
                  <ChevronsLeftIcon className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 bg-background hover:bg-muted"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validCurrentPage <= 1}
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 bg-background hover:bg-muted"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={validCurrentPage >= totalPages}
                  title="Halaman Berikutnya"
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 bg-background hover:bg-muted"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={validCurrentPage >= totalPages}
                  title="Halaman Terakhir"
                >
                  <ChevronsRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
