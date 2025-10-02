## DevOps: Docker Compose, Development Workflows, and Deployment

Document ID: DEVOPS-06

Scope: Runtime topology, compose files, environments, development workflows, Redis logging

Audience: DevOps, Backend engineers, Developers

## 🐳 Docker Compose Architecture

### Multiple Compose Options

The project supports multiple deployment scenarios with different compose files:

#### 1. Full Stack (Production/Testing)
**File**: `docker-compose.yml`
- **Purpose**: Complete application with all services
- **Use Case**: Production deployment, end-to-end testing
- **Services**: Frontend + All Backend Services + Database + Redis

```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports: ["6600:6600"]
    environment:
      - VITE_AUTH_URL=http://auth-service:6601
      - VITE_DATA_URL=http://data-service:6603
      - VITE_DIM_URL=http://dim-service:6604
      - VITE_INGEST_URL=http://ingest-service:6602
      - VITE_DATA_API_KEY=your-api-key

  auth-service:
    build: ./services/auth-service
    ports: ["6601:6601"]
    environment:
      - PORT=6601
      - DATABASE_URL=postgres://postgres:password@postgres:5432/postgres
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    # ... other services
```

#### 2. Backend Only (Development)
**File**: `docker-compose.backend.yml`
- **Purpose**: Backend services only
- **Use Case**: Development with local frontend
- **Services**: All Backend Services + Database + Redis (No Frontend)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      - POSTGRES_DB=postgres
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password

  redis:
    image: redis:7-alpine
    ports: ["6380:6379"]
    volumes:
      - redis_data:/data

  auth-service:
    build: ./services/auth-service
    ports: ["6601:6601"]
    environment:
      - PORT=6601
      - NODE_ENV=production
      - DATABASE_URL=postgres://postgres:password@postgres:5432/postgres
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - INTERNAL_SHARED_SECRET=dev-internal-secret
      - JWT_ACCESS_SECRET=your-jwt-secret
      - JWT_REFRESH_SECRET=your-refresh-secret
      - CORS_ORIGINS=http://localhost:6600
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # Similar configuration for data-service, dim-service, ingest-service
```

#### 3. Frontend Only (Optional)
**File**: `docker-compose.frontend.yml`
- **Purpose**: Frontend service only
- **Use Case**: Frontend deployment separate from backend
- **Services**: Frontend only

```yaml
version: '3.8'
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: demand-forecasting-frontend
    ports:
      - "6600:6600"
    environment:
      - VITE_AUTH_URL=http://localhost:6601
      - VITE_DATA_URL=http://localhost:6603
      - VITE_DIM_URL=http://localhost:6604
      - VITE_INGEST_URL=http://localhost:6602
      - VITE_DATA_API_KEY=your-api-key
```

## 🚀 Development Workflows

### PowerShell Development Scripts

#### Start Development Environment
**File**: `start-dev.ps1`
```powershell
# Development Startup Script
Write-Host "🚀 Starting Demand Forecasting Development Environment..." -ForegroundColor Green

# Start backend services
Write-Host "📦 Starting backend services with Docker Compose..." -ForegroundColor Yellow
docker-compose -f docker-compose.backend.yml up -d

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if services are running
Write-Host "🔍 Checking service health..." -ForegroundColor Yellow
docker-compose -f docker-compose.backend.yml ps

# Start frontend in development mode
Write-Host "🌐 Starting frontend development server..." -ForegroundColor Yellow
Write-Host "Frontend will be available at: http://localhost:6600" -ForegroundColor Cyan

# Change to frontend directory and start dev server
Set-Location frontend
npm run dev
```

#### Stop Development Environment
**File**: `stop-dev.ps1`
```powershell
# Development Stop Script
Write-Host "🛑 Stopping Demand Forecasting Development Environment..." -ForegroundColor Red

# Stop backend services
Write-Host "📦 Stopping backend services..." -ForegroundColor Yellow
docker-compose -f docker-compose.backend.yml down

Write-Host "✅ Backend services stopped!" -ForegroundColor Green
Write-Host "📝 Note: Frontend development server should be stopped manually with Ctrl+C" -ForegroundColor Cyan
```

### Development Workflow Options

#### Option 1: Hybrid Development (Recommended)
```bash
# Start backend services
.\start-dev.ps1

# Frontend runs locally with npm run dev
# - Fast hot reload
# - Full debugging capabilities
# - React DevTools support
```

#### Option 2: Full Docker Development
```bash
# Start everything in Docker
docker-compose up -d --build

# Slower but consistent environment
```

#### Option 3: Full Local Development
```bash
# Start database and Redis
docker-compose -f docker-compose.backend.yml up -d postgres redis

