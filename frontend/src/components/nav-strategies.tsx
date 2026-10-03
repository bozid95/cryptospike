import * as React from "react";
import {
  CpuIcon,
  MoreHorizontalIcon,
  PlayIcon,
  PowerOffIcon,
} from "lucide-react";

import { useCryptoSpike } from "@/context/trading-context";
import { Badge } from "@/components/ui/badge";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavStrategies() {
  const { strategies, toggleStrategy, setActiveTab } = useCryptoSpike();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 px-2 flex items-center justify-between mb-0.5">
        <span>Strategies ({strategies.length})</span>
        <button
          onClick={() => setActiveTab("strategies")}
          className="hover:text-foreground text-[10px] font-normal lowercase tracking-normal text-muted-foreground transition-colors"
        >
          kelola
        </button>
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0.5">
        {strategies.map((strat) => (
          <SidebarMenuItem key={strat.strategyId}>
            <SidebarMenuButton
              onClick={() => setActiveTab("strategies")}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground justify-between group/strat"
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className={`size-1.5 rounded-full shrink-0 ${
                    strat.isEnabled
                      ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                      : "bg-muted-foreground/30"
                  }`}
                />
                <span className="truncate font-medium">{strat.name}</span>
              </div>
              <Badge
                variant="outline"
                className="font-mono text-[9px] px-1 py-0 h-4 border-muted-foreground/20 text-muted-foreground shrink-0"
              >
                {strat.timeframe}
              </Badge>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
