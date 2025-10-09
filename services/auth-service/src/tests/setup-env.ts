import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

process.env['JWT_ACCESS_SECRET'] = process.env['JWT_ACCESS_SECRET'] || 'test-access-secret';
process.env['JWT_REFRESH_SECRET'] = process.env['JWT_REFRESH_SECRET'] || 'test-refresh-secret';
process.env['DATABASE_URL'] = process.env['DATABASE_URL'] || 'postgresql://postgres:password@localhost:5432/test';
process.env['CORS_ORIGIN'] = process.env['CORS_ORIGIN'] || '*';
