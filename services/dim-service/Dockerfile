# =========================
# 1) Dependencies stage
# =========================
FROM node:22-alpine AS deps
WORKDIR /app
# ลดปัญหา DNS/IPv6
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
RUN corepack enable

# ใช้ไฟล์ lock ของ yarn เพื่อให้ build reproducible
COPY package.json yarn.lock ./

# ติดตั้งทุก deps รวมทั้ง devDeps (ต้องมี prisma, @prisma/client, และ @prisma/engines)
RUN yarn install --frozen-lockfile

# =========================
# 2) Build stage
# =========================
FROM node:22-alpine AS builder
WORKDIR /app
# กัน DNS/IPv6
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

# ---- Prisma download fallbacks (ช่วยเวลาตันออกอินเทอร์เน็ต) ----
# ให้ Prisma ใช้ mirror แทนต้นทาง
ENV PRISMA_CLI_CDN_MIRROR=https://registry.npmmirror.com/binaries.prisma.sh
ENV PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/binaries.prisma.sh
# ผ่อนปรน checksum ของไฟล์ mirror
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# ---- บังคับใช้ engine ภายใน image (offline friendly) ----
# Alpine = musl + OpenSSL 3.0.x
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/@prisma/engines/libquery_engine-linux-musl-openssl-3.0.x.so.node
ENV PRISMA_SCHEMA_ENGINE_BINARY=/app/node_modules/@prisma/engines/schema-engine-linux-musl-openssl-3.0.x

# ใช้ node_modules ที่มี devDependencies จาก stage ก่อนหน้า
COPY --from=deps /app/node_modules ./node_modules

# คัดลอกไฟล์ที่จำเป็นต่อการ build
COPY package.json yarn.lock tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
# ถ้ามีไฟล์ openapi.json ในราก ให้คัดลอกด้วย (ลบได้ถ้าไม่มี)
COPY openapi.json ./openapi.json

# สร้าง Prisma Client ตอน build (จะใช้ engine ใน node_modules ตาม ENV ด้านบน)
RUN npx prisma generate

# build TypeScript -> dist
RUN yarn build

# =========================
# 3) Production stage
# =========================
FROM node:22-alpine AS production
WORKDIR /app
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production \
    PORT=6604

# non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# เฉพาะไฟล์ที่ต้องใช้รันจริง
COPY --chown=nodejs:nodejs package.json yarn.lock ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/openapi.json ./openapi.json

# env เริ่มต้น (ปรับผ่าน compose/ENV ภายหลังได้)
COPY --chown=nodejs:nodejs env.example .env

USER nodejs
EXPOSE 6604

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:6604/health', (res)=>process.exit(res.statusCode===200?0:1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
