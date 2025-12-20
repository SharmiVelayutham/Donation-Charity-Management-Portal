import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-donor-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './donor-dashboard.component.html',
  styleUrl: './donor-dashboard.component.css'
})
export class DonorDashboardComponent implements OnInit {
  dashboardData: any = {
    contributions: [],
    totalContributions: 0
  };
  isLoading: boolean = false;
  // Profile edit state
  isEditingProfile: boolean = false;
  profileForm: any = {
    name: '',
    contactInfo: '',
    phoneNumber: '',
    fullAddress: '',
    password: ''
  };
  shareLocationStatus: string = '';

  constructor(
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.loadDashboard();
  }

  async loadDashboard() {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.apiService.getDonorDashboard());
      console.log('Donor Dashboard Response:', response);

      if (response?.success && response.data) {
        // Map API response to component data
        const data = response.data;
        this.dashboardData = {
          profile: data.profile || data.profile || {},
          contributions: data.contributions || data.recentContributions || [],
          upcomingPickups: data.upcomingPickups || data.upcoming_pickups || [],
          totalContributions: data.totalContributions || data.statistics?.contributions?.total || 0,
        };
        // Prefill profile form
        this.profileForm.name = this.dashboardData.profile?.name || '';
        this.profileForm.contactInfo = this.dashboardData.profile?.contactInfo || '';
        this.profileForm.phoneNumber = this.dashboardData.profile?.phoneNumber || '';
        this.profileForm.fullAddress = this.dashboardData.profile?.fullAddress || '';
        console.log('Mapped dashboard data:', this.dashboardData);
      } else {
        console.warn('Dashboard response not successful:', response);
        this.dashboardData = {
          contributions: [],
          totalContributions: 0,
        };
      }
    } catch (error: any) {
      console.error('Failed to load dashboard', error);
      // Set default data on error
      this.dashboardData = {
        contributions: [],
        totalContributions: 0,
      };
    } finally {
      this.isLoading = false;
    }
  }

  editProfile() {
    this.isEditingProfile = true;
  }

  async saveProfile() {
    this.isLoading = true;
    this.shareLocationStatus = '';
    try {
      // send only fields that were set
      const payload: any = {
        name: this.profileForm.name,
        contactInfo: this.profileForm.contactInfo,
        phoneNumber: this.profileForm.phoneNumber,
        fullAddress: this.profileForm.fullAddress
      };
      if (this.profileForm.password) payload.password = this.profileForm.password;

      const response = await lastValueFrom(this.apiService.updateDonorProfile(payload));
      if (response?.success) {
        this.isEditingProfile = false;
        await this.loadDashboard();
        alert('Profile updated successfully');
      } else {
        alert(response?.message || 'Failed to update profile');
      }
    } catch (err: any) {
      console.error('Profile update error', err);
      alert(err?.message || 'Failed to update profile');
    } finally {
      this.isLoading = false;
    }
  }

  async shareMyLocation() {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    this.shareLocationStatus = 'Getting location...';
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const coords = `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
      this.profileForm.fullAddress = coords; // store as coords string
      try {
        const response = await lastValueFrom(this.apiService.updateDonorProfile({ fullAddress: coords }));
        if (response?.success) {
          this.shareLocationStatus = 'Location shared successfully';
          await this.loadDashboard();
        } else {
          this.shareLocationStatus = 'Failed to share location';
        }
      } catch (err) {
        console.error('Error sharing location', err);
        this.shareLocationStatus = 'Failed to share location';
      }
    }, (err) => {
      console.error('Geolocation error', err);
      this.shareLocationStatus = 'Permission denied or location unavailable';
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  async schedulePickupForDonation(item: any) {
    const donationId = item.donation_id || item.donationId || item.donation?.id || item.donation?._id;
    if (!donationId) {
      alert('Unable to determine donation id for scheduling');
      return;
    }

    const dt = prompt('Enter pickup date/time (YYYY-MM-DD HH:MM) in your local time');
    if (!dt) return;
    const iso = new Date(dt.replace(' ', 'T')).toISOString();
    try {
      const payload = {
        pickupScheduledDateTime: iso,
        donorAddress: this.profileForm.fullAddress || this.dashboardData.profile?.fullAddress || '',
        donorContactNumber: this.profileForm.phoneNumber || this.dashboardData.profile?.phoneNumber || ''
      };
      const response = await lastValueFrom(this.apiService.createContribution(donationId.toString(), payload as any));
      if (response?.success) {
        alert('Pickup scheduled successfully');
        await this.loadDashboard();
      } else {
        alert(response?.message || 'Failed to schedule pickup');
      }
    } catch (err: any) {
      console.error('Schedule pickup error', err);
      alert(err?.message || 'Failed to schedule pickup');
    }
  }

  viewDonations() {
    this.router.navigate(['/donations']);
  }

  logout() {
    this.authService.logout();
  }
}
