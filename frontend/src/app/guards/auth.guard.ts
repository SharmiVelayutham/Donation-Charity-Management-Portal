import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  
  if (!token) {
    router.navigate(['/login']);
    return false;
  }
  
  return true;
};
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const router = inject(Router);
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('[Role Guard] ❌ No token - redirecting to login');
      router.navigate(['/login']);
      return false;
    }
    let tokenRole = '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      tokenRole = payload.role?.toUpperCase() || '';
      console.log('[Role Guard] Token decoded - Role:', tokenRole);
      const storedRole = localStorage.getItem('userRole')?.toUpperCase();
      if (storedRole !== tokenRole && tokenRole) {
        console.warn(`[Role Guard] Role mismatch - localStorage: "${storedRole}", Token: "${tokenRole}". Updating localStorage.`);
        localStorage.setItem('userRole', tokenRole);
      }
    } catch (e) {
      console.error('[Role Guard] Failed to decode token:', e);
      tokenRole = localStorage.getItem('userRole')?.toUpperCase() || '';
    }
    
    const userRole = tokenRole || localStorage.getItem('userRole')?.toUpperCase() || '';
    const normalizedAllowedRoles = allowedRoles.map(r => r.toUpperCase());
    
    console.log('[Role Guard] Checking access:', {
      path: state.url,
      userRole,
      tokenRole,
      allowedRoles: normalizedAllowedRoles,
      hasToken: !!token
    });
    if (!normalizedAllowedRoles.includes(userRole)) {
      console.log(`[Role Guard] ❌ Access denied - User role "${userRole}" not in allowed roles [${normalizedAllowedRoles.join(', ')}]`);
      if (userRole === 'NGO') {
        router.navigate(['/dashboard/ngo']);
      } else if (userRole === 'DONOR') {
        router.navigate(['/dashboard/donor']);
      } else if (userRole === 'ADMIN') {
        router.navigate(['/admin/dashboard']);
      } else {
        router.navigate(['/login']);
      }
      return false;
    }
    
    console.log(`[Role Guard] ✅ Access granted - User role "${userRole}" matches allowed roles`);
    return true;
  };
};

