# =========================
# 1) Dependencies stage
# =========================
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable

# ใช้ lock ของ yarn เพื่อให้ build reproducible
COPY package.json yarn.lock ./
# ต้องติดตั้ง devDeps ด้วย เพราะต้องใช้ tsc / vite ตอน build
RUN yarn install --frozen-lockfile

# =========================
# 2) Build stage
# =========================
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable

# นำ node_modules (รวม devDeps) จาก deps มาใช้
COPY --from=deps /app/node_modules ./node_modules

# คัดลอกไฟล์โปรเจ็กต์สำหรับ build
COPY package.json yarn.lock ./
COPY tsconfig.json ./
COPY vite.config.* ./
COPY tailwind.config.* ./
COPY postcss.config.* ./
COPY index.html ./
COPY src ./src
# ถ้ามี public/ ให้คัดลอกด้วย
COPY public ./public

# สร้างไฟล์ static (Vite จะเขียนลง /app/dist)
RUN yarn build

# =========================
# 3) Production (Nginx) stage
# =========================
FROM nginx:alpine AS production

# คัดลอกไฟล์ static ไปเสิร์ฟที่ nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# คัดลอก nginx.conf ถ้ามี
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
