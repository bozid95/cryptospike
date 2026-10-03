export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "new_signal" | "tp" | "sl" | "info";
  timestamp: string;
  read: boolean;
}

export interface SignalItem {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  strength: "STRONG" | "NORMAL";
  entryPrice: number;
  currentPrice?: number;
  tp1: number;
  tp2?: number;
  tp3?: number;
  sl: number;
  score?: number;
  volume24h?: string;
  reasons?: string;
  strategy: string;
  triggerSource: string;
  status:
    | "ACTIVE"
    | "TP1_HIT"
    | "TP2_HIT"
    | "TP3_HIT"
    | "TSL_HIT"
    | "SL_HIT"
    | "CANCELLED";
  profitPct?: number;
  sentAt: string;
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string;
  hitTime?: string | null;
}

export interface StrategyItem {
  strategyId: string;
  name: string;
  timeframe: string;
  description: string;
  isEnabled: boolean;
  version?: string;
  author?: string;
  indicators?: string[];
  winrate?: string;
  totalSignals?: number;
  winSignals?: number;
  lossSignals?: number;
  totalPnlPct?: number;
  avgProfitPct?: number;
  updatedAt?: string;
}

export interface PositionItem {
  symbol: string;
  side: "LONG" | "SHORT";
  positionAmt: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  leverage: number;
  marginType: string;
  unRealizedProfit: number;
  roe: number;
  notional: number;
  initialMargin: number;
  orders?: Array<{
    orderId: number;
    type: string;
    side: string;
    price: number;
    origQty: number;
    reduceOnly: boolean;
  }>;
  strategy?: string;
  signalId?: string | null;
  signalStatus?: string | null;
  tp1?: number | null;
  tp2?: number | null;
  tp3?: number | null;
  sl?: number | null;
  createdAt?: string;
  updatedAt?: string;
  updateTime: number;
}

export interface ClosedPositionItem {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  positionAmt: number;
  realizedPnl: number;
  roe: number;
  leverage: number;
  strategy?: string;
  closedAt: string;
  closeReason?: string;
}

export interface BinanceBalanceInfo {
  environment: string;
  marginBalance?: number;
  walletBalanceUsd?: number;
  totalUsdtEquivalent?: number;
  usdtBalance: number;
  usdtAvailable: number;
  usdcBalance: number;
  btcBalance: number;
  assets: Array<{
    asset: string;
    balance: string;
    availableBalance: string;
  }>;
}

export interface TradingConfig {
  apiKey: string;
  apiSecret: string;
  environment: "TESTNET" | "PRODUCTION";
  leverage: number;
  marginType: "ISOLATED" | "CROSSED";
  maxOpenPositions: number;
  riskPerTradePct: number;
  autoExecute: boolean;
}

export const INITIAL_STRATEGIES: StrategyItem[] = [
  {
    strategyId: "breakout_1h_v1",
    name: "1H Breakout Momentum Engine",
    timeframe: "1h",
    description:
      "Mendeteksi lonjakan volume dan pergerakan breakout harga candle 1H.",
    isEnabled: false,
    version: "v1",
    author: "CryptoSpike Engine",
    indicators: ["Volume Spike", "Candle Range", "Momentum"],
    winrate: "0.0%",
    totalSignals: 0,
    winSignals: 0,
    lossSignals: 0,
    totalPnlPct: 0,
    avgProfitPct: 0,
    updatedAt: new Date().toISOString(),
  },
  {
    strategyId: "breakout_1h_v2",
    name: "1H Breakout MTF Enhanced",
    timeframe: "1h",
    description:
      "1-hour breakout dengan konfirmasi tren 4H EMA, proteksi RSI oversold, dan target TP/SL adaptif.",
    isEnabled: false,
    version: "v2",
    author: "CryptoSpike Engine",
    indicators: ["4H Trend EMA", "1H RSI", "Adaptive SL/TP", "Volume"],
    winrate: "0.0%",
    totalSignals: 0,
    winSignals: 0,
    lossSignals: 0,
    totalPnlPct: 0,
    avgProfitPct: 0,
    updatedAt: new Date().toISOString(),
  },
  {
    strategyId: "prepump_15m_v1",
    name: "Pre-Pump & Pre-Dump 15M Detector",
    timeframe: "15m",
    description:
      "Mendeteksi akumulasi/distribusi awal dan lonjakan volume sebelum impuls besar.",
    isEnabled: false,
    version: "v1",
    author: "CryptoSpike Engine",
    indicators: [
      "Taker Buy Ratio",
      "Volume Anomaly",
      "Consolidation Compression",
    ],
    winrate: "0.0%",
    totalSignals: 0,
    winSignals: 0,
    lossSignals: 0,
    totalPnlPct: 0,
    avgProfitPct: 0,
    updatedAt: new Date().toISOString(),
  },
  {
    strategyId: "crypto_savage_v1",
    name: "Crypto Savage v1 (Price Action Multi-Confluence)",
    timeframe: "1h",
    description:
      "Strategi Price Action murni berdasarkan Handbook Crypto Savage: Dynamic True S/R (HTF 4H), Multiple Rejection Wick, Engulfing Follow-Through, Trendline Breakout, 50 EMA Confluence, dan RSI Divergence.",
    isEnabled: true,
    version: "v1",
    author: "Crypto Savage Handbook",
    indicators: [
      "Dynamic True S/R Zone (4H/1H)",
      "Multiple Long Wick Rejection",
      "Momentum / Engulfing Follow-Through",
      "Counter-Trendline Breakout",
      "50 EMA Dynamic S/R",
      "RSI 14 Divergence",
      "Strict 1:2+ RRR Engine",
    ],
    winrate: "0.0%",
    totalSignals: 0,
    winSignals: 0,
    lossSignals: 0,
    totalPnlPct: 0,
    avgProfitPct: 0,
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_SIGNALS: SignalItem[] = [];

export const INITIAL_CONFIG: TradingConfig = {
  apiKey: "",
  apiSecret: "",
  environment: "TESTNET",
  leverage: 10,
  marginType: "ISOLATED",
  maxOpenPositions: 3,
  riskPerTradePct: 2.0,
  autoExecute: true,
};
