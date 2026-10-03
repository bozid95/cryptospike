import React, { useState } from "react";
import { SignalCard } from "@/components/signals/SignalCard";
import { Activity } from "lucide-react";

// Mock data based on Prisma Schema
const MOCK_SIGNALS = [
  {
    id: "1",
    symbol: "BTCUSDT",
    side: "LONG" as const,
    strategy: "btc_session_v1",
    entryPrice: 65200.5,
    sl: 64500.0,
    tp1: 66000.0,
    tp2: 67500.0,
    tp3: 69000.0,
    status: "ACTIVE",
    sentAt: new Date().toISOString(),
  },
  {
    id: "2",
    symbol: "SOLUSDT",
    side: "SHORT" as const,
    strategy: "breakout_1h_v2",
    entryPrice: 150.25,
    sl: 155.0,
    tp1: 145.0,
    tp2: 138.0,
    status: "TP1_HIT",
    sentAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    id: "3",
    symbol: "ETHUSDT",
    side: "LONG" as const,
    strategy: "prepump_15m_v1",
    entryPrice: 3200.0,
    sl: 3150.0,
    tp1: 3300.0,
    status: "ACTIVE",
    sentAt: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
  },
];

export function Dashboard() {
  const [signals, setSignals] = useState(MOCK_SIGNALS);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Live Signals
          </h1>
          <p className="text-muted-foreground">
            Real-time algorithmic trading signals by CryptoSpike.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-secondary/50 border border-border px-4 py-2 rounded-lg text-sm">
          <Activity size={16} className="text-[#0ecb81]" />
          <span className="font-semibold text-[#0ecb81]">System Online</span>
        </div>
      </div>

      {/* Signals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {signals.map((sig) => (
          <SignalCard key={sig.id} signal={sig} />
        ))}
      </div>
    </div>
  );
}
