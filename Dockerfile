# better-sqlite3 compile des bindings natifs : etape de build separee
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --------------------------------------------------------------------------
FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production \
  PORT=8010 \
  DB_PATH=/data/leads.db

RUN mkdir -p /data \
  && chown node:node /data

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY server.js db.js ./
COPY admin ./admin
COPY home.html home-gate.html index.html nx.html chr.html chr-plus.html chr-video.html yaris-cross.html ./
COPY assets ./assets

USER node

EXPOSE 8010

VOLUME ["/data"]

CMD ["node", "server.js"]
