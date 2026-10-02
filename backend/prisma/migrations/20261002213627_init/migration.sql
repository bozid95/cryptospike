-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(50) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password_salt" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'user',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" VARCHAR(50) NOT NULL,
    "user_id" VARCHAR(50) NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_trading_configs" (
    "user_id" VARCHAR(50) NOT NULL,
    "config" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_trading_configs_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "signals" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "strength" TEXT NOT NULL DEFAULT 'NORMAL',
    "entry_price" DOUBLE PRECISION NOT NULL,
    "tp1" DOUBLE PRECISION NOT NULL,
    "tp2" DOUBLE PRECISION,
    "tp3" DOUBLE PRECISION,
    "sl" DOUBLE PRECISION NOT NULL,
    "score" DOUBLE PRECISION,
    "strategy" TEXT,
    "reasons" TEXT,
    "trigger_source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "profit_pct" DOUBLE PRECISION,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hit_time" TIMESTAMP(3),

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_configs" (
    "strategy_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_configs_pkey" PRIMARY KEY ("strategy_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT,
    "symbol" TEXT,
    "side" TEXT,
    "price" DOUBLE PRECISION,
    "profit_pct" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" UUID NOT NULL,
    "donator_name" TEXT,
    "donator_email" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_position_locks" (
    "user_id" VARCHAR(50) NOT NULL,
    "symbol" VARCHAR(32) NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "exchange" VARCHAR(32) NOT NULL DEFAULT '',
    "environment" VARCHAR(32) NOT NULL DEFAULT '',
    "direction" VARCHAR(16) NOT NULL DEFAULT '',
    "signal" TEXT NOT NULL DEFAULT '',
    "entry_price" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "external_order_id" TEXT NOT NULL DEFAULT '',
    "lock_token" VARCHAR(100) NOT NULL DEFAULT '',
    "reserved_until" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "release_reason" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_position_locks_pkey" PRIMARY KEY ("user_id","symbol")
);

-- CreateTable
CREATE TABLE "user_presence" (
    "session_id" TEXT NOT NULL,
    "last_seen" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_presence_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "message" TEXT,
    "icon" TEXT,
    "link_text" TEXT,
    "link_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "idx_user_sessions_user_id" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_sessions_expires_at" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "idx_signals_status" ON "signals"("status");

-- CreateIndex
CREATE INDEX "idx_signals_strategy" ON "signals"("strategy");

-- CreateIndex
CREATE INDEX "idx_signals_sent_at" ON "signals"("sent_at");

-- CreateIndex
CREATE INDEX "idx_signals_symbol_status" ON "signals"("symbol", "status");

-- CreateIndex
CREATE INDEX "idx_user_position_locks_status_symbol" ON "user_position_locks"("status", "symbol");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_trading_configs" ADD CONSTRAINT "user_trading_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_position_locks" ADD CONSTRAINT "user_position_locks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
