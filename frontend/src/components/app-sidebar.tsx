"use client";

import {
  ActivityIcon,
  BotIcon,
  CpuIcon,
  LayoutDashboardIcon,
  RadioIcon,
  SlidersIcon,
} from "lucide-react";

import { useCryptoSpike } from "@/mock/mock-context";
import { NavMain } from "@/components/nav-main";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { signals, strategies, config, setActiveTab } = useCryptoSpike();

  const activeSignalsCount = signals.filter(
    (s) => s.status === "ACTIVE",
  ).length;
  const activeStrategiesCount = strategies.filter((s) => s.isEnabled).length;

  // Navigasi Utama: Bebas Redundansi (Hanya 4 Menu Esensial)
  const mainNavItems = [
    {
      id: "overview",
      title: "Dashboard Summary",
      url: "#overview",
      icon: LayoutDashboardIcon,
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
              onClick={() => setActiveTab("overview")}
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
                    PRO
                  </Badge>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Binance Futures Engine
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* 2. Content Menu: Bersih & Terfokus */}
      <SidebarContent className="p-2 gap-2 overflow-y-auto">
        <NavMain label="Control Panel" items={mainNavItems} />
      </SidebarContent>
    </Sidebar>
  );
}
