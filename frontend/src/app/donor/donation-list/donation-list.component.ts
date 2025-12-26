import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, lastValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { ApiService, ApiResponse } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-donation-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './donation-list.component.html',
  styleUrls: ['./donation-list.component.css']
})
export class DonationListComponent implements OnInit {
  donations: any[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  // Filters
  filterCategory: string = '';
  filterLocation: string = '';
  filterDate: string = '';

  // Quick-schedule UI state maps
  showSchedule: Record<string, boolean> = {};
  scheduleDateTimeMap: Record<string, string> = {};
  notesMap: Record<string, string> = {};
  isScheduling: Record<string, boolean> = {};
  donorAddress: string = '';
  donorContactNumber: string = '';

  constructor(
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.loadDonations();
    await this.loadDonorProfile();
  }

  async loadDonations() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      // Use new donation-requests endpoint
      const donationType = this.filterCategory || undefined;
      const resp$: Observable<ApiResponse> = this.apiService.getActiveDonationRequests(donationType);
      const response = await lastValueFrom(resp$);
      if (response?.success && response.data) {
        // Filter by location if provided
        let donations = Array.isArray(response.data) ? response.data : [];
        
        if (this.filterLocation) {
          const locationLower = this.filterLocation.toLowerCase();
          donations = donations.filter((d: any) => 
            d.ngo_address?.toLowerCase().includes(locationLower) ||
            d.ngoAddress?.toLowerCase().includes(locationLower)
          );
        }
        
        this.donations = donations;
      }
    } catch (error: any) {
      console.error('Error loading donation requests:', error);
      this.errorMessage = error?.error?.message || error?.message || 'Failed to load donation requests';
      this.donations = [];
    } finally {
      this.isLoading = false;
    }
  }

  contribute(id: string | number) {
    // Check if donor is logged in
    if (!this.authService.isAuthenticated()) {
      // Redirect to login with message
      alert('Please register/login to donate');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: `/donation-requests/${id}/contribute` }
      });
      return;
    }
    
    // Check if user is a donor
    const userRole = this.authService.getCurrentRole();
    if (userRole !== 'DONOR') {
      alert('Only registered donors can contribute. Please login as a donor.');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: `/donation-requests/${id}/contribute` }
      });
      return;
    }
    
    // Navigate to contribution form for donation request
    this.router.navigate(['/donation-requests', id, 'contribute']);
  }

  applyFilters() {
    this.loadDonations();
  }

  clearFilters() {
    this.filterCategory = '';
    this.filterLocation = '';
    this.filterDate = '';
    this.loadDonations();
  }

  toggleQuickSchedule(donationId: string) {
    this.showSchedule[donationId] = !this.showSchedule[donationId];
  }

  async loadDonorProfile() {
    try {
      const resp$: Observable<ApiResponse> = this.apiService.getDonorProfile();
      const response = await lastValueFrom(resp$);
      if (response?.success && response.data) {
        const profile = response.data;
        this.donorAddress = profile.fullAddress || profile.address || '';
        this.donorContactNumber = profile.phoneNumber || profile.contactInfo || '';
      }
    } catch {
      // ignore
    }
  }

  async submitQuickContribution(donationId: string) {
    this.errorMessage = '';
    if (!this.scheduleDateTimeMap[donationId] || !this.donorAddress || !this.donorContactNumber) {
      this.errorMessage = 'Please provide pickup date/time, address and contact number';
      return;
    }
    this.isScheduling[donationId] = true;
    try {
      const resp$: Observable<ApiResponse> = this.apiService.createContribution(donationId, {
        pickupScheduledDateTime: this.scheduleDateTimeMap[donationId],
        donorAddress: this.donorAddress,
        donorContactNumber: this.donorContactNumber,
        notes: this.notesMap[donationId]
      });
      const response = await lastValueFrom(resp$);
      if (response?.success) {
        alert('Pickup scheduled and contribution confirmed');
        this.showSchedule[donationId] = false;
        this.loadDonations();
      } else {
        this.errorMessage = response?.message || 'Failed to submit contribution';
      }
    } catch (err: any) {
      this.errorMessage = err?.message || 'Failed to submit contribution';
    } finally {
      this.isScheduling[donationId] = false;
    }
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }
}
