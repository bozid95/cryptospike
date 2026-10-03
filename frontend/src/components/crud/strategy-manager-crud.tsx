import { useState, useMemo } from "react";
import {
  RefreshCwIcon,
  ZapIcon,
  Code2Icon,
  TrendingUpIcon,
  TrendingDownIcon,
  TargetIcon,
} from "lucide-react";

import { useCryptoSpike } from "@/context/trading-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableToolbar } from "@/components/ui/table-toolbar";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function StrategyManagerCrud() {
  const { strategies, toggleStrategy } = useCryptoSpike();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filteredStrategies = useMemo(() => {
    if (!searchTerm.trim()) return strategies;
    const q = searchTerm.toLowerCase();
    return strategies.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.strategyId.toLowerCase().includes(q) ||
        s.timeframe.toLowerCase().includes(q) ||
        (s.indicators &&
          s.indicators.some((ind) => ind.toLowerCase().includes(q))),
    );
  }, [strategies, searchTerm]);

  // Pagination calculation
  const totalItems = filteredStrategies.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedStrategies = filteredStrategies.slice(startIndex, endIndex);

  const handleToggle = (stratId: string) => {
    toggleStrategy(stratId);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border shadow-xs">
        <CardHeader className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <ZapIcon className="size-5 text-amber-500" />
              Strategy Engine Registry
            </CardTitle>
            <CardDescription className="text-xs">
              Algoritma terdeteksi langsung dari source code backend NestJS.
              Status ON/OFF otomatis tersimpan di PostgreSQL.
            </CardDescription>
          </div>
        </CardHeader>

        {/* Sub-Navigation & Filter Bar via TableToolbar */}
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={(val) => {
            setSearchTerm(val);
            setCurrentPage(1);
          }}
          searchPlaceholder="Cari strategi, indikator, TF..."
          rightActions={
            <>
              <span>Menampilkan</span>
              <span className="font-semibold text-foreground">
                {totalItems > 0 ? startIndex + 1 : 0}-{endIndex}
              </span>
              <span>dari</span>
              <span className="font-semibold text-foreground">
                {totalItems}
              </span>
              <span>strategi backend</span>
            </>
          }
        />

        <CardContent className="p-6 pt-4 space-y-4">
          <div className="rounded-md border overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60 border-b">
                  <TableHead className="w-[260px] px-4 py-3 font-semibold text-xs">
                    ID & Nama Algoritma
                  </TableHead>
                  <TableHead className="w-[90px] px-4 py-3 font-semibold text-xs">
                    Timeframe
                  </TableHead>
                  <TableHead className="w-[170px] px-4 py-3 font-semibold text-xs">
                    Indikator Teknis
                  </TableHead>
                  <TableHead className="w-[160px] px-4 py-3 font-semibold text-xs">
                    Sinyal & Winrate
                  </TableHead>
                  <TableHead className="w-[140px] px-4 py-3 font-semibold text-xs">
                    PnL Dihasilkan
                  </TableHead>
                  <TableHead className="w-[140px] px-4 py-3 text-right font-semibold text-xs">
                    Status Eksekusi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStrategies.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-28 text-center text-muted-foreground text-sm"
                    >
                      Tidak ada strategi yang terdaftar di engine.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStrategies.map((strat) => (
                    <TableRow key={strat.strategyId}>
                      <TableCell className="align-middle px-4 py-3.5">
                        <div className="font-semibold text-sm leading-snug text-foreground flex items-center gap-2">
                          <Code2Icon className="size-4 text-primary shrink-0" />
                          {strat.name}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground mt-0.5 tracking-tight pl-6">
                          ID:{" "}
                          <span className="text-foreground/90 font-medium">
                            {strat.strategyId}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed pl-6">
                          {strat.description}
                        </div>
                      </TableCell>

                      <TableCell className="align-middle px-4 py-3.5">
                        <Badge
                          variant="outline"
                          className="font-mono text-[11px] px-2 py-0.5 leading-none bg-background"
                        >
                          {strat.timeframe}
                        </Badge>
                      </TableCell>

                      <TableCell className="align-middle px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {strat.indicators && strat.indicators.length > 0 ? (
                            strat.indicators.map((ind) => (
                              <Badge
                                key={ind}
                                variant="secondary"
                                className="font-mono text-[10px] px-1.5 py-0"
                              >
                                {ind}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Sinyal Tergenerate & Winrate */}
                      <TableCell className="align-middle px-4 py-3.5 font-mono text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground text-xs">
                              {strat.totalSignals ?? 0}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              sinyal
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              •
                            </span>
                            <span className="text-emerald-600 font-semibold text-[11px]">
                              {strat.winrate || "0.0%"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span className="text-emerald-600 font-medium">
                              {strat.winSignals ?? 0} Win
                            </span>
                            <span>/</span>
                            <span className="text-rose-600 font-medium">
                              {strat.lossSignals ?? 0} Loss
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Akumulasi PnL Dihasilkan */}
                      <TableCell className="align-middle px-4 py-3.5 font-mono">
                        {typeof strat.totalPnlPct === "number" ? (
                          <div className="space-y-0.5">
                            <div
                              className={`font-bold text-xs tabular-nums flex items-center gap-1 ${
                                strat.totalPnlPct >= 0
                                  ? "text-emerald-600"
                                  : "text-rose-600"
                              }`}
                            >
                              {strat.totalPnlPct >= 0 ? (
                                <TrendingUpIcon className="size-3.5" />
                              ) : (
                                <TrendingDownIcon className="size-3.5" />
                              )}
                              <span>
                                {strat.totalPnlPct >= 0 ? "+" : ""}
                                {strat.totalPnlPct.toFixed(2)}%
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              Avg:{" "}
                              <span
                                className={
                                  (strat.avgProfitPct ?? 0) >= 0
                                    ? "text-emerald-600/90 font-semibold"
                                    : "text-rose-600/90 font-semibold"
                                }
                              >
                                {(strat.avgProfitPct ?? 0) >= 0 ? "+" : ""}
                                {(strat.avgProfitPct ?? 0).toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs font-mono">
                            0.00%
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="align-middle px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2.5">
                          <Switch
                            checked={strat.isEnabled}
                            onCheckedChange={() =>
                              handleToggle(strat.strategyId)
                            }
                          />
                          <span
                            className={`text-xs font-mono font-semibold w-16 text-left leading-none ${
                              strat.isEnabled
                                ? "text-emerald-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {strat.isEnabled ? "ACTIVE" : "PAUSED"}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Consistent Pagination Controls */}
          <TablePagination
            currentPage={validCurrentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            pageSizeOptions={[5, 10, 20]}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="strategi backend"
          />
        </CardContent>
      </Card>
    </div>
  );
}
