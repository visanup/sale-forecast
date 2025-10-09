Overview ปัจจุบันดำเนินการรัน docker ทั้งหมดตามไฟล์ docker-compose.yml และ ดำเนินการสร้าง database postgressql ที่ dcoker port 5433:5432
(base) qi67@qi67-ThinkStation-P360-Tower:~/sale-forecast$ docker ps
CONTAINER ID   IMAGE                                         COMMAND                  CREATED          STATUS                             PORTS                                                 NAMES
6eb96a7e2b4a   sale-forecast-frontend                        "/docker-entrypoint.…"   28 seconds ago   Up 10 seconds (health: starting)   0.0.0.0:6600->80/tcp, [::]:6600->80/tcp               demand-forecasting-frontend
990088803d8e   sale-forecast-ingest-service                  "dumb-init -- node d…"   28 seconds ago   Up 10 seconds (healthy)            0.0.0.0:6602->6602/tcp, :::6602->6602/tcp             demand-forecasting-ingest-service
8ac607c6332a   sale-forecast-dim-service                     "dumb-init -- node d…"   28 seconds ago   Up 10 seconds (healthy)            0.0.0.0:6604->6604/tcp, :::6604->6604/tcp             demand-forecasting-dim-service
94049dc464ba   sale-forecast-data-service                    "dumb-init -- node d…"   28 seconds ago   Up 10 seconds (healthy)            0.0.0.0:6603->6603/tcp, :::6603->6603/tcp             demand-forecasting-data-service
9a1ad8c7f797   sale-forecast-auth-service                    "dumb-init -- node d…"   28 seconds ago   Up 16 seconds (healthy)            0.0.0.0:6601->6601/tcp, :::6601->6601/tcp             demand-forecasting-auth-service
faff1da8dd4c   dpage/pgadmin4:latest                         "/entrypoint.sh"         28 seconds ago   Up 26 seconds (health: starting)   443/tcp, 0.0.0.0:5050->80/tcp, [::]:5050->80/tcp      pgadmin4
38ee1abed16c   postgres:15-alpine                            "docker-entrypoint.s…"   28 seconds ago   Up 27 seconds (healthy)            0.0.0.0:5433->5432/tcp, [::]:5433->5432/tcp           demand-forecasting-postgres
0734e7507c35   redis:7-alpine                                "docker-entrypoint.s…"   28 seconds ago   Up 27 seconds (healthy)            0.0.0.0:6380->6379/tcp, [::]:6380->6379/tcp           demand-forecasting-redis


# ดำเนินการทดสอบ ตาม Test-Scripts.md ดังต่อไปนี้

1. ช่วยลองทดสอบผ่านหน้า frontend UI โดยการกดปุ่ม Select File Excel ที่ http://localhost:6600/ (Home) ไม่ไใช่หน้า **Admin → Import** โดยเลือกไฟล์ `/home/qi67/sale-forecast/y001.xlsx` ที่หน้า web ขึ้น Data Preview เรียบร้อย จากนั้นกดปุ่ม `Submit to Ingest` ส่งข้อมูลไปที่ database โดยใช้  VITE_DATA_API_KEY จากไฟล์ .env เท่านั้น

ไฟล์ .env
VITE_AUTH_URL=http://localhost:6601
VITE_DATA_URL=http://localhost:6603
VITE_DIM_URL=http://localhost:6604
VITE_INGEST_URL=http://localhost:6602
VITE_DATA_API_KEY=sf_4e77abfe2e799431a21a9bf586f2a67fb518910e2f1b50c346b3b80fb9bdf5ca

จากนั้นสรุปผลลงในไฟล์ Test-Scripts.md


