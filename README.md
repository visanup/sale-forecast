# Demand Forecasting Application

A comprehensive demand forecasting system built with React frontend and Node.js microservices backend.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │   Auth Service  │
│   (React)       │◄──►│   (Port 6601)   │
│   (Port 6600)   │    └─────────────────┘
└─────────────────┘             │
         │                      │
         │              ┌───────▼───────┐
         │              │   PostgreSQL  │
         │              │   Database    │
         │              └───────────────┘
         │                      │
    ┌────▼────┐         ┌───────▼───────┐
    │  Data   │◄────────┤     Redis     │
    │ Service │         │   (Logging)   │
    │(Port    │         └───────────────┘
    │ 6603)   │
    └─────────┘
         │
    ┌────▼────┐    ┌─────────┐    ┌─────────┐
    │ Ingest  │    │   DIM   │    │   Auth  │
    │ Service │    │ Service │    │ Service │
    │(Port    │    │(Port    │    │(Port    │
    │ 6602)   │    │ 6604)   │    │ 6601)   │
    └─────────┘    └─────────┘    └─────────┘
```

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

1. **Clone and start all services:**
   ```bash
   git clone <repository-url>
   cd DemandForecasting
   docker-compose up -d
   ```

2. **Access the application:**
   - Frontend: http://localhost:6600
   - Auth Service API: http://localhost:6601/docs
   - Data Service API: http://localhost:6603/docs
   - Ingest Service API: http://localhost:6602/docs
   - DIM Service API: http://localhost:6604/docs

### Option 2: Manual Setup (Without Docker)

#### Prerequisites
- Node.js (v20 or higher)
- PostgreSQL (v12 or higher)
- PowerShell (for setup scripts)

#### Setup Steps

1. **Install PostgreSQL**
   - Download from: https://www.postgresql.org/download/
   - Remember the password for `postgres` user

2. **Setup Database**
   ```powershell
   .\setup-database.ps1
   ```

3. **Build Services**
   ```powershell
   .\build-services.ps1
   ```

4. **Create Environment Files**

   **Auth Service** (`services/auth-service/.env`):
   ```env
   PORT=6601
   DATABASE_URL=postgres://app:app@localhost:5432/sales_forecast
   JWT_ACCESS_SECRET=your-super-secret-access-key
   JWT_REFRESH_SECRET=your-super-secret-refresh-key
   INTERNAL_SHARED_SECRET=dev-internal-secret
   CORS_ORIGINS=http://localhost:6600
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

   **Data Service** (`services/data-service/.env`):
   ```env
   PORT=6603
   DATABASE_URL=postgres://app:app@localhost:5432/sales_forecast
   CORS_ORIGINS=http://localhost:6600
   AUTH_VALIDATE_URL=http://localhost:6601/internal/validate
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

   **Ingest Service** (`services/ingest-service/.env`):
   ```env
   PORT=6602
   DATABASE_URL=postgres://app:app@localhost:5432/sales_forecast
   CORS_ORIGINS=http://localhost:6600
   AUTH_VALIDATE_URL=http://localhost:6601/internal/validate
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

   **DIM Service** (`services/dim-service/.env`):
   ```env
   PORT=6604
   DATABASE_URL=postgres://app:app@localhost:5432/sales_forecast
   CORS_ORIGINS=http://localhost:6600
   AUTH_VALIDATE_URL=http://localhost:6601/internal/validate
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

5. **Start Services**
   ```powershell
   .\start-services.ps1
   ```

6. **Start Frontend**
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

7. **Create Sample API Key**
   ```powershell
   cd services/auth-service
   npm run create-api-key
   ```

## 📁 Project Structure

```
DemandForecasting/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API client
│   │   └── ui/              # Layout components
│   └── Dockerfile           # Frontend Docker configuration
├── services/
│   ├── auth-service/        # Authentication & API key management
│   ├── data-service/        # Data processing & forecasting
│   ├── dim-service/         # Dimension management
│   └── ingest-service/      # Data ingestion
├── scripts/                 # Utility scripts
├── docs/                    # Documentation
├── docker-compose.yml       # Docker orchestration
└── README.md               # This file
```

## 🔧 Services Overview

### Frontend (Port 6600)
- **Technology**: React + Vite + TypeScript
- **Features**: 
  - User authentication
  - API key management
  - Data visualization
  - Real-time logs viewing
  - Manual data entry

### Auth Service (Port 6601)
- **Technology**: Node.js + Express + Prisma
- **Features**:
  - User registration/login
  - JWT token management
  - API key generation
  - Internal service authentication

### Data Service (Port 6603)
- **Technology**: Node.js + Express + Prisma
- **Features**:
  - Forecasting algorithms
  - Data processing
  - Log aggregation
  - API key validation

### Ingest Service (Port 6602)
- **Technology**: Node.js + Express + Prisma
- **Features**:
  - Excel file processing
  - Data validation
  - Batch data import
  - API key validation against auth-service (see update below)

### 🔐 Latest Fixes
- Ingest service now falls back to an internal verification call (`AUTH_VALIDATE_URL`) when `X-API-Key` headers do not match the optional static key. Ensure `AUTH_VALIDATE_URL` and `INTERNAL_SHARED_SECRET` are set in `services/ingest-service/.env`.
- Frontend upload requests reuse the most recent API key saved on the **API Portal** or generated on the **API Keys** page. Once a user enters or creates a key, it is stored in `localStorage` and used for ingest/data requests automatically.
- If uploads return `401`, confirm the auth-service contains the key (e.g. via `/api/v1/api-keys`) and that the ingest service container has been restarted with the new environment variables.
- DIM service build error (`Type '{ material: true; uom: true; }' is not assignable to type 'never'`) has been resolved by fetching material and UOM metadata via separate queries, which matches the current Prisma schema without relation definitions.
- Ingest service build error (`'method' does not exist in forecast_runCreateInput`) has been addressed by aligning `createRun` with the current Prisma schema (anchor month only), keeping method/notes parameters reserved for future schema migrations.

### DIM Service (Port 6604)
- **Technology**: Node.js + Express + Prisma
- **Features**:
  - Dimension management
  - Company/product hierarchies
  - Data relationships

## 📊 Redis Logging System

### Overview
Centralized logging system using Redis Stream to collect logs from all services and display them in the frontend.

### Architecture
```
┌─────────────────┐
│  auth-service   │───┐
└─────────────────┘   │
┌─────────────────┐   │
│  data-service   │───┼──► Redis Stream ◄──┐
└─────────────────┘   │    (service:logs)  │
┌─────────────────┐   │                    │
│  dim-service    │───┤                    │
└─────────────────┘   │                    │
┌─────────────────┐   │                    │
│ ingest-service  │───┘                    │
└─────────────────┘                        │
                                           │
