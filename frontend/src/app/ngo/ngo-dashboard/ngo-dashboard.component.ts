import { Component, OnInit, OnDestroy, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService, ApiResponse } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { Observable, lastValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
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
import { environment } from '../../../environments/environment';

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
  private debugLogging = !environment.production;
  private sanitize(value: any): any {
    if (!value || typeof value !== 'object') return value;
    try {
      const redactKeys = new Set([
        'email', 'phone', 'contact', 'contactInfo', 'address', 'token', 'authorization',
        'donor_email', 'donor_phone', 'donor_address'
      ]);
      const clone: any = Array.isArray(value) ? [] : {};
      Object.keys(value).forEach(k => {
        const v = (value as any)[k];
        if (redactKeys.has(k)) {
          clone[k] = '[redacted]';
        } else if (v && typeof v === 'object') {
          clone[k] = this.sanitize(v);
        } else {
          clone[k] = v;
        }
      });
      return clone;
    } catch {
      return value;
    }
  }
  private logDebug(message: string, ...data: any[]) {
    if (!this.debugLogging) return;
    const sanitized = data.map(d => this.sanitize(d));
    console.log('[NGO Dashboard]', message, ...sanitized);
  }
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
  donationStatusMap: { [key: number]: string } = {};
  statusOptions = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'ACCEPTED', label: 'Received' },
    { value: 'NOT_RECEIVED', label: 'Not Received' }
  ];
  getAvailableStatusOptions(donation: any): any[] {
    const currentStatus = donation.status || this.donationStatusMap[donation.contributionId] || 'PENDING';
    if (currentStatus === 'ACCEPTED' || currentStatus === 'NOT_RECEIVED') {
      return this.statusOptions.filter(opt => opt.value !== 'PENDING');
    }
    return this.statusOptions;
  }
  isLoading: boolean = false;
  dashboardData: any = {
    profile: null,
    statistics: null,
    recentDonations: [],
    upcomingPickups: []
  };
  currentView: 'dashboard' | 'profile' = 'dashboard';
  mobileMenuOpen: boolean = false;
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
  getMonthlyDonationData(): { labels: string[], data: number[] } {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const total = this.donationSummary.totalDonations || 0;
    const data = months.map(() => Math.floor(total / 6 + (Math.random() * total / 12)));
    return { labels: months, data };
  }
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
    this.socketService.offNgoStatsUpdate();
    this.socketService.offDonationCreated();
    this.socketService.disconnect();
  }
  async loadRealTimeStats() {
    try {
      const response = await lastValueFrom(this.apiService.getNgoDashboardStats());
      if (response?.success && response.data) {
        this.realTimeStats = {
          totalDonationRequests: response.data.totalDonationRequests || 0,
          totalDonors: response.data.totalDonors || 0,
        };
        this.logDebug('Real-time stats loaded', this.realTimeStats);
      }
    } catch (error: any) {
      console.error('[NGO Dashboard] Failed to load real-time stats:', error);
      this.realTimeStats = {
        totalDonationRequests: 0,
        totalDonors: 0,
      };
    }
  }
  setupSocketConnection() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[NGO Dashboard] No token found, skipping socket connection');
      return;
    }
    this.socketService.connect(token);
    this.socketService.onNgoStatsUpdate((stats) => {
      this.logDebug('Real-time stats update received', stats);
      this.realTimeStats = {
        totalDonationRequests: stats.totalDonationRequests || 0,
        totalDonors: stats.totalDonors || 0,
      };
    });
    this.socketService.onDonationCreated((donation) => {
      this.logDebug('New donation received', donation);
      this.loadDonationDetails();
      this.loadDonationSummary();
      this.showToast(`New donation received from ${donation.donor?.name || 'Donor'}!`, false);
    });
  }
  async loadDonationDetails() {
    this.isLoadingDonations = true;
    try {
      const response = await lastValueFrom(this.apiService.getNgoDonationDetails());
      if (response?.success && response.data) {
        this.donationDetails = (response.data || []).map((d: any) => {
          let rawStatus = d.status || d.contribution_status || '';
          let normalizedStatus = 'PENDING';
          
          if (rawStatus && typeof rawStatus === 'string' && rawStatus.trim() !== '') {
            normalizedStatus = rawStatus.toUpperCase().trim();
          }
          if (!normalizedStatus || normalizedStatus === '' || normalizedStatus === 'NULL' || normalizedStatus === 'UNDEFINED') {
            normalizedStatus = 'PENDING';
          }
          if (normalizedStatus !== 'PENDING' && normalizedStatus !== 'ACCEPTED' && normalizedStatus !== 'NOT_RECEIVED') {
            normalizedStatus = 'PENDING';
          }
          
          this.logDebug(`Loading contribution ${d.contributionId || d.id}: status normalized`, { rawStatus, normalizedStatus });
          
          return {
            ...d,
            status: normalizedStatus
          };
        });
        this.allDonationDetails = this.donationDetails;
        if (!this.showAllContributions) {
          this.donationDetails = this.getRecentDonationDetails();
        }
        this.logDebug('Donation details loaded', { total: this.allDonationDetails.length, displayed: this.donationDetails.length });
        this.cdr.detectChanges();
      }
    } catch (error: any) {
      console.error('[NGO Dashboard] Failed to load donation details:', error);
      this.donationDetails = [];
    } finally {
      this.isLoadingDonations = false;
    }
  }
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
  async updateContributionStatus(contributionId: number, newStatus: string) {
    if (this.updatingStatus[contributionId]) {
      this.logDebug(`Already updating contribution ${contributionId}`);
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
    if (currentStatus === normalizedStatus) {
      this.logDebug(`Status already ${normalizedStatus} for contribution ${contributionId}`);
      return;
    }
    
    this.logDebug(`🔄 Button clicked: Updating contribution ${contributionId}`, { from: currentStatus, to: normalizedStatus });
    this.updatingStatus[contributionId] = true;
    const updatedDonation = {
      ...donation,
      status: normalizedStatus
    };
    this.donationDetails[donationIndex] = updatedDonation;
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
      } else {
        this.donationDetails[donationIndex] = {
          ...donation,
          status: currentStatus
        };
        this.cdr.detectChanges();
        this.showToast(response.message || 'Failed to update status', true);
      }
    } catch (error: any) {
      console.error('[NGO Dashboard] Failed to update contribution status:', error);
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
  getRecentDonationDetails(): any[] {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0); // Set to start of day
    
    return this.allDonationDetails.filter((donation: any) => {
      const donationDateStr = donation.donationDate || donation.created_at || donation.createdAt || donation.date || donation.contributionDate;
      if (!donationDateStr) return false;
      
      const donationDate = new Date(donationDateStr);
      if (isNaN(donationDate.getTime())) return false; // Invalid date
      
      donationDate.setHours(0, 0, 0, 0); // Set to start of day
      return donationDate >= threeDaysAgo;
    });
  }
  getQuantityOrAmountLabel(donationType: string): string {
    if (donationType === 'FUNDS' || donationType === 'MONEY') {
      return 'Amount';
    } else if (donationType === 'FOOD' || donationType === 'CLOTHES') {
      return 'Quantity';
    }
    return 'Quantity/Amount';
  }
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
  trackByContributionId(index: number, donation: any): number {
    return donation.contributionId;
  }

  async loadDashboard() {
    this.isLoading = true;
    const token = localStorage.getItem('token');
    let tokenRole = '';
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        tokenRole = payload.role?.toUpperCase() || '';
        console.log('[NGO Dashboard] Token decoded - Role:', tokenRole);
        const storedRole = localStorage.getItem('userRole')?.toUpperCase();
        if (storedRole !== tokenRole) {
          console.warn(`[NGO Dashboard] Role mismatch - localStorage: "${storedRole}", Token: "${tokenRole}". Updating localStorage.`);
          localStorage.setItem('userRole', tokenRole);
        }
      } catch (e) {
        console.error('[NGO Dashboard] Failed to decode token:', e);
      }
    }
    const userRole = tokenRole || localStorage.getItem('userRole')?.toUpperCase() || '';
    if (userRole !== 'NGO') {
      console.error(`[NGO Dashboard] ❌ Access denied - User role is "${userRole}", not "NGO"`);
      this.showToast(`Access denied. This page is only for NGOs. Your current role is: ${userRole}. Please logout and login as NGO.`, true);
      this.isLoading = false;
      if (userRole === 'ADMIN') {
        this.router.navigate(['/admin/dashboard']);
      } else if (userRole === 'DONOR') {
        this.router.navigate(['/dashboard/donor']);
      } else {
        this.router.navigate(['/login']);
      }
      return;
    }
    this.logDebug('User is NGO, loading dashboard data...');
    
    try {
      const resp$: Observable<ApiResponse> = this.apiService.getNgoDashboard();
      const response = await lastValueFrom(resp$);
      
      this.logDebug('API Response received', {
        success: !!response?.success,
        hasData: !!response?.data,
        hasProfile: !!response?.data?.profile
      });
      if (response?.success && response.data) {
        const d = response.data;
        this.dashboardData = d;
        this.logDebug('Dashboard data loaded (profile present):', !!d?.profile);
        this.stats = {
          totalDonations: d.totalDonations || d.statistics?.donations?.total || 0,
          pendingDonations: d.pendingDonations || d.statistics?.donations?.pending || 0,
          confirmedDonations: d.confirmedDonations || d.statistics?.donations?.confirmed || 0,
          completedDonations: d.completedDonations || d.statistics?.donations?.completed || 0,
        };
        this.profileForm.name = d.profile?.name || '';
        this.profileForm.contactPersonName = d.profile?.contactPersonName || '';
        this.profileForm.phoneNumber = d.profile?.phoneNumber || d.profile?.contactInfo || '';
        this.profileForm.address = d.profile?.address || '';
        this.profileForm.city = d.profile?.city || '';
        this.profileForm.state = d.profile?.state || '';
        this.profileForm.pincode = d.profile?.pincode || '';
        this.profileForm.websiteUrl = d.profile?.websiteUrl || '';
        this.profileForm.aboutNgo = d.profile?.aboutNgo || d.profile?.description || '';
        this.hasPendingProfileUpdates = !!(d.profile?.pendingProfileUpdates && Object.keys(d.profile.pendingProfileUpdates).length > 0);
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
    this.currentView = 'profile';
    this.isEditingProfile = true;
  }

  goToRequests() {
    this.router.navigate(['/ngo/requests']);
  }

  goToCreateBlog() {
    this.router.navigate(['/ngo/create-blog']);
  }
  toggleContributionsView() {
    this.showAllContributions = !this.showAllContributions;
    if (this.showAllContributions) {
      this.donationDetails = this.allDonationDetails;
    } else {
      this.donationDetails = this.getRecentDonationDetails();
    }
  }
  showAllContributionsView() {
    this.showAllContributions = true;
    this.currentView = 'dashboard';
    this.donationDetails = this.allDonationDetails; // Show all donation history
    this.mobileMenuOpen = false;
    setTimeout(() => {
      const element = document.getElementById('all-donor-contributions') || document.querySelector('.donations-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
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
    this.profileForm.name = this.dashboardData.profile?.name || '';
    this.profileForm.contactInfo = this.dashboardData.profile?.contactInfo || '';
    this.profileForm.description = this.dashboardData.profile?.description || '';
    this.formError = '';
  }

  async saveProfile() {
    this.formError = '';
    this.successMessage = '';
    if (!this.profileForm.name || this.profileForm.name.trim().length === 0) {
      this.formError = 'NGO name is required';
      return;
    }
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
  showToast(message: string, isError = false) {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: isError ? ['error-snackbar'] : ['success-snackbar']
    });
  }
}

