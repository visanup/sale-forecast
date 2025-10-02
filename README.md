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