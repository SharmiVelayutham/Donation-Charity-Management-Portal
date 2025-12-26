import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-register.component.html',
  styleUrls: ['./admin-register.component.css']
})
export class AdminRegisterComponent implements OnInit {
  name: string = '';
  email: string = '';
  password: string = '';
  contactInfo: string = '';
  securityCode: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

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

  async onRegister() {
    this.errorMessage = '';
    this.successMessage = '';

    // Validation
    if (!this.name || !this.email || !this.password || !this.contactInfo || !this.securityCode) {
      this.errorMessage = 'Please fill all required fields including security code';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters';
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    this.isLoading = true;

    try {
      const response = await lastValueFrom(
        this.apiService.adminRegister({
          name: this.name.trim(),
          email: this.email.trim(),
          password: this.password,
          contactInfo: this.contactInfo.trim(),
          securityCode: this.securityCode.trim() // Trim security code to handle whitespace
        })
      );

      if (response?.success) {
        // Check if OTP verification is required
        const responseData = response.data as any;
        const requiresVerification = responseData?.requiresVerification;

        if (requiresVerification) {
          // Store registration data temporarily in sessionStorage
          sessionStorage.setItem('pendingAdminRegistration', JSON.stringify({
            name: this.name.trim(),
            email: this.email.trim(),
            password: this.password,
            contactInfo: this.contactInfo.trim(),
            securityCode: this.securityCode.trim() // Store trimmed security code
          }));

          // Redirect to OTP verification page
          this.router.navigate(['/admin/verify-otp'], {
            queryParams: { email: this.email }
          });
        } else {
          // If no requiresVerification flag, something went wrong
          this.errorMessage = response?.message || 'Registration failed. Please try again.';
        }
      } else {
        this.errorMessage = response?.message || 'Registration failed';
      }
    } catch (error: any) {
      console.error('Admin registration error:', error);
      this.errorMessage = error?.error?.message || error?.message || 'Registration failed. Please try again.';
      
      // Check if it's a security code error
      if (error?.error?.message?.includes('security code') || error?.status === 403) {
        this.errorMessage = 'Invalid security code. Admin registration requires a valid security code.';
      }
    } finally {
      this.isLoading = false;
    }
  }

  goToLogin() {
    this.router.navigate(['/admin/login']);
  }
}

