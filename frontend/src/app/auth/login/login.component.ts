import { Component, OnInit } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Pre-fill email if coming from OTP verification
    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.email = params['email'];
      }
    });

    // If already logged in, redirect to dashboard
    if (this.authService.isAuthenticated()) {
      const role = this.authService.getCurrentRole();
      if (role) {
        this.authService.navigateToDashboard(role);
      }
    }
  }

  async onLogin() {
    this.errorMessage = '';

    // Validation
    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter email and password';
      return;
    }

    this.isLoading = true;

    try {
      const response = await lastValueFrom(this.apiService.login(this.email, this.password));

      if (response?.success && response.token) {
        // Store user data using AuthService
        this.authService.setUser(response.token, response.user);

        // Debug logging
        console.log('=== LOGIN SUCCESS ===');
        console.log('API Response:', response);
        console.log('User object:', response.user);
        console.log('User role:', response.user?.role);
        console.log('Token stored:', !!localStorage.getItem('token'));
        console.log('Role stored:', localStorage.getItem('userRole'));

        // Navigate to dashboard via AuthService for consistent handling
        const role = (response.user?.role || '').toUpperCase();
        console.log('Final role for navigation:', role);
        this.authService.navigateToDashboard(role);
      } else {
        this.errorMessage = response?.message || 'Login failed';
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error?.error?.message || error?.message || 'Invalid email or password';
      const errorData = error?.error;
      
      // Check if this is an admin trying to login through regular endpoint
      if (errorMessage.includes('Admin login is not allowed through this endpoint') || 
          errorMessage.includes('Please use /api/admin/auth/login')) {
        this.errorMessage = 'Admin accounts must use the Admin Login page. Redirecting...';
        // Redirect to admin login after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/admin/login'], { 
            queryParams: { email: this.email } 
          });
        }, 2000);
      } 
      // Check if NGO verification status issue
      else if (errorData?.verification_status === 'PENDING') {
        this.errorMessage = 'Your NGO profile is under admin verification. You will receive an email once verified.';
      } 
      else if (errorData?.verification_status === 'REJECTED') {
        const rejectionReason = errorData?.rejection_reason 
          ? `Reason: ${errorData.rejection_reason}` 
          : '';
        this.errorMessage = `Your NGO registration was rejected. ${rejectionReason} Please contact support for more information.`;
      }
      else {
        this.errorMessage = errorMessage;
      }
    } finally {
      this.isLoading = false;
    }
  }

  goToSignup() {
    this.router.navigate(['/signup']);
  }
}
