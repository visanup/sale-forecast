export const config = {
  port: Number(process.env.PORT || 6603),
  dbUrl: process.env.DATABASE_URL || '',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
  authValidateUrl: process.env.AUTH_VALIDATE_URL || 'http://localhost:6601/internal/validate',
  internalSecret: process.env.INTERNAL_SHARED_SECRET || '',
  staticApiKey: process.env.STATIC_API_KEY || process.env.API_KEY || ''
};
