# ============================================
# Base: dependencias compartidas
# ============================================
FROM docker.io/node:lts-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ============================================
# Dependencies: instala node_modules
# ============================================
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ============================================
# Development: para uso local con docker-compose
# ============================================
FROM base AS development

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=deps /app/node_modules ./node_modules
COPY . .

CMD ["npm", "run", "dev"]

# ============================================
# Builder: compila la app para producción
# ============================================
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV SKIP_ENV_VALIDATION=true

ARG NEXT_PUBLIC_API_URL 
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

ARG NEXT_PUBLIC_APP_URL 
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

RUN npm run build

# ============================================
# Production: imagen final optimizada
# ============================================
FROM base AS production
ENV NODE_ENV=production
ENV TZ=America/Toronto

RUN apk add --no-cache tzdata dumb-init

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs


# Copia solo lo necesario
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000
CMD ["dumb-init", "node", "server.js"]
