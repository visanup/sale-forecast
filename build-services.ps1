# PowerShell script to build all services

Write-Host "Building all services..." -ForegroundColor Green

# Function to build a service
function Build-Service {
    param(
        [string]$ServiceName,
        [string]$ServicePath
    )
    
    Write-Host "Building $ServiceName..." -ForegroundColor Yellow
    
    if (Test-Path $ServicePath) {
        Set-Location $ServicePath
        
        # Install dependencies if node_modules doesn't exist
        if (-not (Test-Path "node_modules")) {
            Write-Host "Installing dependencies for $ServiceName..." -ForegroundColor Yellow
            npm install
        }
        
        # Build the service
        Write-Host "Building $ServiceName..." -ForegroundColor Yellow
        npm run build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "$ServiceName built successfully!" -ForegroundColor Green
        } else {
            Write-Host "Failed to build $ServiceName" -ForegroundColor Red
            exit 1
        }
        
        Set-Location ..
    } else {
        Write-Host "Service path not found: $ServicePath" -ForegroundColor Red
        exit 1
    }
}

try {
    # Build Auth Service
    Build-Service -ServiceName "Auth Service" -ServicePath "services/auth-service"
    
    # Build Data Service
    Build-Service -ServiceName "Data Service" -ServicePath "services/data-service"
    
    # Build Ingest Service
    Build-Service -ServiceName "Ingest Service" -ServicePath "services/ingest-service"
    
    # Build Dim Service
    Build-Service -ServiceName "Dim Service" -ServicePath "services/dim-service"
    
    Write-Host "`nAll services built successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "Error building services: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
