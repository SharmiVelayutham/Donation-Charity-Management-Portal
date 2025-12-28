import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class HomeComponent implements OnInit, OnDestroy {
  stats = {
    totalDonations: 0,
    totalContributions: 0,
    activeNGOs: 0,
    activeDonors: 0
  };
  isLoading = false;
  isLoadingStats = false;
  isAuthenticated = false;
  userRole: string | null = null;
  userName: string = '';
  userInitial: string = '';
  recentDonations: any[] = [];
  currentSlide = 0;
  menuOpen = false;
  sliders: any[] = [];
  isLoadingSliders: boolean = false;
  sliderInterval: any;

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.checkAuthStatus();
    this.loadRecentDonations();
    this.loadSliders();
    this.loadPlatformStats();
    this.authService.authStatus$.subscribe(() => {
      this.checkAuthStatus();
    });
  }

  checkAuthStatus() {
    this.isAuthenticated = this.authService.isAuthenticated();
    if (this.isAuthenticated) {
      const user = this.authService.getUser();
      this.userRole = user?.role || null;
      this.userName = user?.name || '';
      if (this.userName) {
        this.userInitial = this.userName.charAt(0).toUpperCase();
      }
    } else {
      this.userRole = null;
      this.userName = '';
      this.userInitial = '';
    }
  }

  navigateToDashboard() {
    if (this.userRole) {
      this.authService.navigateToDashboard(this.userRole);
    } else {
      this.authService.navigateToDashboard();
    }
  }

  async loadSliders() {
    this.isLoadingSliders = true;
    try {
      const response = await lastValueFrom(this.apiService.getSliders());
      if (response?.success && response.data) {
        this.sliders = Array.isArray(response.data) ? response.data : [];
        if (this.sliders.length > 0) {
          this.currentSlide = 0;
          this.startSliderAutoRotation();
        }
      }
    } catch (error) {
      console.error('Failed to load sliders:', error);
      this.sliders = [];
    } finally {
      this.isLoadingSliders = false;
    }
  }

  startSliderAutoRotation() {
    if (this.sliders.length > 1) {
      this.sliderInterval = setInterval(() => {
        this.nextSlide();
      }, 5000); // Change slide every 5 seconds
    }
  }

  stopSliderAutoRotation() {
    if (this.sliderInterval) {
      clearInterval(this.sliderInterval);
      this.sliderInterval = null;
    }
  }

  prevSlide() {
    if (this.sliders.length > 0) {
      this.currentSlide = (this.currentSlide - 1 + this.sliders.length) % this.sliders.length;
    }
  }

  nextSlide() {
    if (this.sliders.length > 0) {
      this.currentSlide = (this.currentSlide + 1) % this.sliders.length;
    }
  }

  getSliderImageUrl(imageUrl: string): string {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    const baseUrl = 'http://localhost:4000';
    return `${baseUrl}${imageUrl}`;
  }

  async loadRecentDonations() {
    try {

      const response = await lastValueFrom(this.apiService.getActiveDonationRequests());
      if (response?.success && response.data) {
        const requests = Array.isArray(response.data) ? response.data : [];

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

      this.recentDonations = [];
    }
  }

  async loadPlatformStats() {
    this.isLoadingStats = true;
    try {
      const response = await lastValueFrom(this.apiService.getPlatformStats());
      if (response?.success && response.data) {
        const data: any = response.data;
        this.stats.totalDonations = Number(data.totalDonations) || 0;
        this.stats.totalContributions = Number(data.totalContributions) || 0;
        this.stats.activeNGOs = Number(data.activeNGOs) || 0;
        this.stats.activeDonors = Number(data.activeDonors) || 0;
      }
    } catch (error) {
      console.error('Failed to load platform stats:', error);
    } finally {
      this.isLoadingStats = false;
    }
  }


  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }
  ngOnDestroy() {
    this.stopSliderAutoRotation();
  }

  getQuantityOrAmountLabel(donationType: string): string {
    if (donationType === 'FUNDS') {
      return 'Required Amount';
    } else if (donationType === 'FOOD' || donationType === 'CLOTHES') {
      return 'Required Quantity';
    }
    return 'Quantity/Amount';
  }
  formatQuantityOrAmount(donation: any): string {
    const value = donation.quantity_or_amount;
    if (!value && value !== 0) return 'N/A';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'N/A';

    if (donation.donation_type === 'FUNDS') {
      return `₹${numValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    if (donation.donation_type === 'FOOD' || donation.donation_type === 'CLOTHES') {
      return Math.round(numValue).toLocaleString('en-IN');
    }

    return numValue.toLocaleString('en-IN');
  }

  handleDonateClick(donationId: string | number) {

    if (!this.authService.isAuthenticated()) {
      alert('Please register/login to donate');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: `/donations/${donationId}/contribute` }
      });
      return;
    }

    const userRole = this.authService.getCurrentRole();
    if (userRole !== 'DONOR') {
      alert('Only registered donors can contribute. Please login as a donor.');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: `/donations/${donationId}/contribute` }
      });
      return;
    }

    this.router.navigate(['/donations', donationId, 'contribute']);
  }
}
