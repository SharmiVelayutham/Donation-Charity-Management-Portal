import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  ngos: any[] = [];
  donors: any[] = [];
  activeTab: 'ngos' | 'donors' = 'ngos';
  isLoading: boolean = false;
  errorMessage: string = '';
  searchTerm: string = '';
  filterBlocked: string = '';

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    if (!this.authService.hasRole('ADMIN')) {
      // Redirect if not admin
      return;
    }
    await this.loadNgos();
  }

  async loadNgos() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      const params: any = {};
      if (this.filterBlocked) params.isBlocked = this.filterBlocked;
      if (this.searchTerm) params.search = this.searchTerm;
      
      console.log('[Admin Dashboard] Loading NGOs...');
      const token = localStorage.getItem('token');
      console.log('[Admin Dashboard] Token exists:', !!token);
      
      const response = await lastValueFrom(this.apiService.getAllNgos(params));
      console.log('[Admin Dashboard] NGO Response:', response);
      
      if (response?.success && response.data) {
        this.ngos = response.data.ngos || response.data || [];
        console.log('[Admin Dashboard] NGOs loaded:', this.ngos.length);
      } else {
        console.error('[Admin Dashboard] Invalid response format:', response);
        this.errorMessage = 'Invalid response from server';
      }
    } catch (error: any) {
      console.error('[Admin Dashboard] Error loading NGOs:', error);
      this.errorMessage = error?.error?.message || error?.message || 'Failed to load NGOs';
      
      // Check if it's a 403 error
      if (error?.status === 403) {
        console.error('[Admin Dashboard] 403 Forbidden - Check authentication');
        this.errorMessage = 'Access denied. Please check your admin permissions.';
      }
    } finally {
      this.isLoading = false;
    }
  }

  async loadDonors() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      const params: any = {};
      if (this.filterBlocked) params.isBlocked = this.filterBlocked;
      if (this.searchTerm) params.search = this.searchTerm;
      
      console.log('[Admin Dashboard] Loading Donors...');
      const response = await lastValueFrom(this.apiService.getAllDonors(params));
      console.log('[Admin Dashboard] Donor Response:', response);
      
      if (response?.success && response.data) {
        this.donors = response.data.donors || response.data || [];
        console.log('[Admin Dashboard] Donors loaded:', this.donors.length);
      } else {
        console.error('[Admin Dashboard] Invalid response format:', response);
        this.errorMessage = 'Invalid response from server';
      }
    } catch (error: any) {
      console.error('[Admin Dashboard] Error loading Donors:', error);
      this.errorMessage = error?.error?.message || error?.message || 'Failed to load Donors';
      
      // Check if it's a 403 error
      if (error?.status === 403) {
        console.error('[Admin Dashboard] 403 Forbidden - Check authentication');
        this.errorMessage = 'Access denied. Please check your admin permissions.';
      }
    } finally {
      this.isLoading = false;
    }
  }

  switchTab(tab: 'ngos' | 'donors') {
    this.activeTab = tab;
    this.searchTerm = '';
    this.filterBlocked = '';
    if (tab === 'ngos') {
      this.loadNgos();
    } else {
      this.loadDonors();
    }
  }

  async toggleBlockNgo(ngo: any) {
    try {
      if (ngo.isBlocked) {
        await lastValueFrom(this.apiService.unblockNgo(ngo.id.toString()));
      } else {
        await lastValueFrom(this.apiService.blockNgo(ngo.id.toString()));
      }
      await this.loadNgos();
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'Failed to update NGO status';
    }
  }

  async approveNgo(ngo: any) {
    if (!confirm(`Are you sure you want to approve ${ngo.name}? An approval email will be sent to ${ngo.email}.`)) {
      return;
    }

    try {
      await lastValueFrom(this.apiService.approveNgo(ngo.id.toString()));
      await this.loadNgos();
      alert('NGO approved successfully! Verification email sent.');
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'Failed to approve NGO';
    }
  }

  async rejectNgo(ngo: any) {
    const rejectionReason = prompt(`Enter rejection reason for ${ngo.name}:`);
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      alert('Rejection reason is required');
      return;
    }

    if (!confirm(`Are you sure you want to reject ${ngo.name}? A rejection email will be sent to ${ngo.email}.`)) {
      return;
    }

    try {
      await lastValueFrom(this.apiService.rejectNgo(ngo.id.toString(), rejectionReason.trim()));
      await this.loadNgos();
      alert('NGO rejected. Rejection email sent.');
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'Failed to reject NGO';
    }
  }

  getVerificationStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'VERIFIED':
        return 'status-verified';
      case 'PENDING':
        return 'status-pending';
      case 'REJECTED':
        return 'status-rejected';
      default:
        return 'status-pending';
    }
  }

  getVerificationStatusText(status: string): string {
    switch (status?.toUpperCase()) {
      case 'VERIFIED':
        return 'Verified';
      case 'PENDING':
        return 'Pending Verification';
      case 'REJECTED':
        return 'Rejected';
      default:
        return 'Pending Verification';
    }
  }

  async toggleBlockDonor(donor: any) {
    try {
      if (donor.isBlocked) {
        await lastValueFrom(this.apiService.unblockDonor(donor.id.toString()));
      } else {
        await lastValueFrom(this.apiService.blockDonor(donor.id.toString()));
      }
      await this.loadDonors();
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'Failed to update Donor status';
    }
  }

  onSearch() {
    if (this.activeTab === 'ngos') {
      this.loadNgos();
    } else {
      this.loadDonors();
    }
  }

  logout() {
    this.authService.logout();
  }
}

