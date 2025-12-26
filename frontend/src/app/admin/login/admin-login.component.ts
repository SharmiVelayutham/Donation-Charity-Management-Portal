import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css']
})
export class AdminLoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // If already logged in as admin, redirect to dashboard
    if (this.authService.isAuthenticated() && this.authService.hasRole('ADMIN')) {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  async onLogin() {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter email and password';
      return;
    }

    this.isLoading = true;

    try {
      const response = await lastValueFrom(this.apiService.adminLogin(this.email, this.password));

      if (response?.success && response.token) {
        console.log('=== ADMIN LOGIN RESPONSE ===');
        console.log('Full response:', response);
        
        // Admin login returns 'admin' field, but normalizeResponse converts it to 'user' for consistency
        const adminData = (response as any).admin || response.user;
        console.log('Admin data extracted:', adminData);
        
        // CRITICAL: Ensure role is ALWAYS set to ADMIN
        if (!adminData) {
          console.error('Admin data is null/undefined');
          this.errorMessage = 'Invalid response from server';
          return;
        }
        
        // Force role to ADMIN
        adminData.role = 'ADMIN';
        console.log('Admin data with role:', adminData);
        
        // Store user data with ADMIN role
        this.authService.setUser(response.token, adminData);
        
        // Wait a bit for localStorage to be written (synchronous but just to be safe)
        setTimeout(() => {
          // Verify role was set correctly
          const storedRole = this.authService.getCurrentRole();
          const storedToken = localStorage.getItem('token');
          const storedUser = localStorage.getItem('user');
          
          console.log('=== LOCALSTORAGE VERIFICATION ===');
          console.log('Stored token:', !!storedToken);
          console.log('Stored user:', storedUser);
          console.log('Stored role:', storedRole);
          console.log('Expected role: ADMIN');
          
          // Navigate to admin dashboard
          if (storedRole === 'ADMIN') {
            console.log('Role verified, navigating to admin dashboard...');
            this.router.navigate(['/admin/dashboard']).then(
              () => console.log('Navigation successful'),
              (err) => {
                console.error('Navigation error:', err);
                // Fallback: use AuthService navigation
                this.authService.navigateToDashboard('ADMIN');
              }
            );
          } else {
            console.error('Role verification failed. Expected ADMIN, got:', storedRole);
            console.error('localStorage contents:', {
              token: localStorage.getItem('token'),
              user: localStorage.getItem('user'),
              userRole: localStorage.getItem('userRole')
            });
            this.errorMessage = `Failed to set admin role. Role: ${storedRole}. Please check console for details.`;
          }
        }, 100);
      } else {
        this.errorMessage = response?.message || 'Login failed';
      }
    } catch (error: any) {
      console.error('Admin login error:', error);
      this.errorMessage = error?.error?.message || error?.message || 'Invalid email or password';
    } finally {
      this.isLoading = false;
    }
  }
}

