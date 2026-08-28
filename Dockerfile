# --- Install dependencies and build the app ---
FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# --- Production image ---
FROM oven/bun:1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=bun:bun /app/package.json ./package.json
COPY --from=builder --chown=bun:bun /app/node_modules ./node_modules
COPY --from=builder --chown=bun:bun /app/.next ./.next
COPY --from=builder --chown=bun:bun /app/public ./public
COPY --from=builder --chown=bun:bun /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=bun:bun /app/scripts ./scripts
COPY --from=builder --chown=bun:bun /app/lib ./lib
COPY --from=builder --chown=bun:bun /app/models ./models

USER bun

EXPOSE 3000

CMD ["bun", "run", "start"]
