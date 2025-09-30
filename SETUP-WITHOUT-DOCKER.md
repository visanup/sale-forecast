# Setup Without Docker

This guide will help you set up the Demand Forecasting application without using Docker.

## Prerequisites

1. **Node.js** (v20 or higher)
2. **PostgreSQL** (v12 or higher)
3. **PowerShell** (for running setup scripts)

## Step 1: Install PostgreSQL

1. Download and install PostgreSQL from: https://www.postgresql.org/download/
2. During installation, remember the password you set for the `postgres` user
3. Make sure PostgreSQL is added to your PATH

## Step 2: Setup Database

Run the database setup script:

```powershell
.\setup-database.ps1
```

This will:
- Create the `sales_forecast` database
- Create the `app` user with password `app`
- Run Prisma migrations
- Set up the database schema

## Step 3: Build Services

Build all backend services:

```powershell
.\build-services.ps1
```

This will:
- Install dependencies for all services
- Build TypeScript to JavaScript
- Create the `dist` folders

## Step 4: Create Environment Files

Create `.env` files for each service:

### Auth Service (`services/auth-service/.env`)
```env
PORT=6601
DATABASE_URL=postgres://app:app@localhost:5432/sales_forecast
JWT_ACCESS_SECRET=your-super-secret-access-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
INTERNAL_SHARED_SECRET=dev-internal-secret
CORS_ORIGIN=http://localhost:5173
```

### Data Service (`services/data-service/.env`)
```env
PORT=6603
DATABASE_URL=postgres://app:app@localhost:5432/sales_forecast
CORS_ORIGINS=http://localhost:5173
```

### Ingest Service (`services/ingest-service/.env`)
```env
PORT=6602
DATABASE_URL=postgres://app:app@localhost:5432/sales_forecast
CORS_ORIGINS=http://localhost:5173
```

### Dim Service (`services/dim-service/.env`)
```env
PORT=6604
DATABASE_URL=postgres://app:app@localhost:5432/sales_forecast
CORS_ORIGINS=http://localhost:5173
```

## Step 5: Start Services

Start all backend services:

```powershell
.\start-services.ps1
```

This will start:
- Auth Service on port 6601
- Data Service on port 6603
- Ingest Service on port 6602
- Dim Service on port 6604

## Step 6: Start Frontend

In a new terminal, start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

The frontend will be available at: http://localhost:5173

## Step 7: Create Sample API Key

To test the API, create a sample API key:

```powershell
cd services/auth-service
npm run create-api-key
```

This will create a demo API client and generate an API key for testing.

## Testing the Setup

1. **Frontend**: Visit http://localhost:5173
2. **API Portal**: Visit http://localhost:5173/api
3. **API Keys Management**: Visit http://localhost:5173/api-keys
4. **Auth Service Docs**: Visit http://localhost:6601/docs

## Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
```powershell
# Find process using port
netstat -ano | findstr :6601

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Database Connection Issues
1. Make sure PostgreSQL is running
2. Check if the database and user were created correctly
3. Verify the connection string in `.env` files

### CORS Issues
Make sure all services have the correct CORS origins set in their `.env` files:
```
CORS_ORIGINS=http://localhost:5173
```

### Frontend Build Issues
If the frontend fails to build:
```powershell
cd frontend
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

## Manual Service Management

If you prefer to start services manually:

### Auth Service
```powershell
cd services/auth-service
npm run dev
```

### Data Service
```powershell
cd services/data-service
npm run dev
```

### Ingest Service
```powershell
cd services/ingest-service
npm run dev
```

### Dim Service
```powershell
cd services/dim-service
npm run dev
```

## API Testing

Once everything is running, you can test the API:

```bash
# Test auth service
curl http://localhost:6601/health

# Test data service (replace with your API key)
curl -H "x-api-key: your-api-key-here" http://localhost:6603/v1/forecast

# Test ingest service
curl -H "x-api-key: your-api-key-here" http://localhost:6602/health

# Test dim service
curl -H "x-api-key: your-api-key-here" http://localhost:6604/v1/dim/companies
```

## Stopping Services

To stop all services, close the PowerShell windows or press `Ctrl+C` in each terminal.
