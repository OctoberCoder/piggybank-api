import dotenv from 'dotenv';
dotenv.config();

export const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://piggybank:password@localhost:5432/piggybank',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshSecret: process.env.REFRESH_SECRET || 'dev-refresh-secret',
    refreshExpiry: process.env.REFRESH_EXPIRY || '7d',
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
  },
  cron: {
    secret: process.env.CRON_SECRET || 'dev-cron-secret',
  },
} as const;
