import React from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Info,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCryptoSpike } from "@/context/trading-context";
import type { AppNotification } from "@/types/trading";

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAllNotificationsAsRead,
    clearNotifications,
    setActiveTab,
  } = useCryptoSpike();

  const getIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "tp":
        return <Target className="size-4 text-emerald-500 shrink-0" />;
      case "sl":
        return <ShieldAlert className="size-4 text-rose-500 shrink-0" />;
      case "new_signal":
        return <TrendingUp className="size-4 text-blue-500 shrink-0" />;
      default:
        return <Info className="size-4 text-muted-foreground shrink-0" />;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative size-8 rounded-full border-border bg-background"
          aria-label="Notifikasi"
        >
          <Bell className="size-4 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 border border-border shadow-2xl bg-card text-card-foreground rounded-xl overflow-hidden z-50 backdrop-blur-none"
      >
        {/* Header Notification */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/60">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifikasi</h3>
            <Badge
              variant="secondary"
              className="text-[11px] font-mono px-1.5 py-0"
            >
              {notifications.length}/100
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllNotificationsAsRead}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Tandai semua dibaca"
              >
                <CheckCheck className="size-3.5 mr-1" />
                Baca Semua
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearNotifications}
                className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                title="Bersihkan notifikasi"
              >
                <Trash2 className="size-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* List Items */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Bell className="size-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Belum ada notifikasi</p>
              <p className="text-xs text-muted-foreground/80 mt-1">
                Sinyal baru, TP, SL, dan penutupan posisi akan tampil di sini
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  // Direct to signals or positions tab if relevant
                  if (item.type === "new_signal") {
                    setActiveTab("signals");
                  } else if (item.type === "tp" || item.type === "sl") {
                    setActiveTab("positions");
                  }
                }}
                className={`group flex items-start gap-3 p-3 text-xs transition-colors cursor-pointer hover:bg-muted/50 ${
                  !item.read ? "bg-primary/5" : ""
                }`}
              >
                <div className="mt-0.5">{getIcon(item.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-semibold truncate text-foreground">
                      {item.title}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>
                </div>
                {!item.read && (
                  <span className="mt-1.5 size-1.5 rounded-full bg-blue-500 shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
