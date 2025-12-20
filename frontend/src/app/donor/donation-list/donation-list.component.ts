import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, lastValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { ApiService, ApiResponse } from '../../services/api.service';

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
    private apiService: ApiService
  ) {}

  async ngOnInit() {
    await this.loadDonations();
    await this.loadDonorProfile();
  }

  async loadDonations() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      const params: any = {};
      if (this.filterCategory) params.category = this.filterCategory;
      if (this.filterLocation) params.location = this.filterLocation;
      if (this.filterDate) params.date = this.filterDate;

      const resp$: Observable<ApiResponse> = this.apiService.getDonations(Object.keys(params).length ? params : undefined);
      const response = await lastValueFrom(resp$);
      if (response?.success && response.data) {
        this.donations = Array.isArray(response.data) ? response.data : [];
      }
    } catch (error: any) {
      this.errorMessage = error?.message || 'Failed to load donations';
      this.donations = [];
    } finally {
      this.isLoading = false;
    }
  }

  contribute(id: string | number) {
    this.router.navigate(['/donations', id, 'contribute']);
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
