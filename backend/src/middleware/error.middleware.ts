import { NextFunction, Request, Response } from 'express';

// Centralized error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const status = (res.statusCode && res.statusCode >= 400) ? res.statusCode : 500;
  return res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};

