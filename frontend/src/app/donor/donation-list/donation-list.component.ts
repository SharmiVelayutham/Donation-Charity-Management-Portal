import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, lastValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { ApiService, ApiResponse } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { HeaderComponent } from '../../shared/header/header.component';

@Component({
  selector: 'app-donation-list',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './donation-list.component.html',
  styleUrls: ['./donation-list.component.css']
})
export class DonationListComponent implements OnInit {
  donations: any[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  filterCategory: string = '';
  filterLocation: string = '';
  filterDate: string = '';
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
    if (this.authService.isAuthenticated()) {
      await this.loadDonorProfile();
    }
  }

  async loadDonations() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      const donationType = this.filterCategory || undefined;
      const resp$: Observable<ApiResponse> = this.apiService.getActiveDonationRequests(donationType);
      const response = await lastValueFrom(resp$);
      if (response?.success && response.data) {
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
    if (!this.authService.isAuthenticated()) {
      alert('Please register/login to donate');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: `/donation-requests/${id}/contribute` }
      });
      return;
    }
    const userRole = this.authService.getCurrentRole();
    if (userRole !== 'DONOR') {
      alert('Only registered donors can contribute. Please login as a donor.');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: `/donation-requests/${id}/contribute` }
      });
      return;
    }
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
    if (!this.authService.isAuthenticated()) {
      return;
    }
    
    try {
      const resp$: Observable<ApiResponse> = this.apiService.getDonorProfile();
      const response = await lastValueFrom(resp$);
      if (response?.success && response.data) {
        const profile = response.data;
        this.donorAddress = profile.fullAddress || profile.address || '';
        this.donorContactNumber = profile.phoneNumber || profile.contactInfo || '';
      }
    } catch {
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
  getQuantityOrAmountLabel(donationType: string): string {
    if (donationType === 'FUNDS') {
      return 'Required Amount';
    } else if (donationType === 'FOOD' || donationType === 'CLOTHES') {
      return 'Required Quantity';
    }
    return 'Required Quantity/Amount';
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
}