┌─────────────────┐    GET /v1/logs       │
│    Frontend     │────────────────────────┘
│   (LogsPage)    │    (via data-service)
└─────────────────┘
```

### Features
- **Real-time log viewing** with auto-refresh
- **Filtering** by service, level, time range
- **Color-coded** log levels
- **Expandable** log data
- **Performance optimized** with Redis Streams
- **Auto-trimming** keeps last 10,000 logs

### Log Levels
- 🔴 **Error**: Critical errors
- 🟡 **Warning**: Warning messages  
- 🔵 **Info**: Informational messages
- ⚪ **Debug**: Debug messages

### API Endpoints
```bash
# Fetch logs
GET /v1/logs?limit=100&service=auth-service&level=error

# Get statistics
GET /v1/logs/stats

# Clear all logs (admin)
DELETE /v1/logs
```

## 🔑 API Authentication

### User Authentication
- **Bearer Token**: `Authorization: Bearer <token>`
- **Endpoints**: User login, registration, profile management

### Service Authentication  
- **API Key**: `X-API-Key: <api-key>`
- **Endpoints**: All business logic APIs (forecast, ingest, dim)

### API Key Management
1. Create API client in frontend
2. Generate API key
3. Use key in service requests
4. Manage permissions and rotation

## 🛠️ Development

### Building Docker Images
```powershell
# Build all images
.\build-docker.ps1

