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
      this.errorMessage = error?.error?.message || error?.message || 'Invalid email or password';
    } finally {
      this.isLoading = false;
    }
  }

  goToSignup() {
    this.router.navigate(['/signup']);
  }
}
