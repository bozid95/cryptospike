import React, { useState } from "react";
import {
  CheckCircle2Icon,
  CheckIcon,
  KeyIcon,
  SlidersIcon,
} from "lucide-react";

import { useCryptoSpike } from "@/context/trading-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function SettingsCrud() {
  const { config, updateConfig } = useCryptoSpike();
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [apiSecret, setApiSecret] = useState(config.apiSecret);
  const [showSecret, setShowSecret] = useState(false);
  const [environment, setEnvironment] = useState(config.environment);
  const [marginType, setMarginType] = useState<"ISOLATED" | "CROSSED">(
    config.marginType || "ISOLATED",
  );
  const [leverage, setLeverage] = useState(config.leverage.toString());
  const [maxOpenPositions, setMaxOpenPositions] = useState(
    config.maxOpenPositions.toString(),
  );
  const [riskPerTradePct, setRiskPerTradePct] = useState(
    config.riskPerTradePct.toString(),
  );
  const [autoExecute, setAutoExecute] = useState(config.autoExecute);
  const [saved, setSaved] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  // Sync state if config is loaded asynchronously from backend API
  React.useEffect(() => {
    setApiKey(config.apiKey || "");
    setApiSecret(config.apiSecret || "");
    setEnvironment(config.environment || "TESTNET");
    setMarginType(config.marginType || "ISOLATED");
    setLeverage((config.leverage ?? 10).toString());
    setMaxOpenPositions((config.maxOpenPositions ?? 3).toString());
    setRiskPerTradePct((config.riskPerTradePct ?? 2).toString());
    setAutoExecute(Boolean(config.autoExecute));
  }, [config]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      apiKey,
      apiSecret,
      environment,
      marginType,
      leverage: parseInt(leverage, 10) || 10,
      maxOpenPositions: parseInt(maxOpenPositions, 10) || 3,
      riskPerTradePct: parseFloat(riskPerTradePct) || 2,
      autoExecute,
    });

    setSaved(true);
    setShowAlert(true);
    setTimeout(() => {
      setSaved(false);
      setShowAlert(false);
    }, 4000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card className="border-border shadow-xs">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <KeyIcon className="size-5 text-primary" />
            Binance Futures API Credentials
          </CardTitle>
          <CardDescription className="text-xs">
            Configure your API Key and Secret connection to execute contract
            orders on Binance Futures.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="apiKey" className="text-xs font-semibold">
              Binance API Key
            </Label>
            <Input
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter Binance Futures API Key..."
              className="font-mono text-xs"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="apiSecret" className="text-xs font-semibold">
                Binance API Secret
              </Label>
              <button
                type="button"
                onClick={() => setShowSecret((prev) => !prev)}
                className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showSecret ? "Hide Secret" : "Show Secret"}
              </button>
            </div>
            <Input
              id="apiSecret"
              type={showSecret ? "text" : "password"}
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Enter API Secret..."
              className="font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="grid gap-2">
              <Label className="text-xs font-semibold">
                Execution Environment
              </Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground font-medium"
                value={environment}
                onChange={(e) =>
                  setEnvironment(e.target.value as "TESTNET" | "PRODUCTION")
                }
              >
                <option value="TESTNET" className="bg-popover text-foreground">
                  Binance Futures TESTNET
                </option>
                <option
                  value="PRODUCTION"
                  className="bg-popover text-foreground"
                >
                  Binance Futures PRODUCTION (Real Money)
                </option>
              </select>
            </div>

            <div className="flex flex-col justify-end gap-2">
              <Label className="text-xs font-semibold">
                Auto-Execute Orders (Bot Engine)?
              </Label>
              <div className="flex items-center gap-2.5 h-9">
                <Switch
                  checked={autoExecute}
                  onCheckedChange={setAutoExecute}
                />
                <span
                  className={`text-xs font-mono font-medium ${
                    autoExecute ? "text-emerald-600" : "text-muted-foreground"
                  }`}
                >
                  {autoExecute ? "Bot Auto-Trading ON" : "Signal Alert Only"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-xs">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <SlidersIcon className="size-5 text-primary" />
            Risk & Position Management
          </CardTitle>
          <CardDescription className="text-xs">
            Risk parameters to control leverage limits and max portfolio
            exposure per trade.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="marginType" className="text-xs font-semibold">
              Margin Type
            </Label>
            <select
              id="marginType"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground font-medium"
              value={marginType}
              onChange={(e) =>
                setMarginType(e.target.value as "ISOLATED" | "CROSSED")
              }
            >
              <option value="ISOLATED" className="bg-popover text-foreground">
                ISOLATED
              </option>
              <option value="CROSSED" className="bg-popover text-foreground">
                CROSSED
              </option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lev" className="text-xs font-semibold">
              Default Leverage (x)
            </Label>
            <Input
              id="lev"
              type="number"
              min="1"
              max="125"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="maxPos" className="text-xs font-semibold">
              Max Concurrent Open Positions
            </Label>
            <Input
              id="maxPos"
              type="number"
              min="1"
              max="10"
              value={maxOpenPositions}
              onChange={(e) => setMaxOpenPositions(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="risk" className="text-xs font-semibold">
              Risk Allocation Per Trade (%)
            </Label>
            <Input
              id="risk"
              type="number"
              step="0.5"
              min="0.5"
              max="20"
              value={riskPerTradePct}
              onChange={(e) => setRiskPerTradePct(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t p-6 py-4 bg-muted/20">
          <span className="text-xs text-muted-foreground">
            Changes will be saved persistently to PostgreSQL configuration.
          </span>
          <Button
            type="submit"
            size="sm"
            className="gap-2 text-xs w-full sm:w-auto"
          >
            {saved ? (
              <>
                <CheckIcon className="size-4 text-emerald-400" />
                Saved!
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
