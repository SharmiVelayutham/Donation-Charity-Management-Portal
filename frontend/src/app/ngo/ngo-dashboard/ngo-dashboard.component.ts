import { Component, OnInit, OnDestroy, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService, ApiResponse } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
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
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { NotificationBellComponent } from '../../shared/notification-bell/notification-bell.component';

@Component({
  selector: 'app-ngo-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
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
    MatTooltipModule,
    MatSelectModule,
    MatMenuModule,
    NotificationBellComponent
  ],
  templateUrl: './ngo-dashboard.component.html',
  styleUrls: ['./ngo-dashboard.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class NgoDashboardComponent implements OnInit, OnDestroy {
  // Real-time dashboard statistics
  realTimeStats: any = {
    totalDonationRequests: 0,
    totalDonors: 0
  };
  
  stats: any = {
    totalDonations: 0,
    pendingDonations: 0,
    confirmedDonations: 0,
    completedDonations: 0
  };

  // Donation details and summary
  donationDetails: any[] = [];
  allDonationDetails: any[] = []; // Store all donations
  showAllContributions: boolean = false; // Toggle between recent and all
  donationSummary: any = {
    totalDonors: 0,
    totalDonations: 0,
    totalFundsCollected: 0,
    fundsReceived: 0,
    fundsPending: 0,
    breakdownByType: {}
  };
  isLoadingDonations: boolean = false;
  updatingStatus: { [key: number]: boolean } = {};
  // Status map for reliable dropdown updates
  donationStatusMap: { [key: number]: string } = {};
  
  // Status options for contributions (when NGO receives donation)
  statusOptions = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'ACCEPTED', label: 'Received' },
    { value: 'NOT_RECEIVED', label: 'Not Received' }
  ];
  
  /**
   * Get available status options for a donation
   * Once status is changed to ACCEPTED or NOT_RECEIVED, PENDING option is removed
   */
  getAvailableStatusOptions(donation: any): any[] {
    const currentStatus = donation.status || this.donationStatusMap[donation.contributionId] || 'PENDING';
    // If status is already ACCEPTED or NOT_RECEIVED, don't show PENDING option
    if (currentStatus === 'ACCEPTED' || currentStatus === 'NOT_RECEIVED') {
      return this.statusOptions.filter(opt => opt.value !== 'PENDING');
    }
    // If status is PENDING, show all options
    return this.statusOptions;
  }
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

  formatTime(time: any): string {
    if (!time) return '';
    const t = new Date(time);
    return t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

  getBreakdownItems(): any[] {
    if (!this.donationSummary.breakdownByType) return [];
    return Object.keys(this.donationSummary.breakdownByType)
      .filter(type => this.donationSummary.breakdownByType[type].count > 0)
      .map(type => ({
        type,
        count: this.donationSummary.breakdownByType[type].count,
        total: this.donationSummary.breakdownByType[type].total
      }))
      .sort((a, b) => b.count - a.count);
  }

  getDonationTypeIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'FOOD': 'restaurant',
      'CLOTHES': 'checkroom',
      'MONEY': 'attach_money',
      'FUNDS': 'account_balance_wallet',
      'MEDICINE': 'medication',
      'BOOKS': 'menu_book',
      'TOYS': 'toys',
      'OTHER': 'category'
    };
    return iconMap[type] || 'category';
  }

  // Chart data processing methods
  getDonationTypeChartData(): { labels: string[], data: number[], colors: string[] } {
    const items = this.getBreakdownItems();
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#FFC107', '#795548'];
    
    return {
      labels: items.map(item => item.type),
      data: items.map(item => item.count),
      colors: colors.slice(0, items.length)
    };
  }

  getDonationTypeChartPercentage(): { labels: string[], percentages: number[] } {
    const items = this.getBreakdownItems();
    const total = items.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) return { labels: [], percentages: [] };
    
    return {
      labels: items.map(item => item.type),
      percentages: items.map(item => Math.round((item.count / total) * 100))
    };
  }

  getFundsChartData(): { labels: string[], amounts: number[] } {
    const items = this.getBreakdownItems();
    return {
      labels: items.filter(item => item.type === 'MONEY' || item.type === 'FUNDS').map(item => item.type),
      amounts: items.filter(item => item.type === 'MONEY' || item.type === 'FUNDS').map(item => item.total)
    };
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  }

  // Generate monthly donation data for line chart (last 6 months)
  getMonthlyDonationData(): { labels: string[], data: number[] } {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    // This is placeholder - in real implementation, you'd group donations by month
    // For now, we'll use summary data to create a realistic distribution
    const total = this.donationSummary.totalDonations || 0;
    const data = months.map(() => Math.floor(total / 6 + (Math.random() * total / 12)));
    return { labels: months, data };
  }

  // Get top donors for table
  getTopDonors(): any[] {
    if (!this.donationDetails || this.donationDetails.length === 0) return [];
    
    const donorMap = new Map();
    this.donationDetails.forEach(donation => {
      const donorId = donation.donor?.id || 'unknown';
      if (!donorMap.has(donorId)) {
        donorMap.set(donorId, {
          name: donation.donor?.name || 'Anonymous',
          email: donation.donor?.email || '',
          contributions: 0,
          totalAmount: 0
        });
      }
      const donor = donorMap.get(donorId);
      donor.contributions += 1;
      if (donation.quantityOrAmount && (donation.donationType === 'MONEY' || donation.donationType === 'FUNDS')) {
        donor.totalAmount += parseFloat(donation.quantityOrAmount) || 0;
      }
    });
    
    return Array.from(donorMap.values())
      .sort((a, b) => b.contributions - a.contributions)
      .slice(0, 5);
  }

  // Chart helper methods
  getDonutOffset(index: number): number {
    const items = this.getBreakdownItems();
    if (items.length === 0) return 0;
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += (items[i].count / this.donationSummary.totalDonations) * 502.65;
    }
    return -offset;
  }

  getLineChartPoints(): string {
    const data = this.getMonthlyDonationData();
    if (data.data.length === 0) return '';
    const max = Math.max(...data.data, 1);
    const points = data.data.map((value, index) => {
      const x = 50 + (index * (500 / (data.data.length - 1 || 1)));
      const y = 250 - ((value / max) * 200);
      return `${x},${y}`;
    });
    return points.join(' ');
  }

  getLineChartAreaPoints(): string {
    const data = this.getMonthlyDonationData();
    if (data.data.length === 0) return '';
    const max = Math.max(...data.data, 1);
    const points = this.getLineChartPoints();
    return `50,250 ${points} 550,250`;
  }

  getLineChartDataPoints(): { x: number, y: number }[] {
    const data = this.getMonthlyDonationData();
    if (data.data.length === 0) return [];
    const max = Math.max(...data.data, 1);
    return data.data.map((value, index) => ({
      x: 50 + (index * (500 / (data.data.length - 1 || 1))),
      y: 250 - ((value / max) * 200)
    }));
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
    private socketService: SocketService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

  async ngOnInit() {
    await this.loadDashboard();
    await this.loadRealTimeStats();
    await this.loadDonationDetails();
    await this.loadDonationSummary();
    this.setupSocketConnection();
  }

  ngOnDestroy() {
    // Clean up socket connection
    this.socketService.offNgoStatsUpdate();
    this.socketService.offDonationCreated();
    this.socketService.disconnect();
  }

  /**
   * Load real-time dashboard statistics
   */
  async loadRealTimeStats() {
    try {
      const response = await lastValueFrom(this.apiService.getNgoDashboardStats());
      if (response?.success && response.data) {
        this.realTimeStats = {
          totalDonationRequests: response.data.totalDonationRequests || 0,
          totalDonors: response.data.totalDonors || 0,
        };
        console.log('[NGO Dashboard] Real-time stats loaded:', this.realTimeStats);
      }
    } catch (error: any) {
      console.error('[NGO Dashboard] Failed to load real-time stats:', error);
      // Set defaults on error
      this.realTimeStats = {
        totalDonationRequests: 0,
        totalDonors: 0,
      };
    }
  }

  /**
   * Setup Socket.IO connection for real-time updates
   */
  setupSocketConnection() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[NGO Dashboard] No token found, skipping socket connection');
      return;
    }

    // Connect to socket server
    this.socketService.connect(token);

    // Subscribe to real-time stats updates
    this.socketService.onNgoStatsUpdate((stats) => {
      console.log('[NGO Dashboard] Real-time stats update received:', stats);
      this.realTimeStats = {
        totalDonationRequests: stats.totalDonationRequests || 0,
        totalDonors: stats.totalDonors || 0,
      };
    });

    // Subscribe to donation created events
    this.socketService.onDonationCreated((donation) => {
      console.log('[NGO Dashboard] New donation received:', donation);
      // Reload donation details and summary
      this.loadDonationDetails();
      this.loadDonationSummary();
      // Show notification
      this.showToast(`New donation received from ${donation.donor?.name || 'Donor'}!`, false);
    });
  }

  /**
   * Load donation details (all contributions with donor info)
   */
  async loadDonationDetails() {
    this.isLoadingDonations = true;
    try {
      const response = await lastValueFrom(this.apiService.getNgoDonationDetails());
      if (response?.success && response.data) {
        // Ensure all donations have a status, default to PENDING if missing, and normalize to uppercase
        this.donationDetails = (response.data || []).map((d: any) => {
          // Get status from the response - check multiple possible field names
          let rawStatus = d.status || d.contribution_status || '';
          
          // Default to PENDING if status is missing, null, empty, or invalid
          let normalizedStatus = 'PENDING';
          
          if (rawStatus && typeof rawStatus === 'string' && rawStatus.trim() !== '') {
            normalizedStatus = rawStatus.toUpperCase().trim();
          }
          
          // Handle empty string, null, or undefined
          if (!normalizedStatus || normalizedStatus === '' || normalizedStatus === 'NULL' || normalizedStatus === 'UNDEFINED') {
            normalizedStatus = 'PENDING';
          }
          
          // Only allow PENDING, ACCEPTED, or NOT_RECEIVED
          if (normalizedStatus !== 'PENDING' && normalizedStatus !== 'ACCEPTED' && normalizedStatus !== 'NOT_RECEIVED') {
            normalizedStatus = 'PENDING';
          }
          
          console.log(`[NGO Dashboard] Loading contribution ${d.contributionId || d.id}: rawStatus="${rawStatus}" -> normalized="${normalizedStatus}"`);
          
          return {
            ...d,
            status: normalizedStatus
          };
        });
        // Store all donations
        this.allDonationDetails = this.donationDetails;
        // Initialize with recent donations (last 3 days) by default
        if (!this.showAllContributions) {
          this.donationDetails = this.getRecentDonationDetails();
        }
        console.log('[NGO Dashboard] ✅ Donation details loaded:', this.allDonationDetails.length, 'total contributions,', this.donationDetails.length, 'displayed contributions');
        // Force change detection to update the UI
        this.cdr.detectChanges();
      }
    } catch (error: any) {
      console.error('[NGO Dashboard] Failed to load donation details:', error);
      this.donationDetails = [];
    } finally {
      this.isLoadingDonations = false;
    }
  }

  /**
   * Load donation summary (aggregated stats)
   */
  async loadDonationSummary() {
    try {
      const response = await lastValueFrom(this.apiService.getNgoDonationSummary());
      if (response?.success && response.data) {
        this.donationSummary = response.data;
        console.log('[NGO Dashboard] Donation summary loaded:', this.donationSummary);
      }
    } catch (error: any) {
      console.error('[NGO Dashboard] Failed to load donation summary:', error);
    }
  }

  /**
   * Update contribution status - DIRECT BUTTON CLICK HANDLER
   */
  async updateContributionStatus(contributionId: number, newStatus: string) {
    // Don't update if already updating
    if (this.updatingStatus[contributionId]) {
      console.log(`[NGO Dashboard] Already updating contribution ${contributionId}`);
      return;
    }

    const normalizedStatus = newStatus.toUpperCase();
    const donationIndex = this.donationDetails.findIndex(d => d.contributionId === contributionId);
    if (donationIndex === -1) {
      console.error(`[NGO Dashboard] Donation not found for contribution ${contributionId}`);
      return;
    }

    const donation = this.donationDetails[donationIndex];
    const currentStatus = (donation?.status || 'PENDING').toUpperCase();
    
    // Don't update if status is already the same
    if (currentStatus === normalizedStatus) {
      console.log(`[NGO Dashboard] Status already ${normalizedStatus} for contribution ${contributionId}`);
      return;
    }
    
    console.log(`[NGO Dashboard] 🔄 Button clicked: Updating contribution ${contributionId} from ${currentStatus} to ${normalizedStatus}`);
    this.updatingStatus[contributionId] = true;
    
    // Update UI immediately - update both arrays
    const updatedDonation = {
      ...donation,
      status: normalizedStatus
    };
    this.donationDetails[donationIndex] = updatedDonation;
    
    // Also update in allDonationDetails
    const allDonationIndex = this.allDonationDetails.findIndex(d => d.contributionId === contributionId);
    if (allDonationIndex !== -1) {
      this.allDonationDetails[allDonationIndex] = updatedDonation;
    }
    
    this.cdr.detectChanges();
    
    try {
      const response = await lastValueFrom(
        this.apiService.updateContributionStatus(contributionId, normalizedStatus)
      );

      if (response?.success) {
        const statusLabel = this.getStatusLabel(normalizedStatus);
        this.showToast(`Status updated to ${statusLabel} successfully`, false);
        
        // Status already updated optimistically, no need to reload immediately
        // The status badge will show the updated status right away
        // Data will sync on next natural refresh or page reload
      } else {
        // Revert on error
        this.donationDetails[donationIndex] = {
          ...donation,
          status: currentStatus
        };
        this.cdr.detectChanges();
        this.showToast(response.message || 'Failed to update status', true);
      }
    } catch (error: any) {
      console.error('[NGO Dashboard] Failed to update contribution status:', error);
      // Revert on error
      this.donationDetails[donationIndex] = {
        ...donation,
        status: currentStatus
      };
      this.cdr.detectChanges();
      this.showToast(error.error?.message || 'Failed to update status', true);
    } finally {
      this.updatingStatus[contributionId] = false;
    }
  }

  /**
   * Get status badge class
   */
  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'PENDING': 'status-pending',
      'ACCEPTED': 'status-approved',  // Received - shows as approved/green
      'APPROVED': 'status-approved',  // Received - shows as approved/green
      'NOT_RECEIVED': 'status-rejected',
      'REJECTED': 'status-rejected',
      'COMPLETED': 'status-completed'
    };
    return statusMap[status] || 'status-default';
  }

  /**
   * Get status label for display
   */
  /**
   * Get recent donations (last 3 days)
   */
  getRecentDonationDetails(): any[] {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    return this.allDonationDetails.filter((donation: any) => {
      const donationDate = new Date(donation.donationDate);
      return donationDate >= threeDaysAgo;
    });
  }

  /**
   * Get label for quantity/amount field based on donation type
   */
  getQuantityOrAmountLabel(donationType: string): string {
    if (donationType === 'FUNDS' || donationType === 'MONEY') {
      return 'Amount';
    } else if (donationType === 'FOOD' || donationType === 'CLOTHES') {
      return 'Quantity';
    }
    return 'Quantity/Amount';
  }

  /**
   * Format quantity/amount based on donation type
   */
  getFormattedQuantityOrAmount(amount: number | string, donationType: string): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return 'N/A';

    if (donationType === 'FUNDS' || donationType === 'MONEY') {
      return `₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return Math.round(numAmount).toLocaleString('en-IN');
    }
  }

  getStatusLabel(status: string): string {
    const option = this.statusOptions.find(opt => opt.value === status);
    return option ? option.label : status;
  }

  /**
   * TrackBy function for donation details to help Angular track changes
   */
  trackByContributionId(index: number, donation: any): number {
    return donation.contributionId;
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
    this.showAllContributions = false;
    this.donationDetails = this.getRecentDonationDetails();
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

  /**
   * Toggle between showing recent and all contributions
   */
  toggleContributionsView() {
    this.showAllContributions = !this.showAllContributions;
    if (this.showAllContributions) {
      this.donationDetails = this.allDonationDetails;
    } else {
      this.donationDetails = this.getRecentDonationDetails();
    }
  }

  /**
   * Show all donor contributions
   */
  showAllContributionsView() {
    this.showAllContributions = true;
    this.currentView = 'dashboard';
    this.donationDetails = this.allDonationDetails;
    this.mobileMenuOpen = false;
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

