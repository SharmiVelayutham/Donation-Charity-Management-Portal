import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { findUserById } from '../utils/mysql-auth-helper';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'DONOR' | 'NGO' | 'ADMIN';
    email: string;
  };
}
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log(`[Auth Middleware] 🔍 Request received - Path: ${req.path}, Method: ${req.method}`);
    console.log(`[Auth Middleware] 🔍 Has Authorization header: ${!!req.headers.authorization}`);
    fetch('http://127.0.0.1:7242/ingest/ce196b78-abae-4f3c-8dd1-512bb7a3206c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:17',message:'AUTH_ENTRY',data:{path:req.path,method:req.method,hasAuthHeader:!!req.headers.authorization},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      fetch('http://127.0.0.1:7242/ingest/ce196b78-abae-4f3c-8dd1-512bb7a3206c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:21',message:'AUTH_NO_HEADER',data:{hasHeader:!!authHeader,startsWithBearer:authHeader?.startsWith('Bearer ')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    fetch('http://127.0.0.1:7242/ingest/ce196b78-abae-4f3c-8dd1-512bb7a3206c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:25',message:'AUTH_TOKEN_EXTRACTED',data:{tokenLength:token?.length,tokenPrefix:token?.substring(0,20)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    const payload = verifyToken(token);
    console.log(`[Auth Middleware] 🔍 Token payload decoded - UserID: ${payload.userId}, Role in token: "${payload.role}" (type: ${typeof payload.role}), Email: ${payload.email}`);
    fetch('http://127.0.0.1:7242/ingest/ce196b78-abae-4f3c-8dd1-512bb7a3206c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:28',message:'AUTH_PAYLOAD_DECODED',data:{userId:payload.userId,role:payload.role,email:payload.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    const tokenRole = (payload.role || '').toUpperCase();
    const user = await findUserById(payload.userId, tokenRole);
    console.log(`[Auth Middleware] 🔍 User lookup result - Found: ${!!user}, Role from DB: "${user?.role}", Token Role: "${tokenRole}", ID: ${user?.id}`);
    fetch('http://127.0.0.1:7242/ingest/ce196b78-abae-4f3c-8dd1-512bb7a3206c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:32',message:'AUTH_USER_LOOKUP',data:{userId:payload.userId,userFound:!!user,userRole:user?.role,userIsBlocked:user?.isBlocked},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    if (!user) {
      fetch('http://127.0.0.1:7242/ingest/ce196b78-abae-4f3c-8dd1-512bb7a3206c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:34',message:'AUTH_USER_NOT_FOUND',data:{userId:payload.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (user.isBlocked) {
      fetch('http://127.0.0.1:7242/ingest/ce196b78-abae-4f3c-8dd1-512bb7a3206c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:38',message:'AUTH_USER_BLOCKED',data:{userId:user.id,role:user.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' });
    }
    const normalizedRole = (user.role || '').toUpperCase() as 'DONOR' | 'NGO' | 'ADMIN';
    req.user = { id: user.id.toString(), role: normalizedRole, email: user.email };
    
    console.log(`[Auth Middleware] ✅ User authenticated - ID: ${req.user.id}, Role: ${req.user.role}, Email: ${req.user.email}`);
    fetch('http://127.0.0.1:7242/ingest/ce196b78-abae-4f3c-8dd1-512bb7a3206c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:42',message:'AUTH_SUCCESS',data:{reqUserId:req.user.id,reqUserRole:req.user.role,reqUserEmail:req.user.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    next();
  } catch (error) {
    fetch('http://127.0.0.1:7242/ingest/ce196b78-abae-4f3c-8dd1-512bb7a3206c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:45',message:'AUTH_ERROR',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