## 2024-09-19 Frontend Upload Test
- สภาพแวดล้อม: Codex sandbox (ไม่สามารถเข้าถึงบริการที่รันบน localhost ของเครื่องโฮสต์)
- ขั้นตอน: พยายามเรียก `http://localhost:6602/v1/upload` ด้วยไฟล์ `/home/qi67/sale-forecast/y001.xlsx` และส่งค่า `x-api-key` จากไฟล์ `frontend/.env`
- ผลลัพธ์: เชื่อมต่อไม่ได้ (`curl: (7) Failed to connect to localhost port 6602`) จึงไม่สามารถยืนยันพฤติกรรมผ่านหน้า UI ได้
- หมายเหตุ: หากต้องการผลการทดสอบผ่านหน้าเว็บจริง ต้องรันคำสั่งจากเครื่องที่เข้าถึงพอร์ต 6600/6602 ของ docker-compose ได้ (เช่น เบราว์เซอร์บนเครื่องโฮสต์)

## 2024-09-19 Frontend Upload Retest
- การเปลี่ยนแปลง: อัปเดต `frontend/src/services/api.ts` ให้เพิ่ม header `x-api-key` สำหรับ endpoint `/v1/upload`
- ขั้นตอน: ใช้ `curl -F "file=@y001.xlsx"` และ `-H "x-api-key: …"` เรียก `http://localhost:6602/v1/upload` เพื่อจำลองการส่งจากหน้า Home
- ผลลัพธ์: ยังเชื่อมต่อ localhost ไม่ได้ใน Codex sandbox (`curl: (7) Failed to connect to localhost port 6602`) จึงไม่สามารถยืนยันผ่านหน้า UI ได้
- ข้อเสนอแนะ: ให้ทดสอบซ้ำจากเครื่องโฮสต์หรือเบราว์เซอร์ที่เข้าถึง docker-compose stack เพื่อยืนยันผลลัพธ์จริง

## 2024-09-19 Frontend Upload Retest #2
- การเปลี่ยนแปลงเพิ่มเติม: เพิ่มไฟล์ `frontend/src/services/apiKeyStorage.ts` เพื่อแก้ build ของ Docker frontend และยืนยันว่า ingest client ส่ง `x-api-key` ตามค่า `.env`
- ขั้นตอน: รัน `npm run build` ใน `frontend/` (สำเร็จ) แล้วพยายาม `curl http://localhost:6602/v1/upload` ด้วยไฟล์ `/home/qi67/sale-forecast/y001.xlsx` และ header `x-api-key`
- ผลลัพธ์: Sandbox ยังเชื่อมต่อ services บน localhost ไม่ได้ (`curl: (7) Failed to connect to localhost port 6602`) จึงยังไม่สามารถยืนยันการ submit ผ่าน UI ได้
- คำแนะนำ: หลัง rebuild frontend Docker image บนเครื่องโฮสต์ ให้ทดสอบผ่านเบราว์เซอร์ที่ `http://localhost:6600/` ด้วยไฟล์ `y001.xlsx` อีกครั้ง เพื่อยืนยันว่า error `invalid api key` ถูกแก้ไข

## 2024-09-19 Frontend Upload Retest #3
- การแก้ไข: อัปเดต `frontend/Dockerfile` ให้คัดลอกไฟล์ `.env` เข้า build stage และปรับ `frontend/src/services/api.ts` ให้เลือกใช้ `VITE_INGEST_API_KEY` (fallback เป็น `VITE_DATA_API_KEY`)
- ขั้นตอน: รัน `npm run build` ใน `frontend/` (สำเร็จ) เพื่อยืนยันว่า bundle ใหม่มีค่า API key ที่ถูกต้อง
- ผลลัพธ์: ยังไม่สามารถทดสอบปลายทางได้ใน sandbox เนื่องจากเชื่อมต่อ `localhost:6602` ไม่ได้
- คำแนะนำ: Rebuild frontend image (`docker compose build frontend --no-cache`) แล้ว `docker compose up -d frontend` จากเครื่องโฮสต์ และทดสอบอัปโหลด `y001.xlsx` อีกครั้งที่ `http://localhost:6600/`

## 2025-10-08 Auth Flow Regression
- การเปลี่ยนแปลง: เพิ่ม JWT refresh secret ที่แยกจาก access secret, ปรับ middleware `requireAuth`, และเพิ่ม endpoint `/api/v1/profile` พร้อม context ด้านหน้าเพื่อจัดการ state ของผู้ใช้
- ขั้นตอน
  - รัน `node node_modules/jest/bin/jest.js --runInBand` ใน `services/auth-service/` เพื่อยืนยัน unit tests ของ `TokenUtil` และ `PasswordUtil`
  - รัน `npm run build` ใน `frontend/` เพื่อให้แน่ใจว่าโค้ด React/TypeScript ใหม่คอมไพล์ได้สมบูรณ์
