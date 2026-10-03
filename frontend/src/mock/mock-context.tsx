import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  INITIAL_CONFIG,
  INITIAL_SIGNALS,
  INITIAL_STRATEGIES,
  type BinanceBalanceInfo,
  type PositionItem,
  type SignalItem,
  type StrategyItem,
  type TradingConfig,
} from "./mock-data";

interface CryptoSpikeContextType {
  // Navigation active tab
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Strategies CRUD
  strategies: StrategyItem[];
  toggleStrategy: (strategyId: string) => void;
  createStrategy: (
    strategy: Omit<StrategyItem, "updatedAt" | "totalSignals" | "winrate">,
  ) => void;
  updateStrategy: (strategyId: string, updated: Partial<StrategyItem>) => void;
  deleteStrategy: (strategyId: string) => void;

  // Signals CRUD
  signals: SignalItem[];
  createSignal: (signal: Omit<SignalItem, "id" | "sentAt">) => void;
  updateSignalStatus: (
    id: string,
    status: SignalItem["status"],
    profitPct?: number,
  ) => void;
  deleteSignal: (id: string) => void;

  // Config CRUD
  config: TradingConfig;
  updateConfig: (updated: Partial<TradingConfig>) => void;

  // Real Binance Balance
  balance: BinanceBalanceInfo | null;
  isLoadingBalance: boolean;
  refreshBalance: () => Promise<void>;

  // Real Binance Positions
  positions: PositionItem[];
  isLoadingPositions: boolean;
  refreshPositions: () => Promise<void>;
  closePosition: (
    symbol: string,
    positionAmt: number,
    side?: string,
  ) => Promise<boolean>;
}

const CryptoSpikeContext = createContext<CryptoSpikeContextType | undefined>(
  undefined,
);

const STRATEGIES_KEY = "cryptospike_mock_strategies_v2";
const SIGNALS_KEY = "cryptospike_mock_signals_v3";
const CONFIG_KEY = "cryptospike_mock_config_v3";

