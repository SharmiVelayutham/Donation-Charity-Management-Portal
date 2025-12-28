import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { lastValueFrom } from 'rxjs';
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
export class CreateRequestComponent implements OnInit {
  donationType: string = '';
  quantityOrAmount: number = 0;
  description: string = '';
  imageFiles: File[] = [];
  imagePreviews: string[] = [];
  showAccountDetails: boolean = false;
  bankAccountNumber: string = '';
  bankName: string = '';
  ifscCode: string = '';
  accountHolderName: string = '';

  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
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
      const response = await lastValueFrom(this.apiService.getNgoProfile());
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
        if (!file.type.startsWith('image/')) {
          this.errorMessage = 'Please select only image files';
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          this.errorMessage = 'Image size should be less than 5MB';
          return;
        }
        
        if (this.imageFiles.length < 5) {
          this.imageFiles.push(file);
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
    this.showAccountDetails = this.donationType === 'FUNDS';
    if (!this.showAccountDetails) {
      this.bankAccountNumber = '';
      this.bankName = '';
      this.ifscCode = '';
      this.accountHolderName = '';
    }
  }
  requiresPickup(): boolean {
    return this.donationType === 'FOOD' || this.donationType === 'CLOTHES';
  }
  isFundsType(): boolean {
    return this.donationType === 'FUNDS';
  }
  getQuantityOrAmountLabel(): string {
    if (this.donationType === 'FUNDS') {
      return 'Amount Required';
    } else if (this.donationType === 'FOOD' || this.donationType === 'CLOTHES') {
      return 'Quantity Required';
    }
    return 'Quantity/Amount Required';
  }
  getQuantityOrAmountPlaceholder(): string {
    if (this.donationType === 'FUNDS') {
      return 'Enter amount';
    } else if (this.donationType === 'FOOD' || this.donationType === 'CLOTHES') {
      return 'Enter quantity';
    }
    return 'Enter quantity or amount';
  }
  getQuantityOrAmountHint(): string {
    if (this.donationType === 'FUNDS') {
      return 'Enter the total amount (in ₹) you need';
    } else if (this.donationType === 'FOOD' || this.donationType === 'CLOTHES') {
      return 'Enter the total quantity of items you need';
    }
    return 'Enter the total quantity (for items) or amount (for funds) you need';
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
    if (!this.donationType) {
      this.errorMessage = 'Please select a Donation Type';
      return;
    }

    if (!this.quantityOrAmount || this.quantityOrAmount <= 0) {
      const fieldName = this.donationType === 'FUNDS' ? 'Amount' : 'Quantity';
      this.errorMessage = `Please enter a valid ${fieldName} (must be greater than 0)`;
      return;
    }
    if (this.donationType === 'FUNDS') {
    }

    this.isLoading = true;

    try {
      const formData = new FormData();
      formData.append('donationType', this.donationType);
      formData.append('quantityOrAmount', this.quantityOrAmount.toString());
      
      if (this.description) {
        formData.append('description', this.description);
      }
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
      this.imageFiles.forEach(file => {
        formData.append('images', file);
      });

      const response = await lastValueFrom(this.apiService.createDonationRequest(formData));

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
