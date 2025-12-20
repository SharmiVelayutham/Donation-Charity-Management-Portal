import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
        // Admin login returns 'admin' field, but normalizeResponse might put it in 'user'
        const adminData = (response as any).admin || response.user;
        this.authService.setUser(response.token, adminData);
        console.log('Admin login successful:', response);
        this.router.navigate(['/admin/dashboard']);
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

