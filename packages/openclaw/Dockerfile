# syntax=docker/dockerfile:1
# OpenClaw — combined Clawdrop agent runtime image
# Bundles: mcp-wallet, travel-crypto-pro, research

FROM node:22-alpine AS base
WORKDIR /app

# ─── Install deps ─────────────────────────────────────────────────────────────
FROM base AS deps
# Copy all package manifests needed for workspace resolution
COPY packages/openclaw/package.json ./packages/openclaw/
COPY packages/mcp-wallet/package.json ./packages/mcp-wallet/
COPY packages/bundles/travel-crypto-pro/package.json ./packages/bundles/travel-crypto-pro/
COPY packages/bundles/research/package.json ./packages/bundles/research/
COPY packages/control-plane/package.json ./packages/control-plane/

# Install openclaw deps (the combined image only needs one npm install)
WORKDIR /app/packages/openclaw
RUN npm install --omit=dev

# ─── Build ────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copy source for all packages that openclaw depends on
COPY packages/openclaw/ ./packages/openclaw/
COPY packages/mcp-wallet/ ./packages/mcp-wallet/
COPY packages/bundles/travel-crypto-pro/ ./packages/bundles/travel-crypto-pro/
COPY packages/bundles/research/ ./packages/bundles/research/
COPY packages/control-plane/ ./packages/control-plane/
COPY tsconfig.base.json ./

# Install dev deps for TypeScript build
WORKDIR /app/packages/openclaw
COPY --from=deps /app/packages/openclaw/node_modules ./node_modules
RUN npm install --include=dev
RUN npm run build

# Also build the research bundle
WORKDIR /app/packages/bundles/research
RUN npm install --include=dev && npm run build

# ─── Runtime image ────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/packages/openclaw/dist ./packages/openclaw/dist
COPY --from=builder /app/packages/openclaw/node_modules ./packages/openclaw/node_modules
COPY --from=builder /app/packages/openclaw/package.json ./packages/openclaw/package.json

# Copy source packages that are dynamically imported at runtime
COPY --from=builder /app/packages/mcp-wallet/src ./packages/mcp-wallet/src
COPY --from=builder /app/packages/mcp-wallet/package.json ./packages/mcp-wallet/package.json
COPY --from=builder /app/packages/bundles/travel-crypto-pro/src ./packages/bundles/travel-crypto-pro/src
COPY --from=builder /app/packages/bundles/travel-crypto-pro/package.json ./packages/bundles/travel-crypto-pro/package.json
COPY --from=builder /app/packages/bundles/research/dist ./packages/bundles/research/dist
COPY --from=builder /app/packages/bundles/research/package.json ./packages/bundles/research/package.json
COPY --from=builder /app/packages/control-plane/src ./packages/control-plane/src
COPY --from=builder /app/packages/control-plane/package.json ./packages/control-plane/package.json

# Labels
LABEL org.clawdrop.version="1.0.0"
LABEL org.clawdrop.bundles="mcp-wallet,travel-crypto-pro,research"

# Environment (must be supplied at runtime)
ENV WALLET_PRIVATE_KEY=""
ENV DUFFEL_API_TOKEN=""
ENV ANTHROPIC_API_KEY=""
ENV TELEGRAM_BOT_TOKEN=""
ENV HELIUS_API_KEY=""

WORKDIR /app/packages/openclaw
CMD ["node", "dist/index.js"]
