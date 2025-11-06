FROM node:22-bullseye-slim AS base
WORKDIR /app

COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile

FROM node:22-bullseye-slim AS build
WORKDIR /app

COPY package.json yarn.lock ./
COPY --from=base /app/node_modules ./node_modules
COPY tsconfig.json tsconfig.json
COPY prisma prisma
COPY src src
RUN corepack enable && yarn prisma:generate && yarn build

FROM node:22-bullseye-slim AS runtime
WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=6601

COPY --chown=node:node package.json yarn.lock ./
COPY --from=base --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node prisma ./prisma
RUN corepack enable && yarn prisma:generate

COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 6601

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:6601/health', (res)=>process.exit(res.statusCode===200?0:1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/server.js"]
