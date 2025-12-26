import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type UserRole = 'DONOR' | 'NGO' | 'ADMIN';

export interface JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
};

