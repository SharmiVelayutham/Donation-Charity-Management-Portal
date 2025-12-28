import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { lastValueFrom } from 'rxjs';
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
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
    });
    const pendingReg = sessionStorage.getItem('pendingRegistration');
    if (pendingReg) {
      this.registrationData = JSON.parse(pendingReg);
      if (!this.email && this.registrationData.email) {
        this.email = this.registrationData.email;
      }
    }
    if (!this.registrationData) {
      this.showToast('Please complete registration first', true);
      this.router.navigate(['/signup']);
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
      this.router.navigate(['/signup']);
      return;
    }

    this.isLoading = true;

    try {
      const registrationPayload: any = {
        name: this.registrationData.name,
        email: this.registrationData.email,
        password: this.registrationData.password,
        role: this.registrationData.role as 'DONOR' | 'NGO',
        contactInfo: this.registrationData.contactInfo,
        otp: this.otp
      };
      if (this.registrationData.role === 'NGO') {
        registrationPayload.registrationNumber = this.registrationData.registrationNumber;
        registrationPayload.address = this.registrationData.address;
        registrationPayload.city = this.registrationData.city;
        registrationPayload.state = this.registrationData.state;
        registrationPayload.pincode = this.registrationData.pincode;
        registrationPayload.contactPersonName = this.registrationData.contactPersonName;
        registrationPayload.phoneNumber = this.registrationData.phoneNumber;
        registrationPayload.aboutNgo = this.registrationData.aboutNgo;
        registrationPayload.websiteUrl = this.registrationData.websiteUrl;
      }
      const response = await lastValueFrom(this.apiService.verifyOTPAndRegister(registrationPayload));

      if (response?.success) {
        sessionStorage.removeItem('pendingRegistration');
        const isNgo = this.registrationData.role === 'NGO';
        const responseData = response.data as any;
        const verificationStatus = responseData?.user?.verification_status || responseData?.verification_status;
        if (isNgo) {
          const status = verificationStatus || 'PENDING';
          if (status === 'PENDING' || status === 'REJECTED') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('userRole');
            const message = status === 'REJECTED' 
              ? 'Your NGO registration was rejected. Please contact support.'
              : 'NGO registration completed! Your profile is under admin verification. You will receive an email once verified.';
            
            this.showToast(message, false);
            setTimeout(() => {
              this.router.navigate(['/login'], {
                queryParams: { 
                  email: this.email,
                  message: message
                }
              });
            }, 3000);
            return; // EXIT - do NOT proceed to login
          }
          if (status === 'VERIFIED' && response.token && response.user) {
            this.authService.setUser(response.token, response.user);
            this.showToast('Account verified successfully! Redirecting to dashboard...', false);
            setTimeout(() => {
              const role = (response.user?.role || '').toUpperCase();
              this.authService.navigateToDashboard(role);
            }, 2000);
            return;
          }
        }
        if (response.token && response.user) {
          this.authService.setUser(response.token, response.user);
          
          this.showToast('Account verified successfully! Redirecting to dashboard...', false);
          setTimeout(() => {
            const role = (response.user?.role || '').toUpperCase();
            this.authService.navigateToDashboard(role);
          }, 2000);
        } else {
          this.showToast('Account verified successfully! Please login to continue.', false);
          
          setTimeout(() => {
            this.router.navigate(['/login'], {
              queryParams: { email: this.email }
            });
          }, 2000);
        }
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

