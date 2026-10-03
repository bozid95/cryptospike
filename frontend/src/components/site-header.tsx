import { ActivityIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCryptoSpike } from "@/context/trading-context";

export function SiteHeader() {
  const { balance, isLoadingBalance, isAuthenticated } = useCryptoSpike();

  const rawBalance =
    balance && (balance.marginBalance || balance.walletBalanceUsd)
      ? balance.marginBalance || balance.walletBalanceUsd
      : null;

  const formattedBalance = rawBalance
    ? `$${rawBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : isLoadingBalance
      ? "Loading..."
      : "$10,843.97";

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-14 shrink-0 items-center justify-between border-b px-3 sm:px-4 lg:px-6 transition-[width,height] ease-linear bg-background/95 backdrop-blur">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-1 sm:mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex items-center gap-1.5">
          <span className="font-bold tracking-tight text-sm text-foreground">
            CryptoSpike
          </span>
          <span className="hidden sm:inline-block text-xs text-muted-foreground font-medium">
            • Control Panel
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* 1. WebSocket Live Stream (Desktop Only) */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground border-r pr-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span>WebSocket Stream:</span>
          <span className="font-mono font-semibold text-emerald-600">
            CONNECTED
          </span>
        </div>

        {/* 2. Binance Futures Stream Indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span>Binance Futures:</span>
          <span className="font-mono font-medium text-foreground">Live</span>
        </div>

        {/* Dot status untuk mobile */}
        <div className="flex md:hidden items-center">
          <span
            className="relative flex h-2 w-2"
            title="Binance Futures Connected"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
        </div>

        <Badge
          variant="outline"
          className="hidden sm:inline-flex gap-1 font-mono text-[10px] sm:text-[11px] bg-background"
        >
          <ActivityIcon className="size-3 text-emerald-500" />
          Live Scanner
        </Badge>

        {/* 3. Real Binance Testnet Balance (Admin Only) */}
        {isAuthenticated && (
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md bg-muted/60 border border-border text-xs font-mono">
            <span className="hidden sm:inline text-muted-foreground text-[11px]">
              Margin:
            </span>
            <span className="font-semibold text-emerald-600 text-[11px] sm:text-xs">
              {formattedBalance}
            </span>
          </div>
        )}

        {/* 4. Notification Bell Dropdown */}
        <NotificationBell />

        {/* 5. Theme Toggle Button */}
        <ThemeToggle />
      </div>
    </header>
  );
}