# Or build individually
docker build -t demand-forecasting-frontend -f frontend/Dockerfile frontend
docker build -t demand-forecasting-auth-service -f services/auth-service/Dockerfile services/auth-service
```

### Environment Variables
All services support the following common environment variables:
- `PORT`: Service port
- `DATABASE_URL`: PostgreSQL connection string
- `CORS_ORIGINS`: Allowed origins for CORS
- `REDIS_HOST`: Redis server host
- `REDIS_PORT`: Redis server port
- `LOG_LEVEL`: Logging level (error, warn, info, debug)

### Testing the Setup
1. **Frontend**: http://localhost:6600
2. **API Portal**: http://localhost:6600/api
3. **API Keys**: http://localhost:6600/api-keys
4. **Logs**: http://localhost:6600/logs
5. **Auth Docs**: http://localhost:6601/docs

## 🔍 Troubleshooting

### Common Issues

**Port Already in Use**
```powershell
# Find process using port
netstat -ano | findstr :6601

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Database Connection Issues**
1. Ensure PostgreSQL is running
2. Verify database and user creation
3. Check connection string in `.env` files

**CORS Issues**
Ensure all services have correct CORS origins:
```
CORS_ORIGINS=http://localhost:6600
```

**Frontend Build Issues**
```powershell
cd frontend
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

**Logs Not Appearing**
1. Check Redis is running: `docker ps | grep df-redis`
2. Verify Redis connection in service logs
3. Check `REDIS_HOST` and `REDIS_PORT` environment variables

### Redis Monitoring
```bash
# Check Redis connection
docker exec -it df-redis redis-cli ping

# View stream info
docker exec -it df-redis redis-cli XINFO STREAM service:logs

# View recent logs
docker exec -it df-redis redis-cli XREVRANGE service:logs + - COUNT 10
```

## 📚 Documentation

Additional documentation is available in the `docs/` directory:
- [Architecture Overview](docs/01-Architecture.md)
- [Database Schema](docs/02-Database.md)
- [Backend Services](docs/03-Backend-Services.md)
- [API Documentation](docs/04-API.md)
- [Frontend Guide](docs/05-Frontend.md)
- [DevOps Guide](docs/06-DevOps.md)

## 🔐 Security Notes

- Logs API requires API key authentication
- Logs may contain sensitive data - restrict access appropriately
- Use strong JWT secrets in production
- Set Redis password for production environments
- Consider log retention policies for compliance

## 🚀 Production Deployment

### Docker Compose Production
1. Update environment variables for production
2. Use strong secrets for JWT and internal communication
3. Set up proper CORS origins
4. Configure Redis password
5. Set up SSL/TLS certificates
6. Configure log retention policies

### Environment Variables for Production
```env
# Security
JWT_ACCESS_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
INTERNAL_SHARED_SECRET=<strong-random-secret>
REDIS_PASSWORD=<strong-redis-password>

# Database
DATABASE_URL=<production-database-url>