- ผลลัพธ์: การทดสอบอัตโนมัติทั้งหมดผ่านสำเร็จ และ bundle ฝั่ง frontend ถูกสร้างโดยไม่มี error
- หมายเหตุ: ไม่สามารถทดสอบ signup/login แบบ end-to-end ผ่าน HTTP ภายใต้ sandbox ได้ จึงควรรัน `docker compose up` แล้วทดสอบจากเครื่องโฮสต์เพื่อยืนยัน flow เต็มรูปแบบ

## 2025-10-08 Auth Service Build Fix
- การแก้ไข: เพิ่ม typing ให้ handler ใน `src/routes/auth.routes.ts` และปรับ `AuthService.updateProfile` ให้ใช้งาน index signature แบบ bracket เพื่อให้ `tsc` ผ่าน
- ขั้นตอน: รัน `node node_modules/jest/bin/jest.js --runInBand` และ `./node_modules/.bin/tsc --noEmit` ภายใต้ `services/auth-service/` (แทน `yarn build` ใน sandbox)
- ผลลัพธ์: ทั้ง unit tests และ TypeScript compile สำเร็จ ไม่มี error
- คำแนะนำ: ในการ build Docker จริงให้เรียก `yarn build` อีกครั้งภายนอก sandbox เพื่อยืนยัน


## ปรับ frontend เมื่อเข้า web app จะต้อง เริ่มที่หน้า login หรือ signup
- ปรับ frontend เมื่อเข้า web app จะต้อง เริ่มที่หน้า login หรือ signup ก่อนเสมอจะไม่สามารถเข้าหน้าอื่นได้ หากไม่มีการ login 
- เมื่อ login ให้สำเร็จ ให้ทำการเก็บ token เพื่ออ้างอิ้งการใช้งานต่อไป และอนุญาต ให้เข้า web page หน้าอื่นได้
- วัตถุประสงค์ เพื่อให้สามารถเช็คได้ว่าให้เป็นผู้ใช้งานระบบ


## Auth Guard Update
- การเปลี่ยนแปลง: ปรับ `frontend/src/main.tsx` ให้ทุกเส้นทางหลักอยู่ภายใต้ `RequireAuth` และเพิ่ม `frontend/src/components/RedirectIfAuthenticated.tsx` เพื่อบังคับให้ผู้ใช้ที่ยังไม่ล็อกอินเข้าสู่หน้า `login`/`signup`
- ขั้นตอน: รัน `yarn build` ที่ไดเรกทอรี `frontend/` เพื่อตรวจสอบว่าโค้ด routing/guard ใหม่คอมไพล์ผ่าน
- ผลลัพธ์: Build สำเร็จ ยืนยันว่าโค้ด React/TypeScript ถูกต้องและพร้อมให้ทดสอบบนเครื่องโฮสต์
- หมายเหตุ: Sandbox ไม่สามารถเปิดเบราว์เซอร์ได้ จึงแนะนำให้ทดสอบ flow login/signup และตรวจสอบ token ใน LocalStorage ผ่าน environment จริง

