import React from "react";
import {
  ActivityIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BotIcon,
  CheckCircle2Icon,
  CpuIcon,
  FlameIcon,
  RadioIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  ZapIcon,
} from "lucide-react";

import { useCryptoSpike } from "@/mock/mock-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function DashboardSummary() {
  const { signals, strategies, config, setActiveTab, balance } =
    useCryptoSpike();

  const totalSignals = signals.length;
  const longSignals = signals.filter((s) => s.side === "LONG");
  const shortSignals = signals.filter((s) => s.side === "SHORT");
  const activeSignals = signals.filter((s) => s.status === "ACTIVE");
  const hitSignals = signals.filter((s) => s.status.includes("TP"));
  const slSignals = signals.filter((s) => s.status === "SL_HIT");
  const closedSignals = hitSignals.length + slSignals.length;
  const winrate =
    closedSignals > 0
      ? ((hitSignals.length / closedSignals) * 100).toFixed(1)
      : "0.0";

  const activeStrategies = strategies.filter((s) => s.isEnabled);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border bg-card shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xl shadow-xs">
            ⚡
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              CryptoSpike System Overview
            </h2>
            <p className="text-xs text-muted-foreground">
              Pemantauan performa otomatis, sinyal terkini, dan status bot
              execution Binance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("signals")}
            className="text-xs gap-1.5 font-medium"
          >
            <RadioIcon className="size-3.5 text-emerald-600" />
            Live Signals ({activeSignals.length})
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveTab("strategies")}
            className="text-xs gap-1.5 font-medium"
          >
            <CpuIcon className="size-3.5" />
            Manage Strategies
          </Button>
        </div>
      </div>

      {/* 2. Top Metric KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sinyal */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium">
              Total Signals Recorded
            </CardDescription>
            <RadioIcon className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {totalSignals}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-mono">
              <span className="text-emerald-600 font-medium">
                {longSignals.length} Long
              </span>
              <span>/</span>
              <span className="text-destructive font-medium">
                {shortSignals.length} Short
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Winrate Realized */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium">
              Target Winrate (TP1+)
            </CardDescription>
            <TrendingUpIcon className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-emerald-600">
              {winrate}%
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-mono">
              <span>{hitSignals.length} TP hit</span>
              <span>•</span>
              <span>{slSignals.length} SL hit</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Engine */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium">
              Strategy Registry Status
            </CardDescription>
            <ZapIcon className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {activeStrategies.length}{" "}
              <span className="text-xs text-muted-foreground font-normal">
                / {strategies.length} Active
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {strategies.length - activeStrategies.length === 0
                ? "Semua engine menyala"
                : `${strategies.length - activeStrategies.length} engine di-pause`}
            </div>
          </CardContent>
        </Card>

        {/* Futures Wallet (Testnet) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium">
              Margin Balance (USD)
            </CardDescription>
            <ShieldCheckIcon className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-emerald-600">
              {balance && (balance.marginBalance || balance.walletBalanceUsd)
                ? `$${(balance.marginBalance || balance.walletBalanceUsd)!.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "$10,843.97"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground font-mono">
              {balance
                ? `USDT: $${balance.usdtAvailable.toLocaleString()} • USDC: $${balance.usdcBalance.toLocaleString()} • BTC: ${balance.btcBalance}`
                : "USDT: $5,000 • USDC: $5,000 • BTC: 0.01"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2.5 Performance & PnL Volume Chart */}
      <ChartAreaInteractive />

      {/* 3. Middle Section: Breakdown Strategi & Status Eksekusi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1 & 2: Active Strategies Performance Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CpuIcon className="size-4 text-amber-500" />
                Strategy Health & Winrate Summary
              </CardTitle>
              <CardDescription className="text-xs">
                Performa tingkat keberhasilan masing-masing file algoritma.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("strategies")}
              className="text-xs h-7 text-muted-foreground"
            >
              Lihat Detail &rarr;
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {strategies.map((strat) => {
                const numericWinrate = parseFloat(strat.winrate ?? "0") || 0;
                return (
                  <div
                    key={strat.strategyId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border bg-muted/50 gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {strat.name}
                        </span>
                        <Badge
                          variant={strat.isEnabled ? "default" : "secondary"}
                          className="text-[10px] py-0 px-1.5"
                        >
                          {strat.isEnabled ? "RUNNING" : "PAUSED"}
                        </Badge>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          TF {strat.timeframe}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {strat.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 sm:text-right shrink-0">
                      <div>
                        <div className="text-sm font-mono font-bold text-emerald-600">
                          {strat.winrate}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {strat.totalSignals} sinyal
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Kolom 3: Execution Engine & Risk Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BotIcon className="size-4 text-primary" />
              Bot Parameters & Risk
            </CardTitle>
            <CardDescription className="text-xs">
              Konfigurasi limit Binance futures aktif.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Trading Environment</span>
              <Badge variant="outline" className="font-mono text-[11px]">
                {config.environment}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Auto-Execution Bot</span>
              <span
                className={`font-semibold font-mono ${
                  config.autoExecute
                    ? "text-emerald-600"
                    : "text-muted-foreground"
                }`}
              >
                {config.autoExecute ? "ENABLED" : "ALERT ONLY"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Default Leverage</span>
              <span className="font-mono font-semibold">
                {config.leverage}x
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Max Open Positions</span>
              <span className="font-mono font-semibold">
                {config.maxOpenPositions} Pasang
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Risk Per Position</span>
              <span className="font-mono font-semibold">
                {config.riskPerTradePct}% Margin
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Margin Mode</span>
              <span className="font-mono font-semibold">
                {config.marginType}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("binance-config")}
              className="w-full text-xs mt-2"
            >
              Ubah Parameter Trading
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 4. Bottom Section: Recent Signals Table Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ActivityIcon className="size-4 text-emerald-600" />
              Recent Signal Activity
            </CardTitle>
            <CardDescription className="text-xs">
              Histori dan pembaruan sinyal terbaru yang terdeteksi scanner.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab("signals")}
            className="text-xs h-7 text-muted-foreground"
          >
            Buka Sinyal Lengkap &rarr;
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[120px]">Pair & Arah</TableHead>
                  <TableHead className="w-[140px]">Entry Price</TableHead>
                  <TableHead className="w-[200px]">Targets (TP / SL)</TableHead>
                  <TableHead className="w-[150px]">Strategy Trigger</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[110px] text-right">PnL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.slice(0, 6).map((sig) => {
                  const isLong = sig.side === "LONG";
                  const isRunning = sig.status === "ACTIVE";
                  const isProfit = (sig.profitPct ?? 0) >= 0;

                  return (
                    <TableRow
                      key={sig.id}
                      className={isRunning ? "bg-emerald-500/[0.03]" : ""}
                    >
                      <TableCell className="align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm">
                            {sig.symbol}
                          </span>
                          <Badge
                            variant={isLong ? "default" : "destructive"}
                            className="text-[10px] font-mono py-0 px-1.5 font-semibold"
                          >
                            {sig.side}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle font-mono text-xs tabular-nums font-semibold">
                        $
                        {sig.entryPrice.toLocaleString(undefined, {
                          minimumFractionDigits: sig.entryPrice < 10 ? 4 : 2,
                          maximumFractionDigits: 4,
                        })}
                      </TableCell>
                      <TableCell className="align-middle font-mono text-xs tabular-nums">
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-600 font-medium">
                            $
                            {sig.tp1.toLocaleString(undefined, {
                              minimumFractionDigits: sig.tp1 < 10 ? 4 : 2,
                              maximumFractionDigits: 4,
                            })}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                            {isLong
                              ? `+${(((sig.tp1 - sig.entryPrice) / sig.entryPrice) * 100).toFixed(1)}%`
                              : `+${(((sig.entryPrice - sig.tp1) / sig.entryPrice) * 100).toFixed(1)}%`}
                          </span>
                          <span className="text-muted-foreground/40">/</span>
                          <span className="text-destructive font-medium">
                            $
                            {sig.sl.toLocaleString(undefined, {
                              minimumFractionDigits: sig.sl < 10 ? 4 : 2,
                              maximumFractionDigits: 4,
                            })}
                          </span>
                          <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-1 py-0.2 rounded border border-destructive/20">
                            {isLong
                              ? `-${(((sig.entryPrice - sig.sl) / sig.entryPrice) * 100).toFixed(1)}%`
                              : `-${(((sig.sl - sig.entryPrice) / sig.entryPrice) * 100).toFixed(1)}%`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle font-mono text-xs text-muted-foreground">
                        {sig.strategy}
                      </TableCell>
                      <TableCell className="align-middle">
                        {isRunning ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            RUNNING
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full border">
                            CLOSED ({sig.status})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="align-middle text-right font-mono text-xs font-bold tabular-nums">
                        {typeof sig.profitPct === "number" &&
                        sig.profitPct !== null ? (
                          <span
                            className={
                              isProfit ? "text-emerald-600" : "text-destructive"
                            }
                          >
                            {isProfit ? "+" : ""}
                            {sig.profitPct.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-normal">
                            -
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
