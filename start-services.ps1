# PowerShell script to start all services without Docker

Write-Host "Starting Demand Forecasting Services..." -ForegroundColor Green

# Function to start a service
function Start-Service {
    param(
        [string]$ServiceName,
        [string]$ServicePath,
        [string]$Port
    )
    
    Write-Host "Starting $ServiceName on port $Port..." -ForegroundColor Yellow
    
    # Check if port is already in use
    $portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($portInUse) {
        Write-Host "Port $Port is already in use. $ServiceName might already be running." -ForegroundColor Red
        return
    }
    
    # Start the service
    $process = Start-Process -FilePath "node" -ArgumentList "dist/server.js" -WorkingDirectory $ServicePath -PassThru -WindowStyle Minimized
    Write-Host "$ServiceName started with PID: $($process.Id)" -ForegroundColor Green
}

# Start services
try {
    # Start Auth Service (port 6601)
    Start-Service -ServiceName "Auth Service" -ServicePath "services/auth-service" -Port 6601
    
    # Start Data Service (port 6603)
    Start-Service -ServiceName "Data Service" -ServicePath "services/data-service" -Port 6603
    
    # Start Ingest Service (port 6602)
    Start-Service -ServiceName "Ingest Service" -ServicePath "services/ingest-service" -Port 6602
    
    # Start Dim Service (port 6604)
    Start-Service -ServiceName "Dim Service" -ServicePath "services/dim-service" -Port 6604
    
    Write-Host "`nAll services started successfully!" -ForegroundColor Green
    Write-Host "Services running on:" -ForegroundColor Cyan
    Write-Host "  - Auth Service: http://localhost:6601" -ForegroundColor White
    Write-Host "  - Data Service: http://localhost:6603" -ForegroundColor White
    Write-Host "  - Ingest Service: http://localhost:6602" -ForegroundColor White
    Write-Host "  - Dim Service: http://localhost:6604" -ForegroundColor White
    Write-Host "`nFrontend should be running on: http://localhost:5173" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error starting services: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
