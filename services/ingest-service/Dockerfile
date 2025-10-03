# =========================
# 1) Dependencies stage
# =========================
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable

# ใช้ lock ของ yarn เพื่อ build แบบ reproducible
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# =========================
# 2) Build stage
# =========================
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable

# ใช้ node_modules (รวม devDeps) จาก deps stage
COPY --from=deps /app/node_modules ./node_modules

# คัดลอกไฟล์สำหรับ build
COPY package.json yarn.lock tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
# ถ้ามีไฟล์ openapi.json ให้คัดลอกด้วย (ลบได้ถ้าไม่มี)
COPY openapi.json ./openapi.json

# สร้าง Prisma Client และ build TypeScript -> dist
RUN yarn prisma generate
RUN yarn build

# =========================
# 3) Production stage
# =========================
FROM node:22-alpine AS production
WORKDIR /app
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production \
    PORT=6602

# non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# คัดลอกเฉพาะสิ่งที่ต้องใช้รันจริง
COPY --chown=nodejs:nodejs package.json yarn.lock ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/openapi.json ./openapi.json

# .env เริ่มต้น (ค่า runtime ปรับผ่าน ENV/compose ได้)
COPY --chown=nodejs:nodejs env.example .env

USER nodejs
EXPOSE 6602

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:6602/health', (res)=>process.exit(res.statusCode===200?0:1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]

