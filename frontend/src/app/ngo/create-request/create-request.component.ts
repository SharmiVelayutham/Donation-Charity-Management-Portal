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
  donationType: string = '';
  quantityOrAmount: number = 0;
  description: string = '';
  imageFiles: File[] = [];
  imagePreviews: string[] = [];
  
  // Account details for FUNDS/MONEY donations
  showAccountDetails: boolean = false;
  bankAccountNumber: string = '';
  bankName: string = '';
  ifscCode: string = '';
  accountHolderName: string = '';

  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  
  // NGO profile info to display at top
  ngoName: string = '';
  ngoAddress: string = '';

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {}

  async ngOnInit() {
    await this.loadNgoProfile();
  }

  async loadNgoProfile() {
    try {
      const response = await this.apiService.getNgoProfile().toPromise();
      if (response?.success && response.data) {
        this.ngoName = response.data.name || '';
        const addressParts = [
          response.data.address,
          response.data.city,
          response.data.state,
          response.data.pincode
        ].filter(Boolean);
        this.ngoAddress = addressParts.join(', ') || 'Address not set';
      }
    } catch (error) {
      console.error('Failed to load NGO profile:', error);
    }
  }

  onImageSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    if (files.length > 0) {
      files.forEach(file => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          this.errorMessage = 'Please select only image files';
          return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          this.errorMessage = 'Image size should be less than 5MB';
          return;
        }
        
        if (this.imageFiles.length < 5) {
          this.imageFiles.push(file);
          
          // Create preview
          const reader = new FileReader();
          reader.onload = (e: any) => {
            this.imagePreviews.push(e.target.result);
          };
          reader.readAsDataURL(file);
        }
      });
      this.errorMessage = '';
    }
  }

  removeImage(index: number) {
    this.imageFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }

  onDonationTypeChange() {
    // Show account details only for FUNDS type
    this.showAccountDetails = this.donationType === 'FUNDS';
    // Clear account details if type changes
    if (!this.showAccountDetails) {
      this.bankAccountNumber = '';
      this.bankName = '';
      this.ifscCode = '';
      this.accountHolderName = '';
    }
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

    // Validation - Only Donation Type and Quantity/Amount are required
    if (!this.donationType) {
      this.errorMessage = 'Please select a Donation Type';
      return;
    }

    if (!this.quantityOrAmount || this.quantityOrAmount <= 0) {
      this.errorMessage = 'Please enter a valid Quantity/Amount (must be greater than 0)';
      return;
    }

    this.isLoading = true;

    try {
      const formData = new FormData();
      formData.append('donationType', this.donationType);
      formData.append('quantityOrAmount', this.quantityOrAmount.toString());
      
      if (this.description) {
        formData.append('description', this.description);
      }
      
      // Add account details if donation type is FUNDS
      if (this.donationType === 'FUNDS') {
        if (this.bankAccountNumber) {
          formData.append('bankAccountNumber', this.bankAccountNumber);
        }
        if (this.bankName) {
          formData.append('bankName', this.bankName);
        }
        if (this.ifscCode) {
          formData.append('ifscCode', this.ifscCode);
        }
        if (this.accountHolderName) {
          formData.append('accountHolderName', this.accountHolderName);
        }
      }
      
      // Add images
      this.imageFiles.forEach(file => {
        formData.append('images', file);
      });

      const response = await this.apiService.createDonationRequest(formData).toPromise();

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
