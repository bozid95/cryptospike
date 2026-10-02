import { useState, useMemo } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const { strategies, toggleStrategy, createStrategy, deleteStrategy } =
    useCryptoSpike();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Form states
  const [strategyId, setStrategyId] = useState("");
  const [name, setName] = useState("");
  const [timeframe, setTimeframe] = useState("15m");
  const [description, setDescription] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);

  const filteredStrategies = useMemo(() => {
    if (!searchTerm.trim()) return strategies;
    const q = searchTerm.toLowerCase();
    return strategies.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.strategyId.toLowerCase().includes(q) ||
        s.timeframe.toLowerCase().includes(q),
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

  const handleDelete = (stratId: string) => {
    deleteStrategy(stratId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!strategyId || !name) return;

    createStrategy({
      strategyId: strategyId.trim().toLowerCase(),
      name: name.trim(),
      timeframe: timeframe.trim(),
      description: description.trim(),
      isEnabled,
    });

    setOpen(false);
    setStrategyId("");
    setName("");
    setTimeframe("15m");
    setDescription("");
    setIsEnabled(true);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border shadow-xs">
        <CardHeader className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <ZapIcon className="size-5 text-amber-500" />
              Strategy Modular Registry
            </CardTitle>
            <CardDescription className="text-xs">
              Kelola status aktif/non-aktif setiap algoritma strategi trading
              tanpa perlu restart server.
            </CardDescription>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 text-xs">
                <PlusIcon className="size-4" />
                Tambah Strategy
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Daftarkan Strategy Baru</DialogTitle>
                  <DialogDescription>
                    Masukkan identitas file strategi yang ada di folder modules
                    NestJS.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="strategyId">
                      Strategy ID (Format: nama_tf_versi)
                    </Label>
                    <Input
                      id="strategyId"
                      placeholder="misal: rsi_divergence_15m_v1"
                      value={strategyId}
                      onChange={(e) => setStrategyId(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="name">Nama Tampilan Strategy</Label>
                    <Input
                      id="name"
                      placeholder="misal: RSI Bullish Divergence"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="timeframe">Timeframe Candle</Label>
                      <Input
                        id="timeframe"
                        placeholder="15m, 1h, 4h"
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col justify-end gap-2">
                      <Label>Langsung Aktif?</Label>
                      <div className="flex items-center gap-2 h-9">
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={setIsEnabled}
                        />
                        <span className="text-xs font-mono text-muted-foreground">
                          {isEnabled ? "Aktif" : "Mati"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="desc">Deskripsi Singkat</Label>
                    <Input
                      id="desc"
                      placeholder="Penjelasan logika trigger sinyal..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit">Simpan Strategy</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>

        {/* Search Bar with Solid Background */}
        <div className="px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 border-b bg-muted/50">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari nama strategi atau TF..."
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
            <span>strategi</span>
          </div>
        </div>

        <CardContent className="p-6 pt-4 space-y-4">
          <div className="rounded-md border overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60 border-b">
                  <TableHead className="w-[280px] px-4 py-3 font-semibold text-xs">
                    Strategy ID & Nama
                  </TableHead>
                  <TableHead className="w-[90px] px-4 py-3 font-semibold text-xs">
                    TF
                  </TableHead>
                  <TableHead className="w-[140px] px-4 py-3 font-semibold text-xs">
                    Status Engine
                  </TableHead>
                  <TableHead className="w-[140px] px-4 py-3 font-semibold text-xs">
                    Winrate (TP1+)
                  </TableHead>
                  <TableHead className="w-[130px] px-4 py-3 font-semibold text-xs">
                    Total Signals
                  </TableHead>
                  <TableHead className="w-[90px] px-4 py-3 text-right font-semibold text-xs">
                    Aksi
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
                      Tidak ada strategi yang ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStrategies.map((strat) => (
                    <TableRow key={strat.strategyId}>
                      <TableCell className="align-middle px-4 py-3.5">
                        <div className="font-semibold text-sm leading-snug text-foreground">
                          {strat.name}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground/80 mt-0.5 tracking-tight">
                          {strat.strategyId}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1 leading-relaxed">
                          {strat.description}
                        </div>
                      </TableCell>
                      <TableCell className="align-middle px-4 py-3.5">
                        <Badge
                          variant="outline"
                          className="font-mono text-[11px] px-2 py-0.5 leading-none"
                        >
                          {strat.timeframe}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-middle px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Switch
                            checked={strat.isEnabled}
                            onCheckedChange={() =>
                              handleToggle(strat.strategyId)
                            }
                          />
                          <span
                            className={`text-xs font-mono font-semibold leading-none ${
                              strat.isEnabled
                                ? "text-emerald-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {strat.isEnabled ? "ACTIVE" : "PAUSED"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle px-4 py-3.5 font-mono font-bold text-sm text-emerald-600 tabular-nums">
                        {strat.winrate}
                      </TableCell>
                      <TableCell className="align-middle px-4 py-3.5 font-mono text-xs text-muted-foreground tabular-nums">
                        {strat.totalSignals} sinyal
                      </TableCell>
                      <TableCell className="align-middle px-4 py-3.5 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Hapus Strategy"
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Hapus Strategi Ini?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Apakah Anda yakin ingin menghapus strategi{" "}
                                <span className="font-semibold text-foreground">
                                  "{strat.name}" ({strat.strategyId})
                                </span>
                                ? Tindakan ini akan menghentikan evaluasi sinyal
                                terkait di background.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleDelete(strat.strategyId)}
                              >
                                Ya, Hapus Strategi
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
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
