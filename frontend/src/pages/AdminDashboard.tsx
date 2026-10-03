import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings, BarChart3, Zap, Power } from "lucide-react";

// Mock data dari StrategyConfig DB
const MOCK_STRATEGIES = [
  {
    id: "breakout_1h_v1",
    name: "Breakout 1H",
    version: "v1",
    isEnabled: true,
    winrate: "66.67%",
  },
  {
    id: "breakout_1h_v2",
    name: "Breakout 1H (Enhanced)",
    version: "v2",
    isEnabled: false,
    winrate: "72.65%",
  },
  {
    id: "prepump_15m_v1",
    name: "Pre-pump 15M",
    version: "v1",
    isEnabled: true,
    winrate: "67.42%",
  },
  {
    id: "btc_session_v1",
    name: "BTC Session Drop",
    version: "v1",
    isEnabled: true,
    winrate: "77.59%",
  },
];

export function AdminDashboard() {
  const [strategies, setStrategies] = useState(MOCK_STRATEGIES);

  const toggleStrategy = (id: string) => {
    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isEnabled: !s.isEnabled } : s)),
    );
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage system configuration, strategy modules, and run analytics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Mini */}
        <div className="flex flex-col space-y-2">
          <button className="flex items-center gap-3 bg-secondary/50 text-foreground px-4 py-3 rounded-lg text-sm font-medium border border-border">
            <Zap size={18} className="text-primary" />
            Strategy Manager
          </button>
          <button className="flex items-center gap-3 hover:bg-secondary/30 text-muted-foreground hover:text-foreground transition-colors px-4 py-3 rounded-lg text-sm font-medium">
            <BarChart3 size={18} />
            Performance / Winrate
          </button>
          <button className="flex items-center gap-3 hover:bg-secondary/30 text-muted-foreground hover:text-foreground transition-colors px-4 py-3 rounded-lg text-sm font-medium">
            <Settings size={18} />
            Trading Config
          </button>
        </div>

        {/* Main Panel - Strategy Manager */}
        <div className="col-span-1 md:col-span-3 space-y-4">
          <Card className="bg-[#181a20]">
            <CardHeader>
              <CardTitle>Strategy Manager</CardTitle>
              <CardDescription>
                Enable or disable strategy modules independently. Disabled strategies
                will not process market data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {strategies.map((strategy) => (
                  <div
                    key={strategy.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">
                          {strategy.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase text-muted-foreground"
                        >
                          {strategy.version}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground font-mono">
                        ID: {strategy.id}
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="bg-secondary/50">
                          Winrate: {strategy.winrate}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <Switch
                        checked={strategy.isEnabled}
                        onCheckedChange={() => toggleStrategy(strategy.id)}
                      />
                      <span
                        className={`text-xs font-bold ${strategy.isEnabled ? "text-success" : "text-muted-foreground"}`}
                      >
                        {strategy.isEnabled ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
