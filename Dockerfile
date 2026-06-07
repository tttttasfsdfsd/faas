# ==================== Build stage ====================
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY . .

# حذف أي cache قديم وتثبيت نظيف مع كل الـ optional dependencies
RUN rm -rf node_modules && \
    npm cache clean --force && \
    npm install --prefer-offline=false && \
    npm install @rollup/rollup-linux-x64-musl --save-optional || true

# Build frontend + backend
RUN npm run build

# ==================== Production stage ====================
FROM node:22-alpine AS production

WORKDIR /app

COPY package*.json ./

RUN rm -rf node_modules && \
    npm cache clean --force && \
    npm install --omit=dev --prefer-offline=false

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Copy runtime config
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/db ./db

# Security: non-root user
RUN addgroup -S eexa && adduser -S eexa -G eexa
USER eexa

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "dist/boot.js"]
