import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService, ApiResponse } from '../../services/api.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-view-ngo-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>NGO Details</h2>
    <mat-dialog-content>
      <div *ngIf="isLoading" class="loading-container">
        <p>Loading details...</p>
      </div>
      <div *ngIf="!isLoading && ngoDetails" class="ngo-details">
        <!-- Basic Information -->
        <div class="detail-section">
          <h3>Basic Information</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <strong>NGO ID:</strong>
              <span>{{ ngoDetails.ngo_id || ngoDetails.ngoId || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <strong>NGO Name:</strong>
              <span>{{ ngoDetails.name || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <strong>Email:</strong>
              <span>{{ ngoDetails.email || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <strong>Registration Number:</strong>
              <span>{{ ngoDetails.registrationNumber || ngoDetails.registration_number || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <strong>Contact Person:</strong>
              <span>{{ ngoDetails.contactPersonName || ngoDetails.contact_person_name || ngoDetails.contactInfo || ngoDetails.contact_info || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <strong>Phone Number:</strong>
              <span>{{ ngoDetails.phoneNumber || ngoDetails.phone_number || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <strong>Verification Status:</strong>
              <span [class]="getStatusClass(ngoDetails.verificationStatus || ngoDetails.verification_status)">
                {{ getStatusText(ngoDetails.verificationStatus || ngoDetails.verification_status) }}
              </span>
            </div>
            <div class="detail-item">
              <strong>Status:</strong>
              <span [class]="ngoDetails.isBlocked ? 'status-blocked' : 'status-active'">
                {{ ngoDetails.isBlocked || ngoDetails.is_blocked ? 'Blocked' : 'Active' }}
              </span>
            </div>
            <div class="detail-item">
              <strong>Created Date:</strong>
              <span>{{ (ngoDetails.createdAt || ngoDetails.created_at) | date:'short' }}</span>
            </div>
          </div>
        </div>

        <!-- Address Information -->
        <div class="detail-section">
          <h3>Address</h3>
          <div class="detail-grid">
            <div class="detail-item" *ngIf="ngoDetails.address">
              <strong>Address:</strong>
              <span>{{ ngoDetails.address }}</span>
            </div>
            <div class="detail-item" *ngIf="ngoDetails.city">
              <strong>City:</strong>
              <span>{{ ngoDetails.city }}</span>
            </div>
            <div class="detail-item" *ngIf="ngoDetails.state">
              <strong>State:</strong>
              <span>{{ ngoDetails.state }}</span>
            </div>
            <div class="detail-item" *ngIf="ngoDetails.pincode">
              <strong>Pincode:</strong>
              <span>{{ ngoDetails.pincode }}</span>
            </div>
            <div class="detail-item full-width" *ngIf="!ngoDetails.address && !ngoDetails.city && !ngoDetails.state && !ngoDetails.pincode">
              <span style="color: #94A3B8;">No address information available</span>
            </div>
          </div>
        </div>

        <!-- Additional Information -->
        <div class="detail-section">
          <h3>Additional Information</h3>
          <div class="detail-grid">
            <div class="detail-item" *ngIf="ngoDetails.websiteUrl || ngoDetails.website_url">
              <strong>Website:</strong>
              <a [href]="ngoDetails.websiteUrl || ngoDetails.website_url" target="_blank">{{ ngoDetails.websiteUrl || ngoDetails.website_url }}</a>
            </div>
            <div class="detail-item full-width" *ngIf="ngoDetails.aboutNgo || ngoDetails.about_ngo">
              <strong>About NGO:</strong>
              <p>{{ ngoDetails.aboutNgo || ngoDetails.about_ngo }}</p>
            </div>
            <div class="detail-item full-width" *ngIf="!ngoDetails.websiteUrl && !ngoDetails.website_url && !ngoDetails.aboutNgo && !ngoDetails.about_ngo">
              <span style="color: #94A3B8;">No additional information available</span>
            </div>
          </div>
        </div>


        <!-- Pending Profile Updates -->
        <div class="detail-section" *ngIf="ngoDetails.hasPendingProfileUpdate && ngoDetails.pendingProfileUpdate">
          <h3>Pending Profile Updates</h3>
          <div class="pending-updates-warning">
            <mat-icon>warning</mat-icon>
            <span>This NGO has pending profile updates that require your review</span>
          </div>
          <div class="pending-updates">
            <div class="detail-item" *ngIf="ngoDetails.pendingProfileUpdate.name">
              <strong>Name:</strong>
              <span>{{ ngoDetails.pendingProfileUpdate.name }}</span>
            </div>
            <div class="detail-item" *ngIf="ngoDetails.pendingProfileUpdate.contactPersonName">
              <strong>Contact Person:</strong>
              <span>{{ ngoDetails.pendingProfileUpdate.contactPersonName }}</span>
            </div>
            <div class="detail-item" *ngIf="ngoDetails.pendingProfileUpdate.phoneNumber">
              <strong>Phone Number:</strong>
              <span>{{ ngoDetails.pendingProfileUpdate.phoneNumber }}</span>
            </div>
            <div class="detail-item" *ngIf="ngoDetails.pendingProfileUpdate.address">
              <strong>Address:</strong>
              <span>{{ ngoDetails.pendingProfileUpdate.address }}</span>
            </div>
            <div class="detail-item" *ngIf="ngoDetails.pendingProfileUpdate.city">
              <strong>City:</strong>
              <span>{{ ngoDetails.pendingProfileUpdate.city }}</span>
            </div>
            <div class="detail-item" *ngIf="ngoDetails.pendingProfileUpdate.state">
              <strong>State:</strong>
              <span>{{ ngoDetails.pendingProfileUpdate.state }}</span>
            </div>
            <div class="detail-item" *ngIf="ngoDetails.pendingProfileUpdate.pincode">
              <strong>Pincode:</strong>
              <span>{{ ngoDetails.pendingProfileUpdate.pincode }}</span>
            </div>
            <div class="detail-item" *ngIf="ngoDetails.pendingProfileUpdate.websiteUrl">
              <strong>Website:</strong>
              <span>{{ ngoDetails.pendingProfileUpdate.websiteUrl }}</span>
            </div>
            <div class="detail-item full-width" *ngIf="ngoDetails.pendingProfileUpdate.aboutNgo">
              <strong>About NGO:</strong>
              <p>{{ ngoDetails.pendingProfileUpdate.aboutNgo }}</p>
            </div>
          </div>
        </div>

        <!-- Rejection Reason -->
        <div class="detail-section" *ngIf="ngoDetails.rejectionReason">
          <h3>Rejection Information</h3>
          <div class="detail-item full-width">
            <strong>Rejection Reason:</strong>
            <p>{{ ngoDetails.rejectionReason }}</p>
          </div>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <div class="dialog-actions-left" *ngIf="ngoDetails?.hasPendingProfileUpdate && ngoDetails?.pendingProfileUpdate">
        <button mat-raised-button color="primary" (click)="approveProfileUpdate()" title="Approve Profile Update">
          <mat-icon>check_circle</mat-icon>
          Approve Update
        </button>
        <button mat-raised-button color="warn" (click)="rejectProfileUpdate()" title="Reject Profile Update">
          <mat-icon>cancel</mat-icon>
          Reject Update
        </button>
      </div>
      <button mat-button (click)="onClose()">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
      background: #FFFFFF;
    }
    ::ng-deep .mat-dialog-container {
      background: #FFFFFF !important;
      color: #1F2937 !important;
    }
    mat-dialog-content {
      padding: 20px 24px;
      max-height: 70vh;
      overflow-y: auto;
      background: #FFFFFF !important;
      color: #1F2937 !important;
    }
    .loading-container {
      text-align: center;
      padding: 40px;
    }
    .ngo-details {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .detail-section {
      border-bottom: 1px solid #E5E7EB;
      padding-bottom: 16px;
    }
    .detail-section:last-child {
      border-bottom: none;
    }
    .detail-section h3 {
      margin: 0 0 16px 0;
      color: #10B981 !important;
      font-size: 18px;
      font-weight: 700;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .detail-item.full-width {
      grid-column: 1 / -1;
    }
    .detail-item strong {
      color: #374151 !important;
      font-size: 14px;
      font-weight: 700;
    }
    .detail-item span,
    .detail-item p {
      color: #1F2937 !important;
      font-size: 14px;
      font-weight: 500;
    }
    .detail-item span.status-verified,
    .detail-item span.status-pending,
    .detail-item span.status-rejected,
    .detail-item span.status-active,
    .detail-item span.status-blocked {
      color: inherit !important;
      font-size: inherit !important;
    }
    .detail-item p {
      margin: 0;
      line-height: 1.6;
    }
    .detail-item a {
      color: #3B82F6;
      text-decoration: none;
    }
    .detail-item a:hover {
      text-decoration: underline;
    }
    .status-verified {
      background: #10B981 !important;
      color: #FFFFFF !important;
      padding: 8px 16px !important;
      border-radius: 8px !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      display: inline-block !important;
      border: none !important;
      margin-top: 4px;
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3) !important;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-pending {
      background: #FBBF24 !important;
      color: #1F2937 !important;
      padding: 8px 16px !important;
      border-radius: 8px !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      display: inline-block !important;
      border: none !important;
      margin-top: 4px;
      box-shadow: 0 2px 4px rgba(251, 191, 36, 0.3) !important;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-rejected {
      background: #EF4444 !important;
      color: #FFFFFF !important;
      padding: 8px 16px !important;
      border-radius: 8px !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      display: inline-block !important;
      border: none !important;
      margin-top: 4px;
      box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3) !important;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-blocked {
      background: #EF4444 !important;
      color: #FFFFFF !important;
      padding: 8px 16px !important;
      border-radius: 8px !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      display: inline-block !important;
      border: none !important;
      margin-top: 4px;
      box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3) !important;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-active {
      background: #10B981 !important;
      color: #FFFFFF !important;
      padding: 8px 16px !important;
      border-radius: 8px !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      display: inline-block !important;
      border: none !important;
      margin-top: 4px;
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3) !important;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .pending-updates-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(251, 191, 36, 0.15);
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid rgba(251, 191, 36, 0.4);
      margin-bottom: 16px;
      color: #FBBF24;
      font-weight: 600;
    }
    .pending-updates-warning mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .pending-updates {
      background: rgba(251, 191, 36, 0.1);
      padding: 16px;
      border-radius: 8px;
      border: 1px solid rgba(251, 191, 36, 0.3);
    }
    mat-dialog-actions {
      padding: 8px 24px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dialog-actions-left {
      display: flex;
      gap: 12px;
    }
    @media (max-width: 600px) {
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ViewNgoDialogComponent implements OnInit {
  ngoDetails: any = null;
  isLoading: boolean = true;

  constructor(
    public dialogRef: MatDialogRef<ViewNgoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { ngo: any },
    private apiService: ApiService,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    if (this.data.ngo) {
      this.isLoading = true;
      try {
        const response: ApiResponse = await lastValueFrom(this.apiService.getNgoDetails(this.data.ngo.id.toString()));
        console.log('[View NGO Dialog] API Response:', response);
        if (response?.success && response.data) {
          this.ngoDetails = response.data;
          console.log('[View NGO Dialog] NGO Details loaded:', this.ngoDetails);
        } else {
          this.ngoDetails = this.data.ngo;
          console.log('[View NGO Dialog] Using table data as fallback:', this.ngoDetails);
        }
      } catch (error) {
        console.error('[View NGO Dialog] Error fetching NGO details:', error);
        this.ngoDetails = this.data.ngo;
        console.log('[View NGO Dialog] Using table data due to error:', this.ngoDetails);
      } finally {
        this.isLoading = false;
      }
    } else {
      console.error('[View NGO Dialog] No NGO data provided');
      this.isLoading = false;
    }
  }

  getStatusClass(status: string): string {
    if (!status) return 'status-pending';
    const statusUpper = String(status).toUpperCase().trim();
    console.log('[View NGO Dialog] getStatusClass - status:', status, '->', statusUpper);
    switch (statusUpper) {
      case 'VERIFIED':
      case 'APPROVED':
        return 'status-verified';
      case 'PENDING':
        return 'status-pending';
      case 'REJECTED':
        return 'status-rejected';
      default:
        console.log('[View NGO Dialog] Unknown status:', status);
        return 'status-pending';
    }
  }

  getStatusText(status: string): string {
    if (!status) return 'Pending';
    const statusUpper = String(status).toUpperCase().trim();
    switch (statusUpper) {
      case 'VERIFIED':
      case 'APPROVED':
        return 'Verified';
      case 'PENDING':
        return 'Pending';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status || 'Pending';
    }
  }

  async approveProfileUpdate() {
    if (!confirm(`Are you sure you want to approve the profile update for ${this.ngoDetails.name}?`)) {
      return;
    }

    try {
      const response: ApiResponse = await lastValueFrom(this.apiService.approveNgoProfileUpdate(this.ngoDetails.id.toString()));
      if (response?.success) {
        this.snackBar.open('Profile update approved successfully', 'Close', { duration: 3000 });
        this.dialogRef.close({ reload: true });
      } else {
        this.snackBar.open(response?.message || 'Failed to approve profile update', 'Close', { duration: 3000 });
      }
    } catch (error: any) {
      this.snackBar.open(error?.error?.message || 'Failed to approve profile update', 'Close', { duration: 3000 });
    }
  }

  async rejectProfileUpdate() {
    if (!confirm(`Are you sure you want to reject the profile update for ${this.ngoDetails.name}?`)) {
      return;
    }

    try {
      const response: ApiResponse = await lastValueFrom(this.apiService.rejectNgoProfileUpdate(this.ngoDetails.id.toString()));
      if (response?.success) {
        this.snackBar.open('Profile update rejected successfully', 'Close', { duration: 3000 });
        this.dialogRef.close({ reload: true });
      } else {
        this.snackBar.open(response?.message || 'Failed to reject profile update', 'Close', { duration: 3000 });
      }
    } catch (error: any) {
      this.snackBar.open(error?.error?.message || 'Failed to reject profile update', 'Close', { duration: 3000 });
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}

