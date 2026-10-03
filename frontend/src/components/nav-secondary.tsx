import * as React from "react";
import {
  HelpCircleIcon,
  KeyIcon,
  RadioIcon,
  ShieldAlertIcon,
  SlidersIcon,
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

export function NavSecondary({
  ...props
}: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const { activeTab, setActiveTab, config } = useCryptoSpike();

  const items = [
    {
      id: "binance-config",
      title: "Binance API & Keys",
      icon: KeyIcon,
      badge: config.environment,
      badgeVariant: "outline" as const,
    },
    {
      id: "execution-settings",
      title: "Risk & Bot Limits",
      icon: SlidersIcon,
      badge: `${config.leverage}x`,
      badgeVariant: "secondary" as const,
    },
  ];

  return (
    <SidebarGroup {...props}>
      <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 px-2 mb-0.5">
        Configuration
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0.5">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                isActive={isActive}
                onClick={() => setActiveTab(item.id)}
                className={`h-9 px-2.5 font-medium transition-all ${
                  isActive
                    ? "bg-accent text-accent-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <item.icon
                  className={`size-4 shrink-0 ${
                    isActive ? "text-primary" : "text-muted-foreground/80"
                  }`}
                />
                <span className="truncate flex-1 text-xs">{item.title}</span>
                <Badge
                  variant={item.badgeVariant}
                  className="font-mono text-[10px] px-1.5 py-0 h-4 border-muted-foreground/20 text-muted-foreground"
                >
                  {item.badge}
                </Badge>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
