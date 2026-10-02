import { ActivityIcon, LogOutIcon, UserCircleIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useCryptoSpike } from "@/mock/mock-context";

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
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-100 border border-border text-xs font-mono">
          <span className="text-muted-foreground text-[11px]">Futures Margin:</span>
          <span className="font-semibold text-emerald-600">
            {balance
              ? `$${balance.usdtAvailable.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
              : isLoadingBalance
                ? "Loading..."
                : "$4,981.44 USDT"}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full border border-border"
              title="Profil Pengguna"
            >
              <Avatar className="size-7">
                <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">
                  OP
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">
                  Lead Operator
                </p>
                <p className="text-xs leading-none text-muted-foreground font-mono">
                  operator@cryptospike.io
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer gap-2 text-xs">
              <UserCircleIcon className="size-4" />
              Profil Pengguna
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive focus:bg-destructive/10 font-medium"
              onClick={() => {
                if (
                  window.confirm(
                    "Apakah Anda yakin ingin keluar dari sesi operator?",
                  )
                ) {
                  window.location.reload();
                }
              }}
            >
              <LogOutIcon className="size-4" />
              Keluar (Log out)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
