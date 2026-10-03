#!/bin/sh
set -e

echo "=== Starting CryptoSpike Stack ==="

# 1. Jalankan Prisma Database Migration jika DATABASE_URL tersedia
if [ -n "$DATABASE_URL" ]; then
  echo "Applying database schema migrations..."
  cd /app/backend
  npx prisma db push --skip-generate || true
  cd /app
fi

# 2. Start NestJS Backend di background
echo "Starting NestJS Backend on port 3001..."
cd /app/backend
if [ ! -f "dist/main.js" ]; then
  echo "dist/main.js not found! Running build on the fly..."
  npx nest build || npm run build
fi
node dist/main.js &
BACKEND_PID=$!

# 3. Start Nginx reverse proxy di foreground
echo "Starting Nginx HTTP/WS Proxy on port 80..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Trap signals for graceful shutdown
trap "kill -TERM $BACKEND_PID $NGINX_PID" SIGINT SIGTERM

wait -n $BACKEND_PID $NGINX_PID

