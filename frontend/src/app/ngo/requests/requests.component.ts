import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './requests.component.html',
  styleUrl: './requests.component.css'
})
export class RequestsComponent implements OnInit {
  donations: any[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  cancelingRequestId: number | null = null;

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {}

  async ngOnInit() {
    await this.loadDonations();
  }

  async loadDonations() {
    this.isLoading = true;
    this.errorMessage = '';
    console.log('[Requests Component] Loading donations...');

    try {
      const response = await lastValueFrom(this.apiService.getMyDonationRequests());
      console.log('[Requests Component] API Response:', response);
      
      if (response?.success && response.data) {
        const rawDonations = Array.isArray(response.data) ? response.data : [];
        console.log('[Requests Component] Raw donations from API:', rawDonations);
        console.log('[Requests Component] Number of donations:', rawDonations.length);
        this.donations = rawDonations.map((request: any) => ({
          id: request.id,
          purpose: request.description || '', // donation_requests uses 'description' not 'purpose'
          donationCategory: request.donation_type || '',
          donationType: request.donation_type || '',
          quantityOrAmount: request.quantity_or_amount || 0,
          status: request.status || 'ACTIVE', // donation_requests uses ACTIVE/CLOSED, not PENDING/CONFIRMED
          priority: 'NORMAL', // donation_requests table doesn't have priority field
          pickupDateTime: null, // donation_requests table doesn't have pickup_date_time
          description: request.description || '',
          locationAddress: request.ngo_address || '',
          createdAt: request.created_at || null,
          contributionCount: request.contribution_count || 0,
          approvedContributions: request.approved_contributions || 0,
          images: request.images || [],
          ngoName: request.ngo_name || ''
        }));
        
        console.log('[Requests Component] Mapped donations:', this.donations);
        console.log('[Requests Component] Final donations count:', this.donations.length);
      } else {
        console.log('[Requests Component] No data in response or response not successful');
        this.donations = [];
      }
    } catch (error: any) {
      console.error('[Requests Component] Error loading donations:', error);
      this.errorMessage = error?.error?.message || error?.message || 'Failed to load donations';
      this.donations = [];
    } finally {
      this.isLoading = false;
      console.log('[Requests Component] Loading complete. Donations count:', this.donations.length);
    }
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatDateTime(dateTime: string | Date): string {
    if (!dateTime) return 'N/A';
    const d = new Date(dateTime);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
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

  goToCreate() {
    this.router.navigate(['/ngo/create-request']);
  }

  editRequest(requestId: number) {
    console.log('Edit request:', requestId);
    alert('Edit functionality coming soon!');
  }

  async cancelRequest(requestId: number) {
    if (!confirm('Are you sure you want to close this donation request? This action cannot be undone.')) {
      return;
    }

    this.cancelingRequestId = requestId;
    try {
      const response = await lastValueFrom(this.apiService.updateDonationRequestStatus(requestId.toString(), 'CLOSED'));
      
      if (response?.success) {
        await this.loadDonations();
        alert('Request closed successfully!');
      } else {
        alert(response?.message || 'Failed to close request');
      }
    } catch (error: any) {
      console.error('Error canceling request:', error);
      alert(error?.error?.message || 'Failed to close request');
    } finally {
      this.cancelingRequestId = null;
    }
  }
}
