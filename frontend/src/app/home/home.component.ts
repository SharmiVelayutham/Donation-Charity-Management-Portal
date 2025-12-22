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
    this.loadRecentDonations();
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
      // Load only ACTIVE donations (no auth required for viewing)
      const response = await lastValueFrom(this.apiService.getDonations({ status: 'ACTIVE' }));
      if (response?.success && response.data) {
        const donations = Array.isArray(response.data) 
          ? response.data 
          : (response.data.donations || []);
        // Show only ACTIVE donations, limit to 6 most recent
        this.recentDonations = donations
          .filter((d: any) => d.status === 'ACTIVE')
          .slice(0, 6);
      }
    } catch (error) {
      console.error('Failed to load donations:', error);
      // Use placeholder data if API fails
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
