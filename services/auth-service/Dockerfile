# ---------- Build stage ----------
FROM node:22-alpine AS builder
WORKDIR /app

# deps ที่มักต้องใช้กับ native modules & Prisma บน Alpine
RUN apk add --no-cache python3 make g++ openssl libc6-compat

# ใช้ Yarn ผ่าน Corepack (มากับ Node 18)
RUN corepack enable

# 1) ติดตั้งจาก lockfile (reproducible)
COPY package.json yarn.lock ./
RUN yarn install --immutable

# 2) ใส่โค้ดที่เหลือ
COPY . .

# 3) generate Prisma client (ปลอดภัย แม้คุณจะมี postinstall อยู่แล้ว)
RUN yarn prisma generate || true

# 4) build TypeScript
RUN yarn build


# ---------- Runtime stage ----------
FROM node:22-alpine AS production
WORKDIR /app

# init ที่จัดการสัญญาณดีขึ้น
RUN apk add --no-cache dumb-init

# ใช้ user ที่มากับ image เพื่อลดสิทธิ์
USER node

# คัดเฉพาะไฟล์จำเป็น
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# (ไม่แนะนำให้ COPY .env เข้า image; ให้ส่งผ่าน env ด้วย docker compose)
# ถ้าจำเป็นจริงค่อย uncomment บรรทัดนี้
# COPY --chown=node:node env.example .env

EXPOSE 6601

# Healthcheck (ปรับ path ตามแอปคุณ)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:6601/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

ENTRYPOINT ["dumb-init", "--"]
# เปลี่ยนเป็นคำสั่ง start ของคุณได้ เช่น: ["yarn","start"]
CMD ["node", "dist/server.js"]
