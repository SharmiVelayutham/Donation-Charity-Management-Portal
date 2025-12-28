import { NextFunction, Request, Response } from 'express';
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  const status = (res.statusCode && res.statusCode >= 400) ? res.statusCode : 500;
  const errorLog = {
    timestamp: new Date().toISOString(),
    route: `${req.method} ${req.path}`,
    message: err.message || 'Internal Server Error',
    stack: err.stack,
    body: req.body,
    query: req.query,
    params: req.params,
    userId: (req as any).user?.id || 'anonymous',
    userRole: (req as any).user?.role || 'anonymous',
  };
  
  console.error('❌ [Error Handler] Server Error:', JSON.stringify(errorLog, null, 2));
  const userMessage = status >= 500 
    ? 'Something went wrong. Please try again later.' 
    : (err.message || 'An error occurred');
  
  return res.status(status).json({
    success: false,
    message: userMessage,
  });
};

