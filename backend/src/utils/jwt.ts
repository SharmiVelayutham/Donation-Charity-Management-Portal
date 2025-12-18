import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '../models/User.model';

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

