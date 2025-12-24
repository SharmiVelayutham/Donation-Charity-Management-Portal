import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { lastValueFrom } from 'rxjs';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UnblockNgoDialogComponent } from './unblock-ngo-dialog.component';
import { BlockNgoDialogComponent } from './block-ngo-dialog.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class AdminDashboardComponent implements OnInit {
  ngos: any[] = [];
  donors: any[] = [];
  contributions: any[] = [];
  allNgos: any[] = []; // For filter dropdown
  
  activeTab: 'dashboard' | 'ngos' | 'contributions' | 'email-templates' = 'dashboard';
  currentView: 'dashboard' | 'contributions' | 'ngos' | 'email-templates' = 'dashboard';
  mobileMenuOpen: boolean = false;
  
  isLoading: boolean = false;
  isLoadingContributions: boolean = false;
  isLoadingAnalytics: boolean = false;
  errorMessage: string = '';
  searchTerm: string = '';
  filterBlocked: string = '';
  
  // Email template data
  emailTemplate: any = {
    templateType: 'NGO_UNBLOCK',
    subject: '',
    bodyHtml: '',
    isDefault: false,
  };
  isEditingTemplate: boolean = false;
  isLoadingTemplate: boolean = false;
  placeholderHint: string = 'Available placeholders: {{NGO_NAME}}, {{UNBLOCK_DATE}}, {{SUPPORT_EMAIL}}, {{UNBLOCK_REASON}}';

  // Analytics data
  analytics: any = {
    donations: {
      breakdown: [],
      totalContributions: 0,
      totalFunds: 0,
      monthlyTrends: [],
    },
    ngos: {
      total: 0,
      verified: 0,
      pending: 0,
      rejected: 0,
      blocked: 0,
      active: 0,
      topNgos: [],
    },
    donors: {
      total: 0,
      active: 0,
      blocked: 0,
      withContributions: 0,
      topDonors: [],
    },
  };
  
  // Filters for contributions
  filterDonorId: string = '';
  filterNgoId: string = '';
  filterDonationType: string = '';
  filterFromDate: string = '';
  filterToDate: string = '';
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 50;
  totalContributions: number = 0;
  
  // Math reference for template
  Math = Math;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  async ngOnInit() {
    if (!this.authService.hasRole('ADMIN')) {
      // Redirect if not admin
      return;
    }
    await Promise.all([
      this.loadAnalytics(),
      this.loadContributions(),
      this.loadDonors(),
      this.loadNgos()
    ]);
    // Populate allNgos for filter dropdown
    this.allNgos = this.ngos;
  }
  
  async loadAnalytics() {
    this.isLoadingAnalytics = true;
    try {
      const response = await lastValueFrom(this.apiService.getAdminAnalytics());
      if (response?.success && response.data) {
        this.analytics = response.data;
      }
    } catch (error: any) {
      console.error('[Admin Dashboard] Error loading analytics:', error);
      this.snackBar.open('Failed to load analytics data', 'Close', {
        duration: 3000
      });
    } finally {
      this.isLoadingAnalytics = false;
    }
  }
  
  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }
  
  showDashboard() {
    this.currentView = 'dashboard';
    this.activeTab = 'dashboard';
    if (!this.analytics?.donations?.breakdown?.length) {
      this.loadAnalytics();
    }
  }
  
  showContributions() {
    this.currentView = 'contributions';
    this.activeTab = 'contributions';
  }
  
  showNgos() {
    this.currentView = 'ngos';
    this.activeTab = 'ngos';
  }
  
  showEmailTemplates() {
    this.currentView = 'email-templates';
    this.activeTab = 'email-templates';
    if (!this.emailTemplate.subject) {
      this.loadEmailTemplate();
    }
  }
  
  async loadEmailTemplate() {
    this.isLoadingTemplate = true;
    try {
      const response = await lastValueFrom(this.apiService.getEmailTemplate('NGO_UNBLOCK'));
      if (response?.success && response.data) {
        this.emailTemplate = {
          templateType: 'NGO_UNBLOCK',
          subject: response.data.subject || '',
          bodyHtml: response.data.bodyHtml || '',
          isDefault: response.data.isDefault || false,
        };
      }
    } catch (error: any) {
      console.error('[Admin Dashboard] Error loading email template:', error);
      this.snackBar.open('Failed to load email template', 'Close', { duration: 3000 });
    } finally {
      this.isLoadingTemplate = false;
    }
  }
  
  startEditingTemplate() {
    this.isEditingTemplate = true;
  }
  
  cancelEditTemplate() {
    this.isEditingTemplate = false;
    this.loadEmailTemplate();
  }
  
  async saveEmailTemplate() {
    if (!this.emailTemplate.subject || !this.emailTemplate.bodyHtml) {
      this.snackBar.open('Subject and body are required', 'Close', { duration: 3000 });
      return;
    }
    
    try {
      const response = await lastValueFrom(
        this.apiService.updateEmailTemplate(
          this.emailTemplate.templateType,
          this.emailTemplate.subject,
          this.emailTemplate.bodyHtml
        )
      );
      if (response?.success) {
        this.isEditingTemplate = false;
        this.snackBar.open('Email template updated successfully', 'Close', { duration: 3000 });
        await this.loadEmailTemplate();
      }
    } catch (error: any) {
      console.error('[Admin Dashboard] Error saving email template:', error);
      this.snackBar.open(error?.error?.message || 'Failed to save email template', 'Close', { duration: 3000 });
    }
  }
  
  async restoreDefaultTemplate() {
    if (!confirm('Are you sure you want to restore the default email template? This will overwrite your current template.')) {
      return;
    }
    
    try {
      const response = await lastValueFrom(
        this.apiService.restoreDefaultEmailTemplate(this.emailTemplate.templateType)
      );
      if (response?.success) {
        this.snackBar.open('Default template restored successfully', 'Close', { duration: 3000 });
        await this.loadEmailTemplate();
      }
    } catch (error: any) {
      console.error('[Admin Dashboard] Error restoring default template:', error);
      this.snackBar.open(error?.error?.message || 'Failed to restore default template', 'Close', { duration: 3000 });
    }
  }
  
  // Chart helper methods
  getDonationBreakdownItems(): any[] {
    if (!this.analytics?.donations?.breakdown) return [];
    return this.analytics.donations.breakdown.filter((item: any) => item.count > 0);
  }
  
  getTotalDonations(): number {
    return this.analytics?.donations?.totalContributions || 0;
  }
  
  getDonutOffset(index: number): number {
    const items = this.getDonationBreakdownItems();
    if (items.length === 0) return 0;
    let offset = 0;
    const total = this.getTotalDonations();
    for (let i = 0; i < index; i++) {
      offset += (items[i].count / total) * 502.65;
    }
    return -offset;
  }
  
  getMonthlyTrendData(): { labels: string[], counts: number[], amounts: number[] } {
    if (!this.analytics?.donations?.monthlyTrends) {
      return { labels: [], counts: [], amounts: [] };
    }
    const trends = this.analytics.donations.monthlyTrends;
    return {
      labels: trends.map((t: any) => {
        const date = new Date(t.month + '-01');
        return date.toLocaleDateString('en-US', { month: 'short' });
      }),
      counts: trends.map((t: any) => t.count || 0),
      amounts: trends.map((t: any) => t.amount || 0),
    };
  }
  
  getLineChartPoints(): string {
    const data = this.getMonthlyTrendData();
    if (data.counts.length === 0) return '';
    const max = Math.max(...data.counts, 1);
    const points = data.counts.map((value, index) => {
      const x = 50 + (index * (500 / (data.counts.length - 1 || 1)));
      const y = 250 - ((value / max) * 200);
      return `${x},${y}`;
    });
    return points.join(' ');
  }
  
  getLineChartAreaPoints(): string {
    const data = this.getMonthlyTrendData();
    if (data.counts.length === 0) return '';
    const points = this.getLineChartPoints();
    return `50,250 ${points} 550,250`;
  }
  
  getLineChartDataPoints(): { x: number, y: number }[] {
    const data = this.getMonthlyTrendData();
    if (data.counts.length === 0) return [];
    const max = Math.max(...data.counts, 1);
    return data.counts.map((value, index) => ({
      x: 50 + (index * (500 / (data.counts.length - 1 || 1))),
      y: 250 - ((value / max) * 200)
    }));
  }
  
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  }
  
  async loadContributions() {
    this.isLoadingContributions = true;
    this.errorMessage = '';
    try {
      const params: any = {
        page: this.currentPage,
        limit: this.pageSize
      };
      
      if (this.filterDonorId) params.donorId = this.filterDonorId;
      if (this.filterNgoId) params.ngoId = this.filterNgoId;
      if (this.filterDonationType) params.donationType = this.filterDonationType;
      if (this.filterFromDate) params.fromDate = this.filterFromDate;
      if (this.filterToDate) params.toDate = this.filterToDate;
      
      const response = await lastValueFrom(this.apiService.getAdminContributions(params));
      
      if (response?.success && response.data) {
        this.contributions = response.data.contributions || [];
        this.totalContributions = response.data.pagination?.total || 0;
      } else {
        this.errorMessage = 'Invalid response from server';
      }
    } catch (error: any) {
      console.error('[Admin Dashboard] Error loading contributions:', error);
      this.errorMessage = error?.error?.message || error?.message || 'Failed to load contributions';
      if (error?.status === 403) {
        this.errorMessage = 'Access denied. Please check your admin permissions.';
      }
    } finally {
      this.isLoadingContributions = false;
    }
  }
  
  applyFilters() {
    this.currentPage = 1;
    this.loadContributions();
  }
  
  clearFilters() {
    this.filterDonorId = '';
    this.filterNgoId = '';
    this.filterDonationType = '';
    this.filterFromDate = '';
    this.filterToDate = '';
    this.currentPage = 1;
    this.loadContributions();
  }
  
  // Report Download Functions
  async downloadReport(format: 'csv' | 'excel' | 'pdf') {
    try {
      // Fetch all data (without pagination) for the report
      const params: any = { limit: 10000 }; // Large limit to get all records
      
      if (this.filterDonorId) params.donorId = this.filterDonorId;
      if (this.filterNgoId) params.ngoId = this.filterNgoId;
      if (this.filterDonationType) params.donationType = this.filterDonationType;
      if (this.filterFromDate) params.fromDate = this.filterFromDate;
      if (this.filterToDate) params.toDate = this.filterToDate;
      
      const response = await lastValueFrom(this.apiService.getAdminContributions(params));
      const contributions = response?.data?.contributions || [];
      
      if (format === 'csv') {
        this.downloadCSV(contributions);
      } else if (format === 'excel') {
        this.downloadExcel(contributions);
      } else if (format === 'pdf') {
        this.downloadPDF(contributions);
      }
      
      this.snackBar.open(`Report downloaded successfully as ${format.toUpperCase()}`, 'Close', {
        duration: 3000
      });
    } catch (error: any) {
      console.error('Error generating report:', error);
      this.snackBar.open('Failed to generate report', 'Close', {
        duration: 3000
      });
    }
  }
  
  downloadCSV(data: any[]) {
    const headers = ['Donor Name', 'Donor Email', 'NGO Name', 'Donation Type', 'Quantity/Amount', 'Contribution Date', 'Status'];
    const rows = data.map(c => [
      c.donorName || '',
      c.donorEmail || '',
      c.ngoName || '',
      c.donationType || '',
      c.quantityOrAmount || 0,
      new Date(c.contributedDate).toLocaleDateString(),
      c.contributionStatus || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `contributions_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  downloadExcel(data: any[]) {
    // For Excel, we'll generate CSV with .xlsx extension (requires a library like xlsx for proper Excel)
    // For now, using CSV format
    this.downloadCSV(data);
  }
  
  downloadPDF(data: any[]) {
    // Simple PDF generation using window.print or a library
    // For now, we'll create a simple HTML table and print it
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const htmlContent = `
      <html>
        <head>
          <title>Contributions Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Contributions Report</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Donor Name</th>
                <th>Donor Email</th>
                <th>NGO Name</th>
                <th>Donation Type</th>
                <th>Quantity/Amount</th>
                <th>Contribution Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(c => `
                <tr>
                  <td>${c.donorName || ''}</td>
                  <td>${c.donorEmail || ''}</td>
                  <td>${c.ngoName || ''}</td>
                  <td>${c.donationType || ''}</td>
                  <td>${c.quantityOrAmount || 0}</td>
                  <td>${new Date(c.contributedDate).toLocaleDateString()}</td>
                  <td>${c.contributionStatus || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  }
  
  formatDate(date: any): string {
    if (!date) return 'Not available';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  
  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'PENDING': 'status-pending',
      'APPROVED': 'status-approved',
      'COMPLETED': 'status-completed',
      'REJECTED': 'status-rejected',
      'ACCEPTED': 'status-accepted',
      'NOT_RECEIVED': 'status-not-received'
    };
    return statusMap[status?.toUpperCase()] || 'status-default';
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

  switchTab(tab: 'ngos' | 'contributions') {
    this.activeTab = tab;
    this.currentView = tab;
    this.searchTerm = '';
    this.filterBlocked = '';
    if (tab === 'ngos') {
      this.loadNgos();
    } else {
      this.loadContributions();
    }
  }

  async toggleBlockNgo(ngo: any) {
    try {
      if (ngo.isBlocked) {
        // Show dialog for unblock reason
        const dialogRef = this.dialog.open(UnblockNgoDialogComponent, {
          width: '500px',
          data: { ngoName: ngo.name }
        });

        dialogRef.afterClosed().subscribe(async (result) => {
          if (result && result.reason) {
            try {
              await lastValueFrom(this.apiService.unblockNgo(ngo.id.toString(), result.reason));
              this.snackBar.open(`NGO ${ngo.name} unblocked successfully. Email notification sent.`, 'Close', { duration: 3000 });
              await this.loadNgos();
            } catch (error: any) {
              this.snackBar.open(error?.error?.message || 'Failed to unblock NGO', 'Close', { duration: 3000 });
            }
          }
        });
      } else {
        // Show dialog for block reason
        const dialogRef = this.dialog.open(BlockNgoDialogComponent, {
          width: '500px',
          data: { ngoName: ngo.name }
        });

        dialogRef.afterClosed().subscribe(async (result) => {
          if (result && result.reason) {
            try {
              await lastValueFrom(this.apiService.blockNgo(ngo.id.toString(), result.reason));
              this.snackBar.open(`NGO ${ngo.name} blocked successfully. Email notification sent.`, 'Close', { duration: 3000 });
              await this.loadNgos();
            } catch (error: any) {
              this.snackBar.open(error?.error?.message || 'Failed to block NGO', 'Close', { duration: 3000 });
            }
          }
        });
      }
    } catch (error: any) {
      this.snackBar.open(error?.error?.message || 'Failed to update NGO status', 'Close', { duration: 3000 });
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
      this.loadContributions();
    }
  }
  
  onPageChange(page: number) {
    this.currentPage = page;
    this.loadContributions();
  }

  logout() {
    this.authService.logout();
  }
}

