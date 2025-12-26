import { Component, OnInit, ViewEncapsulation } from '@angular/core';
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
  styleUrls: ['./ngo-dashboard.component.css'],
  encapsulation: ViewEncapsulation.None
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

  // View state - Dashboard or Profile
  currentView: 'dashboard' | 'profile' = 'dashboard';
  mobileMenuOpen: boolean = false;
  
  // Profile edit state
  isEditingProfile: boolean = false;
  isSavingProfile: boolean = false;
  hasPendingProfileUpdates: boolean = false;
  profileForm: any = { 
    name: '', 
    contactInfo: '', 
    description: '',
    contactPersonName: '',
    phoneNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    websiteUrl: '',
    aboutNgo: ''
  };
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
    // Check for both contactInfo and phoneNumber (phoneNumber is from registration)
    const hasContact = !!(profile.contactInfo || profile.phoneNumber);
    return !!(profile.name && profile.email && hasContact);
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
    
    // CRITICAL: Check token role, not just localStorage
    const token = localStorage.getItem('token');
    let tokenRole = '';
    
    if (token) {
      try {
        // Decode JWT token to get actual role
        const payload = JSON.parse(atob(token.split('.')[1]));
        tokenRole = payload.role?.toUpperCase() || '';
        console.log('[NGO Dashboard] Token decoded - Role:', tokenRole);
        
        // Update localStorage if it doesn't match token
        const storedRole = localStorage.getItem('userRole')?.toUpperCase();
        if (storedRole !== tokenRole) {
          console.warn(`[NGO Dashboard] Role mismatch - localStorage: "${storedRole}", Token: "${tokenRole}". Updating localStorage.`);
          localStorage.setItem('userRole', tokenRole);
        }
      } catch (e) {
        console.error('[NGO Dashboard] Failed to decode token:', e);
      }
    }
    
    // Check if user is actually an NGO (use token role, not localStorage)
    const userRole = tokenRole || localStorage.getItem('userRole')?.toUpperCase() || '';
    if (userRole !== 'NGO') {
      console.error(`[NGO Dashboard] ❌ Access denied - User role is "${userRole}", not "NGO"`);
      this.showToast(`Access denied. This page is only for NGOs. Your current role is: ${userRole}. Please logout and login as NGO.`, true);
      this.isLoading = false;
      // Redirect immediately to appropriate dashboard
      if (userRole === 'ADMIN') {
        this.router.navigate(['/admin/dashboard']);
      } else if (userRole === 'DONOR') {
        this.router.navigate(['/dashboard/donor']);
      } else {
        this.router.navigate(['/login']);
      }
      return;
    }
    
    // Only proceed if user is NGO
    console.log('[NGO Dashboard] ✅ User is NGO, loading dashboard data...');
    
    try {
      const resp$: Observable<ApiResponse> = this.apiService.getNgoDashboard();
      const response = await lastValueFrom(resp$);
      
      console.log('[NGO Dashboard] ✅ API Response received:', {
        success: response?.success,
        hasData: !!response?.data,
        hasProfile: !!response?.data?.profile
      });
      if (response?.success && response.data) {
        const d = response.data;
        this.dashboardData = d;
        
        console.log('[NGO Dashboard] Loaded dashboard data:', d);
        console.log('[NGO Dashboard] Profile data:', d.profile);
        console.log('[NGO Dashboard] Registration fields check:', {
          ngo_id: d.profile?.ngo_id,
          name: d.profile?.name,
          registrationNumber: d.profile?.registrationNumber,
          address: d.profile?.address,
          city: d.profile?.city,
          state: d.profile?.state,
          pincode: d.profile?.pincode,
          contactPersonName: d.profile?.contactPersonName,
          phoneNumber: d.profile?.phoneNumber,
          aboutNgo: d.profile?.aboutNgo,
          websiteUrl: d.profile?.websiteUrl,
          email: d.profile?.email
        });
        
        // Map statistics for backward compatibility
        this.stats = {
          totalDonations: d.totalDonations || d.statistics?.donations?.total || 0,
          pendingDonations: d.pendingDonations || d.statistics?.donations?.pending || 0,
          confirmedDonations: d.confirmedDonations || d.statistics?.donations?.confirmed || 0,
          completedDonations: d.completedDonations || d.statistics?.donations?.completed || 0,
        };

        // Setup profile form with all registration fields
        this.profileForm.name = d.profile?.name || '';
        this.profileForm.contactPersonName = d.profile?.contactPersonName || '';
        this.profileForm.phoneNumber = d.profile?.phoneNumber || d.profile?.contactInfo || '';
        this.profileForm.address = d.profile?.address || '';
        this.profileForm.city = d.profile?.city || '';
        this.profileForm.state = d.profile?.state || '';
        this.profileForm.pincode = d.profile?.pincode || '';
        this.profileForm.websiteUrl = d.profile?.websiteUrl || '';
        this.profileForm.aboutNgo = d.profile?.aboutNgo || d.profile?.description || '';
        
        // Check if there are pending profile updates
        this.hasPendingProfileUpdates = !!(d.profile?.pendingProfileUpdates && Object.keys(d.profile.pendingProfileUpdates).length > 0);

        // If backend exposes an 'addressEditable' flag on profile, use it
        this.addressEditable = !!d.profile?.addressEditable;
        
        console.log('[NGO Dashboard] Profile complete check:', {
          hasProfile: !!d.profile,
          hasName: !!d.profile?.name,
          hasEmail: !!d.profile?.email,
          hasContact: !!(d.profile?.contactInfo || d.profile?.phoneNumber),
          isComplete: this.isProfileComplete()
        });
      }
    } catch (err: any) {
      console.error('[NGO Dashboard] Failed to load dashboard', err);
    } finally {
      this.isLoading = false;
    }
  }

  // Navigation methods
  showDashboard() {
    this.currentView = 'dashboard';
    this.isEditingProfile = false;
    this.mobileMenuOpen = false;
  }

  showProfile() {
    this.currentView = 'profile';
    this.isEditingProfile = false;
    this.mobileMenuOpen = false;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  goToCreateRequest() {
    this.router.navigate(['/ngo/create-request']);
  }

  goToCompleteProfile() {
    // Show profile view and enable edit mode
    this.currentView = 'profile';
    this.isEditingProfile = true;
  }

  goToRequests() {
    this.router.navigate(['/ngo/requests']);
  }

  toggleProfileEdit() {
    this.isEditingProfile = !this.isEditingProfile;
    if (!this.isEditingProfile) {
      this.cancelProfileEdit();
    }
    this.formError = '';
    this.successMessage = '';
  }

  cancelProfileEdit() {
    this.isEditingProfile = false;
    // Restore original values from dashboard data
    if (this.dashboardData.profile) {
      this.profileForm.name = this.dashboardData.profile.name || '';
      this.profileForm.contactPersonName = this.dashboardData.profile.contactPersonName || '';
      this.profileForm.phoneNumber = this.dashboardData.profile.phoneNumber || this.dashboardData.profile.contactInfo || '';
      this.profileForm.address = this.dashboardData.profile.address || '';
      this.profileForm.city = this.dashboardData.profile.city || '';
      this.profileForm.state = this.dashboardData.profile.state || '';
      this.profileForm.pincode = this.dashboardData.profile.pincode || '';
      this.profileForm.websiteUrl = this.dashboardData.profile.websiteUrl || '';
      this.profileForm.aboutNgo = this.dashboardData.profile.aboutNgo || '';
    }
    this.formError = '';
  }

  async saveProfileUpdate() {
    this.formError = '';
    this.successMessage = '';
    this.isSavingProfile = true;
    
    // Validation
    if (!this.profileForm.name || this.profileForm.name.trim().length === 0) {
      this.formError = 'NGO name is required';
      this.isSavingProfile = false;
      this.showToast(this.formError, true);
      return;
    }
    
    try {
      const payload: any = {
        name: this.profileForm.name.trim(),
        contactPersonName: this.profileForm.contactPersonName?.trim() || null,
        phoneNumber: this.profileForm.phoneNumber?.trim() || null,
        address: this.profileForm.address?.trim() || null,
        city: this.profileForm.city?.trim() || null,
        state: this.profileForm.state?.trim() || null,
        pincode: this.profileForm.pincode?.trim() || null,
        websiteUrl: this.profileForm.websiteUrl?.trim() || null,
        aboutNgo: this.profileForm.aboutNgo?.trim() || null,
        saveAsPending: true // Flag to save as pending for admin approval
      };
      
      const resp$ = this.apiService.updateNgoProfile(payload);
      const response = await lastValueFrom(resp$);
      
      if (response?.success) {
        this.isEditingProfile = false;
        this.hasPendingProfileUpdates = true;
        this.showToast('Profile update submitted. Waiting for admin approval.', false);
        await this.loadDashboard(); // Refresh data
      } else {
        this.formError = response?.message || 'Failed to update profile';
        this.showToast(this.formError, true);
      }
    } catch (err: any) {
      this.formError = err?.message || 'Failed to update profile';
      this.showToast(this.formError, true);
    } finally {
      this.isSavingProfile = false;
    }
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

