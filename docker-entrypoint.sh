#!/bin/sh
set -e

echo "=== Starting CryptoSpike Stack ==="

# 1. Jalankan Prisma Migration resmi untuk Production (prisma migrate deploy)
if [ -n "$DATABASE_URL" ]; then
  echo "Applying database schema migrations safely (prisma migrate deploy)..."
  cd /app/backend
  export DATABASE_URL="$DATABASE_URL"
  npx prisma generate --schema=./prisma/schema.prisma --config=./prisma.config.ts
  npx prisma migrate deploy --schema=./prisma/schema.prisma --config=./prisma.config.ts || npx prisma db push --schema=./prisma/schema.prisma
  cd /app
fi

# 2. Start NestJS Backend di background
echo "Starting NestJS Backend on port 3001..."
cd /app/backend
ls -la dist/ || true
node dist/main.js &
BACKEND_PID=$!

# 3. Start Nginx reverse proxy di foreground
echo "Starting Nginx HTTP/WS Proxy on port 80..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Trap signals for graceful shutdown
trap "kill -TERM $BACKEND_PID $NGINX_PID" SIGINT SIGTERM

wait -n $BACKEND_PID $NGINX_PID

