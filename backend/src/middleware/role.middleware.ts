import { NextFunction, Response } from 'express';
import { AuthRequest } from './auth.middleware';

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    console.log(`[Role Middleware] 🔍 Checking role - Path: ${req.path}, Required roles: [${roles.join(', ')}]`);
    console.log(`[Role Middleware] 🔍 User object:`, req.user ? { id: req.user.id, role: req.user.role, email: req.user.email } : 'NULL');
    
    if (!req.user) {
      console.error('[Role Middleware] ❌ No user found in request - Authentication may have failed');
      return res.status(403).json({ success: false, message: 'Forbidden: No user found' });
    }
    const rawUserRole = req.user.role || '';
    const normalizedUserRole = rawUserRole.toString().toUpperCase();
    const normalizedRequiredRoles = roles.map(r => r.toString().toUpperCase());
    
    console.log(`[Role Middleware] 🔍 Role check details:`);
    console.log(`  - User Role (raw): "${rawUserRole}" (type: ${typeof rawUserRole})`);
    console.log(`  - User Role (normalized): "${normalizedUserRole}"`);
    console.log(`  - Required Roles (raw): [${roles.join(', ')}]`);
    console.log(`  - Required Roles (normalized): [${normalizedRequiredRoles.join(', ')}]`);
    console.log(`  - Match: ${normalizedRequiredRoles.includes(normalizedUserRole)}`);
    console.log(`  - Full req.user object:`, JSON.stringify(req.user, null, 2));
    
    if (!normalizedRequiredRoles.includes(normalizedUserRole)) {
      console.error(`[Role Middleware] ❌ Access denied - User role "${normalizedUserRole}" not in required roles [${normalizedRequiredRoles.join(', ')}]`);
      console.error(`[Role Middleware] ❌ Full user object:`, JSON.stringify(req.user, null, 2));
      return res.status(403).json({ 
        success: false, 
        message: `Forbidden: Access denied. Required role: ${roles.join(' or ')}. Your role: ${normalizedUserRole}` 
      });
    }
    
    console.log(`[Role Middleware] ✅ Access granted - User role "${normalizedUserRole}" matches required roles`);
    next();
  };
};

