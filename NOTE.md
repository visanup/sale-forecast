# ขั้นตอนการ build แบบที่ 1

1. git clone https://github.com/visanup/sale-forecast.git

2. สร้างไฟล์ .env

3. yarn Install ใน auth/data/dim/ingest service และใน frontend

4. ทำการแก้ไข Dockerfile ที่ auth/data/dim/ingest service

5. แก้ไขไฟล์ .dockerignore ที่ auth/data/dim/ingest service ใส่ !node_modules

6. รันคำสั่ง docker compose -f docker-compose.backend.yml build --no-cache --progress=plain

7. ติดตั้ง prisma ใน auth/data/dim/ingest service
    yarn add -D prisma@6.16.3
    yarn add @prisma/client@6.16.3
    npx prisma generate

8. แก้ไขไฟล์ docker compose.backend.yml จาก image: postgres:16-alpine เป็น image: postgres:15-alpine

9. แก้ไขไฟล์ docker compose  NODE_ENV=development ใน compose ของ auth-service

10. เชื่อม 2 container ที่มีอยู่เข้าด้วยกัน pgadmin4 กับ postgres เข้าด้วยกัน
    docker network connect demand-forecasting-network demand-forecasting-postgres
    docker network connect demand-forecasting-network pgadmin4



# สิ่งที่แก้ไข

1. แก้ไขไฟล์ excel แถวแรกต้องเป็น header
2. แก้ไข ingest-service ให้แปลง format column `Distribution Channel` ให้เป็น string ก่อนส่งไป Database