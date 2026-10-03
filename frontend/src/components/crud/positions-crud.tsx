import { useState, useMemo } from "react";
import {
  BriefcaseIcon,
  RefreshCwIcon,
  SearchIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  XCircleIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { useCryptoSpike } from "@/mock/mock-context";
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

export function PositionsCrud() {
  const { positions, isLoadingPositions, refreshPositions, closePosition } =
    useCryptoSpike();
  const [searchTerm, setSearchTerm] = useState("");
  const [closingSymbol, setClosingSymbol] = useState<string | null>(null);

  const filteredPositions = useMemo(() => {
    if (!searchTerm.trim()) return positions;
    const q = searchTerm.toLowerCase();
    return positions.filter(
      (p) =>
        p.symbol.toLowerCase().includes(q) ||
        p.side.toLowerCase().includes(q) ||
        p.marginType.toLowerCase().includes(q),
    );
  }, [positions, searchTerm]);

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

        {/* Filter Bar */}
        <div className="px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 border-b bg-muted/50">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari simbol pair atau side..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-8 text-xs bg-background"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-muted-foreground font-mono">
            <span>Total Posisi Terbuka:</span>
            <span className="font-semibold text-foreground text-sm">
              {filteredPositions.length}
            </span>
          </div>
        </div>

        <CardContent className="p-6 pt-4 space-y-4">
          <div className="rounded-md border overflow-x-auto bg-card">
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
                  <TableHead className="w-[100px] px-4 py-3 text-right font-semibold text-xs">
                    Tindakan
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPositions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-28 text-center text-muted-foreground text-sm"
                    >
                      Tidak ada posisi terbuka saat ini di akun Binance Futures.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPositions.map((pos) => {
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
                            <span className="uppercase">{pos.marginType}</span>
                          </div>
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
                          ${pos.entryPrice.toLocaleString()}
                        </TableCell>

                        <TableCell className="align-middle px-4 py-3.5 font-mono text-xs tabular-nums font-semibold text-foreground">
                          ${pos.markPrice.toLocaleString()}
                        </TableCell>

                        <TableCell className="align-middle px-4 py-3.5 font-mono text-xs">
                          <div className="font-semibold text-foreground">
                            ${pos.initialMargin.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Liq: $
                            {pos.liquidationPrice > 0
                              ? pos.liquidationPrice.toLocaleString()
                              : "0"}
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

                        <TableCell className="align-middle px-4 py-3.5 font-mono text-xs">
                          {pos.orders && pos.orders.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {pos.orders.map((ord, idx) => (
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
                                  <span className="font-semibold tabular-nums">
                                    ${ord.price.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    ({ord.origQty})
                                  </span>
                                </div>
                              ))}
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                <span className="text-amber-500 font-bold">●</span>
                                <span>TSL Engine Active</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <span className="text-emerald-500 font-bold">●</span>
                              <span>Engine TSL Monitored</span>
                            </div>
                          )}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
