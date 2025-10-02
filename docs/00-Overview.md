## Overview

Document ID: OVERVIEW-00

Purpose: เส้นทางการอ่านเอกสารและสรุปสถาปัตยกรรมโดยย่อสำหรับทีม

## 📚 Reading Guide

อ่านเอกสารตามลำดับนี้:

1. **`01-Architecture.md`** — ภาพรวมระบบและไมโครเซอร์วิส
   - System architecture overview
   - Microservices communication
   - Redis logging system
   - Security and observability

2. **`02-Database.md`** — แบบจำลองข้อมูลและการแม็ปจาก Excel
   - Database schema design
   - Data relationships
   - Migration strategies

3. **`03-Backend-Services.md`** — รายละเอียดบริการหลังบ้าน, พอร์ต, .env
   - Service responsibilities
   - Port configurations
   - Environment variables
   - API endpoints

4. **`04-API.md`** — สัญญา API ที่ใช้ทั้ง FE และภายนอก
   - Public API contracts
   - Authentication methods
   - Logging endpoints
   - Error handling

5. **`05-Frontend.md`** — ธีม, โครงสร้าง, แนวทางการเชื่อม API
   - React application structure
   - UI/UX guidelines
   - API integration patterns
   - Development workflow

6. **`06-DevOps.md`** — docker compose แยก infra/apps, networks/secrets
   - Multiple deployment options
   - Development workflows
   - Redis logging setup
   - Production deployment

## 🏗️ System Architecture Summary

### Core Components
- **Frontend** (Port 6600): React + TypeScript + Vite
- **Auth Service** (Port 6601): Authentication & API key management
- **Data Service** (Port 6603): Forecasting & log aggregation
- **Ingest Service** (Port 6602): File processing & data import
- **DIM Service** (Port 6604): Dimension management
- **PostgreSQL**: Primary database
- **Redis**: Caching & centralized logging

### Key Features
- **Centralized Logging**: Redis Streams for real-time log viewing
- **API Key Management**: Secure API key generation and validation
- **File Upload**: Excel/CSV processing with validation
- **Real-time Monitoring**: Live log streaming in frontend
- **Docker Support**: Multiple deployment configurations

## 🚀 Quick Start Options

### Option 1: Full Docker (Production/Testing)
```bash
docker-compose up -d
```
- All services in Docker containers
- Frontend: http://localhost:6600
- Consistent environment

### Option 2: Hybrid Development (Recommended)
```bash
.\start-dev.ps1
```
- Backend services in Docker
- Frontend runs locally with npm run dev
- Fast development iteration

### Option 3: Backend Only
```bash
docker-compose -f docker-compose.backend.yml up -d
```
- Only backend services
- Use for API development/testing

## 🔧 Development Workflows

### PowerShell Scripts
- **`start-dev.ps1`**: Start development environment
- **`stop-dev.ps1`**: Stop development environment
- **`build-docker.ps1`**: Build all Docker images

### Environment Configurations
- **Development**: Local frontend + Docker backend
- **Production**: All services in Docker
- **Testing**: Full Docker stack

## 📊 Redis Logging System

### Features
- **Real-time Logging**: All services push to Redis Streams
- **Frontend Integration**: Live log viewing with filtering
- **Performance**: Auto-trimming keeps last 10,000 logs
- **Filtering**: By service, level, time range

### API Endpoints
- `GET /v1/logs`: Fetch logs with filters
- `GET /v1/logs/stats`: Get log statistics
- `DELETE /v1/logs`: Clear all logs

## 🔐 Security Model

### Authentication Methods
- **User Auth**: Bearer Token (`Authorization: Bearer <token>`)
- **Service Auth**: API Key (`X-API-Key: <api-key>`)
- **Internal Auth**: Shared secret for service-to-service

### Security Features
- JWT token management
- API key lifecycle management
- Rate limiting per API key
- CORS configuration
- Input validation

## 🌐 Port Configuration

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 6600 | React development server |
| Auth Service | 6601 | Authentication & API keys |
| Ingest Service | 6602 | File upload & processing |
| Data Service | 6603 | Forecasting & logs |
| DIM Service | 6604 | Dimension management |
| PostgreSQL | 5432 | Primary database |
| Redis | 6380 | Cache & logging |

## 📋 Environment Variables

### Frontend (.env)
```env
VITE_AUTH_URL=http://localhost:6601
VITE_DATA_URL=http://localhost:6603
VITE_DIM_URL=http://localhost:6604
VITE_INGEST_URL=http://localhost:6602
VITE_DATA_API_KEY=your-api-key
```

### Backend Services
```env
PORT=6601-6604
DATABASE_URL=postgres://postgres:password@postgres:5432/postgres
REDIS_HOST=redis
REDIS_PORT=6379
INTERNAL_SHARED_SECRET=dev-internal-secret
```

## 🔄 Development vs Production

### Development
- **Frontend**: Local npm run dev (fast hot reload)
- **Backend**: Docker containers with dev settings
- **Logging**: Full debug logging
- **Database**: Local or Docker PostgreSQL

### Production
- **Frontend**: Nginx-served static files in Docker
- **Backend**: Docker containers with production optimizations
- **Logging**: Reduced log levels, retention policies
- **Security**: Enhanced configurations, SSL/TLS

## 📈 Monitoring & Observability

### Health Checks
- All services expose `/health` endpoints
- Docker health checks configured
- Service dependency monitoring

### Logging
- Structured JSON logging with Pino
- Redis Streams for centralized storage
- Real-time log viewing in frontend
- Color-coded log levels

### Performance
- Request tracing with request IDs
- Response time monitoring
- Error tracking and alerting

## 🎯 Key Benefits

### For Developers
- **Fast Development**: Hot reload for frontend
- **Consistent Environment**: Docker for backend
- **Real-time Debugging**: Live log streaming
- **Easy Setup**: PowerShell scripts for automation

### For Operations
- **Scalable Architecture**: Microservices design
- **Centralized Logging**: Redis Streams
- **Health Monitoring**: Built-in health checks
- **Flexible Deployment**: Multiple compose options

### For Users
- **Modern UI**: React with Tailwind CSS
- **Real-time Updates**: Live data and logs
- **Responsive Design**: Works on all devices
- **Secure Access**: API key management

## 🚀 Future Roadmap

### Planned Features
- [ ] Advanced data visualization
- [ ] Real-time notifications
- [ ] Dark mode theme
- [ ] Advanced filtering
- [ ] Export functionality
- [ ] PWA support

### Technical Improvements
- [ ] Database per service
- [ ] Service mesh integration
- [ ] Message queues
- [ ] Load balancing
- [ ] Distributed caching

## 📞 Support & Resources

### Documentation
- **README.md**: Main project documentation
- **docs/**: Detailed technical documentation
- **OpenAPI**: Interactive API documentation

### Development Tools
- **PowerShell Scripts**: Automated workflows
- **Docker Compose**: Container orchestration
- **Health Checks**: Service monitoring
- **Logging**: Centralized observability

### Getting Help
- Check service health: `docker-compose ps`
- View logs: `docker-compose logs <service>`
- Test APIs: Use interactive docs at `/docs` endpoints
- Monitor Redis: `docker exec -it <redis-container> redis-cli`