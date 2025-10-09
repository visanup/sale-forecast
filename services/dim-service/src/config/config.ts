const DEFAULT_LIMIT = Number(process.env.DEFAULT_PAGE_LIMIT || 25);
const MAX_LIMIT = Number(process.env.MAX_PAGE_LIMIT || 100);

export const config = {
  port: Number(process.env.PORT || 6604),
  dbUrl: process.env.DATABASE_URL || '',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean),
  authValidateUrl: process.env.AUTH_VALIDATE_URL || 'http://localhost:6601/internal/validate',
  internalSecret: process.env.INTERNAL_SHARED_SECRET || '',
  staticApiKey: process.env.STATIC_API_KEY || process.env.API_KEY || '',
  ingestUploadUrl: process.env.INGEST_UPLOAD_URL || 'http://localhost:6602/v1/upload',
  defaultPageLimit: DEFAULT_LIMIT > 0 ? DEFAULT_LIMIT : 25,
  maxPageLimit: MAX_LIMIT > 0 ? MAX_LIMIT : 100
};
