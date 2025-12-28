import dotenv from 'dotenv';

dotenv.config();

const requiredVars = ['PORT', 'JWT_SECRET'] as const;

requiredVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export const env = {
  // Server
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET as string,

  // CORS / Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
  enableHttpLogs: (process.env.ENABLE_HTTP_LOGS || '').toLowerCase() === 'true',
  logLevel: (process.env.LOG_LEVEL || '').toLowerCase(),

  // SMTP
  smtpHost: process.env.SMTP_HOST as string,
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpSecure: (process.env.SMTP_SECURE || '').toLowerCase() === 'true',
  smtpUser: process.env.SMTP_USER as string,
  smtpPass: process.env.SMTP_PASS as string,
  smtpFrom: process.env.SMTP_FROM as string,

  // Admin
  adminSecurityCode: process.env.ADMIN_SECURITY_CODE as string,

  // MySQL
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'donation_charity',
  },
};

