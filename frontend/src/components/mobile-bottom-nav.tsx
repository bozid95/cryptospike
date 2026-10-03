import React from "react";
import {
  BriefcaseIcon,
  CpuIcon,
  LayoutDashboardIcon,
  RadioIcon,
  SlidersIcon,
} from "lucide-react";
import { useCryptoSpike } from "@/context/trading-context";
import { Badge } from "@/components/ui/badge";

export function MobileBottomNav() {
  const { activeTab, setActiveTab, signals, positions, isAuthenticated } = useCryptoSpike();

  if (!isAuthenticated) {
    return null;
  }

  const activeSignalsCount = signals.filter(
    (s) => s.status === "ACTIVE",
  ).length;
  const activePositionsCount = positions.length;

  const navItems = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboardIcon,
    },
    {
      id: "positions",
      label: "Positions",
      icon: BriefcaseIcon,
      badge: activePositionsCount > 0 ? activePositionsCount : undefined,
      badgeColor: "bg-indigo-600",
    },
    {
      id: "signals",
      label: "Signals",
      icon: RadioIcon,
      badge: activeSignalsCount > 0 ? activeSignalsCount : undefined,
      badgeColor: "bg-emerald-600",
    },
    {
      id: "strategies",
      label: "Strategies",
      icon: CpuIcon,
    },
    {
      id: "config",
      label: "Settings",
      icon: SlidersIcon,
    },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border px-2 py-1.5 flex items-center justify-around shadow-lg pb-[env(safe-area-inset-bottom,6px)]">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg transition-colors cursor-pointer select-none ${
              isActive
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="relative">
              <Icon
                className={`size-5 transition-transform ${isActive ? "scale-110" : ""}`}
              />
              {item.badge !== undefined && (
                <span
                  className={`absolute -top-1.5 -right-2.5 size-4 rounded-full text-[9px] font-mono font-bold text-white flex items-center justify-center shadow-xs ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight leading-none">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
