import dotenv from 'dotenv';

dotenv.config();

const requiredVars = ['PORT', 'MONGO_URI', 'JWT_SECRET'] as const;

requiredVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUri: process.env.MONGO_URI as string,
  jwtSecret: process.env.JWT_SECRET as string,
};

