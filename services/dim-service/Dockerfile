FROM node:22-bullseye-slim AS runtime
WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=6604

COPY --chown=node:node package.json yarn.lock ./
COPY --chown=node:node dist ./dist
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node openapi.json ./openapi.json
COPY --chown=node:node env.example .env
COPY --chown=node:node node_modules ./node_modules

USER node
EXPOSE 6604

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:6604/health', (res)=>process.exit(res.statusCode===200?0:1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
