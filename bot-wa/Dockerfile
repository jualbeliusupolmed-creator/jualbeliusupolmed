# Dockerfile for WhatsApp Bot (Baileys)
# Multi-stage build for smaller production image

# Base stage
FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Development stage (with dev dependencies for testing)
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 botuser

# Copy only production dependencies
COPY --from=deps --chown=botuser:nodejs /app/node_modules ./node_modules
COPY --chown=botuser:nodejs package.json ./
COPY --chown=botuser:nodejs index.js ./

# Auth directory will be mounted as volume
RUN mkdir -p auth_info_baileys && chown -R botuser:nodejs auth_info_baileys

USER botuser

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "index.js"]