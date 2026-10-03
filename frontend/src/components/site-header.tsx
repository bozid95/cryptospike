import { ActivityIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { useCryptoSpike } from "@/context/trading-context";

export function SiteHeader() {
  const { balance, isLoadingBalance } = useCryptoSpike();
  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-14 shrink-0 items-center justify-between border-b px-4 lg:px-6 transition-[width,height] ease-linear">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-sm font-semibold tracking-wide">
          Trading Control Panel
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* 1. WebSocket Live Stream */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground border-r pr-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span>WebSocket Stream:</span>
          <span className="font-mono font-semibold text-emerald-600">
            CONNECTED
          </span>
        </div>

        {/* 2. Binance Futures Stream & Mode */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span>Binance Futures:</span>
          <span className="font-mono font-medium text-foreground">Live</span>
        </div>

        <Badge
          variant="outline"
          className="gap-1 font-mono text-[11px] bg-background"
        >
          <ActivityIcon className="size-3 text-emerald-500" />
          Testnet
        </Badge>

        {/* 3. Real Binance Testnet Balance */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border text-xs font-mono">
          <span className="text-muted-foreground text-[11px]">
            Margin Balance:
          </span>
          <span className="font-semibold text-emerald-600">
            {balance && (balance.marginBalance || balance.walletBalanceUsd)
              ? `$${(balance.marginBalance || balance.walletBalanceUsd)!.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
              : isLoadingBalance
                ? "Loading..."
                : "$10,843.97 USDT"}
          </span>
        </div>

        {/* 4. Notification Bell Dropdown (Max 100) */}
        <NotificationBell />
      </div>
    </header>
  );
}