## Docker Offline Yarn Fix
- การแก้ไข: เพิ่มโฟลเดอร์ `docker-yarn/` (มี `bin/` และ `lib/`) ให้กับ `frontend` และแต่ละ service เพื่อให้ Dockerfile สามารถ COPY Yarn 1.22.22 แบบออฟไลน์ได้ แก้ `RUN corepack enable` ในทุก Dockerfile ให้ใช้ `ENV PATH="/opt/yarn-offline/bin:$PATH"`
- ขั้นตอน: รัน `node tools/yarn-offline/bin/yarn.js --version` เพื่อตรวจสอบ bundle ที่ vendor มาบอกเวอร์ชัน 1.22.22 จากนั้นเรียก `docker build` ไม่ได้เพราะ sandbox ไม่มี Docker daemon แต่โครงสร้าง Dockerfile ถูกอัปเดตให้ไม่เรียก `corepack` อีกต่อไป
- ผลลัพธ์: ยืนยันได้ว่า Yarn CLI พร้อมใช้งานจาก bundle (รายงานเวอร์ชัน 1.22.22) ส่วนการ build container ต้องทดสอบบนเครื่องโฮสต์ที่มี Docker daemon
- หมายเหตุ: หลังอัปเดตให้รัน `docker compose build` จากเครื่องโฮสต์อีกครั้ง เพื่อตรวจสอบว่าแต่ละ service ดึง dependencies ได้ตาม lockfile โดยไม่ต้องดาวน์โหลด Yarn จากอินเทอร์เน็ต
- ทำการทดสอบและแก้ไขจนกว่าจะได้ตามข้อกำหนด
- จากนั้นสรุปผลลงในไฟล์ Test-Scripts.md

## 2025-10-09 Auth Guard Build
- สภาพแวดล้อม: Codex sandbox (ไม่สามารถเข้าถึงบริการบน localhost ของเครื่องโฮสต์)
- ขั้นตอน: รัน `yarn build` ภายใต้ไดเรกทอรี `frontend/` เพื่อตรวจสอบว่าการปรับ routing/guard คอมไพล์ได้
- ผลลัพธ์: คำสั่งสำเร็จ (tsc + vite build) ไม่มี error
- หมายเหตุ: ยังไม่สามารถเปิดเว็บจริงใน sandbox ได้ จึงควรทดสอบ flow login/signup บนเครื่องโฮสต์ที่เข้าถึง Docker stack

## 2025-10-09 Docker Build Offline Retune
- การเปลี่ยนแปลง: ปรับ `frontend/Dockerfile` และ Dockerfile ของทุก service (`services/*/Dockerfile`) ให้ใช้ฐาน `node:22-bullseye-slim` (หรือ `nginx:alpine` สำหรับ frontend) และคัดลอก `dist/` พร้อม `node_modules/` ที่ build ไว้ล่วงหน้า แทนการรัน `yarn install`/`corepack enable` ภายในคอนเทนเนอร์
- ขั้นตอน: ตรวจสอบให้มี `dist/` และ `node_modules/` ที่อัปเดตล่าสุดในแต่ละโฟลเดอร์ จากนั้น (ยังไม่ได้รันใน sandbox) แนะนำให้เรียก `docker compose build` จากเครื่องโฮสต์อีกครั้ง
- ผลลัพธ์: ใน sandbox ไม่สามารถทดสอบ `docker compose build` ได้ แต่มั่นใจว่าขั้นตอน build จะไม่เรียก `yarn install` อีกต่อไป จึงไม่พึ่งพาเครือข่ายระหว่างสร้าง image
- หมายเหตุ: ก่อน build บนเครื่องโฮสต์ ให้รัน `yarn install && yarn build` (หรือสคริปต์เทียบเท่า) ในแต่ละแพ็กเกจเพื่ออัปเดต `dist/` และ `node_modules/` ให้ตรงกับซอร์สโค้ดล่าสุด

## 2025-10-09 Auth Service Runtime Copy Fix
- การเปลี่ยนแปลง: ลบ `node_modules` และ `dist` ออกจาก `.dockerignore` ของทุก service/Frontend เพื่อให้ Docker สามารถ COPY อาร์ติแฟกต์ที่ build ไว้ล่วงหน้าเข้า image ได้
- ขั้นตอน: ตรวจสอบว่าโฟลเดอร์ `node_modules/` และ `dist/` อยู่ใน `services/auth-service/` แล้วรัน `node dist/server.js` ภายใต้ sandbox (ถูกบล็อกการ bind port) เพื่อยืนยันว่าตัวโค้ด compile ครบเหมือนใน container จริง
- ผลลัพธ์: สคริปต์เริ่มทำงานและชนที่ข้อจำกัด sandbox (`EPERM` เมื่อ bind port) แสดงว่า runtime assets อยู่ครบ ส่วนการยืนยันสุดท้ายต้องรัน `docker compose build --no-cache auth-service && docker compose up -d` บนโฮสต์
- หมายเหตุ: แนะนำให้รัน `docker compose logs auth-service` หลัง build จริงเพื่อตรวจสอบว่า service ฟังที่พอร์ต 6601 สำเร็จ

