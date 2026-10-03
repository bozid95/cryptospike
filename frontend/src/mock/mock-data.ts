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
  strategy: string;
  triggerSource: string;
  status: "ACTIVE" | "TP1_HIT" | "TP2_HIT" | "TP3_HIT" | "SL_HIT" | "CANCELLED";
  profitPct?: number;
  sentAt: string;
  closedAt?: string;
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
  updatedAt?: string;
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
    name: "1H Breakout Momentum",
    timeframe: "1h",
    description:
      "Deteksi breakout level resisten/support dengan konfirmasi volume spike 1 jam.",
    isEnabled: true,
    winrate: "66.7%",
    totalSignals: 54,
    updatedAt: new Date().toISOString(),
  },
  {
    strategyId: "breakout_1h_v2",
    name: "1H Breakout Dynamic Trailing",
    timeframe: "1h",
    description:
      "Breakout 1 jam dengan trailing stop loss otomatis dan dynamic ATR exit.",
    isEnabled: false,
    winrate: "72.4%",
    totalSignals: 38,
    updatedAt: new Date().toISOString(),
  },
  {
    strategyId: "prepump_15m_v1",
    name: "Pre-Pump Accumulation Scanner",
    timeframe: "15m",
    description:
      "Scan akumulasi anomali volume & CVD mendadak di TF 15 menit sebelum impulsive pump.",
    isEnabled: true,
    winrate: "68.2%",
    totalSignals: 88,
    updatedAt: new Date().toISOString(),
  },
  {
    strategyId: "btc_session_v1",
    name: "BTC London/NY Session Drop",
    timeframe: "15m",
    description:
      "Sinyal reaksi pergerakan drastis BTC terhadap altcoins saat pergantian sesi market.",
    isEnabled: true,
    winrate: "77.5%",
    totalSignals: 29,
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_SIGNALS: SignalItem[] = [
  // 1. RUNNING POSITIONS (Floating PnL)
  {
    id: "sig-001",
    symbol: "BTCUSDT",
    side: "LONG",
    strength: "STRONG",
    entryPrice: 65200.0,
    currentPrice: 66601.8,
    tp1: 66800.0,
    tp2: 67900.0,
    tp3: 69500.0,
    sl: 64100.0,
    strategy: "breakout_1h_v1",
    triggerSource: "candle_1h",
    status: "ACTIVE",
    profitPct: 2.15,
    sentAt: new Date(Date.now() - 3600000 * 2.5).toISOString(),
  },
  {
    id: "sig-002",
    symbol: "ETHUSDT",
    side: "LONG",
    strength: "STRONG",
    entryPrice: 3220.0,
    currentPrice: 3255.4,
    tp1: 3340.0,
    tp2: 3420.0,
    sl: 3140.0,
    strategy: "prepump_15m_v1",
    triggerSource: "pre_pump_scanner",
    status: "ACTIVE",
    profitPct: 1.1,
    sentAt: new Date(Date.now() - 3600000 * 1.8).toISOString(),
  },
  {
    id: "sig-003",
    symbol: "AVAXUSDT",
    side: "SHORT",
    strength: "NORMAL",
    entryPrice: 28.4,
    currentPrice: 28.64,
    tp1: 27.2,
    tp2: 26.1,
    sl: 29.2,
    strategy: "breakout_1h_v2",
    triggerSource: "candle_1h",
    status: "ACTIVE",
    profitPct: -0.85,
    sentAt: new Date(Date.now() - 3600000 * 1.1).toISOString(),
  },
  {
    id: "sig-004",
    symbol: "NEARUSDT",
    side: "LONG",
    strength: "STRONG",
    entryPrice: 4.7,
    currentPrice: 4.86,
    tp1: 4.95,
    tp2: 5.2,
    sl: 4.52,
    strategy: "prepump_15m_v1",
    triggerSource: "pre_pump_scanner",
    status: "ACTIVE",
    profitPct: 3.4,
    sentAt: new Date(Date.now() - 1800000).toISOString(),
  },

  // 2. CLOSED POSITIONS (Realized PnL - TP Hit or SL Hit)
  {
    id: "sig-005",
    symbol: "SOLUSDT",
    side: "SHORT",
    strength: "NORMAL",
    entryPrice: 152.0,
    currentPrice: 144.7,
    tp1: 147.0,
    tp2: 144.7,
    sl: 156.8,
    strategy: "breakout_1h_v2",
    triggerSource: "candle_1h",
    status: "TP2_HIT",
    profitPct: 4.8,
    sentAt: new Date(Date.now() - 3600000 * 9).toISOString(),
    closedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "sig-006",
    symbol: "DOGEUSDT",
    side: "LONG",
    strength: "NORMAL",
    entryPrice: 0.136,
    currentPrice: 0.1392,
    tp1: 0.1392,
    tp2: 0.145,
    sl: 0.131,
    strategy: "prepump_15m_v1",
    triggerSource: "pre_pump_scanner",
    status: "TP1_HIT",
    profitPct: 2.35,
    sentAt: new Date(Date.now() - 3600000 * 14).toISOString(),
    closedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: "sig-007",
    symbol: "LINKUSDT",
    side: "SHORT",
    strength: "NORMAL",
    entryPrice: 11.4,
    currentPrice: 11.6,
    tp1: 10.8,
    tp2: 10.2,
    sl: 11.6,
    strategy: "breakout_1h_v1",
    triggerSource: "candle_1h",
    status: "SL_HIT",
    profitPct: -1.75,
    sentAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    closedAt: new Date(Date.now() - 3600000 * 13).toISOString(),
  },
  {
    id: "sig-008",
    symbol: "SUIUSDT",
    side: "LONG",
    strength: "STRONG",
    entryPrice: 1.82,
    currentPrice: 1.964,
    tp1: 1.89,
    tp2: 1.93,
    tp3: 1.964,
    sl: 1.76,
    strategy: "prepump_15m_v1",
    triggerSource: "pre_pump_scanner",
    status: "TP3_HIT",
    profitPct: 7.9,
    sentAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    closedAt: new Date(Date.now() - 3600000 * 16).toISOString(),
  },
  {
    id: "sig-009",
    symbol: "BNBUSDT",
    side: "SHORT",
    strength: "STRONG",
    entryPrice: 594.0,
    currentPrice: 605.0,
    tp1: 580.0,
    tp2: 568.0,
    sl: 605.0,
    strategy: "btc_session_v1",
    triggerSource: "ticker_filter",
    status: "SL_HIT",
    profitPct: -1.85,
    sentAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    closedAt: new Date(Date.now() - 3600000 * 22).toISOString(),
  },
  {
    id: "sig-010",
    symbol: "ADAUSDT",
    side: "LONG",
    strength: "NORMAL",
    entryPrice: 0.354,
    currentPrice: 0.361,
    tp1: 0.368,
    tp2: 0.38,
    sl: 0.342,
    strategy: "breakout_1h_v1",
    triggerSource: "candle_1h",
    status: "ACTIVE",
    profitPct: 1.98,
    sentAt: new Date(Date.now() - 3600000 * 1.2).toISOString(),
  },
  {
    id: "sig-011",
    symbol: "OPUSDT",
    side: "SHORT",
    strength: "STRONG",
    entryPrice: 1.58,
    currentPrice: 1.516,
    tp1: 1.52,
    tp2: 1.46,
    sl: 1.63,
    strategy: "breakout_1h_v2",
    triggerSource: "candle_1h",
    status: "TP1_HIT",
    profitPct: 3.8,
    sentAt: new Date(Date.now() - 3600000 * 36).toISOString(),
    closedAt: new Date(Date.now() - 3600000 * 28).toISOString(),
  },
  {
    id: "sig-012",
    symbol: "INJUSDT",
    side: "LONG",
    strength: "STRONG",
    entryPrice: 19.4,
    currentPrice: 20.45,
    tp1: 20.3,
    tp2: 21.2,
    sl: 18.7,
    strategy: "prepump_15m_v1",
    triggerSource: "pre_pump_scanner",
    status: "TP1_HIT",
    profitPct: 4.64,
    sentAt: new Date(Date.now() - 3600000 * 42).toISOString(),
    closedAt: new Date(Date.now() - 3600000 * 35).toISOString(),
  },
  {
    id: "sig-013",
    symbol: "APTUSDT",
    side: "SHORT",
    strength: "NORMAL",
    entryPrice: 8.65,
    currentPrice: 8.85,
    tp1: 8.2,
    tp2: 7.8,
    sl: 8.85,
    strategy: "btc_session_v1",
    triggerSource: "ticker_filter",
    status: "SL_HIT",
    profitPct: -2.31,
    sentAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    closedAt: new Date(Date.now() - 3600000 * 40).toISOString(),
  },
  {
    id: "sig-014",
    symbol: "PEPEUSDT",
    side: "LONG",
    strength: "STRONG",
    entryPrice: 0.0000098,
    currentPrice: 0.0000105,
    tp1: 0.0000105,
    tp2: 0.0000112,
    sl: 0.0000093,
    strategy: "prepump_15m_v1",
    triggerSource: "pre_pump_scanner",
    status: "TP1_HIT",
    profitPct: 7.14,
    sentAt: new Date(Date.now() - 3600000 * 54).toISOString(),
    closedAt: new Date(Date.now() - 3600000 * 46).toISOString(),
  },
  {
    id: "sig-015",
    symbol: "RENDERUSDT",
    side: "LONG",
    strength: "NORMAL",
    entryPrice: 5.6,
    currentPrice: 5.54,
    tp1: 5.95,
    tp2: 6.3,
    sl: 5.35,
    strategy: "breakout_1h_v1",
    triggerSource: "candle_1h",
    status: "ACTIVE",
    profitPct: -1.07,
    sentAt: new Date(Date.now() - 3600000 * 0.8).toISOString(),
  },
];

export const INITIAL_CONFIG: TradingConfig = {
  apiKey: "dhA11NTt2uFViDGybKvJv9g0IQc8PJilepPHV7uqgWH5H2opcwaJjGto1CgWiz13",
  apiSecret: "wVVzZaysTZ3Pz4XhGDkPPRJAgvwIjw0sYJkxTlAsVHu6Q3tSP9TBpJmhCRdPBlIm",
  environment: "TESTNET",
  leverage: 10,
  marginType: "ISOLATED",
  maxOpenPositions: 3,
  riskPerTradePct: 2.0,
  autoExecute: true,
};
