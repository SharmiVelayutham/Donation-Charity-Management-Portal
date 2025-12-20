import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  name: string = '';
  email: string = '';
  password: string = '';
  contactInfo: string = '';
  role: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  onRoleChange(event: Event) {
    this.role = (event.target as HTMLSelectElement).value.toUpperCase();
  }

  async createAccount() {
    this.errorMessage = '';
    
    // Validation
    if (!this.name || !this.email || !this.password || !this.contactInfo || !this.role) {
      this.errorMessage = 'Please fill all required fields';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters';
      return;
    }

    if (!['DONOR', 'NGO'].includes(this.role)) {
      this.errorMessage = 'Please select a valid role';
      return;
    }

    this.isLoading = true;

    try {
      const response = await lastValueFrom(this.apiService.register({
        name: this.name,
        email: this.email,
        password: this.password,
        role: this.role as 'DONOR' | 'NGO',
        contactInfo: this.contactInfo
      }));

      // Debug logging
      console.log('=== REGISTRATION RESPONSE ===');
      console.log('Full response:', JSON.stringify(response, null, 2));
      console.log('Response data:', response.data);
      console.log('Has token:', !!response.token);
      console.log('Has user:', !!response.user);
      console.log('Has requiresVerification:', !!(response.data as any)?.requiresVerification);

      if (response?.success) {
        // CRITICAL: If token or user exists in registration response, backend is using OLD CODE
        // This should NEVER happen with OTP flow - reject it immediately
        if (response.token || response.user) {
          console.error('❌ CRITICAL ERROR: Registration returned token/user directly!');
          console.error('This means backend server is running OLD CODE.');
          console.error('Response:', JSON.stringify(response, null, 2));
          console.error('ACTION REQUIRED: Restart backend server to load new code!');
          this.errorMessage = 'Backend error: Registration should not return token. Please restart backend server.';
          // DO NOT store token or navigate to dashboard
          return;
        }
        
        // Check if OTP verification is required
        // The backend returns { success: true, data: { requiresVerification: true, email: ... } }
        const responseData = response.data as any;
        const requiresVerification = responseData?.requiresVerification;
        
        if (requiresVerification) {
          console.log('✅ OTP flow detected - redirecting to verification page');
          
          // Store registration data temporarily in sessionStorage (not localStorage)
          // This will be used during OTP verification
          sessionStorage.setItem('pendingRegistration', JSON.stringify({
            name: this.name,
            email: this.email,
            password: this.password,
            role: this.role,
            contactInfo: this.contactInfo
          }));

          // Redirect to OTP verification page
          this.router.navigate(['/verify-otp'], {
            queryParams: { email: this.email }
          });
        } else {
          // If no requiresVerification flag, something went wrong
          console.error('❌ Unexpected registration response - no requiresVerification flag');
          console.error('Response:', JSON.stringify(response, null, 2));
          this.errorMessage = response?.message || responseData?.message || 'Registration failed. Please try again.';
        }
      } else {
        this.errorMessage = response?.message || 'Registration failed';
      }
    } catch (error: any) {
      this.errorMessage = error?.error?.message || error?.message || 'Registration failed. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
