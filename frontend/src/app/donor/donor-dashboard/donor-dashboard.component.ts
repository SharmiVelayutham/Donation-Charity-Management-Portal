import { Component, OnInit, OnDestroy, AfterViewInit, ViewEncapsulation } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { lastValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-donor-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, MatIconModule, MatSnackBarModule],
  templateUrl: './donor-dashboard.component.html',
  styleUrl: './donor-dashboard.component.css',
  encapsulation: ViewEncapsulation.None
})
export class DonorDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  dashboardData: any = {
    contributions: [],
    totalContributions: 0
  };
  allDonations: any[] = []; // All donations for history view
  recentDonations: any[] = []; // Last 3 days donations
  isLoadingContributions: boolean = false;
  activeView: 'dashboard' | 'history' = 'dashboard'; // Track current view
  stats: any = {
    numberOfDonations: 0,
    totalFunds: 0,
    donationTypes: [],
    lastDonated: 'Never',
    donorForMonths: 0
  };
  isLoading: boolean = false;
  isEditingProfile: boolean = false;
  profileForm: any = {
    name: '',
    email: '',
    contactInfo: '',
    phoneNumber: '',
    fullAddress: '',
    password: ''
  };
  shareLocationStatus: string = '';
  private routerSubscription: any;
  private refreshInterval: any;
  mobileMenuOpen: boolean = false;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService,
    private socketService: SocketService,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    await this.loadDashboard();
    await this.loadRealTimeStats();
    await this.loadDonationRequestContributions();
    this.setupSocketConnection();
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(async (event: any) => {
        if (event.url === '/dashboard/donor' || event.urlAfterRedirects === '/dashboard/donor') {
          console.log('[Donor Dashboard] Navigation detected, reloading stats...');
          await this.loadRealTimeStats();
          await this.loadDonationRequestContributions();
          await this.loadDashboard();
        }
      });
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  ngAfterViewInit() {
  }

  ngOnDestroy() {
    this.socketService.offDonorStatsUpdate();
    this.socketService.offContributionStatusUpdate();
    this.socketService.disconnect();
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
  async loadRealTimeStats() {
    try {
      const response = await lastValueFrom(this.apiService.getDonorDashboardStats());
      console.log('[Donor Dashboard] Stats API Response:', response);
      if (response?.success && response.data) {
        this.stats = {
          numberOfDonations: response.data.numberOfDonations || 0,
          totalFunds: parseFloat(response.data.totalFunds) || 0,
          donationTypes: response.data.donationTypes || [],
          lastDonated: response.data.lastDonated || 'Never',
          donorForMonths: response.data.donorForMonths || 0
        };
        console.log('[Donor Dashboard] Stats loaded:', this.stats);
        console.log('[Donor Dashboard] Total Funds value:', this.stats.totalFunds, typeof this.stats.totalFunds);
      }
    } catch (error: any) {
      console.error('[Donor Dashboard] Failed to load stats:', error);
      this.stats = {
        numberOfDonations: 0,
        totalFunds: 0,
        donationTypes: [],
        lastDonated: 'Never',
        donorForMonths: 0
      };
    }
  }
  setupSocketConnection() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[Donor Dashboard] No token found, skipping socket connection');
      return;
    }
    this.socketService.connect(token);
    this.socketService.onDonorStatsUpdate(async (stats) => {
      console.log('[Donor Dashboard] 🔵 Real-time stats update received via socket:', stats);
      await this.loadRealTimeStats();
      await this.loadDonationRequestContributions();
      console.log('[Donor Dashboard] ✅ Stats and contributions updated via socket');
    });
    this.socketService.onContributionStatusUpdate(async (data: any) => {
      console.log('[Donor Dashboard] 🔵 Contribution status update received via socket:', data);
      const status = (data?.status || '').toUpperCase();
      const message = status === 'ACCEPTED'
        ? 'Your contribution was received by the NGO. Thank you!'
        : status === 'NOT_RECEIVED'
          ? 'Pickup not successful. Please check your details or reschedule.'
          : `Contribution status updated: ${status}`;
      this.showToast(message, status === 'NOT_RECEIVED');
      await this.loadDonationRequestContributions();
      console.log('[Donor Dashboard] ✅ Donations refreshed after status update');
    });
    this.refreshInterval = setInterval(async () => {
      if (this.activeView === 'dashboard' || this.activeView === 'history') {
        console.log('[Donor Dashboard] Auto-refreshing donations...');
        await this.loadDonationRequestContributions();
      }
    }, 10000); // Refresh every 10 seconds for faster status sync
  }
  showToast(message: string, isError = false) {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: isError ? ['error-snackbar'] : ['success-snackbar']
    });
  }

  async loadDashboard() {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.apiService.getDonorDashboard());
      console.log('Donor Dashboard Response:', response);

      if (response?.success && response.data) {
        const data = response.data;
        this.dashboardData = {
          profile: data.profile || data.profile || {},
          contributions: data.contributions || data.recentContributions || [],
          upcomingPickups: data.upcomingPickups || data.upcoming_pickups || [],
          totalContributions: data.totalContributions || data.statistics?.contributions?.total || 0,
        };
        this.profileForm.name = this.dashboardData.profile?.name || '';
        this.profileForm.email = this.dashboardData.profile?.email || '';
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
  async loadDonationRequestContributions() {
    this.isLoadingContributions = true;
    try {
      const response = await lastValueFrom(this.apiService.getDonorDonationRequestContributions());
      if (response?.success && response.data) {
        this.allDonations = response.data || [];
        this.filterRecentDonations();
        console.log('[Donor Dashboard] All donations loaded:', this.allDonations.length);
        console.log('[Donor Dashboard] Recent donations (last 3 days):', this.recentDonations.length);
      }
    } catch (error: any) {
      console.error('[Donor Dashboard] Failed to load donation request contributions:', error);
      this.allDonations = [];
      this.recentDonations = [];
    } finally {
      this.isLoadingContributions = false;
    }
  }
  filterRecentDonations() {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);

    this.recentDonations = this.allDonations.filter((donation: any) => {
      if (!donation.contributionDate) return false;
      const donationDate = new Date(donation.contributionDate);
      return donationDate >= threeDaysAgo;
    });
  }
  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'PENDING': 'pending',
      'APPROVED': 'approved',  // Maps to 'received' styling
      'ACCEPTED': 'approved',  // Maps to 'received' styling (same as APPROVED)
      'NOT_RECEIVED': 'not_received',
      'REJECTED': 'rejected',
      'COMPLETED': 'completed'
    };
    return statusMap[status] || 'pending';
  }
  formatDate(date: any): string {
    if (!date) return 'Not available';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  formatTime(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  }
  formatCurrency(amount: number): string {
    if (!amount && amount !== 0) return '0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '0.00';
    return numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'PENDING': 'Pending',
      'APPROVED': 'Complete',
      'ACCEPTED': 'Complete',
      'COMPLETED': 'Complete',
      'NOT_RECEIVED': 'Not Received',
      'REJECTED': 'Rejected'
    };
    return statusMap[status] || status;
  }
  getDonationTypeLabel(type: string): string {
    const typeMap: { [key: string]: string } = {
      'FOOD': 'Food',
      'FUNDS': 'Funds',
      'MONEY': 'Funds',
      'CLOTHES': 'Clothes',
      'MEDICINE': 'Medicine',
      'BOOKS': 'Books',
      'TOYS': 'Toys',
      'OTHER': 'Other'
    };
    return typeMap[type] || type;
  }
  showDashboard() {
    this.activeView = 'dashboard';
    this.loadRealTimeStats();
    this.loadDonationRequestContributions();
  }

  showDonationHistory() {
    this.activeView = 'history';
    this.loadDonationRequestContributions();
  }

  async viewReceipt(donation: any) {
    try {
      const contributionId = donation.contributionId;
      if (!contributionId) {
        alert('Contribution ID not found');
        return;
      }
      const blob = await lastValueFrom(this.apiService.downloadReceipt(contributionId));
      const text = await blob.text();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(text);
        printWindow.document.close();
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      } else {
        const url = window.URL.createObjectURL(new Blob([text], { type: 'text/html' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `receipt-${contributionId}-${new Date().getTime()}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      console.error('Error downloading receipt:', error);
      alert(error?.error?.message || 'Failed to download receipt');
    }
  }

  logout() {
    this.authService.logout();
  }
}
