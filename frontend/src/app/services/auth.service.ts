import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

export type UserRole = 'DONOR' | 'NGO' | 'ADMIN';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private router: Router) {}

  /**
   * Get current user role from localStorage
   */
  getCurrentRole(): UserRole | null {
    const role = localStorage.getItem('userRole')?.toUpperCase();
    if (role === 'DONOR' || role === 'NGO' || role === 'ADMIN') {
      return role as UserRole;
    }
    return null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: UserRole): boolean {
    return this.getCurrentRole() === role;
  }

  /**
   * Get user data from localStorage
   */
  getUser(): any {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Store user data after login/registration
   */
  setUser(token: string, user: any): void {
    const normalizedRole = (user?.role || '').toUpperCase();
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('userRole', normalizedRole);
  }

  /**
   * Clear user data (logout)
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    this.router.navigate(['/login']);
  }

  /**
   * Navigate to appropriate dashboard based on role
   */
  navigateToDashboard(role?: UserRole | string): void {
    const userRole = (role || this.getCurrentRole() || '').toString().toUpperCase();
    
    console.log('Navigating to dashboard for role:', userRole);
    
    if (userRole === 'DONOR') {
      this.router.navigate(['/dashboard/donor']).catch(err => {
        console.error('Failed to navigate to donor dashboard:', err);
      });
    } else if (userRole === 'NGO') {
      this.router.navigate(['/dashboard/ngo']).catch(err => {
        console.error('Failed to navigate to NGO dashboard:', err);
      });
    } else if (userRole === 'ADMIN') {
      // Admin dashboard route if exists
      this.router.navigate(['/admin/dashboard']).catch(() => {
        this.router.navigate(['/login']);
      });
    } else {
      console.warn('Unknown role, redirecting to donations');
      this.router.navigate(['/donations']);
    }
  }
}

