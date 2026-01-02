export const config = {
  port: Number(process.env.PORT || 6603),
  dbUrl: process.env.DATABASE_URL || '',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
  authValidateUrl: process.env.AUTH_VALIDATE_URL || 'http://localhost:6601/internal/validate',
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:6601',
  internalSecret: process.env.INTERNAL_SHARED_SECRET || '',
  staticApiKey: process.env.STATIC_API_KEY || process.env.API_KEY || '',
  monthlyAccessSeedIntervalMs: Number(process.env.MONTHLY_ACCESS_SEED_INTERVAL_MS || 24 * 60 * 60 * 1000)
};
