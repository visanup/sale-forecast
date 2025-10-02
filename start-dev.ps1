# Development Startup Script
# Starts backend services with Docker and frontend with npm

Write-Host "🚀 Starting Demand Forecasting Development Environment..." -ForegroundColor Green

# Start backend services
Write-Host "📦 Starting backend services with Docker Compose..." -ForegroundColor Yellow
docker-compose -f docker-compose.backend.yml up -d

# Wait for services to be healthy
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
