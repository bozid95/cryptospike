import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Clock,
} from "lucide-react";

interface Signal {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  strategy: string;
  entryPrice: number;
  sl: number;
  tp1: number;
  tp2?: number;
  tp3?: number;
  status: string;
  sentAt: string;
}

export function SignalCard({ signal }: { signal: Signal }) {
  const isLong = signal.side === "LONG";

  // Format date
  const dateObj = new Date(signal.sentAt);
  const timeStr = dateObj.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${isLong ? "bg-[#0ecb81]/20 text-[#0ecb81]" : "bg-[#f6465d]/20 text-[#f6465d]"}`}
          >
            {isLong ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">{signal.symbol}</h3>
            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Clock size={12} /> {timeStr}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Badge
            className={
              isLong
                ? "bg-[#0ecb81] hover:bg-[#0ecb81]/80 text-black"
                : "bg-[#f6465d] hover:bg-[#f6465d]/80 text-white"
            }
          >
            {signal.side}
          </Badge>
          <Badge
            variant="outline"
            className="text-[10px] uppercase tracking-wider text-muted-foreground border-border"
          >
            {signal.strategy}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm mt-2 p-3 bg-secondary/50 rounded-md">
          {/* Entry */}
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs font-medium mb-1">
              ENTRY PRICE
            </span>
            <span className="font-mono font-semibold">{signal.entryPrice}</span>
          </div>

          {/* Stop Loss */}
          <div className="flex flex-col items-end">
            <span className="text-muted-foreground text-xs font-medium flex items-center gap-1 mb-1">
              <ShieldAlert size={12} /> STOP LOSS
            </span>
            <span className="font-mono font-semibold text-[#f6465d]">
              {signal.sl}
            </span>
          </div>

          {/* Targets */}
          <div className="col-span-2 pt-2 border-t border-border/50 flex justify-between items-center">
            <div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
              <Target size={14} /> TARGETS
            </div>
            <div className="flex gap-3">
              <span className="font-mono text-[#0ecb81] font-semibold">
                {signal.tp1}
              </span>
              {signal.tp2 && (
                <span className="font-mono text-[#0ecb81]/80 font-medium">
                  {signal.tp2}
                </span>
              )}
              {signal.tp3 && (
                <span className="font-mono text-[#0ecb81]/60 font-medium">
                  {signal.tp3}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