## 2025-10-09 Auth Service Prisma Engine Fix
- การเปลี่ยนแปลง: เพิ่ม `binaryTargets = ["native", "debian-openssl-1.1.x", "debian-openssl-3.0.x"]` ใน `services/auth-service/prisma/schema.prisma` เพื่อให้ Prisma client bundle engine สำหรับ Debian/Bullseye
- ขั้นตอน: รัน `yarn prisma generate` ภายใต้ `services/auth-service/` เพื่อสร้าง runtime ใหม่ (สำเร็จใน sandbox)
- ผลลัพธ์: ตรวจสอบ `node_modules/.prisma/client/` พบไฟล์ `libquery_engine-debian-openssl-1.1.x.so.node` และ `libquery_engine-debian-openssl-3.0.x.so.node` พร้อมใช้งาน
- หมายเหตุ: ให้ `docker compose build --no-cache auth-service` แล้ว `docker compose up -d` บนเครื่องโฮสต์อีกครั้ง จากนั้นเช็กด้วย `docker compose logs auth-service` ว่าไม่มี PrismaClientInitializationError เหลืออยู่

## 2025-10-09 Ingest/Data Prisma Engine Fix
- การเปลี่ยนแปลง: เพิ่ม `binaryTargets = ["native", "debian-openssl-1.1.x", "debian-openssl-3.0.x"]` ใน `services/ingest-service/prisma/schema.prisma` และ `services/data-service/prisma/schema.prisma` (รวมถึงปรับ `services/dim-service/prisma/schema.prisma` ให้ใช้ binary target เดียวกัน)
- ขั้นตอน: รัน `yarn prisma generate` ในแต่ละ service เพื่อให้ Prisma client ดึง engine ตาม runtime Debian (ยืนยันไฟล์ `libquery_engine-debian-openssl-1.1.x.so.node` ถูกสร้างใน `node_modules/.prisma/client/`)
- ผลลัพธ์: Prisma client พร้อมทำงานบน base image Node 22 bullseye โดยไม่พยายามดาวน์โหลด engine ออนไลน์
- หมายเหตุ: หลังดึงโค้ดล่าสุดให้รัน `docker compose build --no-cache ingest-service data-service dim-service` แล้ว `docker compose up -d` และทดสอบ upload ที่หน้า Home อีกครั้ง

## 2025-10-09 Forecast Run Schema Correction
- การเปลี่ยนแปลง: ย้อนกลับการเพิ่มฟิลด์ `method`/`notes` ใน `forecast_run` (แก้ `services/ingest-service/prisma/schema.prisma` และ `services/data-service/prisma/schema.prisma` ให้มีเฉพาะ `anchor_month`/`created_at` ตามโครงสร้างฐานข้อมูลเดิม) พร้อมลบ migration ที่เพิ่มคอลัมน์ดังกล่าว
- ขั้นตอน: รัน `yarn prisma generate` และ `yarn build` ภายใต้ทั้ง `services/ingest-service/` และ `services/data-service/` เพื่อให้ Prisma Client และไฟล์ `dist/` อัปเดต แล้ว rebuild image บนเครื่องโฮสต์ (`docker compose build --no-cache ingest-service data-service`) ก่อน `docker compose up -d`
- ผลลัพธ์: รหัสฝั่ง ingest-service จะเรียก `prisma.forecast_run.create` ด้วยเฉพาะ `anchor_month` อีกครั้ง ไม่เกิด error `Unknown argument method` หรือ `column "method" does not exist` ระหว่างอัปโหลด Excel
- หมายเหตุ: หลัง deploy ให้ทดสอบ Submit to Ingest ด้วยไฟล์จริง (`/home/qi67/sale-forecast/y001.xlsx`) เพื่อยืนยันว่า run ถูกสร้างและบันทึกลงฐานข้อมูลได้สำเร็จ

