import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-create-request',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './create-request.component.html',
  styleUrl: './create-request.component.css'
})
export class CreateRequestComponent {
  donationCategory: string = '';
  purpose: string = '';
  description: string = '';
  quantityOrAmount: number = 0;
  pickupLocation: string = '';
  pickupDateTime: string = '';
  priority: string = 'NORMAL';
  imageFile: File | null = null;
  imagePreview: string | null = null;
  
  // For MONEY donations
  qrCodeImage: string = '';
  bankAccountNumber: string = '';
  bankName: string = '';
  ifscCode: string = '';
  accountHolderName: string = '';

  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {}

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Please select an image file';
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'Image size should be less than 5MB';
        return;
      }
      
      this.imageFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
      this.errorMessage = '';
    }
  }

  removeImage() {
    this.imageFile = null;
    this.imagePreview = null;
  }

  triggerImageUpload() {
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  goBack() {
    this.router.navigate(['/dashboard/ngo']);
  }

  async onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    // Validation
    if (!this.donationCategory || !this.purpose || !this.description || !this.quantityOrAmount) {
      this.errorMessage = 'Please fill all required fields';
      return;
    }

    if (this.donationCategory === 'MONEY') {
      if (!this.qrCodeImage || !this.bankAccountNumber || !this.bankName || !this.ifscCode || !this.accountHolderName) {
        this.errorMessage = 'Please fill all payment details for MONEY donation';
        return;
      }
    } else {
      if (!this.pickupLocation || !this.pickupDateTime) {
        this.errorMessage = 'Please provide pickup location and date/time for FOOD/CLOTHES donation';
        return;
      }
    }

    this.isLoading = true;

    try {
      const formData = new FormData();
      formData.append('donationCategory', this.donationCategory);
      formData.append('purpose', this.purpose);
      formData.append('description', this.description);
      formData.append('quantityOrAmount', this.quantityOrAmount.toString());
      
      if (this.donationCategory !== 'MONEY') {
        formData.append('pickupLocation', this.pickupLocation);
        formData.append('pickupDateTime', this.pickupDateTime);
      }
      
      formData.append('priority', this.priority);
      
      // Add single image if selected
      if (this.imageFile) {
        formData.append('images', this.imageFile);
      }

      // Add payment details for MONEY
      if (this.donationCategory === 'MONEY') {
        formData.append('qrCodeImage', this.qrCodeImage);
        formData.append('bankAccountNumber', this.bankAccountNumber);
        formData.append('bankName', this.bankName);
        formData.append('ifscCode', this.ifscCode);
        formData.append('accountHolderName', this.accountHolderName);
      }

      const response = await this.apiService.createNgoDonation(formData).toPromise();

      if (response?.success) {
        this.successMessage = 'Donation request created successfully!';
        setTimeout(() => {
          this.router.navigate(['/dashboard/ngo']);
        }, 2000);
      } else {
        this.errorMessage = response?.message || 'Failed to create donation request';
      }
    } catch (error: any) {
      this.errorMessage = error?.error?.message || error?.message || 'Failed to create donation request';
    } finally {
      this.isLoading = false;
    }
  }
}
