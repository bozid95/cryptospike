-- AlterTable
ALTER TABLE "user_trading_configs" ADD COLUMN IF NOT EXISTS "api_key" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "api_secret" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "auto_execute" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "environment" VARCHAR(20) NOT NULL DEFAULT 'TESTNET',
ADD COLUMN IF NOT EXISTS "leverage" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS "margin_type" VARCHAR(20) NOT NULL DEFAULT 'ISOLATED',
ADD COLUMN IF NOT EXISTS "max_open_positions" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS "risk_per_trade_pct" DOUBLE PRECISION NOT NULL DEFAULT 2.0;

ALTER TABLE "user_trading_configs" ALTER COLUMN "config" DROP NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "closed_positions" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "entry_price" DOUBLE PRECISION NOT NULL,
    "exit_price" DOUBLE PRECISION NOT NULL,
    "position_amt" DOUBLE PRECISION NOT NULL,
    "realized_pnl" DOUBLE PRECISION NOT NULL,
    "roe" DOUBLE PRECISION NOT NULL,
    "leverage" INTEGER NOT NULL DEFAULT 10,
    "strategy" TEXT,
    "close_reason" TEXT,
    "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "closed_positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_closed_positions_symbol" ON "closed_positions"("symbol");
CREATE INDEX IF NOT EXISTS "idx_closed_positions_closed_at" ON "closed_positions"("closed_at");
