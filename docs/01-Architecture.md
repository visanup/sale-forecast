## Architecture & Microservices

Document ID: ARCH-01

Scope: System overview, services, communication, security, observability, Redis logging

Audience: All engineers, architects

## 🏗️ System Architecture Overview

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

## 🔧 Microservices

### Core Services

#### Frontend Service (Port 6600)
- **Technology**: React + Vite + TypeScript
- **Purpose**: User interface and application frontend
- **Features**:
  - User authentication interface
  - API key management
  - Data visualization and forecasting
  - Real-time logs viewing
  - Manual data entry forms
  - File upload interface

#### Auth Service (Port 6601)
- **Technology**: Node.js + Express + Prisma
- **Purpose**: Authentication and authorization
- **Features**:
  - User registration and login
  - JWT token management (access + refresh)
  - API key generation and lifecycle management
  - Internal service authentication validation
  - User profile management
- **Dependencies**: PostgreSQL, Redis (for logging)

#### Data Service (Port 6603)
- **Technology**: Node.js + Express + Prisma
- **Purpose**: Data processing and forecasting
- **Features**:
  - Forecasting algorithms and calculations
  - Data aggregation and analysis
  - Log aggregation and retrieval
  - API key validation for business logic endpoints
  - Historical data queries
- **Dependencies**: PostgreSQL, Redis (for logging and caching)

#### Ingest Service (Port 6602)
- **Technology**: Node.js + Express + Prisma
- **Purpose**: Data ingestion and validation
- **Features**:
  - Excel/CSV file processing
  - Data validation and transformation
  - Batch data import
  - Dimension data upsert
  - Fact data insertion
- **Dependencies**: PostgreSQL, Redis (for logging)

#### DIM Service (Port 6604)
- **Technology**: Node.js + Express + Prisma
- **Purpose**: Dimension management
- **Features**:
  - Company and product hierarchy management
  - Dimension data relationships
  - Lookup tables for frontend selects
  - Data consistency validation
- **Dependencies**: PostgreSQL, Redis (for logging)

### Infrastructure Services

#### PostgreSQL Database
- **Purpose**: Primary data storage
- **Port**: 5432
- **Features**:
  - Single database for MVP (future: per-service databases)
  - Prisma ORM for all services
  - ACID transactions
  - Connection pooling

#### Redis Cache & Logging
- **Purpose**: Caching and centralized logging
- **Port**: 6380 (mapped from 6379)
- **Features**:
  - Redis Streams for log aggregation
  - Centralized logging from all services
  - Real-time log viewing in frontend
  - Log filtering and search capabilities

## 🔄 Communication Patterns

### Service-to-Service Communication
- **Protocol**: REST over HTTP within Docker network
- **Authentication**: API Key validation via auth-service
- **Internal Validation**: Services call `auth-service` `/internal/validate` to validate `X-API-Key`
- **Shared Secret**: `INTERNAL_SHARED_SECRET` for internal service communication

### Frontend-to-Backend Communication
- **User Authentication**: Bearer Token (`Authorization: Bearer <token>`)
- **API Access**: API Key (`X-API-Key: <api-key>`)
- **CORS**: Configured for frontend domain
- **Environment Variables**: Frontend uses `VITE_*` prefixed environment variables

### Logging Communication
- **Pattern**: All services → Redis Streams → Data Service → Frontend
- **Format**: JSON structured logs with Pino
- **Storage**: Redis Streams with automatic trimming (10,000 entries)
- **Real-time**: Frontend polls logs via Data Service API

## 🔐 Security Architecture

### Authentication & Authorization
- **User Authentication**: JWT tokens (access + refresh)
- **API Authentication**: API keys for service-to-service communication
- **Token Storage**: Only hashes stored in database
- **Key Rotation**: Support for API key rotation and expiration

