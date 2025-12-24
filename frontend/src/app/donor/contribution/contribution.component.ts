import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, ApiResponse } from '../../services/api.service';
import { Observable, lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-contribution',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contribution.component.html',
  styleUrls: ['./contribution.component.css']
})
export class ContributionComponent implements OnInit {
  donationId!: string;
  request: any = null; // Changed from donation to request
  
  // Donor form fields
  quantityOrAmount: number = 0;
  pickupLocation: string = '';
  pickupDate: string = '';
  pickupTime: string = '';
  notes: string = '';
  imageFiles: File[] = [];

  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {
    this.donationId = this.route.snapshot.paramMap.get('id') || '';
  }

  async ngOnInit() {
    await this.loadDonation();
  }

  async loadDonation() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      // Load donation request details
      const resp$: Observable<ApiResponse> = this.apiService.getDonationRequestById(this.donationId);
      const response = await lastValueFrom(resp$);
      if (response?.success && response.data) {
        this.request = response.data;
      } else {
        this.errorMessage = 'Failed to load donation request details';
      }
    } catch (error: any) {
      console.error('Error loading donation request:', error);
      this.errorMessage = error?.error?.message || 'Failed to load donation request details';
    } finally {
      this.isLoading = false;
    }
  }

  triggerFileInput() {
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onImageSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    if (files.length > 0) {
      files.forEach(file => {
        if (file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024) {
          if (this.imageFiles.length < 5) {
            this.imageFiles.push(file);
          }
        }
      });
    }
  }

  removeImage(index: number) {
    this.imageFiles.splice(index, 1);
  }

  // Helper methods
  isFundsType(): boolean {
    return this.request?.donation_type === 'FUNDS';
  }

  requiresPickup(): boolean {
    return this.request?.donation_type === 'FOOD' || this.request?.donation_type === 'CLOTHES';
  }

  async submitContribution() {
    this.errorMessage = '';

    // Validation
    if (!this.quantityOrAmount || this.quantityOrAmount <= 0) {
      this.errorMessage = 'Please enter a valid quantity/amount';
      return;
    }

    // For FOOD/CLOTHES, pickup fields are required
    if (this.requiresPickup()) {
      if (!this.pickupLocation || !this.pickupDate || !this.pickupTime) {
        this.errorMessage = 'Please fill all required fields (Pickup Location, Date, and Time)';
        return;
      }
    }

    // For FUNDS, pickup fields are not required
    // Donors will transfer funds directly to the bank account

    this.isLoading = true;

    try {
      const formData = new FormData();
      formData.append('quantityOrAmount', this.quantityOrAmount.toString());
      
      // Only add pickup fields if donation type requires pickup
      // For FUNDS, don't send pickup fields at all
      if (this.requiresPickup()) {
        formData.append('pickupLocation', this.pickupLocation.trim());
        formData.append('pickupDate', this.pickupDate);
        formData.append('pickupTime', this.pickupTime);
      }
      // For FUNDS: pickup fields are not sent (backend will set them to NULL)
      
      if (this.notes) {
        formData.append('notes', this.notes.trim());
      }
      
      // Images removed - no longer needed

      const resp$: Observable<ApiResponse> = this.apiService.contributeToDonationRequest(this.donationId, formData);
      const response = await lastValueFrom(resp$);

      if (response?.success) {
        alert('Donation submitted successfully! The NGO will review your contribution.');
        this.router.navigate(['/dashboard/donor']);
      } else {
        this.errorMessage = response?.message || 'Failed to submit donation';
      }
    } catch (error: any) {
      console.error('Error submitting donation:', error);
      this.errorMessage = error?.error?.message || error?.message || 'Failed to submit donation';
    } finally {
      this.isLoading = false;
    }
  }
}
