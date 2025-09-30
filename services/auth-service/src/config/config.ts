import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

interface Config {
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
  nodeEnv: string;
  port: number;
  frontendUrl: string;
  apiBaseUrl: string;
  bcryptRounds: number;
  tokenExpiryAccess: string;
  tokenExpiryRefresh: string;
  passwordResetExpiry: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  corsOrigin: string;
  corsCredentials: boolean;
  logLevel: string;
  logFormat: string;
}

export const config: Config = {
  // Database
  databaseUrl: process.env['DATABASE_URL'] || 'postgresql://postgres:password@localhost:5432/microplates',

  // JWT Secrets
  jwtAccessSecret: process.env['JWT_ACCESS_SECRET'] || 'your-super-secret-access-key',
  jwtRefreshSecret: process.env['JWT_REFRESH_SECRET'] || 'your-super-secret-refresh-key',

  // Email Configuration
  smtp: {
    host: process.env['SMTP_HOST'] || 'smtp.gmail.com',
    port: parseInt(process.env['SMTP_PORT'] || '587'),
    user: process.env['SMTP_USER'] || '',
    pass: process.env['SMTP_PASS'] || '',
    from: process.env['SMTP_FROM'] || 'Microplate AI <noreply@microplate-ai.com>'
  },

  // Application
  nodeEnv: process.env['NODE_ENV'] || 'development',
  port: parseInt(process.env['PORT'] || '6401'),
  frontendUrl: process.env['FRONTEND_URL'] || 'http://localhost:3000',
  apiBaseUrl: process.env['API_BASE_URL'] || 'http://localhost:6400',

  // Security
  bcryptRounds: parseInt(process.env['BCRYPT_ROUNDS'] || '12'),
  tokenExpiryAccess: process.env['TOKEN_EXPIRY_ACCESS'] || '15m',
  tokenExpiryRefresh: process.env['TOKEN_EXPIRY_REFRESH'] || '7d',
  passwordResetExpiry: process.env['PASSWORD_RESET_EXPIRY'] || '30m',
  // Email verification disabled

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100'),

  // CORS
  corsOrigin: process.env['CORS_ORIGIN'] || '*',
  corsCredentials: process.env['CORS_CREDENTIALS'] ? process.env['CORS_CREDENTIALS'] === 'true' : true,

  // Logging
  logLevel: process.env['LOG_LEVEL'] || 'info',
  logFormat: process.env['LOG_FORMAT'] || 'pretty'
};

// Validation
if (!config.jwtAccessSecret || config.jwtAccessSecret === 'your-super-secret-access-key') {
  throw new Error('JWT_ACCESS_SECRET must be set in production');
}

if (!config.jwtRefreshSecret || config.jwtRefreshSecret === 'your-super-secret-refresh-key') {
  throw new Error('JWT_REFRESH_SECRET must be set in production');
}

if (config.nodeEnv === 'production' && !config.smtp.user) {
  throw new Error('SMTP_USER must be set in production');
}

if (config.nodeEnv === 'production' && !config.smtp.pass) {
  throw new Error('SMTP_PASS must be set in production');
}
