import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-verify-otp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-verify-otp.component.html',
  styleUrls: ['./admin-verify-otp.component.css']
})
export class AdminVerifyOtpComponent implements OnInit {
  email: string = '';
  otp: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  registrationData: any = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
    });
    const pendingReg = sessionStorage.getItem('pendingAdminRegistration');
    if (pendingReg) {
      this.registrationData = JSON.parse(pendingReg);
      if (!this.email && this.registrationData.email) {
        this.email = this.registrationData.email;
      }
    }
    if (!this.registrationData) {
      alert('Please complete admin registration first');
      this.router.navigate(['/admin/register']);
    }
  }

  async verifyOTP() {
    this.errorMessage = '';
    if (!this.otp || this.otp.length !== 6) {
      this.errorMessage = 'Please enter a valid 6-digit OTP';
      return;
    }

    if (!this.registrationData) {
      this.errorMessage = 'Registration data not found. Please register again.';
      this.router.navigate(['/admin/register']);
      return;
    }

    this.isLoading = true;

    try {
      const trimmedOTP = this.otp.trim();
      const response = await lastValueFrom(
        this.apiService.adminVerifyOTPAndRegister({
          name: this.registrationData.name,
          email: this.registrationData.email.trim(),
          password: this.registrationData.password,
          contactInfo: this.registrationData.contactInfo,
          securityCode: this.registrationData.securityCode,
          otp: trimmedOTP
        })
      );

      if (response?.success && response.token) {
        sessionStorage.removeItem('pendingAdminRegistration');
        const adminData = (response as any).admin || response.user;
        this.authService.setUser(response.token, adminData);

        alert('Admin account verified and created successfully! Redirecting to dashboard...');
        setTimeout(() => {
          this.router.navigate(['/admin/dashboard']);
        }, 1500);
      } else {
        this.errorMessage = response?.message || 'OTP verification failed';
      }
    } catch (error: any) {
      console.error('Admin OTP verification error:', error);
      this.errorMessage = error?.error?.message || error?.message || 'OTP verification failed. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  resendOTP() {
    if (!this.registrationData) {
      alert('Registration data not found');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.adminRegister({
      name: this.registrationData.name,
      email: this.registrationData.email,
      password: this.registrationData.password,
      contactInfo: this.registrationData.contactInfo,
      securityCode: this.registrationData.securityCode
    }).subscribe({
      next: (response) => {
        if (response?.success) {
          alert('OTP resent to your email');
        } else {
          this.errorMessage = response?.message || 'Failed to resend OTP';
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || error?.message || 'Failed to resend OTP';
        this.isLoading = false;
      }
    });
  }

  goToRegister() {
    sessionStorage.removeItem('pendingAdminRegistration');
    this.router.navigate(['/admin/register']);
  }
}

