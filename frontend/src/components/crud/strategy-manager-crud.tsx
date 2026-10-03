import { useState, useMemo } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  RefreshCwIcon,
  SearchIcon,
  ZapIcon,
  Code2Icon,
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredStrategies = useMemo(() => {
    if (!searchTerm.trim()) return strategies;
    const q = searchTerm.toLowerCase();
    return strategies.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.strategyId.toLowerCase().includes(q) ||
        s.timeframe.toLowerCase().includes(q) ||
        (s.indicators && s.indicators.some((ind) => ind.toLowerCase().includes(q))),
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Reload window or re-fetch via context
    window.location.reload();
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
              Algoritma terdeteksi langsung dari source code backend NestJS. Status ON/OFF otomatis tersimpan di PostgreSQL.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCwIcon className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Sinkronkan Engine
            </Button>
          </div>
        </CardHeader>

        {/* Search Bar */}
        <div className="px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 border-b bg-muted/50">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari strategi, indikator, TF..."
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
            <span>strategi backend</span>
          </div>
        </div>

        <CardContent className="p-6 pt-4 space-y-4">
          <div className="rounded-md border overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60 border-b">
                  <TableHead className="w-[300px] px-4 py-3 font-semibold text-xs">
                    ID & Nama Algoritma
                  </TableHead>
                  <TableHead className="w-[100px] px-4 py-3 font-semibold text-xs">
                    Timeframe
                  </TableHead>
                  <TableHead className="w-[200px] px-4 py-3 font-semibold text-xs">
                    Indikator Teknis
                  </TableHead>
                  <TableHead className="w-[120px] px-4 py-3 font-semibold text-xs">
                    Versi
                  </TableHead>
                  <TableHead className="w-[160px] px-4 py-3 text-right font-semibold text-xs">
                    Status Eksekusi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStrategies.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
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
                          ID: <span className="text-foreground/90 font-medium">{strat.strategyId}</span>
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
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="align-middle px-4 py-3.5">
                        <Badge
                          variant="secondary"
                          className="font-mono text-[11px] px-2 py-0.5 font-semibold text-muted-foreground"
                        >
                          {strat.version || "v1"}
                        </Badge>
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

          {/* Pagination */}
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
                  {[5, 10, 20].map((size) => (
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
