import { CheckCircle2Icon, FlameIcon, RadioIcon, ZapIcon } from "lucide-react";

import { useCryptoSpike } from "@/mock/mock-context";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SectionCards() {
  const { signals, strategies, config, balance } = useCryptoSpike();

  const totalSignals = signals.length;
  const longCount = signals.filter((s) => s.side === "LONG").length;
  const shortCount = signals.filter((s) => s.side === "SHORT").length;

  const hitSignals = signals.filter((s) => s.status.includes("TP")).length;
  const closedSignals = signals.filter(
    (s) => s.status.includes("TP") || s.status === "SL_HIT",
  ).length;
  const winrate =
    closedSignals > 0 ? ((hitSignals / closedSignals) * 100).toFixed(1) : "0.0";

  const activeStrategies = strategies.filter((s) => s.isEnabled).length;
  const activeSignals = signals.filter((s) => s.status === "ACTIVE").length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 lg:px-6">
      <Card className="@container/card">
        <CardHeader className="relative pb-2">
          <CardDescription>Signals Recorded</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-bold tabular-nums">
            {totalSignals}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge
              variant="outline"
              className="flex gap-1 rounded-lg text-xs font-mono"
            >
              <RadioIcon className="size-3 text-emerald-500" />
              Live CRUD
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-xs text-muted-foreground">
          <div className="line-clamp-1 flex gap-1 font-medium text-foreground">
            {longCount} Long / {shortCount} Short
          </div>
          <div>Berdasarkan sinyal tersimpan di database</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader className="relative pb-2">
          <CardDescription>Winrate Realized</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-bold tabular-nums text-emerald-500">
            {winrate}%
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge
              variant="outline"
              className="flex gap-1 rounded-lg text-xs font-mono"
            >
              <CheckCircle2Icon className="size-3 text-emerald-500" />
              TP1+
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-xs text-muted-foreground">
          <div className="line-clamp-1 flex gap-1 font-medium text-foreground">
            {hitSignals} Win / {closedSignals - hitSignals} Loss
          </div>
          <div>Dari {closedSignals} closed signals</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader className="relative pb-2">
          <CardDescription>Active Strategies</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-bold tabular-nums">
            {activeStrategies} / {strategies.length}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge
              variant="outline"
              className="flex gap-1 rounded-lg text-xs font-mono"
            >
              <ZapIcon className="size-3 text-amber-500" />
              Dynamic
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-xs text-muted-foreground">
          <div className="line-clamp-1 flex gap-1 font-medium text-foreground">
            {activeStrategies} engine running
          </div>
          <div>Dapat di-toggle realtime dari Strategy Manager</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader className="relative pb-2">
          <CardDescription>Futures Wallet (Testnet)</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-bold tabular-nums text-emerald-600">
            {balance
              ? `$${balance.usdtAvailable.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "$4,981.44"}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge
              variant="outline"
              className="flex gap-1 rounded-lg text-xs font-mono"
            >
              <FlameIcon className="size-3 text-emerald-500" />
              USDT
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-xs text-muted-foreground">
          <div className="line-clamp-1 flex gap-1 font-medium text-foreground">
            {balance
              ? `USDC: $${balance.usdcBalance.toLocaleString()} | BTC: ${balance.btcBalance}`
              : "USDC: $5,000 | BTC: 0.01"}
          </div>
          <div>
            Lev: {config.leverage}x | Risk: {config.riskPerTradePct}% ({activeSignals} Open)
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
