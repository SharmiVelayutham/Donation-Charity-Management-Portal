import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  stats = {
    totalDonations: 0,
    totalContributions: 0,
    activeNGOs: 0,
    activeDonors: 0
  };
  isLoading = false;
  isAuthenticated = false;
  userRole: string | null = null;
  userName: string = '';
  userInitial: string = '';
  recentDonations: any[] = [];
  menuOpen = false;
  currentSlide = 0;

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.isAuthenticated = this.authService.isAuthenticated();
    this.userRole = this.authService.getCurrentRole();
    this.loadUserInfo();
    this.loadRecentDonations();
  }

  loadUserInfo() {
    if (this.isAuthenticated) {
      const user = this.authService.getUser();
      if (user) {
        this.userName = user.name || '';
        // Get first letter of name in uppercase
        if (this.userName) {
          this.userInitial = this.userName.charAt(0).toUpperCase();
        }
      }
    }
  }

  prevSlide() {
    // For future carousel implementation
    console.log('Previous slide');
  }

  nextSlide() {
    // For future carousel implementation
    console.log('Next slide');
  }

  async loadRecentDonations() {
    try {
      // Load ACTIVE donation requests (no auth required for viewing)
      const response = await lastValueFrom(this.apiService.getActiveDonationRequests());
      if (response?.success && response.data) {
        const requests = Array.isArray(response.data) ? response.data : [];
        
        // Filter to show only requests from last 3 days
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        
        this.recentDonations = requests
          .filter((req: any) => {
            const requestDate = new Date(req.created_at);
            return requestDate >= threeDaysAgo;
          })
          .slice(0, 6); // Limit to 6 most recent
      }
    } catch (error) {
      console.error('Failed to load donation requests:', error);
      // Use empty array if API fails
      this.recentDonations = [];
    }
  }

  navigateToDashboard() {
    if (this.userRole) {
      this.authService.navigateToDashboard(this.userRole);
    } else {
      this.authService.navigateToDashboard();
    }
  }

  logout() {
    this.authService.logout();
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  /**
   * Get label for quantity/amount field based on donation type
   */
  getQuantityOrAmountLabel(donationType: string): string {
    if (donationType === 'FUNDS') {
      return 'Required Amount';
    } else if (donationType === 'FOOD' || donationType === 'CLOTHES') {
      return 'Required Quantity';
    }
    return 'Quantity/Amount';
  }

  /**
   * Format quantity/amount based on donation type
   */
  formatQuantityOrAmount(donation: any): string {
    const value = donation.quantity_or_amount;
    if (!value && value !== 0) return 'N/A';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'N/A';

    // For FUNDS: show with ₹ symbol and 2 decimals
    if (donation.donation_type === 'FUNDS') {
      return `₹${numValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    // For FOOD/CLOTHES: show as integer (no decimals, no currency)
    if (donation.donation_type === 'FOOD' || donation.donation_type === 'CLOTHES') {
      return Math.round(numValue).toLocaleString('en-IN');
    }
    
    // Default: show as number
    return numValue.toLocaleString('en-IN');
  }

  handleDonateClick(donationId: string | number) {
    // Check if donor is logged in
    if (!this.authService.isAuthenticated()) {
      alert('Please register/login to donate');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: `/donations/${donationId}/contribute` }
      });
      return;
    }
    
    // Check if user is a donor
    const userRole = this.authService.getCurrentRole();
    if (userRole !== 'DONOR') {
      alert('Only registered donors can contribute. Please login as a donor.');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: `/donations/${donationId}/contribute` }
      });
      return;
    }
    
    // Allow donor to proceed
    this.router.navigate(['/donations', donationId, 'contribute']);
  }
}
