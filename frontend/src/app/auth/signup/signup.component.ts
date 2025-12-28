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
  registrationNumber: string = '';
  address: string = '';
  city: string = '';
  state: string = '';
  pincode: string = '';
  contactPersonName: string = '';
  phoneNumber: string = '';
  aboutNgo: string = '';
  websiteUrl: string = '';

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
    if (!this.name || !this.email || !this.password || !this.contactInfo || !this.role) {
      this.errorMessage = 'Please fill all required fields';
      return;
    }
    if (this.role === 'NGO') {
      if (!this.registrationNumber || !this.address || !this.contactPersonName || !this.phoneNumber) {
        this.errorMessage = 'Please fill all required NGO fields: Registration Number, Address, Contact Person Name, and Phone Number';
        return;
      }
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
      const registrationData: any = {
        name: this.name,
        email: this.email,
        password: this.password,
        role: this.role as 'DONOR' | 'NGO',
        contactInfo: this.contactInfo
      };
      if (this.role === 'NGO') {
        registrationData.registrationNumber = this.registrationNumber;
        registrationData.address = this.address;
        registrationData.city = this.city;
        registrationData.state = this.state;
        registrationData.pincode = this.pincode;
        registrationData.contactPersonName = this.contactPersonName;
        registrationData.phoneNumber = this.phoneNumber;
        registrationData.aboutNgo = this.aboutNgo;
        registrationData.websiteUrl = this.websiteUrl;
      }

      const response = await lastValueFrom(this.apiService.register(registrationData));
      console.log('=== REGISTRATION RESPONSE ===');
      console.log('Full response:', JSON.stringify(response, null, 2));
      console.log('Response data:', response.data);
      console.log('Has token:', !!response.token);
      console.log('Has user:', !!response.user);
      console.log('Has requiresVerification:', !!(response.data as any)?.requiresVerification);

      if (response?.success) {
        if (response.token || response.user) {
          console.error('❌ CRITICAL ERROR: Registration returned token/user directly!');
          console.error('This means backend server is running OLD CODE.');
          console.error('Response:', JSON.stringify(response, null, 2));
          console.error('ACTION REQUIRED: Restart backend server to load new code!');
          this.errorMessage = 'Backend error: Registration should not return token. Please restart backend server.';
          return;
        }
        const responseData = response.data as any;
        const requiresVerification = responseData?.requiresVerification;
        
        if (requiresVerification) {
          console.log('✅ OTP flow detected - redirecting to verification page');
          const pendingData: any = {
            name: this.name,
            email: this.email,
            password: this.password,
            role: this.role,
            contactInfo: this.contactInfo
          };
          if (this.role === 'NGO') {
            pendingData.registrationNumber = this.registrationNumber;
            pendingData.address = this.address;
            pendingData.city = this.city;
            pendingData.state = this.state;
            pendingData.pincode = this.pincode;
            pendingData.contactPersonName = this.contactPersonName;
            pendingData.phoneNumber = this.phoneNumber;
            pendingData.aboutNgo = this.aboutNgo;
            pendingData.websiteUrl = this.websiteUrl;
          }

          sessionStorage.setItem('pendingRegistration', JSON.stringify(pendingData));
          this.router.navigate(['/verify-otp'], {
            queryParams: { email: this.email }
          });
        } else {
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