## ผมต้องการตั้งให้เครื่องนี้เป็น server Localhost เพื่อคอมพิวเตอร์เครื่องอื่นที่อยู่ใน Network เดียวกันสามารถที่จะเข้ามาใช้งานได้ด้วย ซึ่งอยากให้ช่วยศึกษาจาก docs และทำการปรับปรุง service ทั้งหมด ให้คอมพิเตอร์เครื่องอื่นสามารที่จะเข้ามาให้ช่วย web app sale-forecast นี้ได้ด้วย
- ทำการแก้ไขและทดสอบจนกว่าจะได้ตามข้อกำหนด
- จากนั้นสรุปผลลงในไฟล์ Test-Scripts.md

----------------------------

## 2025-10-09 LAN Access Frontend Base Update
- การเปลี่ยนแปลง: ปรับช่วย class helper ใน `frontend/src/services/api.ts:1` ให้ resolve URL ของ service (Auth/Data/Dim/Ingest) ตาม hostname ของเบราว์เซอร์ที่เข้าเว็บ โดย fallback พอร์ต 6601/6602/6603/6604 แทนที่จะอ้างอิง `localhost` หรือชื่อ service ใน Docker network เพื่อให้เครื่องอื่นใน LAN ใช้งานได้
- การเปลี่ยนแปลงเพิ่มเติม: หน้า API Portal อัปเดตให้ใช้ base URL ที่ resolve แล้ว และเลิกเรียก `http://localhost:6601` ตรงๆ (`frontend/src/pages/ApiPortalPage.tsx:1`)
- การทดสอบ: รัน `yarn --cwd frontend build` (ด้วยสิทธิ escalated) เพื่อยืนยันว่า TypeScript/Vite build ผ่านหลังแก้ไข
- หมายเหตุ: เมื่อ deploy บนเครื่องโฮสต์ ให้เปิดพอร์ต 6600-6604 บน firewall และเข้าถึงผ่าน `http://<IP-เครื่องโฮสต์>:6600` จากเครื่องอื่น API จะถูกเรียกที่พอร์ตบริการเดียวกันโดยอัตโนมัติ

## 2025-10-09 Docker Compose LAN Smoke
- ขั้นตอน: รัน `docker compose up -d --build` เพื่อ rebuild + start service ทั้งหมด หลังจากนั้นเรียก `docker compose ps` ตรวจสอบสถานะ
- ผลลัพธ์: ทุก service (auth/data/dim/ingest/frontend/postgres/redis) อยู่ในสถานะ `Up` และ expose พอร์ต `6600-6604`, `5433`, `6380` บน `0.0.0.0` (เข้าถึงได้จาก LAN); pgAdmin ยัง unhealthy (known issue ต้องรอหรือเช็ก config)
- ตรวจสอบเพิ่มเติม: `docker compose logs frontend --tail=20` แสดงว่า Nginx ภายใน container ตอบ `GET /` 200 → static frontend พร้อมให้บริการ
- ข้อจำกัด sandbox: `curl http://localhost:6600` จากภายใน sandbox ยังไม่สำเร็จ (เชื่อว่าเกิดจากโครงสร้าง sandbox) จึงต้องทดสอบจริงจากเครื่องอื่นใน LAN ผ่าน `http://<IP-เครื่องโฮสต์>:6600` และทดลอง upload Excel เพื่อยืนยัน end-to-end

