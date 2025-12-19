import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { lastValueFrom } from 'rxjs';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './verify-otp.component.html',
  styleUrls: ['./verify-otp.component.css']
})
export class VerifyOtpComponent implements OnInit {
  email: string = '';
  otp: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  registrationData: any = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    // Get email from query params
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
    });

    // Get registration data from sessionStorage
    const pendingReg = sessionStorage.getItem('pendingRegistration');
    if (pendingReg) {
      this.registrationData = JSON.parse(pendingReg);
      if (!this.email && this.registrationData.email) {
        this.email = this.registrationData.email;
      }
    }

    // If no registration data, redirect to signup
    if (!this.registrationData) {
      this.showToast('Please complete registration first', true);
      this.router.navigate(['/signup']);
    }
  }

  async verifyOTP() {
    this.errorMessage = '';

    // Validation
    if (!this.otp || this.otp.length !== 6) {
      this.errorMessage = 'Please enter a valid 6-digit OTP';
      return;
    }

    if (!this.registrationData) {
      this.errorMessage = 'Registration data not found. Please register again.';
      this.router.navigate(['/signup']);
      return;
    }

    this.isLoading = true;

    try {
      // Verify OTP and complete registration
      const response = await lastValueFrom(this.apiService.verifyOTPAndRegister({
        name: this.registrationData.name,
        email: this.registrationData.email,
        password: this.registrationData.password,
        role: this.registrationData.role as 'DONOR' | 'NGO',
        contactInfo: this.registrationData.contactInfo,
        otp: this.otp
      }));

      if (response?.success) {
        // Clear pending registration data
        sessionStorage.removeItem('pendingRegistration');

        // IMPORTANT: Do NOT store token/role here even if token is returned
        // User must login separately after OTP verification
        // Clear any existing auth data (safety measure)
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');

        this.showToast('Account verified successfully! Please login to continue.', false);
        
        // Redirect to login page
        setTimeout(() => {
          this.router.navigate(['/login'], {
            queryParams: { email: this.email }
          });
        }, 2000);
      } else {
        this.errorMessage = response?.message || 'OTP verification failed';
        this.showToast(this.errorMessage, true);
      }
    } catch (error: any) {
      this.errorMessage = error?.error?.message || error?.message || 'OTP verification failed. Please try again.';
      this.showToast(this.errorMessage, true);
    } finally {
      this.isLoading = false;
    }
  }

  resendOTP() {
    if (!this.registrationData) {
      this.showToast('Registration data not found', true);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.register({
      name: this.registrationData.name,
      email: this.registrationData.email,
      password: this.registrationData.password,
      role: this.registrationData.role as 'DONOR' | 'NGO',
      contactInfo: this.registrationData.contactInfo
    }).subscribe({
      next: (response) => {
        if (response?.success) {
          this.showToast('OTP resent to your email', false);
        } else {
          this.errorMessage = response?.message || 'Failed to resend OTP';
          this.showToast(this.errorMessage, true);
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || error?.message || 'Failed to resend OTP';
        this.showToast(this.errorMessage, true);
        this.isLoading = false;
      }
    });
  }

  goToSignup() {
    sessionStorage.removeItem('pendingRegistration');
    this.router.navigate(['/signup']);
  }

  goToLogin() {
    sessionStorage.removeItem('pendingRegistration');
    this.router.navigate(['/login']);
  }

  showToast(message: string, isError = false) {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: isError ? ['error-snackbar'] : ['success-snackbar']
    });
  }
}