# CORS
CORS_ORIGINS=https://your-domain.com
```

## 📈 Future Enhancements

- [ ] Add log search/grep functionality
- [ ] Export logs to file
- [ ] Log aggregation by time periods
- [ ] Alert on error thresholds
- [ ] Integration with monitoring tools (Grafana, etc.)
- [ ] Advanced forecasting algorithms
- [ ] Real-time data streaming
- [ ] Multi-tenant support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.


ภาพรวมระบบ

ระบบนี้เป็นแพลตฟอร์มพยากรณ์ความต้องการแบบ end-to-end ที่แยกเป็น React frontend (พอร์ต 6600) และไมโครเซอร์วิส Node.js/Express หลายตัวบนพอร์ต 6601–6604 โดยทั้งหมดแชร์ PostgreSQL สำหรับข้อมูลธุรกิจและ Redis สำหรับแคช/ล็อก (README.md:3, README.md:5, docs/01-Architecture.md:42, docs/01-Architecture.md:96).
แต่ละบริการเป็นโครงการ TypeScript อิสระ ใช้มาตรฐานเดียวกัน (pino, zod, Prisma) และสื่อสารผ่าน REST ด้วย Bearer token สำหรับผู้ใช้และ API Key สำหรับข้อมูล โดยบริการอื่นเรียก /internal/validate ของ auth-service ผ่าน INTERNAL_SHARED_SECRET (docs/03-Backend-Services.md:9, docs/03-Backend-Services.md:17, docs/01-Architecture.md:116).
บริการ Backend

auth-service จัดการผู้ใช้, JWT access/refresh, การสร้าง/เพิกถอน API key และยืนยันสิทธิ์ให้บริการอื่น (docs/01-Architecture.md:53, docs/03-Backend-Services.md:106).
ingest-service รับไฟล์ Excel/CSV หรือบันทึกมือ, แปลงข้อมูล, ตรวจสอบ dimension, สร้าง forecast_run, และเขียน fact_forecast/fact_price (docs/01-Architecture.md:75, docs/03-Backend-Services.md:111).
data-service ให้บริการดึง forecast, aggregates, ราคา, audit logs และเป็นเกตเวย์ดึง Redis logs (docs/01-Architecture.md:64, docs/04-API.md:93, docs/04-API.md:255, docs/04-API.md:328).
dim-service ให้ endpoint อ่านข้อมูลมิติ (บริษัท, SKU, ช่องทาง, ยอดขาย ฯลฯ) เพื่อใช้ใน UI และ validation (docs/01-Architecture.md:86, docs/04-API.md:395).
Frontend & UX

Frontend ใช้ React + Vite + Tailwind พร้อมฟีเจอร์หลัก: ล็อกอิน/สมัคร, จัดการ API key, อัปโหลด Excel, กรอกด้วยมือ, พรีวิว API portal และหน้า Logs แบบเรียลไทม์ (docs/05-Frontend.md:45, docs/05-Frontend.md:141, docs/01-Architecture.md:42).
มีแนวทาง UI/UX เพื่อให้หน้าตาพรีเมียม รองรับการตอบสนอง, โฟกัส state, lazy loading, error state รายแถว และ auto-refresh logs ทุก 5 วินาที (docs/05-Frontend.md:74, docs/05-Frontend.md:219, docs/05-Frontend.md:235).
การเชื่อมต่อ API รวมศูนย์ใน services/api.ts โดยกำหนด URL ผ่าน VITE_* และจัดเก็บ API key ล่าสุดใน localStorage เพื่อใช้ซ้ำ (docs/05-Frontend.md:181, README.md:270).
ข้อมูล & ฐานข้อมูล

สคีมาหลักประกอบด้วยตาราง dimension (บริษัท, แผนก, ช่องทาง, UOM, วัสดุ, SKU, sales org, เดือน), fact (fact_forecast, fact_price) และตารางควบคุม (forecast_run, api_clients, api_keys, staging_forecast_uploads) เพื่อรองรับ long-format forecast รายเดือน (docs/02-Database.md:14).
ข้อมูลจากไฟล์อินพุต map เข้าตารางมิติตาม code ต่าง ๆ, กระจาย forecast_n-2…n+2 เป็นหลายแถว และเก็บ snapshot ราคาไว้ใน fact (docs/02-Database.md:22).
มีข้อกำหนดเรื่อง primary key/unique, CHECK, foreign key และดัชนีตาม company/sku/month เพื่อให้ query เร็ว รวมถึงข้อเสนอ SCD สำหรับราคาหากต้องเก็บช่วงเวลา (docs/02-Database.md:33, docs/02-Database.md:44, docs/02-Database.md:142).
API และการบูรณาการ

ผู้ใช้ต้องพิสูจน์ตัวตนด้วย JWT ส่วน endpoint ธุรกิจต้องมี X-API-Key, และบริการภายในใช้ shared secret กับ /internal/validate (docs/04-API.md:25, docs/04-API.md:39).
Auth API ครอบคลุม register/login/refresh/logout/reset-password, การจัดการ API key และโปรไฟล์ (docs/04-API.md:60).
Data API มี /v1/forecast, /v1/forecast/aggregate, /v1/saleforecast (พร้อมกฎ anchor_month และ requirement ในการบันทึก audit log ทุก method), /v1/forecast-runs, /v1/prices, /v1/audit-logs, และ log endpoints /v1/logs|logs/stats|logs (DELETE) (docs/04-API.md:93, docs/04-API.md:116, docs/04-API.md:229, docs/04-API.md:255, docs/04-API.md:303, docs/04-API.md:320, docs/04-API.md:328).
Ingest API รองรับ POST /v1/upload (multipart) และ POST /v1/manual สำหรับกรอกเป็น JSON list ต่อ anchor month (docs/04-API.md:436).
มีกลยุทธ์ versioning (/v1), cursor pagination, รูปแบบ error มาตรฐาน, และอัตราจำกัด 600 req/นาที (Logs 100 req/นาที) พร้อม header แจ้ง quota (docs/04-API.md:500, docs/04-API.md:517, docs/04-API.md:536, docs/04-API.md:573).
Observability & Logging

ทุกบริการส่งล็อกแบบ JSON เข้า Redis Stream เดียว (service:logs) แล้ว data-service ให้ frontend เปิดดู, กรอง, เคลียร์ พร้อม auto-trim 10,000 รายการ (README.md:220, README.md:234, docs/01-Architecture.md:160, docs/01-Architecture.md:181).
ล็อกเก็บระดับ Error/Warn/Info/Debug, แนบ requestId/timestamp และ config redis health check ใน docker (docs/01-Architecture.md:189, docs/06-DevOps.md:216).
ความปลอดภัย & การกำกับดูแล

นโยบาย Hashing password/API key, จำกัด CORS, มี rate limiting, กำหนด health check ต่อบริการ, และระบุให้ใช้ JWT/secret ที่แข็งแรงพร้อม Redis password ใน production (docs/01-Architecture.md:138, README.md:364, README.md:382).
Audit log จำเป็นสำหรับทุกการเรียก /v1/saleforecast, เก็บ action, record_id, performer และ metadata เพื่อการตรวจสอบ (docs/04-API.md:229).
Cloud deployment guide ย้ำให้ตั้งค่า secrets, SSL/TLS, และ CORS domain ที่ถูกต้องก่อนเปิดบริการ (CLOUD-DEPLOYMENT.md:7, CLOUD-DEPLOYMENT.md:118, CLOUD-DEPLOYMENT.md:146).
DevOps & การปรับใช้

โครงการมี compose หลายแบบ: full stack, backend-only, frontend-only พร้อมสคริปต์ PowerShell start/stop dev และตัวเลือกพัฒนา hybrid/docker/local (docs/06-DevOps.md:15, docs/06-DevOps.md:118, docs/06-DevOps.md:160).
README ระบุขั้นตอนตั้งค่า manual รวมถึง .env สำหรับแต่ละบริการและชุดตัวแปร production (README.md:75, README.md:288, README.md:382).
สำหรับคลาวด์ รองรับ Kubernetes manifests, Docker Compose production และ Terraform บน AWS พร้อมคำแนะนำตรวจสุขภาพหลัง deploy (CLOUD-DEPLOYMENT.md:5, CLOUD-DEPLOYMENT.md:32, CLOUD-DEPLOYMENT.md:49, CLOUD-DEPLOYMENT.md:78).
ทิศทางอนาคต

Roadmap เพิ่มฟีเจอร์ เช่น log search/export, alerting, advanced forecasting/streaming/multi-tenant, component เสริม frontend (README.md:397, docs/05-Frontend.md:172).
หากต้องการขยายประเด็นใด (เช่น requirement ตามไฟล์ Excel หรือ UAT ในสเปรดชีต) แจ้งได้เลยครับ.