export function CryptoSpikeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState("overview");

  const [strategies, setStrategies] = useState<StrategyItem[]>(() => {
    try {
      const saved = localStorage.getItem(STRATEGIES_KEY);
      return saved ? JSON.parse(saved) : INITIAL_STRATEGIES;
    } catch (e) {
      console.warn(
        "Failed to load strategies from storage, falling back to initial",
        e,
      );
      return INITIAL_STRATEGIES;
    }
  });

  const [signals, setSignals] = useState<SignalItem[]>(() => {
    try {
      const saved = localStorage.getItem(SIGNALS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_SIGNALS;
    } catch (e) {
      console.warn(
        "Failed to load signals from storage, falling back to initial",
        e,
      );
      return INITIAL_SIGNALS;
    }
  });

  const [config, setConfig] = useState<TradingConfig>(() => {
    try {
      const saved = localStorage.getItem(CONFIG_KEY);
      return saved ? JSON.parse(saved) : INITIAL_CONFIG;
    } catch (e) {
      console.warn(
        "Failed to load config from storage, falling back to initial",
        e,
      );
      return INITIAL_CONFIG;
    }
  });

  const [balance, setBalance] = useState<BinanceBalanceInfo | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);

  const refreshBalance = async () => {
    try {
      setIsLoadingBalance(true);
      const res = await fetch("http://localhost:3001/api/binance/balance");
      if (res.ok) {
        const data = (await res.json()) as BinanceBalanceInfo;
        setBalance(data);
      }
    } catch (err) {
      console.warn("Could not fetch live Binance balance:", err);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const refreshPositions = async () => {
    try {
      setIsLoadingPositions(true);
      const res = await fetch("http://localhost:3001/api/positions");
      if (res.ok) {
        const data = (await res.json()) as PositionItem[];
        setPositions(data);
      }
    } catch (err) {
      console.warn("Could not fetch live Binance positions:", err);
    } finally {
      setIsLoadingPositions(false);
    }
  };

  const closePosition = async (
    symbol: string,
    positionAmt: number,
    side?: string,
  ): Promise<boolean> => {
    try {
      const res = await fetch("http://localhost:3001/api/positions/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, positionAmt, side }),
      });
      if (res.ok) {
        await refreshPositions();
        await refreshBalance();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to close position:", err);
      return false;
    }
  };

  // Load initial config dari DB backend
  useEffect(() => {
    const fetchDbConfig = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/config");
        if (res.ok) {
          const dbConfig = (await res.json()) as TradingConfig;
          setConfig(dbConfig);
        }
      } catch (e) {
        console.warn("Could not load config from DB API:", e);
      }
    };
    void fetchDbConfig();
  }, []);

  // Load strategies dari backend Registry (DB PostgreSQL)
  const fetchDbStrategies = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/strategies");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: StrategyItem[] = data.map((s: any) => ({
            strategyId: s.key || s.id,
            name: s.displayName || s.id,
            timeframe: s.timeframe || "1h",
            description: s.description || "",
            isEnabled: s.isEnabled ?? true,
            version: s.version || "v1",
            author: s.author || "System",
            indicators: Array.isArray(s.indicators) ? s.indicators : [],
            winrate: "66.7%",
            totalSignals: 0,
            updatedAt: new Date().toISOString(),
          }));
          setStrategies(mapped);
        }
      }
    } catch (e) {
      console.warn("Could not load strategies from BE API:", e);
    }
  };

  useEffect(() => {
    void fetchDbStrategies();
  }, []);

  // Load signals dari database PostgreSQL backend
  const fetchDbSignals = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/signals?limit=100");
      if (res.ok) {
        const json = await res.json();
        if (json.items && Array.isArray(json.items) && json.items.length > 0) {
          setSignals(json.items);
        }
      }
    } catch (e) {
      console.warn("Could not load signals from DB API:", e);
    }
  };

  useEffect(() => {
    void fetchDbSignals();

    // Koneksi Realtime WebSocket ke Backend NestJS
    const socket = io("http://localhost:3001", {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("[WS Frontend] Connected to NestJS WebSocket Gateway");
    });

    // Menerima sinyal baru secara realtime (0 delay)
    socket.on("new_signal", (newSig: SignalItem) => {
      setSignals((prev) => {
        if (prev.some((s) => s.id === newSig.id)) return prev;
        return [newSig, ...prev];
      });
    });

    // Menerima update status sinyal (TP1 hit, SL hit, close)
    socket.on(
      "signal_status_update",
      (update: {
        id: string;
        status: SignalItem["status"];
        profitPct?: number;
      }) => {
        setSignals((prev) =>
          prev.map((s) =>
            s.id === update.id
              ? {
                  ...s,
                  status: update.status,
                  profitPct: update.profitPct ?? s.profitPct,
                }
              : s,
          ),
        );
      },
    );

    // Fallback polling berkala setiap 30 detik untuk safety
    const interval = setInterval(() => {
      void fetchDbSignals();
    }, 30000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    void refreshBalance();
    void refreshPositions();
    const interval = setInterval(() => {
      void refreshBalance();
      void refreshPositions();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem(STRATEGIES_KEY, JSON.stringify(strategies));
  }, [strategies]);

  useEffect(() => {
    localStorage.setItem(SIGNALS_KEY, JSON.stringify(signals));
  }, [signals]);

  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  // Strategy operations (Terkoneksi langsung ke Backend Registry & DB PostgreSQL)
  const toggleStrategy = (strategyId: string) => {
    setStrategies((prev) =>
      prev.map((s) => {
        if (s.strategyId === strategyId) {
          const nextState = !s.isEnabled;
          // Kirim ke backend untuk di-update di memory & DB
          fetch(`http://localhost:3001/api/strategies/${strategyId}/toggle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isEnabled: nextState }),
          }).catch((err) => {
            console.warn(`Failed to toggle strategy ${strategyId} on BE:`, err);
          });

          return {
            ...s,
            isEnabled: nextState,
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      }),
    );
  };

  const createStrategy = (
    strategy: Omit<StrategyItem, "updatedAt" | "totalSignals" | "winrate">,
  ) => {
    const newStrategy: StrategyItem = {
      ...strategy,
      winrate: "0.0%",
      totalSignals: 0,
      updatedAt: new Date().toISOString(),
    };
    setStrategies((prev) => [newStrategy, ...prev]);
  };

  const updateStrategy = (
    strategyId: string,
    updated: Partial<StrategyItem>,
  ) => {
    setStrategies((prev) =>
      prev.map((s) =>
        s.strategyId === strategyId
          ? { ...s, ...updated, updatedAt: new Date().toISOString() }
          : s,
      ),
    );
  };

  const deleteStrategy = (strategyId: string) => {
    setStrategies((prev) => prev.filter((s) => s.strategyId !== strategyId));
  };

  // Signal operations
  const createSignal = (signal: Omit<SignalItem, "id" | "sentAt">) => {
    const newSignal: SignalItem = {
      ...signal,
      id: `sig-${Date.now().toString().slice(-4)}`,
      sentAt: new Date().toISOString(),
    };
    setSignals((prev) => [newSignal, ...prev]);
  };

  const updateSignalStatus = (
    id: string,
    status: SignalItem["status"],
    profitPct?: number,
  ) => {
    setSignals((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status, profitPct: profitPct ?? s.profitPct } : s,
      ),
    );
  };

  const deleteSignal = (id: string) => {
    setSignals((prev) => prev.filter((s) => s.id !== id));
  };

  // Config operations (Tersimpan langsung ke database backend)
  const updateConfig = (updated: Partial<TradingConfig>) => {
    setConfig((prev) => {
      const merged = { ...prev, ...updated };
      // Kirim ke backend NestJS untuk di-persist ke PostgreSQL
      fetch("http://localhost:3001/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      })
        .then(() => {
          // Refresh saldo sesuai API key baru
          void refreshBalance();
        })
        .catch((err) => {
          console.warn("Failed to persist config to DB:", err);
        });

      return merged;
    });
  };

  return (
    <CryptoSpikeContext.Provider
      value={{
        activeTab,
        setActiveTab,
        strategies,
        toggleStrategy,
        createStrategy,
        updateStrategy,
        deleteStrategy,
        signals,
        createSignal,
        updateSignalStatus,
        deleteSignal,
        config,
        updateConfig,
        balance,
        isLoadingBalance,
        refreshBalance,
        positions,
        isLoadingPositions,
        refreshPositions,
        closePosition,
      }}
    >
      {children}
    </CryptoSpikeContext.Provider>
  );
}

export function useCryptoSpike() {
  const context = useContext(CryptoSpikeContext);
  if (!context) {
    throw new Error("useCryptoSpike must be used within a CryptoSpikeProvider");
  }
  return context;
}
