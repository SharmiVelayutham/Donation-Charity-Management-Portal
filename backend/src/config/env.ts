import dotenv from 'dotenv';

dotenv.config();

const requiredVars = ['PORT', 'JWT_SECRET'] as const;

requiredVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET as string,
  
  // SMTP Email Configuration
  smtpHost: process.env.SMTP_HOST as string,
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpSecure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  smtpUser: process.env.SMTP_USER as string,
  smtpPass: process.env.SMTP_PASS as string,
  smtpFrom: process.env.SMTP_FROM as string, // Optional: custom "from" address
};

