# PowerShell script to setup PostgreSQL database

Write-Host "Setting up PostgreSQL database..." -ForegroundColor Green

# Check if PostgreSQL is installed
$pgInstalled = Get-Command psql -ErrorAction SilentlyContinue
if (-not $pgInstalled) {
    Write-Host "PostgreSQL is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install PostgreSQL and add it to your PATH." -ForegroundColor Yellow
    Write-Host "Download from: https://www.postgresql.org/download/" -ForegroundColor Cyan
    exit 1
}

# Database connection parameters
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_USER = "postgres"
$DB_PASSWORD = Read-Host "Enter PostgreSQL password for user '$DB_USER'" -AsSecureString
$DB_PASSWORD_TEXT = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD))

$DB_NAME = "sales_forecast"
$DB_USER_APP = "app"
$DB_PASSWORD_APP = "app"

Write-Host "Creating database and user..." -ForegroundColor Yellow

# Create database and user
$sql = @"
-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Create user if not exists
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER_APP') THEN
      CREATE ROLE $DB_USER_APP LOGIN PASSWORD '$DB_PASSWORD_APP';
   END IF;
END
\$\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER_APP;
"@

# Execute SQL
$env:PGPASSWORD = $DB_PASSWORD_TEXT
$sql | psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database and user created successfully!" -ForegroundColor Green
    
    # Run Prisma migrations for auth service
    Write-Host "Running database migrations..." -ForegroundColor Yellow
    Set-Location "services/auth-service"
    
    # Set environment variables
    $env:DATABASE_URL = "postgres://$DB_USER_APP`:$DB_PASSWORD_APP@$DB_HOST`:$DB_PORT/$DB_NAME"
    
    # Generate Prisma client
    Write-Host "Generating Prisma client..." -ForegroundColor Yellow
    npx prisma generate --schema=./prisma/schema.prisma
    
    # Run migrations
    Write-Host "Running migrations..." -ForegroundColor Yellow
    npx prisma migrate deploy --schema=./prisma/schema.prisma
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database setup completed successfully!" -ForegroundColor Green
        Write-Host "`nDatabase connection string:" -ForegroundColor Cyan
        Write-Host "postgres://$DB_USER_APP`:$DB_PASSWORD_APP@$DB_HOST`:$DB_PORT/$DB_NAME" -ForegroundColor White
    } else {
        Write-Host "Failed to run migrations" -ForegroundColor Red
        exit 1
    }
    
    Set-Location "../.."
} else {
    Write-Host "Failed to create database and user" -ForegroundColor Red
    exit 1
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
