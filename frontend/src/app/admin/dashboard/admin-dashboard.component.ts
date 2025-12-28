import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { lastValueFrom } from 'rxjs';
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
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UnblockNgoDialogComponent } from './unblock-ngo-dialog.component';
import { BlockNgoDialogComponent } from './block-ngo-dialog.component';
import { ViewNgoDialogComponent } from './view-ngo-dialog.component';
import { SliderDialogComponent } from './slider-dialog.component';
import { NotificationBellComponent } from '../../shared/notification-bell/notification-bell.component';
import { LeaderboardComponent } from '../../leaderboard/leaderboard.component';

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
    MatDialogModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    NotificationBellComponent,
    LeaderboardComponent
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  ngos: any[] = [];
  donors: any[] = [];
  contributions: any[] = [];
  allNgos: any[] = []; // For filter dropdown
  
  activeTab: 'dashboard' | 'ngos' | 'contributions' | 'email-templates' | 'leaderboard' | 'sliders' = 'dashboard';
  currentView: 'dashboard' | 'contributions' | 'ngos' | 'email-templates' | 'leaderboard' | 'sliders' = 'dashboard';
  mobileMenuOpen: boolean = false;
  
  isLoading: boolean = false;
  isLoadingContributions: boolean = false;
  isLoadingAnalytics: boolean = false;
  errorMessage: string = '';
  searchTerm: string = '';
  filterBlocked: string = '';
  availableTemplateTypes = [
    { value: 'OTP_REGISTRATION', label: 'OTP Registration' },
    { value: 'OTP_PASSWORD_RESET', label: 'OTP Password Reset' },
    { value: 'OTP_EMAIL_CHANGE', label: 'OTP Email Change' },
    { value: 'OTP_ADMIN_REGISTRATION', label: 'OTP Admin Registration' },
    { value: 'NGO_DONATION_RECEIVED', label: 'NGO Donation Received' },
    { value: 'DONOR_DONATION_CONFIRMATION', label: 'Donor Donation Confirmation' },
    { value: 'NGO_UNBLOCK', label: 'NGO Unblock' },
    { value: 'NGO_BLOCK', label: 'NGO Block' }
  ];
  selectedTemplateType: string = 'NGO_UNBLOCK';
  emailTemplate: any = {
    templateType: 'NGO_UNBLOCK',
    subject: '',
    bodyHtml: '',
    isDefault: false,
  };
  isEditingTemplate: boolean = false;
  isLoadingTemplate: boolean = false;
  placeholderHints: { [key: string]: string } = {
    'OTP_REGISTRATION': 'Available placeholders: {{OTP_CODE}}',
    'OTP_PASSWORD_RESET': 'Available placeholders: {{OTP_CODE}}',
    'OTP_EMAIL_CHANGE': 'Available placeholders: {{OTP_CODE}}',
    'OTP_ADMIN_REGISTRATION': 'Available placeholders: {{OTP_CODE}}',
    'NGO_DONATION_RECEIVED': 'Available placeholders: {{NGO_NAME}}, {{DONOR_NAME}}, {{DONOR_EMAIL}}, {{DONATION_TYPE}}, {{AMOUNT_OR_QUANTITY}}',
    'DONOR_DONATION_CONFIRMATION': 'Available placeholders: {{DONOR_NAME}}, {{NGO_NAME}}, {{DONATION_TYPE}}, {{AMOUNT_OR_QUANTITY}}',
    'NGO_UNBLOCK': 'Available placeholders: {{NGO_NAME}}, {{UNBLOCK_DATE}}, {{SUPPORT_EMAIL}}, {{UNBLOCK_REASON}}',
    'NGO_BLOCK': 'Available placeholders: {{NGO_NAME}}, {{BLOCK_DATE}}, {{BLOCK_REASON}}, {{SUPPORT_EMAIL}}'
  };
  analytics: any = {
    donations: {
      breakdown: [],
      totalContributions: 0,
      totalFunds: 0,
      fundsReceived: 0,
      fundsPending: 0,
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
  filterDonorId: string = '';
  filterNgoId: string = '';
  filterDonationType: string = '';
  filterFromDate: string = '';
  filterToDate: string = '';
  currentPage: number = 1;
  pageSize: number = 50;
  totalContributions: number = 0;
  Math = Math;
  chartViewMode: 'amount' | 'donors' = 'amount';
  sliders: any[] = [];
  isLoadingSliders: boolean = false;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private socketService: SocketService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  async ngOnInit() {
    if (!this.authService.hasRole('ADMIN')) {
      return;
    }
    const token = localStorage.getItem('token');
    if (token) {
      this.socketService.connect(token);
    }
    await Promise.all([
      this.loadAnalytics(),
      this.loadContributions(),
      this.loadDonors(),
      this.loadNgos()
    ]);
    this.allNgos = this.ngos;
  }

  ngOnDestroy() {
    this.socketService.offNgoStatsUpdate();
    this.socketService.offDonationCreated();
    this.socketService.offDonorStatsUpdate();
    this.socketService.offContributionStatusUpdate();
    this.socketService.disconnect();
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
    if (!this.emailTemplate.subject || this.emailTemplate.templateType !== this.selectedTemplateType) {
      this.loadEmailTemplate();
    }
  }

  showLeaderboard() {
    this.currentView = 'leaderboard';
    this.activeTab = 'leaderboard';
  }

  showSliders() {
    this.currentView = 'sliders';
    this.activeTab = 'sliders';
    this.loadSliders();
  }

  async loadSliders() {
    this.isLoadingSliders = true;
    try {
      const response: any = await lastValueFrom(this.apiService.getSlidersAdmin());
      if (response?.success && response.data) {
        this.sliders = response.data.sort((a: any, b: any) => a.display_order - b.display_order);
      }
    } catch (error: any) {
      console.error('Error loading sliders:', error);
      this.snackBar.open('Failed to load sliders', 'Close', { duration: 3000 });
    } finally {
      this.isLoadingSliders = false;
    }
  }

  getSliderImageUrl(imageUrl: string): string {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    const baseUrl = 'http://localhost:4000';
    return `${baseUrl}${imageUrl}`;
  }

  openCreateSliderDialog() {
    const dialogRef = this.dialog.open(SliderDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { slider: null }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadSliders();
      }
    });
  }

  editSlider(slider: any) {
    const dialogRef = this.dialog.open(SliderDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { slider: slider }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadSliders();
      }
    });
  }

  async toggleSliderStatus(slider: any) {
    try {
      const response = await lastValueFrom(
        this.apiService.updateSlider(slider.id, { is_active: !slider.is_active })
      );
      if (response?.success) {
        slider.is_active = !slider.is_active;
        this.snackBar.open('Slider status updated', 'Close', { duration: 2000 });
      }
    } catch (error: any) {
      console.error('Error updating slider status:', error);
      this.snackBar.open('Failed to update slider status', 'Close', { duration: 3000 });
    }
  }

  async deleteSlider(slider: any) {
    if (!confirm(`Are you sure you want to delete "${slider.title}"?`)) {
      return;
    }
    try {
      const response = await lastValueFrom(this.apiService.deleteSlider(slider.id));
      if (response?.success) {
        this.sliders = this.sliders.filter(s => s.id !== slider.id);
        this.snackBar.open('Slider deleted successfully', 'Close', { duration: 2000 });
      }
    } catch (error: any) {
      console.error('Error deleting slider:', error);
      this.snackBar.open('Failed to delete slider', 'Close', { duration: 3000 });
    }
  }
  
  onTemplateTypeChange() {
    this.emailTemplate.templateType = this.selectedTemplateType;
    this.isEditingTemplate = false;
    this.loadEmailTemplate();
  }
  
  async loadEmailTemplate() {
    this.isLoadingTemplate = true;
    try {
      const response = await lastValueFrom(this.apiService.getEmailTemplate(this.selectedTemplateType));
      if (response?.success && response.data) {
        this.emailTemplate = {
          templateType: this.selectedTemplateType,
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
  
  getPlaceholderHint(): string {
    return this.placeholderHints[this.selectedTemplateType] || 'No placeholders available';
  }
  
  getTemplateLabel(): string {
    const template = this.availableTemplateTypes.find(t => t.value === this.selectedTemplateType);
    return template ? template.label : this.selectedTemplateType;
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
  
  getChartData(): number[] {
    const data = this.getMonthlyTrendData();
    return this.chartViewMode === 'amount' ? data.amounts : data.counts;
  }
  
  getChartMaxValue(): number {
    const values = this.getChartData();
    if (values.length === 0) return 1;
    const max = Math.max(...values);
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / magnitude) * magnitude;
  }
  
  getChartPoints(): { x: number, y: number }[] {
    const values = this.getChartData();
    if (values.length === 0) return [];
    const max = this.getChartMaxValue();
    return values.map((value, index) => {
      const x = 50 + (index * (500 / (values.length - 1 || 1)));
      const y = 250 - ((value / max) * 200);
      return { x, y };
    });
  }
  getSmoothCurvePath(): string {
    const points = this.getChartPoints();
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
    
    let path = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : p2;
      
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    
    return path;
  }
  getSmoothAreaPath(): string {
    const points = this.getChartPoints();
    if (points.length === 0) return '';
    
    const curvePath = this.getSmoothCurvePath();
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    
    return `${curvePath} L ${lastPoint.x},250 L ${firstPoint.x},250 Z`;
  }
  
  getYAxisLabels(): number[] {
    const max = this.getChartMaxValue();
    const numLabels = 5;
    const step = max / (numLabels - 1);
    const labels: number[] = [];
    for (let i = 0; i < numLabels; i++) {
      labels.push(Math.round(step * i));
    }
    return labels;
  }
  
  formatChartValue(value: number): string {
    if (this.chartViewMode === 'amount') {
      if (value >= 1000) {
        return `₹${(value / 1000).toFixed(0)}K`;
      }
      return `₹${value.toFixed(0)}`;
    }
    return value.toString();
  }
  
  setChartViewMode(mode: 'amount' | 'donors') {
    this.chartViewMode = mode;
  }

  getBarWidth(): number {
    const dataLength = this.getChartData().length;
    if (dataLength === 0) return 0;
    const totalWidth = 500; // Total available width (570 - 70)
    const totalSpacing = (dataLength - 1) * 30; // 30px spacing between bars
    return (totalWidth - totalSpacing) / dataLength;
  }

  getBarXPosition(index: number): number {
    const dataLength = this.getChartData().length;
    if (dataLength === 0) return 70;
    const barWidth = this.getBarWidth();
    const spacing = 30;
    return 70 + (index * (barWidth + spacing));
  }

  getBarHeight(value: number): number {
    if (value <= 0) return 0;
    const max = this.getChartMaxValue();
    if (max === 0) return 0;
    return (value / max) * 200;
  }

  getBarYPosition(value: number): number {
    const height = this.getBarHeight(value);
    return 220 - height; // 220 is the x-axis Y position
  }

  trackByIndex(index: number): number {
    return index;
  }
  
  formatCurrency(amount: number): string {
    return `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  async downloadReport(format: 'csv' | 'excel' | 'pdf') {
    try {
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
    this.downloadCSV(data);
  }
  
  downloadPDF(data: any[]) {
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

  async approveNgoProfileUpdate(ngo: any) {
    if (!confirm(`Are you sure you want to approve the profile update for ${ngo.name}?`)) {
      return;
    }

    try {
      const response = await lastValueFrom(this.apiService.approveNgoProfileUpdate(ngo.id.toString()));
      await this.loadNgos();
      this.snackBar.open('Profile update approved successfully', 'Close', { duration: 3000 });
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'Failed to approve profile update';
      this.snackBar.open(this.errorMessage, 'Close', { duration: 3000 });
    }
  }

  async rejectNgoProfileUpdate(ngo: any) {
    if (!confirm(`Are you sure you want to reject the profile update for ${ngo.name}?`)) {
      return;
    }

    try {
      const response = await lastValueFrom(this.apiService.rejectNgoProfileUpdate(ngo.id.toString()));
      await this.loadNgos();
      this.snackBar.open('Profile update rejected successfully', 'Close', { duration: 3000 });
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'Failed to reject profile update';
      this.snackBar.open(this.errorMessage, 'Close', { duration: 3000 });
    }
  }

  viewNgoDetails(ngo: any): void {
    const dialogRef = this.dialog.open(ViewNgoDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: { ngo: ngo }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.reload) {
        this.loadNgos();
      }
    });
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

