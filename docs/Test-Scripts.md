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
