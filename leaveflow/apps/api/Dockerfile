# ============================================================
# LeaveFlow API — Multi-stage Docker build
#
# Stage 1 (deps):   Install production dependencies only
# Stage 2 (build):  Compile TypeScript to JavaScript
# Stage 3 (runner): Minimal runtime image
# ============================================================

# ---- Base image pinned for reproducibility ----
ARG NODE_VERSION=22-alpine
FROM node:${NODE_VERSION} AS base

# ---- Stage 1: Install production dependencies ----
FROM base AS deps
WORKDIR /app

# Copy package manifests first (layer caching)
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts

# ---- Stage 2: Build (install all deps + compile) ----
FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ---- Stage 3: Minimal runtime image ----
FROM base AS runner
WORKDIR /app

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 leaveflow

# Copy compiled output
COPY --from=builder --chown=leaveflow:nodejs /app/dist ./dist

# Copy production node_modules
COPY --from=deps --chown=leaveflow:nodejs /app/node_modules ./node_modules

# Copy package.json for version detection
COPY --chown=leaveflow:nodejs package.json ./

USER leaveflow

# Expose the default port (overridable at runtime via API_PORT)
EXPOSE 3000

# Health check — liveness probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