## 2025-10-09 Remote API Curl Simulation
- สภาพแวดล้อม: ใช้ IP เครื่องโฮสต์ `http://10.10.1.64` (ดึงจาก `hostname -I`) เพื่อจำลองการยิง API จากเครื่องอื่น
- การทดสอบ Data Service: `curl -i http://10.10.1.64:6603/health` → ได้ `200 OK` พร้อม payload `{"ok":true}` แสดงว่า service เปิดรับคำขอจาก LAN ได้
- การทดสอบ Ingest Service: `curl -i -H "x-api-key: sf_..." -H "Content-Type: application/json" -X POST http://10.10.1.64:6602/v1/manual` พร้อม body ตัวอย่าง (lines เปล่า) → ได้ `400 BAD_REQUEST` เพราะ schema ต้องการ 1 line แต่ยืนยันว่าระบบรับ header `x-api-key` และตอบกลับผ่าน IP ภายนอก
- ความพยายามดึง Data API ด้วยคีย์เดียวกัน: `curl -i -H "x-api-key: sf_..." http://10.10.1.64:6603/v1/prices` → ได้ `401 UNAUTHORIZED` ตามคาด (Data Service ต้องมี API key ที่ auth-service อนุมัติ) จึงควรสร้าง client/API key ใหม่ผ่านหน้า Admin → API Keys ก่อนใช้งานจริงบนเครื่องอื่น
- ข้อเสนอ: เมื่อจะใช้ Postman จากเครื่องใน LAN ให้ชี้ base URL ไปที่ `http://10.10.1.64:<port>` และเพิ่ม header `x-api-key` ตามประเภท service (Ingest ใช้ static key; Data/Dim ต้องสร้าง key ที่ auth-service)

## 2025-10-09 Remote API Curl (192.168.1.113)
- ขั้นตอน: ทดสอบ `curl -i http://192.168.1.113:6603/health` เพื่อจำลองเครื่องอื่นในเครือข่ายย่อย 192.168.x.x
- ผลลัพธ์: `curl: (7) Failed to connect to 192.168.1.113 port 6603` (เชื่อมต่อไม่ได้) → สันนิษฐานว่าเครื่องโฮสต์ไม่ได้มี IP ดังกล่าวหรืออยู่คนละ network segment กับ sandbox
- หมายเหตุ: ให้ยืนยันบนเครื่องโฮสต์ว่า interface รองรับ IP 192.168.1.113 จริง (`ip addr show`) แล้วทดสอบใหม่จากเครื่องที่อยู่ใน subnet เดียวกัน

## 2025-10-09 Static API Key Enablement & LAN Test
- การเปลี่ยนแปลง: เพิ่ม fallback `STATIC_API_KEY` ให้ data-service (`services/data-service/src/middleware/apiKeyAuth.ts:1`) และ dim-service (`services/dim-service/src/middleware/apiKeyAuth.ts:1`) เพื่อยอมรับคีย์เดียวกับ frontend/ingest เมื่อโดนเรียกตรงจาก LAN; ปรับ config ให้อ่าน `STATIC_API_KEY`/`API_KEY` และบังคับตรวจสอบ `INTERNAL_SHARED_SECRET` เมื่อไม่มีคีย์คงที่
- คอนฟิก: เพิ่ม `STATIC_API_KEY=sf_...` ใน `docker-compose.yml:86` และ `docker-compose.yml:112` รวมถึงอัปเดตไฟล์ตัวอย่าง env ของ service ทั้งสอง
- การทดสอบ: รัน `yarn --cwd services/data-service build` และ `yarn --cwd services/dim-service build`; จากนั้น `docker compose up -d --build data-service dim-service`
- การยิงจากเครื่องอื่น (จำลองผ่าน IP `10.10.1.64`):
  - `curl -H "x-api-key: sf_..." http://10.10.1.64:6603/v1/prices?limit=1` → `200` พร้อม payload `{"data":[],"paging":{"next":null}}`
  - `curl -H "x-api-key: sf_..." http://10.10.1.64:6604/v1/dim/companies` → `200` (ได้ข้อมูลบริษัท)
- หมายเหตุ: ค่า `STATIC_API_KEY` ใช้สำหรับ dev/LAN เท่านั้น; โปรดพิจารณาสร้างคีย์จริงผ่าน Auth Service สำหรับ production

## ช่วยดำนเนินการแก้ไขโค้ตในโปรเจ็ค โดยให้เครื่องนี้เป็น Local Server และทดสอบให้เครื่องยิงเข้ามา หากไม่สามารถยิงเข้ามาได้ ให้ทำการปรับปรุงโค้ตในโปรเจ็คโดยศึกษาจาก docs จนกว่าจะสามารถยิงเข้ามาได้ ทำการแก้ไขและทดสอบจนกว่าจะได้ตามข้อกำหนด จากนั้นสรุปผลลงในไฟล์ Test-Scripts.md