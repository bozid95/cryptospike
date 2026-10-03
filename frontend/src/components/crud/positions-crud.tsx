import { useState, useMemo } from "react";
import {
  BriefcaseIcon,
  RefreshCwIcon,
  SearchIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  XCircleIcon,
  ExternalLinkIcon,
  DollarSignIcon,
  LayersIcon,
  ShieldCheckIcon,
  ActivityIcon,
  HistoryIcon,
  ClockIcon,
  Trash2Icon,
} from "lucide-react";
import { useCryptoSpike } from "@/mock/mock-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableToolbar } from "@/components/ui/table-toolbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

// Helper presisi desimal maksimal sesuai Binance (hingga 8 angka di belakang koma)
function formatCryptoPrice(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0.00";
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

export function PositionsCrud() {
  const {
    positions,
    isLoadingPositions,
    refreshPositions,
    closePosition,
    closedPositions,
    clearClosedPositions,
  } = useCryptoSpike();
  const [activeTabFilter, setActiveTabFilter] = useState<"ACTIVE" | "CLOSED">(
    "ACTIVE",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [closingSymbol, setClosingSymbol] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page when switching tabs or search term
  const handleTabChange = (tab: "ACTIVE" | "CLOSED") => {
    setActiveTabFilter(tab);
    setCurrentPage(1);
  };

  // Summary Metrics Active
  const summary = useMemo(() => {
    let totalUnrealizedPnl = 0;
    let totalInitialMargin = 0;
    let totalNotional = 0;
    let longCount = 0;
    let shortCount = 0;
    let winningCount = 0;
    let losingCount = 0;

    for (const p of positions) {
      totalUnrealizedPnl += p.unRealizedProfit;
      totalInitialMargin += p.initialMargin;
      totalNotional += p.notional;
      if (p.side === "LONG") longCount++;
      else shortCount++;

      if (p.unRealizedProfit > 0) winningCount++;
      else if (p.unRealizedProfit < 0) losingCount++;
    }

    const totalRoe =
      totalInitialMargin > 0
        ? (totalUnrealizedPnl / totalInitialMargin) * 100
        : 0;

    return {
      totalPositions: positions.length,
      totalUnrealizedPnl,
      totalInitialMargin,
      totalNotional,
      totalRoe,
      longCount,
      shortCount,
      winningCount,
      losingCount,
    };
  }, [positions]);

  // Summary Metrics Closed
  const closedSummary = useMemo(() => {
    let totalRealizedPnl = 0;
    let winCount = 0;
    let lossCount = 0;

    for (const c of closedPositions) {
      totalRealizedPnl += c.realizedPnl;
      if (c.realizedPnl > 0) winCount++;
      else if (c.realizedPnl < 0) lossCount++;
    }

    const totalClosed = closedPositions.length;
    const winrate =
      totalClosed > 0 ? ((winCount / totalClosed) * 100).toFixed(1) : "0.0";

    return {
      totalClosed,
      totalRealizedPnl,
      winCount,
      lossCount,
      winrate,
    };
  }, [closedPositions]);

  const filteredPositions = useMemo(() => {
    if (!searchTerm.trim()) return positions;
    const q = searchTerm.toLowerCase();
    return positions.filter(
      (p) =>
        p.symbol.toLowerCase().includes(q) ||
        p.side.toLowerCase().includes(q) ||
        (p.strategy && p.strategy.toLowerCase().includes(q)) ||
        p.marginType.toLowerCase().includes(q),
    );
  }, [positions, searchTerm]);

  const filteredClosedPositions = useMemo(() => {
    if (!searchTerm.trim()) return closedPositions;
    const q = searchTerm.toLowerCase();
    return closedPositions.filter(
      (p) =>
        p.symbol.toLowerCase().includes(q) ||
        p.side.toLowerCase().includes(q) ||
        (p.strategy && p.strategy.toLowerCase().includes(q)),
    );
  }, [closedPositions, searchTerm]);

  // Current active dataset depending on tab
  const activeDatasetCount =
    activeTabFilter === "ACTIVE"
      ? filteredPositions.length
      : filteredClosedPositions.length;

  const totalPages = Math.max(1, Math.ceil(activeDatasetCount / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedActivePositions = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredPositions.slice(start, start + pageSize);
  }, [filteredPositions, validCurrentPage, pageSize]);

  const paginatedClosedPositions = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredClosedPositions.slice(start, start + pageSize);
  }, [filteredClosedPositions, validCurrentPage, pageSize]);

  const handleClose = async (
    symbol: string,
    positionAmt: number,
    side: string,
  ) => {
    setClosingSymbol(symbol);
    try {
      await closePosition(symbol, positionAmt, side);
    } finally {
      setClosingSymbol(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Unrealized PnL */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">
                Total Unrealized PnL
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-xl font-bold font-mono ${
                    summary.totalUnrealizedPnl >= 0
                      ? "text-emerald-500"
                      : "text-rose-500"
                  }`}
                >
                  {summary.totalUnrealizedPnl >= 0 ? "+" : ""}$
                  {summary.totalUnrealizedPnl.toFixed(2)}
                </span>
                <span
                  className={`text-xs font-mono font-medium ${
                    summary.totalRoe >= 0 ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  ({summary.totalRoe >= 0 ? "+" : ""}
                  {summary.totalRoe.toFixed(2)}%)
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                <span className="text-emerald-500 font-semibold font-mono">
                  {summary.winningCount} Win
                </span>
                <span>•</span>
                <span className="text-rose-500 font-semibold font-mono">
                  {summary.losingCount} Loss
                </span>
              </div>
            </div>
            <div
              className={`p-2.5 rounded-full ${
                summary.totalUnrealizedPnl >= 0
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-rose-500/10 text-rose-500"
              }`}
            >
              <DollarSignIcon className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Margin In Play */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">
                Total Margin Dipakai
              </span>
              <div className="text-xl font-bold font-mono text-foreground">
                $
                {summary.totalInitialMargin.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <span className="text-[11px] text-muted-foreground">
                Alokasi margin aktif Binance
              </span>
            </div>
            <div className="p-2.5 rounded-full bg-blue-500/10 text-blue-500">
              <ShieldCheckIcon className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Total Notional Value */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">
                Total Nilai Notional
              </span>
              <div className="text-xl font-bold font-mono text-foreground">
                $
                {summary.totalNotional.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <span className="text-[11px] text-muted-foreground">
                Total eksposur pasar terbuka
              </span>
            </div>
            <div className="p-2.5 rounded-full bg-indigo-500/10 text-indigo-500">
              <ActivityIcon className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Open Positions Breakdown */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">
                Distribusi Posisi
              </span>
              <div className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
                <span>{summary.totalPositions} Posisi</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono pt-0.5">
                <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
                  <TrendingUpIcon className="size-3" /> {summary.longCount} Long
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-rose-500 font-semibold flex items-center gap-0.5">
                  <TrendingDownIcon className="size-3" /> {summary.shortCount}{" "}
                  Short
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-500">
              <LayersIcon className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-xs">
        <CardHeader className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <BriefcaseIcon className="size-5 text-indigo-500" />
              Live Binance Futures Positions
            </CardTitle>
            <CardDescription className="text-xs">
              Posisi aktif riil di akun Binance Futures. Eksekusi posisi
              otomatis menggunakan saldo margin akun.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => void refreshPositions()}
              disabled={isLoadingPositions}
            >
              <RefreshCwIcon
                className={`size-3.5 ${isLoadingPositions ? "animate-spin" : ""}`}
              />
              Refresh Posisi
            </Button>
          </div>
        </CardHeader>

        {/* Sub-Navigation & Filter Bar */}
        {/* Sub-Navigation & Filter Bar via TableToolbar */}
        <TableToolbar<"ACTIVE" | "CLOSED">
          tabs={[
            {
              id: "ACTIVE",
              label: "Active",
              count: positions.length,
              icon: <BriefcaseIcon className="size-3.5" />,
            },
            {
              id: "CLOSED",
              label: "History Closed",
              count: closedPositions.length,
              icon: <HistoryIcon className="size-3.5" />,
            },
          ]}
          activeTab={activeTabFilter}
          onTabChange={handleTabChange}
          searchTerm={searchTerm}
          onSearchChange={(val) => {
            setSearchTerm(val);
            setCurrentPage(1);
          }}
          searchPlaceholder="Cari simbol pair atau side..."
          rightActions={
            activeTabFilter === "ACTIVE" ? (
              <>
                <span>Total Posisi Terbuka:</span>
                <span className="font-semibold text-foreground text-sm">
                  {filteredPositions.length}
                </span>
              </>
            ) : (
              <>
                <span>Winrate History:</span>
                <span className="font-semibold text-emerald-600 text-sm">
                  {closedSummary.winrate}%
                </span>
                {closedPositions.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (
                        window.confirm("Hapus seluruh catatan history posisi?")
                      ) {
                        clearClosedPositions();
                      }
                    }}
                  >
                    <Trash2Icon className="size-3 mr-1" />
                    Clear
                  </Button>
                )}
              </>
            )
          }
        />

        <CardContent className="p-6 pt-4 space-y-4">
          <div className="rounded-md border overflow-x-auto bg-card">
            {activeTabFilter === "ACTIVE" ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60 border-b">
                    <TableHead className="w-[180px] px-4 py-3 font-semibold text-xs">
                      Simbol & Arah
                    </TableHead>
                    <TableHead className="w-[120px] px-4 py-3 font-semibold text-xs">
                      Ukuran (Size)
                    </TableHead>
                    <TableHead className="w-[130px] px-4 py-3 font-semibold text-xs">
                      Entry Price
                    </TableHead>
                    <TableHead className="w-[130px] px-4 py-3 font-semibold text-xs">
                      Mark Price
                    </TableHead>
                    <TableHead className="w-[140px] px-4 py-3 font-semibold text-xs">
                      Margin / Notional
                    </TableHead>
                    <TableHead className="w-[150px] px-4 py-3 font-semibold text-xs">
                      PnL (ROE %)
                    </TableHead>
                    <TableHead className="w-[190px] px-4 py-3 font-semibold text-xs">
                      Target Orders (TP/SL)
                    </TableHead>
                    <TableHead className="w-[160px] px-4 py-3 font-semibold text-xs">
                      Waktu (Dibuat & Update)
                    </TableHead>
                    <TableHead className="w-[100px] px-4 py-3 text-right font-semibold text-xs">
                      Tindakan
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPositions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-28 text-center text-muted-foreground text-sm"
                      >
                        Tidak ada posisi terbuka saat ini di akun Binance
                        Futures.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedActivePositions.map((pos) => {
                      const isLong = pos.side === "LONG";
                      const isProfit = pos.unRealizedProfit >= 0;

                      return (
                        <TableRow key={pos.symbol}>
                          <TableCell className="align-middle px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm tracking-tight">
                                {pos.symbol}
                              </span>
                              <Badge
                                variant={isLong ? "default" : "destructive"}
                                className={`text-[10px] font-mono px-1.5 py-0 flex items-center gap-1 ${
                                  isLong
                                    ? "bg-emerald-600 hover:bg-emerald-600"
                                    : "bg-rose-600 hover:bg-rose-600"
                                }`}
                              >
                                {isLong ? (
                                  <TrendingUpIcon className="size-3" />
                                ) : (
                                  <TrendingDownIcon className="size-3" />
                                )}
                                {pos.side}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono mt-0.5">
                              <span className="font-semibold text-foreground">
                                {pos.leverage}x
                              </span>
                              <span>•</span>
                              <span className="uppercase">
                                {pos.marginType}
                              </span>
                            </div>
                            {pos.strategy && (
                              <div className="mt-1">
                                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20 font-mono">
                                  {pos.strategy}
                                </span>
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="align-middle px-4 py-3.5 font-mono text-xs">
                            <div className="font-semibold text-foreground">
                              {pos.positionAmt}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              ${pos.notional.toLocaleString()}
                            </div>
                          </TableCell>

                          <TableCell className="align-middle px-4 py-3.5 font-mono text-xs tabular-nums text-foreground">
                            ${formatCryptoPrice(pos.entryPrice)}
                          </TableCell>

                          <TableCell className="align-middle px-4 py-3.5 font-mono text-xs tabular-nums font-semibold text-foreground">
                            ${formatCryptoPrice(pos.markPrice)}
                          </TableCell>

                          <TableCell className="align-middle px-4 py-3.5 font-mono text-xs">
                            <div className="font-semibold text-foreground">
                              ${pos.initialMargin.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Liq: $
                              {pos.liquidationPrice > 0
                                ? formatCryptoPrice(pos.liquidationPrice)
                                : "0.00"}
                            </div>
                          </TableCell>

                          <TableCell className="align-middle px-4 py-3.5 font-mono">
                            <div
                              className={`font-bold text-sm tabular-nums ${
                                isProfit ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {isProfit ? "+" : ""}$
                              {pos.unRealizedProfit.toFixed(2)}
                            </div>
                            <div
                              className={`text-[11px] font-semibold tabular-nums ${
                                isProfit
                                  ? "text-emerald-600/80"
                                  : "text-rose-600/80"
                              }`}
                            >
                              {isProfit ? "+" : ""}
                              {pos.roe}%
                            </div>
                          </TableCell>

                          {/* Target Orders (TP & SL) dengan Persentase dari Entry Point */}
                          <TableCell className="align-middle px-4 py-3.5 font-mono text-xs">
                            {pos.orders && pos.orders.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {pos.orders.map((ord, idx) => {
                                  const diffPct =
                                    pos.entryPrice > 0
                                      ? (isLong
                                          ? (ord.price - pos.entryPrice) /
                                            pos.entryPrice
                                          : (pos.entryPrice - ord.price) /
                                            pos.entryPrice) * 100
                                      : 0;
                                  return (
                                    <div
                                      key={ord.orderId}
                                      className="flex items-center gap-1.5 text-[11px]"
                                    >
                                      <Badge
                                        variant="outline"
                                        className="px-1 py-0 h-4 text-[9px] font-bold border-emerald-500/40 text-emerald-600 bg-emerald-500/5"
                                      >
                                        TP{idx + 1}
                                      </Badge>
                                      <span className="font-semibold tabular-nums text-foreground">
                                        ${formatCryptoPrice(ord.price)}
                                      </span>
                                      <span className="font-bold text-[10px] bg-emerald-500/10 text-emerald-600 px-1 py-0.5 rounded border border-emerald-500/20 leading-none">
                                        {diffPct >= 0
                                          ? `+${diffPct.toFixed(2)}%`
                                          : `${diffPct.toFixed(2)}%`}
                                      </span>
                                    </div>
                                  );
                                })}
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                  <span className="text-amber-500 font-bold">
                                    ●
                                  </span>
                                  <span>TSL Engine Active</span>
                                </div>
                              </div>
                            ) : pos.tp1 || pos.tp2 || pos.tp3 ? (
                              <div className="flex flex-col gap-1">
                                {pos.tp1 && (
                                  <div className="flex items-center gap-1.5 text-[11px]">
                                    <Badge
                                      variant="outline"
                                      className="px-1 py-0 h-4 text-[9px] font-bold border-emerald-500/40 text-emerald-600 bg-emerald-500/5"
                                    >
                                      TP1
                                    </Badge>
                                    <span className="font-semibold tabular-nums text-foreground">
                                      ${formatCryptoPrice(pos.tp1)}
                                    </span>
                                    <span className="font-bold text-[10px] bg-emerald-500/10 text-emerald-600 px-1 py-0.5 rounded border border-emerald-500/20 leading-none">
                                      {pos.entryPrice > 0
                                        ? `+${Math.abs(((pos.tp1 - pos.entryPrice) / pos.entryPrice) * 100).toFixed(2)}%`
                                        : "+0.00%"}
                                    </span>
                                  </div>
                                )}
                                {pos.tp2 && (
                                  <div className="flex items-center gap-1.5 text-[11px]">
                                    <Badge
                                      variant="outline"
                                      className="px-1 py-0 h-4 text-[9px] font-bold border-teal-500/40 text-teal-600 bg-teal-500/5"
                                    >
                                      TP2
                                    </Badge>
                                    <span className="font-semibold tabular-nums text-foreground">
                                      ${formatCryptoPrice(pos.tp2)}
                                    </span>
                                    <span className="font-bold text-[10px] bg-teal-500/10 text-teal-600 px-1 py-0.5 rounded border border-teal-500/20 leading-none">
                                      {pos.entryPrice > 0
                                        ? `+${Math.abs(((pos.tp2 - pos.entryPrice) / pos.entryPrice) * 100).toFixed(2)}%`
                                        : "+0.00%"}
                                    </span>
                                  </div>
                                )}
                                {pos.tp3 && (
                                  <div className="flex items-center gap-1.5 text-[11px]">
                                    <Badge
                                      variant="outline"
                                      className="px-1 py-0 h-4 text-[9px] font-bold border-cyan-500/40 text-cyan-600 bg-cyan-500/5"
                                    >
                                      TP3
                                    </Badge>
                                    <span className="font-semibold tabular-nums text-foreground">
                                      ${formatCryptoPrice(pos.tp3)}
                                    </span>
                                    <span className="font-bold text-[10px] bg-cyan-500/10 text-cyan-600 px-1 py-0.5 rounded border border-cyan-500/20 leading-none">
                                      {pos.entryPrice > 0
                                        ? `+${Math.abs(((pos.tp3 - pos.entryPrice) / pos.entryPrice) * 100).toFixed(2)}%`
                                        : "+0.00%"}
                                    </span>
                                  </div>
                                )}
                                {pos.sl && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-destructive">
                                    <Badge
                                      variant="outline"
                                      className="px-1 py-0 h-4 text-[9px] font-bold border-destructive/40 text-destructive bg-destructive/5"
                                    >
                                      SL
                                    </Badge>
                                    <span className="font-semibold tabular-nums">
                                      ${formatCryptoPrice(pos.sl)}
                                    </span>
                                    <span className="font-bold text-[10px] bg-destructive/10 text-destructive px-1 py-0.5 rounded border border-destructive/20 leading-none">
                                      {pos.entryPrice > 0
                                        ? `-${Math.abs(((pos.entryPrice - pos.sl) / pos.entryPrice) * 100).toFixed(2)}%`
                                        : "-0.00%"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <span className="text-emerald-500 font-bold">
                                  ●
                                </span>
                                <span>Engine TSL Monitored</span>
                              </div>
                            )}
                          </TableCell>

                          {/* Waktu (Dibuat & Update) */}
                          <TableCell className="align-middle px-4 py-3.5 font-mono text-xs">
                            <div className="space-y-1">
                              {/* Created At */}
                              <div className="flex items-center gap-1.5 text-muted-foreground leading-tight">
                                <span className="text-[10px] uppercase font-sans font-semibold text-muted-foreground/70 w-8">
                                  Buat:
                                </span>
                                <ClockIcon className="size-3 text-muted-foreground/60 shrink-0" />
                                <span className="text-foreground text-[11px] font-medium">
                                  {new Date(
                                    pos.createdAt ||
                                      (pos.updateTime
                                        ? pos.updateTime
                                        : Date.now()),
                                  ).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </span>
                                <span className="text-[10px] text-muted-foreground/70">
                                  {new Date(
                                    pos.createdAt ||
                                      (pos.updateTime
                                        ? pos.updateTime
                                        : Date.now()),
                                  ).toLocaleDateString("id-ID")}
                                </span>
                              </div>

                              {/* Updated At */}
                              <div className="flex items-center gap-1.5 text-muted-foreground leading-tight">
                                <span className="text-[10px] uppercase font-sans font-semibold text-muted-foreground/70 w-8">
                                  Ubah:
                                </span>
                                <RefreshCwIcon className="size-2.5 text-primary/70 shrink-0" />
                                <span className="text-foreground text-[11px] font-medium">
                                  {new Date(
                                    pos.updatedAt ||
                                      (pos.updateTime
                                        ? pos.updateTime
                                        : Date.now()),
                                  ).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </span>
                                <span className="text-[10px] text-muted-foreground/70">
                                  {new Date(
                                    pos.updatedAt ||
                                      (pos.updateTime
                                        ? pos.updateTime
                                        : Date.now()),
                                  ).toLocaleDateString("id-ID")}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="align-middle px-4 py-3.5 text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                                  disabled={closingSymbol === pos.symbol}
                                >
                                  <XCircleIcon className="size-3.5 mr-1" />
                                  Tutup
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Tutup Posisi Pasar Sekarang?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Anda akan menutup seluruh posisi{" "}
                                    <span className="font-semibold text-foreground">
                                      {pos.symbol} ({pos.side})
                                    </span>{" "}
                                    dengan order Pasar (MARKET) di Binance
                                    Futures.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() =>
                                      void handleClose(
                                        pos.symbol,
                                        pos.positionAmt,
                                        pos.side,
                                      )
                                    }
                                  >
                                    Ya, Tutup Posisi
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            ) : (
              /* TAB 2: CLOSED POSITIONS HISTORY TABLE */
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60 border-b">
                    <TableHead className="w-[180px] px-4 py-3 font-semibold text-xs">
                      Simbol & Arah
                    </TableHead>
                    <TableHead className="w-[120px] px-4 py-3 font-semibold text-xs">
                      Ukuran (Size)
                    </TableHead>
                    <TableHead className="w-[140px] px-4 py-3 font-semibold text-xs">
                      Entry Price
                    </TableHead>
                    <TableHead className="w-[140px] px-4 py-3 font-semibold text-xs">
                      Exit Price
                    </TableHead>
                    <TableHead className="w-[160px] px-4 py-3 font-semibold text-xs">
                      Realized PnL (ROE)
                    </TableHead>
                    <TableHead className="w-[150px] px-4 py-3 font-semibold text-xs">
                      Strategi Source
                    </TableHead>
                    <TableHead className="w-[170px] px-4 py-3 text-right font-semibold text-xs">
                      Waktu Ditutup
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClosedPositions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-28 text-center text-muted-foreground text-sm"
                      >
                        Belum ada riwayat posisi yang ditutup.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedClosedPositions.map((cp) => {
                      const isLong = cp.side === "LONG";
                      const isProfit = cp.realizedPnl >= 0;

                      return (
                        <TableRow key={cp.id} className="hover:bg-muted/40">
                          <TableCell className="align-middle px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm tracking-tight">
                                {cp.symbol}
                              </span>
                              <Badge
                                variant={isLong ? "default" : "destructive"}
                                className={`text-[10px] font-mono px-1.5 py-0 flex items-center gap-1 ${
                                  isLong
                                    ? "bg-emerald-600 hover:bg-emerald-600"
                                    : "bg-rose-600 hover:bg-rose-600"
                                }`}
                              >
                                {isLong ? (
                                  <TrendingUpIcon className="size-3" />
                                ) : (
                                  <TrendingDownIcon className="size-3" />
                                )}
                                {cp.side}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              {cp.leverage}x Leverage
                            </div>
                          </TableCell>

                          <TableCell className="align-middle px-4 py-3.5 font-mono text-xs">
                            <span className="font-semibold text-foreground">
                              {cp.positionAmt}
                            </span>
                          </TableCell>

                          <TableCell className="align-middle px-4 py-3.5 font-mono text-xs tabular-nums text-foreground">
                            ${formatCryptoPrice(cp.entryPrice)}
                          </TableCell>

                          <TableCell className="align-middle px-4 py-3.5 font-mono text-xs tabular-nums font-semibold text-foreground">
                            ${formatCryptoPrice(cp.exitPrice)}
                          </TableCell>

                          <TableCell className="align-middle px-4 py-3.5 font-mono">
                            <div
                              className={`font-bold text-sm tabular-nums ${
                                isProfit ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {isProfit ? "+" : ""}${cp.realizedPnl.toFixed(2)}
                            </div>
                            <div
                              className={`text-[11px] font-semibold tabular-nums ${
                                isProfit
                                  ? "text-emerald-600/80"
                                  : "text-rose-600/80"
                              }`}
                            >
                              {isProfit ? "+" : ""}
                              {cp.roe}%
                            </div>
                          </TableCell>

                          <TableCell className="align-middle px-4 py-3.5 font-mono text-xs">
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                              {cp.strategy || "MANUAL"}
                            </span>
                          </TableCell>

                          <TableCell className="align-middle px-4 py-3.5 font-mono text-xs text-right text-muted-foreground">
                            <div className="flex items-center justify-end gap-1 text-[11px]">
                              <ClockIcon className="size-3 text-muted-foreground/70" />
                              <span>
                                {new Date(cp.closedAt).toLocaleTimeString(
                                  "id-ID",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  },
                                )}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground/70">
                              {new Date(cp.closedAt).toLocaleDateString(
                                "id-ID",
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Consistent Pagination Controls */}
          <TablePagination
            currentPage={validCurrentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={activeDatasetCount}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel={
              activeTabFilter === "ACTIVE" ? "posisi aktif" : "riwayat posisi"
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
