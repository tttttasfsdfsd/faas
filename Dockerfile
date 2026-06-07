# ==================== Build stage ====================
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build frontend + backend
RUN npm run build

# ==================== Production stage ====================
FROM node:22-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

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