### Network Security
- **CORS**: Restricted to frontend domain
- **Rate Limiting**: Per API key and IP address
- **Internal Communication**: Services communicate within Docker network
- **External Access**: Only necessary ports exposed to host

### Data Security
- **Password Hashing**: Secure password storage
- **API Key Hashing**: API keys hashed before storage
- **Input Validation**: Comprehensive input validation on all endpoints
- **SQL Injection Protection**: Prisma ORM provides protection

## 📊 Observability & Monitoring

### Centralized Logging System

#### Redis Stream Architecture
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

#### Log Features
- **Real-time Logging**: All services push logs to Redis Streams
- **Structured Logging**: JSON format with consistent schema
- **Log Levels**: Error, Warning, Info, Debug with color coding
- **Filtering**: By service, level, time range, limit
- **Performance**: Redis Streams for efficient storage and retrieval
- **Retention**: Auto-trimming keeps last 10,000 logs

#### Log Entry Format
```typescript
{
  id: string;           // Redis Stream ID
  timestamp: string;    // ISO 8601 timestamp
  level: string;        // error, warn, info, debug
  service: string;      // Service name
  message: string;      // Log message
  data?: any;          // Additional data (JSON)
  requestId?: string;  // Request ID for tracing
}
```

### Health Monitoring
- **Health Checks**: Each service exposes `/health` endpoint
- **Docker Health Checks**: Built into Docker Compose configuration
- **Service Dependencies**: Proper dependency ordering with health checks
- **Graceful Degradation**: Services handle dependencies being unavailable

### Performance Monitoring
- **Request Tracing**: Request IDs for end-to-end tracing
- **Response Times**: Logged for performance monitoring
- **Error Tracking**: Centralized error logging and alerting
- **Resource Usage**: Docker container resource monitoring

## 🌐 Port Allocation

### Service Ports
- **Frontend**: 6600 (React development server)
- **Auth Service**: 6601 (Authentication and API keys)
- **Ingest Service**: 6602 (Data ingestion)
- **Data Service**: 6603 (Data processing and forecasting)
- **DIM Service**: 6604 (Dimension management)

### Infrastructure Ports
- **PostgreSQL**: 5432 (Database)
- **Redis**: 6380 (mapped from 6379, Cache and logging)

## 🔄 Development vs Production

### Development Environment
- **Frontend**: Local development server (npm run dev)
- **Backend**: Docker containers with development settings
- **Database**: Local PostgreSQL or Docker PostgreSQL
- **Logging**: Full debug logging enabled
- **Hot Reload**: Frontend supports hot module replacement

### Production Environment
- **Frontend**: Nginx-served static files in Docker container
- **Backend**: Docker containers with production optimizations
- **Database**: Production PostgreSQL with proper configuration
- **Logging**: Reduced log levels, log retention policies
- **Security**: Enhanced security configurations, SSL/TLS

## 🚀 Scalability Considerations

### Current Architecture (MVP)
- **Single Database**: Shared PostgreSQL for all services
- **Single Redis**: Centralized logging and caching
- **Stateless Services**: All services are stateless and horizontally scalable

### Future Scalability
- **Database Per Service**: Each service gets its own database
- **Service Mesh**: Consider Istio or similar for advanced networking
- **Message Queues**: Add message queues for async processing
- **Load Balancing**: Add load balancers for high availability
- **Caching Strategy**: Implement distributed caching strategies

## 🔧 Technology Stack

### Frontend
- **React 18**: Component-based UI framework
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing

### Backend Services
- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **TypeScript**: Type-safe development
- **Prisma**: Database ORM and migrations
- **Pino**: High-performance JSON logger

### Infrastructure
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **PostgreSQL**: Primary database
- **Redis**: Caching and logging
- **Nginx**: Frontend web server (production)

### Development Tools
- **PowerShell Scripts**: Development workflow automation
- **Health Checks**: Service monitoring
- **Hot Reload**: Fast development iteration
- **API Documentation**: OpenAPI/Swagger documentation