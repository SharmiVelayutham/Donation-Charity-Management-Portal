import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

export type UserRole = 'DONOR' | 'NGO' | 'ADMIN';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authStatusSubject = new BehaviorSubject<boolean>(this.isAuthenticated());
  public authStatus$: Observable<boolean> = this.authStatusSubject.asObservable();

  constructor(private router: Router) {}
  getCurrentRole(): UserRole | null {
    const role = localStorage.getItem('userRole')?.toUpperCase();
    if (role === 'DONOR' || role === 'NGO' || role === 'ADMIN') {
      return role as UserRole;
    }
    return null;
  }
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }
  hasRole(role: UserRole): boolean {
    return this.getCurrentRole() === role;
  }
  getUser(): any {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
  setUser(token: string, user: any): void {
    if (!user) {
      console.error('setUser: user object is null or undefined');
      return;
    }
    let role = user.role || (user as any).admin?.role || '';
    if (!role && user.id) {
      console.warn('setUser: Role not found in user object, attempting to infer from context');
    }
    const normalizedRole = role.toUpperCase();
    if (!['DONOR', 'NGO', 'ADMIN'].includes(normalizedRole)) {
      console.error('setUser: Invalid role:', normalizedRole, 'User object:', user);
      return;
    }
    if (!user.role) {
      user.role = normalizedRole;
    }
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('userRole', normalizedRole);
    this.authStatusSubject.next(true);
    console.debug('setUser: Stored data keys:', {
      tokenPresent: !!token,
      role: normalizedRole,
      localStorageRole: localStorage.getItem('userRole')
    });
  }
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    this.authStatusSubject.next(false);
    this.router.navigate(['/login']);
  }
  navigateToDashboard(role?: UserRole | string): void {
    const userRole = (role || this.getCurrentRole() || '').toString().toUpperCase();
    
    console.debug('Navigating to dashboard for role:', userRole);
    
    if (userRole === 'DONOR') {
      this.router.navigate(['/dashboard/donor']).catch(err => {
        console.error('Failed to navigate to donor dashboard:', err);
      });
    } else if (userRole === 'NGO') {
      this.router.navigate(['/dashboard/ngo']).catch(err => {
        console.error('Failed to navigate to NGO dashboard:', err);
      });
    } else if (userRole === 'ADMIN') {
      this.router.navigate(['/admin/dashboard']).catch(() => {
        this.router.navigate(['/login']);
      });
    } else {
      console.warn('Unknown role, redirecting to donations');
      this.router.navigate(['/donations']);
    }
  }
}

