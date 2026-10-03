import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import {
  INITIAL_CONFIG,
  INITIAL_SIGNALS,
  INITIAL_STRATEGIES,
  type AppNotification,
  type AuthUser,
  type BinanceBalanceInfo,
  type PositionItem,
  type ClosedPositionItem,
  type SignalItem,
  type StrategyItem,
  type TradingConfig,
} from "@/types/trading";

interface CryptoSpikeContextType {
  // Authentication
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;

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

  // Closed Positions History
  closedPositions: ClosedPositionItem[];
  clearClosedPositions: () => void;

  // Realtime Push Notifications Center (Max 100)
  notifications: AppNotification[];
  unreadCount: number;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
}

const CryptoSpikeContext = createContext<CryptoSpikeContextType | undefined>(
  undefined,
);

const ACTIVE_TAB_KEY = "cryptospike_active_tab";
const STRATEGIES_KEY = "cryptospike_mock_strategies_v2";
const SIGNALS_KEY = "cryptospike_mock_signals_v3";
const CONFIG_KEY = "cryptospike_mock_config_v3";
const TOKEN_KEY = "cryptospike_jwt_token";
const USER_KEY = "cryptospike_auth_user";
const CLOSED_POSITIONS_KEY = "cryptospike_closed_positions_v1";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? ""
    : "http://localhost:3001");

