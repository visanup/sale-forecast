# =========================
# 1) Dependencies stage
# =========================
FROM node:22-alpine AS deps
WORKDIR /app

# ใช้ yarn ผ่าน corepack (ไม่ต้องติดตั้งเพิ่ม)
RUN corepack enable

# คัดลอกไฟล์ lock ให้ build reproducible
COPY package.json yarn.lock ./

# ลง dependencies ตาม lock (ไม่สร้างไฟล์ lock ใหม่)
RUN yarn install --frozen-lockfile

# =========================
# 2) Build stage
# =========================
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable

# ดึง node_modules จาก stage ก่อนหน้า (มี devDeps สำหรับ build)
COPY --from=deps /app/node_modules ./node_modules

# คัดลอกไฟล์ที่ใช้ build
COPY package.json yarn.lock tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
# ถ้ามีไฟล์ openapi.json ในรากโปรเจ็กต์ ให้คัดลอกด้วย
COPY openapi.json ./openapi.json

# สร้าง Prisma Client ตอน build (สำคัญมาก)
RUN yarn prisma generate

# build TypeScript -> dist
RUN yarn build

# =========================
# 3) Production stage
# =========================
FROM node:22-alpine AS production
WORKDIR /app

# จัดการสัญญาณให้ container ปิด/รีสตาร์ทนิ่ม ๆ
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production \
    PORT=6603

# สร้าง user ไม่ใช่ root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# คัดลอกไฟล์ที่ต้องใช้รันจริง
COPY --chown=nodejs:nodejs package.json yarn.lock ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/openapi.json ./openapi.json

# คัดลอก env ตัวอย่างให้ container มีค่าเริ่มต้น (ปรับได้ภายหลังด้วย ENV/compose)
COPY --chown=nodejs:nodejs env.example .env

USER nodejs
EXPOSE 6603

# Healthcheck แบบไม่ต้องพึ่ง curl
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:6603/health', (res)=>process.exit(res.statusCode===200?0:1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
