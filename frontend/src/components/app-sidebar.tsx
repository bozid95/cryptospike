"use client";

import {
  ActivityIcon,
  BotIcon,
  BriefcaseIcon,
  CpuIcon,
  LayoutDashboardIcon,
  RadioIcon,
  SlidersIcon,
} from "lucide-react";

import { useCryptoSpike } from "@/context/trading-context";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { signals, strategies, config, positions, setActiveTab, isAuthenticated } =
    useCryptoSpike();

  const activeSignalsCount = signals.filter(
    (s) => s.status === "ACTIVE",
  ).length;
  const activeStrategiesCount = strategies.filter((s) => s.isEnabled).length;
  const activePositionsCount = positions.length;

  // Navigasi Utama: Bebas Redundansi (Jika publik, hanya tampilkan Scanner)
  const mainNavItems = isAuthenticated
    ? [
        {
          id: "overview",
          title: "Dashboard Summary",
          url: "#overview",
          icon: LayoutDashboardIcon,
        },
        {
          id: "positions",
          title: "Active Positions",
          url: "#positions",
          icon: BriefcaseIcon,
          badge:
            activePositionsCount > 0 ? `${activePositionsCount} Open` : undefined,
          badgeVariant: "default" as const,
        },
        {
          id: "signals",
          title: "Scanner & Live Signals",
          url: "#signals",
          icon: RadioIcon,
          badge: activeSignalsCount,
          badgeVariant: (activeSignalsCount > 0 ? "default" : "secondary") as
            | "default"
            | "secondary",
        },
        {
          id: "strategies",
          title: "Strategy Manager",
          url: "#strategies",
          icon: CpuIcon,
          badge: `${activeStrategiesCount}/${strategies.length}`,
          badgeVariant: "outline" as const,
        },
        {
          id: "config",
          title: "Configuration",
          url: "#config",
          icon: SlidersIcon,
          badge: `${config.environment} • ${config.leverage}x`,
          badgeVariant: "secondary" as const,
        },
      ]
    : [
        {
          id: "signals",
          title: "Scanner & Live Signals",
          url: "#signals",
          icon: RadioIcon,
          badge: activeSignalsCount,
          badgeVariant: (activeSignalsCount > 0 ? "default" : "secondary") as
            | "default"
            | "secondary",
        },
      ];

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r border-border/80"
      {...props}
    >
      {/* 1. Brand Header */}
      <SidebarHeader className="p-3 border-b border-border/60">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => setActiveTab(isAuthenticated ? "overview" : "signals")}
              className="hover:bg-transparent cursor-pointer p-0 gap-3"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-base shadow-xs shrink-0">
                ⚡
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight text-foreground">
                    CryptoSpike
                  </span>
                  <Badge
                    variant="outline"
                    className="font-mono text-[9px] px-1 py-0 h-4 border-emerald-500/40 text-emerald-600 bg-emerald-500/5 font-semibold"
                  >
                    LIVE
                  </Badge>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Realtime Price Action Scanner
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* 2. Content Menu: Bersih & Terfokus */}
      <SidebarContent className="p-2 gap-2 overflow-y-auto">
        <NavMain label={isAuthenticated ? "Control Panel" : "Public Feeds"} items={mainNavItems} />
      </SidebarContent>

      {/* 3. Footer: Profil Pengguna & Keluar (Hanya jika login) */}
      {isAuthenticated && (
        <SidebarFooter className="p-2 border-t border-border/60">
          <NavUser />
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
