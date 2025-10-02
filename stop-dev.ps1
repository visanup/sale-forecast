# Development Stop Script
# Stops backend services and provides instructions for frontend

Write-Host "🛑 Stopping Demand Forecasting Development Environment..." -ForegroundColor Red

# Stop backend services
Write-Host "📦 Stopping backend services..." -ForegroundColor Yellow
docker-compose -f docker-compose.backend.yml down

Write-Host "✅ Backend services stopped!" -ForegroundColor Green
Write-Host "📝 Note: Frontend development server should be stopped manually with Ctrl+C" -ForegroundColor Cyan
