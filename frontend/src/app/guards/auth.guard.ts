import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

/**
 * Auth Guard - Protects routes that require authentication
 * Checks if user is logged in (has token)
 */
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  
  if (!token) {
    router.navigate(['/login']);
    return false;
  }
  
  return true;
};

/**
 * Role Guard - Protects routes based on user role
 * @param allowedRoles - Array of roles allowed to access the route
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const router = inject(Router);
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole')?.toUpperCase() || '';
    
    // If no token, redirect to login
    if (!token) {
      router.navigate(['/login']);
      return false;
    }
    
    // Check if user role is in allowed roles
    if (!allowedRoles.includes(userRole)) {
      // Redirect based on role
      if (userRole === 'NGO') {
        router.navigate(['/dashboard/ngo']);
      } else if (userRole === 'DONOR') {
        router.navigate(['/dashboard/donor']);
      } else {
        router.navigate(['/login']);
      }
      return false;
    }
    
    return true;
  };
};