export function CryptoSpikeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = Boolean(token);

  const login = async (
    username: string,
    password: string,
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.accessToken) {
        return {
          success: false,
          message:
            data.message || "Login failed. Check your username and password.",
        };
      }

      setToken(data.accessToken);
      setUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Failed to reach authentication server.",
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  // Helper untuk authenticated fetch yang otomatis melampirkan Bearer JWT token & Client Signature
  const authFetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const currentToken =
      token ||
      (typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null);
    const headers = new Headers(init?.headers || {});
    if (currentToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${currentToken}`);
    }
    if (!headers.has("x-cryptospike-client")) {
      headers.set("x-cryptospike-client", "cspk-client-app-v1-pub");
    }
    const res = await fetch(input, { ...init, headers });
    if (res.status === 401 && currentToken) {
      logout();
    }
    return res;
  };

  const [activeTab, setActiveTabState] = useState<string>(() => {
    // 1. Cek URL Hash terlebih dahulu (misal: #positions, #signals, #config)
    const hash = window.location.hash.replace("#", "").trim();
    if (
      hash &&
      ["overview", "positions", "signals", "strategies", "config"].includes(
        hash,
      )
    ) {
      return hash;
    }
    // 2. Cek localStorage
    try {
      const savedTab = localStorage.getItem(ACTIVE_TAB_KEY);
      if (
        savedTab &&
        ["overview", "positions", "signals", "strategies", "config"].includes(
          savedTab,
        )
      ) {
        return savedTab;
      }
    } catch {
      // ignore
    }
    return "overview";
  });

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, tab);
      window.location.hash = tab;
    } catch {
      // ignore
    }
  };

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

  const [closedPositions, setClosedPositions] = useState<ClosedPositionItem[]>(
    () => {
      try {
        const saved = localStorage.getItem(CLOSED_POSITIONS_KEY);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    },
  );

  const NOTIFICATIONS_KEY = "cryptospike_notifications_history_v1";
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      try {
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
    try {
      localStorage.removeItem(NOTIFICATIONS_KEY);
    } catch {
      // ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchClosedPositions = async () => {
    try {
      const res = await authFetch(
        `${API_BASE_URL}/api/positions/history?limit=300`,
      );
      if (res.ok) {
        const json = await res.json();
        if (json.items && Array.isArray(json.items)) {
          setClosedPositions(json.items);
          localStorage.setItem(
            CLOSED_POSITIONS_KEY,
            JSON.stringify(json.items),
          );
        }
      }
    } catch (e) {
      console.warn("Could not fetch closed positions from DB API:", e);
    }
  };

  const clearClosedPositions = async () => {
    setClosedPositions([]);
    try {
      localStorage.removeItem(CLOSED_POSITIONS_KEY);
      await authFetch(`${API_BASE_URL}/api/positions/history/clear`, {
        method: "POST",
      });
    } catch {
      // ignore
    }
  };

  const refreshBalance = async () => {
    try {
      setIsLoadingBalance(true);
      const res = await authFetch(`${API_BASE_URL}/api/binance/balance`);
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
      const res = await authFetch(`${API_BASE_URL}/api/positions`);
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
      // Temukan data posisi sebelum di-close untuk history lokal instan
      const existingPos = positions.find((p) => p.symbol === symbol);

      const res = await authFetch(`${API_BASE_URL}/api/positions/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, positionAmt, side }),
      });
      if (res.ok) {
        if (existingPos) {
          const closedItem: ClosedPositionItem = {
            id: `close-${Date.now()}-${symbol}`,
            symbol: existingPos.symbol,
            side: existingPos.side,
            entryPrice: existingPos.entryPrice,
            exitPrice: existingPos.markPrice,
            positionAmt: existingPos.positionAmt,
            realizedPnl: existingPos.unRealizedProfit,
            roe: existingPos.roe,
            leverage: existingPos.leverage,
            strategy: existingPos.strategy,
            closedAt: new Date().toISOString(),
            closeReason: "Manual Operator Close",
          };

          setClosedPositions((prev) => {
            const next = [closedItem, ...prev].slice(0, 300);
            try {
              localStorage.setItem(CLOSED_POSITIONS_KEY, JSON.stringify(next));
            } catch {
              // ignore
            }
            return next;
          });
        }

        await refreshPositions();
        await refreshBalance();
        void fetchClosedPositions();
        toast.success(`Position ${symbol} closed successfully`, {
          description: existingPos
            ? `PnL: $${existingPos.unRealizedProfit} (${existingPos.roe}%)`
            : "Market close order sent to Binance.",
        });
        return true;
      }
      toast.error(`Failed to close position ${symbol}`);
      return false;
    } catch (err) {
      console.error("Failed to close position:", err);
      toast.error(`Failed to close position ${symbol}`);
      return false;
    }
  };

  // Load initial config dari DB backend (Hanya jika admin login)
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchDbConfig = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/config`);
        if (res.ok) {
          const dbConfig = (await res.json()) as TradingConfig;
          setConfig(dbConfig);
        }
      } catch (e) {
        console.warn("Could not load config from DB API:", e);
      }
    };
    void fetchDbConfig();
  }, [isAuthenticated]);

  // Load strategies dari backend Registry (DB PostgreSQL) (Hanya jika admin login)
  const fetchDbStrategies = async (signalsData?: SignalItem[]) => {
    if (!isAuthenticated) return;
    try {
      const res = await authFetch(`${API_BASE_URL}/api/strategies`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const activeSignalsList = signalsData || signals;
          const mapped: StrategyItem[] = data.map((s: any) => {
            const key = s.key || s.id;
            // Hitung sinyal real dari database yang cocok persis dengan strategi ini (key: breakout_1h_v1 vs breakout_1h_v2)
            const stratSignals = activeSignalsList.filter(
              (sig) => sig.strategy === key,
            );
            const totalCount = stratSignals.length;
            const hitCount = stratSignals.filter(
              (sig) =>
                sig.status?.includes("TP") ||
                (typeof sig.profitPct === "number" && sig.profitPct > 0),
            ).length;
            const lossCount = stratSignals.filter(
              (sig) =>
                sig.status === "SL_HIT" ||
                (typeof sig.profitPct === "number" && sig.profitPct < 0),
            ).length;
            const closedCount = hitCount + lossCount;
            const wr =
              closedCount > 0
                ? `${((hitCount / closedCount) * 100).toFixed(1)}%`
                : "0.0%";

            // Hitung akumulasi PnL (%) yang dihasilkan oleh strategi
            let totalPnl = 0;
            for (const sig of stratSignals) {
              if (typeof sig.profitPct === "number" && !isNaN(sig.profitPct)) {
                totalPnl += sig.profitPct;
              }
            }

            const avgPnl = closedCount > 0 ? totalPnl / closedCount : 0;

            return {
              strategyId: key,
              name: s.displayName || s.id,
              timeframe: s.timeframe || "1h",
              description: s.description || "",
              isEnabled: s.isEnabled ?? true,
              version: s.version || "v1",
              author: s.author || "System",
              indicators: Array.isArray(s.indicators) ? s.indicators : [],
              winrate: wr,
              totalSignals: totalCount,
              winSignals: hitCount,
              lossSignals: lossCount,
              totalPnlPct: parseFloat(totalPnl.toFixed(2)),
              avgProfitPct: parseFloat(avgPnl.toFixed(2)),
              updatedAt: new Date().toISOString(),
            };
          });
          setStrategies(mapped);
        }
      }
    } catch (e) {
      console.warn("Could not load strategies from BE API:", e);
    }
  };

  // Load signals dari database PostgreSQL backend
  const fetchDbSignals = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/signals?limit=500`);
      if (res.ok) {
        const json = await res.json();
        if (json.items && Array.isArray(json.items) && json.items.length > 0) {
          setSignals(json.items);
          void fetchDbStrategies(json.items);
        }
      }
    } catch (e) {
      console.warn("Could not load signals from DB API:", e);
    }
  };

  // Audio notification synth using Web Audio API
  const playNotificationSound = (type: "new_signal" | "tp" | "sl" | "info") => {
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === "tp") {
        // Nada sukses / naik (dua nada naik C5 -> G5)
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === "sl") {
        // Nada peringatan turun (G4 -> C4)
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(392.0, now);
        osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.25);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        // Nada sinyal baru (bell chime chime)
        osc.type = "triangle";
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.12); // A5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch {
      // Audio context might be blocked if user hasn't interacted
    }
  };

  const sendPushNotification = (
    title: string,
    body: string,
    type: "new_signal" | "tp" | "sl" | "info" = "info",
  ) => {
    // 0. Simpan ke history notifikasi (maksimal 100)
    const newNotifItem: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title,
      message: body,
      type,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => {
      const updated = [newNotifItem, ...prev].slice(0, 100);
      try {
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    // 1. Play sound
    playNotificationSound(type);

    // 2. In-App Toast via Sonner
    if (type === "new_signal") {
      toast.info(title, {
        description: body,
        duration: 8000,
      });
    } else if (type === "tp") {
      toast.success(title, {
        description: body,
        duration: 8000,
      });
    } else if (type === "sl") {
      toast.error(title, {
        description: body,
        duration: 8000,
      });
    } else {
      toast(title, {
        description: body,
        duration: 5000,
      });
    }

    // 3. Browser Desktop Notification jika didukung & diizinkan
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
        });
      } catch (err) {
        console.warn("Failed to trigger desktop notification:", err);
      }
    }
  };

  // Minta izin notifikasi browser saat mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    void fetchDbSignals();

    // Koneksi Realtime WebSocket ke Backend NestJS
    const socket = io(API_BASE_URL || window.location.origin, {
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

      // Trigger Push Notification
      const sideText = (newSig as any).side || (newSig as any).type || "LONG";
      const icon = sideText === "LONG" ? "🟢" : "🔴";
      sendPushNotification(
        `${icon} New Signal: ${newSig.symbol} (${sideText})`,
        `Entry: ${newSig.entryPrice.toLocaleString()} | TP1: ${newSig.tp1.toLocaleString()} | SL: ${newSig.sl.toLocaleString()} [${newSig.strategy}]`,
        "new_signal",
      );
    });

    // Menerima update status sinyal (TP1 hit, SL hit, close)
    socket.on(
      "signal_status_update",
      (update: {
        id: string;
        status: SignalItem["status"];
        profitPct?: number;
      }) => {
        setSignals((prev) => {
          const matched = prev.find((s) => s.id === update.id);
          if (matched) {
            const sym = matched.symbol;
            const pPct =
              typeof update.profitPct === "number"
                ? `${update.profitPct > 0 ? "+" : ""}${update.profitPct.toFixed(2)}%`
                : "";

            if (update.status === "TP1_HIT") {
              sendPushNotification(
                `🎯 Take Profit 1 Hit: ${sym}!`,
                `TP1 target reached. Profit ${pPct}. Strategy: ${matched.strategy}`,
                "tp",
              );
            } else if (update.status === "TP2_HIT") {
              sendPushNotification(
                `🎯🎯 Take Profit 2 Hit: ${sym}!`,
                `TP2 target reached! Profit ${pPct}.`,
                "tp",
              );
            } else if (update.status === "TP3_HIT") {
              sendPushNotification(
                `🚀🚀 Take Profit 3 (MAX) Hit: ${sym}!`,
                `Maximum TP3 target reached! Profit ${pPct}.`,
                "tp",
              );
            } else if (update.status === "TSL_HIT") {
              sendPushNotification(
                `🛡️ Trailing Stop Hit: ${sym}`,
                `Trailing stop triggered to lock in profit ${pPct}.`,
                "tp",
              );
            } else if (update.status === "SL_HIT") {
              sendPushNotification(
                `🛑 Stop Loss Hit: ${sym}`,
                `Signal hit stop loss threshold (${pPct || "Loss"}).`,
                "sl",
              );
            } else if (
              (update.status as string) === "CLOSED" ||
              update.status === "CANCELLED"
            ) {
              sendPushNotification(
                `ℹ️ Position Closed: ${sym}`,
                `Signal position concluded. PnL: ${pPct}.`,
                "info",
              );
            }
          }

          return prev.map((s) =>
            s.id === update.id
              ? {
                  ...s,
                  status: update.status,
                  profitPct: update.profitPct ?? s.profitPct,
                }
              : s,
          );
        });
      },
    );

    // Menerima update harga mark realtime khusus untuk open positions dan active signals
    socket.on(
      "position_price_update",
      (update: { symbol: string; markPrice: number }) => {
        // 1. Update Open Positions (Binance)
        setPositions((prev) =>
          prev.map((p) => {
            if (p.symbol === update.symbol) {
              const newMarkPrice = update.markPrice;
              const isLong = p.side === "LONG";
              const unRealizedProfit = isLong
                ? (newMarkPrice - p.entryPrice) * p.positionAmt
                : (p.entryPrice - newMarkPrice) * p.positionAmt;
              const roe =
                p.initialMargin > 0
                  ? (unRealizedProfit / p.initialMargin) * 100
                  : 0;

              return {
                ...p,
                markPrice: newMarkPrice,
                unRealizedProfit: parseFloat(unRealizedProfit.toFixed(2)),
                roe: parseFloat(roe.toFixed(2)),
                notional: parseFloat((p.positionAmt * newMarkPrice).toFixed(2)),
              };
            }
            return p;
          }),
        );

        // 2. Update Active Signals (Floating PnL % & Current Price)
        setSignals((prev) =>
          prev.map((s) => {
            if (
              s.symbol === update.symbol &&
              (s.status === "ACTIVE" ||
                s.status === "TP1_HIT" ||
                s.status === "TP2_HIT")
            ) {
              const isLong = s.side === "LONG";
              const currentPrice = update.markPrice;
              const floatingProfitPct = isLong
                ? ((currentPrice - s.entryPrice) / s.entryPrice) * 100
                : ((s.entryPrice - currentPrice) / s.entryPrice) * 100;

              return {
                ...s,
                currentPrice,
                profitPct: parseFloat(floatingProfitPct.toFixed(2)),
              };
            }
            return s;
          }),
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
    // Jangan panggil API privat (balance, positions, closed positions) jika pengunjung publik belum login
    if (!isAuthenticated) return;

    void refreshBalance();
    void refreshPositions();
    void fetchClosedPositions();
    const interval = setInterval(() => {
      void refreshBalance();
      void refreshPositions();
    }, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

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
          authFetch(`${API_BASE_URL}/api/strategies/${strategyId}/toggle`, {
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
    const nowIso = new Date().toISOString();
    const newSignal: SignalItem = {
      ...signal,
      id: `sig-${Date.now().toString().slice(-4)}`,
      sentAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setSignals((prev) => [newSignal, ...prev]);
  };

  const updateSignalStatus = (
    id: string,
    status: SignalItem["status"],
    profitPct?: number,
  ) => {
    const nowIso = new Date().toISOString();
    setSignals((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status,
              profitPct: profitPct ?? s.profitPct,
              updatedAt: nowIso,
              hitTime: nowIso,
            }
          : s,
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
      authFetch(`${API_BASE_URL}/api/config`, {
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
        user,
        token,
        isAuthenticated: Boolean(token),
        login,
        logout,
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
        closedPositions,
        clearClosedPositions,
        notifications,
        unreadCount,
        markAllNotificationsAsRead,
        clearNotifications,
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

export const useTrading = useCryptoSpike;
export const TradingProvider = CryptoSpikeProvider;
