# ============================================================
# LeaveFlow Web — Next.js standalone output Docker build
#
# Stage 1 (deps):    Install all dependencies
# Stage 2 (builder): Build Next.js with standalone output
# Stage 3 (runner):  Minimal runtime using Next.js standalone
#
# Requires next.config.ts to include:
#   output: "standalone"
# ============================================================

ARG NODE_VERSION=22-alpine
FROM node:${NODE_VERSION} AS base

# ---- Stage 1: Install dependencies ----
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./

# Install all deps (including devDependencies needed for build)
RUN npm ci --ignore-scripts

# ---- Stage 2: Build ----
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

COPY . .

# Set production env for build optimisations
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ---- Stage 3: Minimal runtime ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone server and static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