# Start each service manually
cd services/auth-service && npm run dev
cd services/data-service && npm run dev
cd services/dim-service && npm run dev
cd services/ingest-service && npm run dev
cd frontend && npm run dev
```

## 📊 Redis Logging System

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

### Redis Configuration
```yaml
redis:
  image: redis:7-alpine
  container_name: demand-forecasting-redis
  ports:
    - "6380:6379"
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### Log Management Features
- **Real-time log viewing** with auto-refresh
- **Filtering** by service, level, time range
- **Color-coded** log levels
- **Expandable** log data
- **Performance optimized** with Redis Streams
- **Auto-trimming** keeps last 10,000 logs

### Log API Endpoints
```bash
# Fetch logs
GET /v1/logs?limit=100&service=auth-service&level=error

# Get statistics
GET /v1/logs/stats

# Clear all logs (admin)
DELETE /v1/logs
```

## 🔧 Environment Variables

### Common Variables (All Services)
```env
PORT=6601
NODE_ENV=production
DATABASE_URL=postgres://postgres:password@postgres:5432/postgres
REDIS_HOST=redis
REDIS_PORT=6379
CORS_ORIGINS=http://localhost:6600
LOG_LEVEL=info
```

### Service-Specific Variables

#### Auth Service
```env
INTERNAL_SHARED_SECRET=dev-internal-secret
JWT_ACCESS_SECRET=your-jwt-access-secret
JWT_REFRESH_SECRET=your-jwt-refresh-secret
```

#### Data Service, DIM Service, Ingest Service
```env
AUTH_VALIDATE_URL=http://auth-service:6601/internal/validate
```

#### Frontend
```env
VITE_AUTH_URL=http://localhost:6601
VITE_DATA_URL=http://localhost:6603
VITE_DIM_URL=http://localhost:6604
VITE_INGEST_URL=http://localhost:6602
VITE_DATA_API_KEY=your-api-key
```

## 🏗️ Build and Deployment

### Docker Build Script
**File**: `build-docker.ps1`
```powershell
# Build Frontend
echo "Building frontend image..."
docker build -t demand-forecasting-frontend -f frontend/Dockerfile frontend

# Build Auth Service
echo "Building auth-service image..."
docker build -t demand-forecasting-auth-service -f services/auth-service/Dockerfile services/auth-service

# Build Data Service
echo "Building data-service image..."
docker build -t demand-forecasting-data-service -f services/data-service/Dockerfile services/data-service

# Build DIM Service
echo "Building dim-service image..."
docker build -t demand-forecasting-dim-service -f services/dim-service/Dockerfile services/dim-service

# Build Ingest Service
echo "Building ingest-service image..."
docker build -t demand-forecasting-ingest-service -f services/ingest-service/Dockerfile services/ingest-service

echo "All images built successfully!"
```

### Service Build Commands
```bash
# Build all services
.\build-services.ps1

# Build individual service
cd services/auth-service
docker build -t demand-forecasting-auth-service .
```

## 🔍 Monitoring and Health Checks

### Health Check Configuration
```yaml
services:
  auth-service:
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:6601/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Monitoring Commands
```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs auth-service
docker-compose logs -f auth-service  # Follow logs

# Check Redis connection
docker exec -it demand-forecasting-redis redis-cli ping

# View Redis logs
docker exec -it demand-forecasting-redis redis-cli XREVRANGE service:logs + - COUNT 10
```

## 🚀 Production Deployment

### Production Environment Variables
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

# Logging
LOG_LEVEL=warn
```

### Production Docker Compose
- Use strong secrets for JWT and internal communication
- Set up proper CORS origins
- Configure Redis password
- Set up SSL/TLS certificates
- Configure log retention policies
- Use health checks and restart policies

### Deployment Checklist
- [ ] Update environment variables for production
- [ ] Configure SSL/TLS certificates
- [ ] Set up proper CORS origins
- [ ] Configure Redis password
- [ ] Set up log retention policies
- [ ] Configure monitoring and alerting
- [ ] Set up backup strategies for database and Redis
- [ ] Configure rate limiting
- [ ] Set up API key rotation policies

## 🔐 Security Considerations

### Network Security
- Use internal networks for service-to-service communication
- Expose only necessary ports to the host
- Use secrets management for sensitive data

### API Security
- Implement rate limiting per API key
- Use strong JWT secrets
- Implement proper CORS policies
- Store only API key hashes

### Logging Security
- Logs may contain sensitive data - restrict access appropriately
- Implement log retention policies
- Use Redis password in production environments
- Consider log encryption for sensitive environments