import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, ApiResponse } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Observable, lastValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-ngo-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './ngo-dashboard.component.html',
  styleUrls: ['./ngo-dashboard.component.css']
})
export class NgoDashboardComponent implements OnInit {
  stats: any = {
    totalDonations: 0,
    pendingDonations: 0,
    confirmedDonations: 0,
    completedDonations: 0
  };
  isLoading: boolean = false;
  // Dashboard full payload
  dashboardData: any = {
    profile: null,
    statistics: null,
    recentDonations: [],
    upcomingPickups: []
  };

  // Profile edit state
  isEditingProfile: boolean = false;
  profileForm: any = { name: '', contactInfo: '', description: '' };
  addressEditable: boolean = false; // controlled by backend when available
  changePasswordOpen: boolean = false;
  pwOld: string = '';
  pwNew: string = '';
  pwConfirm: string = '';
  formError: string = '';
  successMessage: string = '';

  // Helper methods
  getStatusBadgeClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'PENDING': 'status-pending',
      'CONFIRMED': 'status-confirmed',
      'COMPLETED': 'status-completed',
      'CANCELLED': 'status-cancelled'
    };
    return statusMap[status] || 'status-default';
  }

  formatDate(date: any): string {
    if (!date) return 'Not available';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatDateTime(dateTime: any): string {
    if (!dateTime) return 'Not scheduled';
    const d = new Date(dateTime);
    return d.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isProfileComplete(): boolean {
    if (!this.dashboardData.profile) return false;
    const profile = this.dashboardData.profile;
    // Check if essential fields are present
    return !!(profile.name && profile.email && profile.contactInfo);
  }

  logout() {
    this.authService.logout();
  }

  constructor(
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  async ngOnInit() {
    await this.loadDashboard();
  }

  async loadDashboard() {
    this.isLoading = true;
    try {
      const resp$: Observable<ApiResponse> = this.apiService.getNgoDashboard();
      const response = await lastValueFrom(resp$);
      if (response?.success && response.data) {
        const d = response.data;
        this.dashboardData = d;
        // Map statistics for backward compatibility
        this.stats = {
          totalDonations: d.totalDonations || d.statistics?.donations?.total || 0,
          pendingDonations: d.pendingDonations || d.statistics?.donations?.pending || 0,
          confirmedDonations: d.confirmedDonations || d.statistics?.donations?.confirmed || 0,
          completedDonations: d.completedDonations || d.statistics?.donations?.completed || 0,
        };

        // Setup profile form
        this.profileForm.name = d.profile?.name || '';
        this.profileForm.contactInfo = d.profile?.contactInfo || '';
        this.profileForm.description = d.profile?.description || '';

        // If backend exposes an 'addressEditable' flag on profile, use it
        this.addressEditable = !!d.profile?.addressEditable;
      }
    } catch (err: any) {
      console.error('Failed to load dashboard', err);
    } finally {
      this.isLoading = false;
    }
  }

  goToCreateRequest() {
    this.router.navigate(['/ngo/create-request']);
  }

  goToCompleteProfile() {
    this.router.navigate(['/ngo/complete-profile']);
  }

  goToRequests() {
    this.router.navigate(['/ngo/requests']);
  }

  startEditProfile() {
    this.isEditingProfile = true;
    this.formError = '';
    this.successMessage = '';
  }

  cancelEditProfile() {
    this.isEditingProfile = false;
    // restore
    this.profileForm.name = this.dashboardData.profile?.name || '';
    this.profileForm.contactInfo = this.dashboardData.profile?.contactInfo || '';
    this.profileForm.description = this.dashboardData.profile?.description || '';
    this.formError = '';
  }

  async saveProfile() {
    this.formError = '';
    this.successMessage = '';
    
    // Validation
    if (!this.profileForm.name || this.profileForm.name.trim().length === 0) {
      this.formError = 'NGO name is required';
      return;
    }
    
    // Only allow updating name/contactInfo via API (description not supported yet)
    try {
      const payload: any = {
        name: this.profileForm.name.trim(),
        contactInfo: this.profileForm.contactInfo?.trim() || ''
      };
      const resp$ = this.apiService.updateNgoProfile(payload);
      const response = await lastValueFrom(resp$);
      if (response?.success && response.data) {
        this.isEditingProfile = false;
        this.showToast('Profile updated successfully');
        await this.loadDashboard(); // Refresh data
      } else {
        this.formError = response?.message || 'Failed to update profile';
        this.showToast(this.formError, true);
      }
    } catch (err: any) {
      this.formError = err?.message || 'Failed to update profile';
      this.showToast(this.formError, true);
    }
  }

  openChangePassword() {
    this.changePasswordOpen = true;
    this.pwOld = '';
    this.pwNew = '';
    this.pwConfirm = '';
    this.formError = '';
  }

  closeChangePassword() {
    this.changePasswordOpen = false;
    this.pwOld = '';
    this.pwNew = '';
    this.pwConfirm = '';
    this.formError = '';
  }

  async submitChangePassword() {
    this.formError = '';
    if (!this.pwNew || this.pwNew.length < 6) {
      this.formError = 'New password must be at least 6 characters';
      return;
    }
    if (this.pwNew !== this.pwConfirm) {
      this.formError = 'Passwords do not match';
      return;
    }

    try {
      // Backend updateNgoProfile only accepts password; old password validation should be done server-side.
      const resp$ = this.apiService.updateNgoProfile({ password: this.pwNew });
      const response = await lastValueFrom(resp$);
      if (response?.success) {
        this.successMessage = 'Password changed successfully';
        this.closeChangePassword();
        this.showToast(this.successMessage);
      } else {
        this.formError = response?.message || 'Failed to change password';
        this.showToast(this.formError, true);
      }
    } catch (err: any) {
      this.formError = err?.message || 'Failed to change password';
      this.showToast(this.formError, true);
    }
  }

  // Show snackbar notification
  showToast(message: string, isError = false) {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: isError ? ['error-snackbar'] : ['success-snackbar']
    });
  }
}

