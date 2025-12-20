import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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
      
      const response = await lastValueFrom(this.apiService.getAllNgos(params));
      if (response?.success && response.data) {
        this.ngos = response.data.ngos || [];
      }
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'Failed to load NGOs';
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
      
      const response = await lastValueFrom(this.apiService.getAllDonors(params));
      if (response?.success && response.data) {
        this.donors = response.data.donors || [];
      }
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'Failed to load Donors';
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

