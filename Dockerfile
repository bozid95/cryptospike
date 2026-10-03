# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm install

COPY backend/ ./
RUN npx prisma generate
RUN npx nest build
RUN ls -la dist/

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache curl nginx

# Salin hasil build backend & dependency production
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules/
COPY --from=backend-builder /app/backend/dist ./backend/dist/
COPY --from=backend-builder /app/backend/prisma ./backend/prisma/

# Verifikasi file dist/main.js ada di runner stage
RUN ls -la /app/backend/dist/ && test -f /app/backend/dist/main.js

# Salin hasil build frontend ke nginx html
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Konfigurasi Nginx Reverse Proxy
COPY nginx.conf /etc/nginx/http.d/default.conf

# Script entrypoint start nginx + backend
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 80 3001

ENTRYPOINT ["/app/docker-entrypoint.sh"]

