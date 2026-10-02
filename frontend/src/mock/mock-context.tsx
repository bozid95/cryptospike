import React, { createContext, useContext, useEffect, useState } from "react";
import {
  INITIAL_CONFIG,
  INITIAL_SIGNALS,
  INITIAL_STRATEGIES,
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
}

const CryptoSpikeContext = createContext<CryptoSpikeContextType | undefined>(
  undefined,
);

const STRATEGIES_KEY = "cryptospike_mock_strategies_v2";
const SIGNALS_KEY = "cryptospike_mock_signals_v3";
const CONFIG_KEY = "cryptospike_mock_config_v2";

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

  useEffect(() => {
    localStorage.setItem(STRATEGIES_KEY, JSON.stringify(strategies));
  }, [strategies]);

  useEffect(() => {
    localStorage.setItem(SIGNALS_KEY, JSON.stringify(signals));
  }, [signals]);

  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  // Strategy operations
  const toggleStrategy = (strategyId: string) => {
    setStrategies((prev) =>
      prev.map((s) =>
        s.strategyId === strategyId
          ? {
              ...s,
              isEnabled: !s.isEnabled,
              updatedAt: new Date().toISOString(),
            }
          : s,
      ),
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

  // Config operations
  const updateConfig = (updated: Partial<TradingConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
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
