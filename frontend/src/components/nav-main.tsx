"use client";

import { type LucideIcon } from "lucide-react";

import { useCryptoSpike } from "@/context/trading-context";
import { Badge } from "@/components/ui/badge";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export interface NavItem {
  title: string;
  url: string;
  id?: string;
  icon?: LucideIcon;
  badge?: string | number;
  badgeVariant?: "default" | "secondary" | "outline" | "destructive";
}

export function NavMain({
  label,
  items,
}: {
  label?: string;
  items: NavItem[];
}) {
  const { activeTab, setActiveTab } = useCryptoSpike();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleSelect = (tabId: string) => {
    setActiveTab(tabId);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarGroup>
      {label && (
        <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 px-2 mb-0.5">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarMenu className="gap-0.5">
        {items.map((item) => {
          const tabId = item.id || item.url.replace("#", "");
          const isActive = activeTab === tabId;

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                isActive={isActive}
                onClick={() => handleSelect(tabId)}
                tooltip={item.title}
                className={`h-9 px-2.5 font-medium transition-all ${
                  isActive
                    ? "bg-accent text-accent-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {item.icon && (
                  <item.icon
                    className={`size-4 shrink-0 transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground/80"
                    }`}
                  />
                )}
                <span className="truncate flex-1 text-xs">{item.title}</span>
                {item.badge !== undefined && (
                  <Badge
                    variant={item.badgeVariant || "secondary"}
                    className="ml-auto font-mono text-[10px] px-1.5 py-0 h-4 min-w-4 justify-center"
                  >
                    {item.badge}
                  </Badge>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
