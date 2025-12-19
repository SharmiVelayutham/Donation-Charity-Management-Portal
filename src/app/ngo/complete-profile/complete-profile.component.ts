import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, ApiResponse } from '../../services/api.service';
import { Observable, lastValueFrom } from 'rxjs';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './complete-profile.component.html',
  styleUrls: ['./complete-profile.component.css']
})
export class CompleteProfileComponent implements OnInit {
  isLoading: boolean = false;
  isSaving: boolean = false;
  
  // Profile data from backend
  profileData: any = null;
  
  // Form model
  profileForm: any = {
    contactPersonName: '',
    phoneNumber: '',
    aboutNgo: '',
    websiteUrl: '',
    logoUrl: ''
  };

  // Read-only fields (from backend)
  ngoId: string | number = '';
  ngoName: string = '';
  registrationNumber: string = '';
  email: string = '';
  address: string = '';
  city: string = '';
  state: string = '';
  pincode: string = '';
  isVerified: boolean = false;
  adminApprovalForEdit: boolean = false;

  // Form state
  formError: string = '';
  logoFile: File | null = null;
  logoPreview: string | null = null;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    await this.loadProfile();
  }

  async loadProfile() {
    this.isLoading = true;
    this.formError = '';
    
    try {
      const resp$: Observable<ApiResponse> = this.apiService.getNgoDashboard();
      const response = await lastValueFrom(resp$);
      
      if (response?.success && response.data?.profile) {
        const profile = response.data.profile;
        this.profileData = profile;
        
        // Set read-only fields
        this.ngoId = profile.id || '';
        this.ngoName = profile.name || 'Not provided';
        this.registrationNumber = profile.registrationNumber || profile.id?.toString() || 'N/A';
        this.email = profile.email || '';
        this.address = profile.address || '';
        this.city = profile.city || '';
        this.state = profile.state || '';
        this.pincode = profile.pincode || '';
        this.isVerified = profile.verified || false;
        this.adminApprovalForEdit = profile.adminApprovalForEdit || false;
        
        // Set editable fields
        this.profileForm.contactPersonName = profile.contactPersonName || '';
        this.profileForm.phoneNumber = profile.contactInfo || profile.phoneNumber || '';
        this.profileForm.aboutNgo = profile.aboutNgo || profile.description || '';
        this.profileForm.websiteUrl = profile.websiteUrl || '';
        this.profileForm.logoUrl = profile.logoUrl || '';
        this.logoPreview = profile.logoUrl || null;
      } else {
        this.formError = 'Failed to load profile data';
        this.showToast('Failed to load profile', true);
      }
    } catch (err: any) {
      console.error('Failed to load profile', err);
      this.formError = err?.message || 'Failed to load profile';
      this.showToast(this.formError, true);
    } finally {
      this.isLoading = false;
    }
  }

  onLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.showToast('Please select an image file', true);
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.showToast('Image size should be less than 5MB', true);
        return;
      }
      
      this.logoFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeLogo() {
    this.logoFile = null;
    this.logoPreview = null;
  }

  calculateProfileCompletion(): number {
    let completed = 0;
    const total = 5; // Total fields to complete
    
    if (this.profileForm.contactPersonName) completed++;
    if (this.profileForm.phoneNumber) completed++;
    if (this.profileForm.aboutNgo) completed++;
    if (this.profileForm.websiteUrl) completed++;
    if (this.logoPreview || this.profileForm.logoUrl) completed++;
    
    return Math.round((completed / total) * 100);
  }

  async saveProfile() {
    this.formError = '';
    
    // Validation
    if (!this.profileForm.contactPersonName || this.profileForm.contactPersonName.trim().length === 0) {
      this.formError = 'Contact Person Name is required';
      this.showToast(this.formError, true);
      return;
    }
    
    if (!this.profileForm.phoneNumber || this.profileForm.phoneNumber.trim().length === 0) {
      this.formError = 'Phone Number is required';
      this.showToast(this.formError, true);
      return;
    }
    
    // Basic phone validation
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(this.profileForm.phoneNumber.replace(/\s/g, ''))) {
      this.formError = 'Please enter a valid phone number';
      this.showToast(this.formError, true);
      return;
    }
    
    this.isSaving = true;
    
    try {
      // Prepare payload with all profile fields
      const payload: any = {
        contactPersonName: this.profileForm.contactPersonName.trim(),
        phoneNumber: this.profileForm.phoneNumber.trim(),
        aboutNgo: this.profileForm.aboutNgo?.trim() || '',
        websiteUrl: this.profileForm.websiteUrl?.trim() || '',
        contactInfo: this.profileForm.phoneNumber.trim() // Keep for backward compatibility
      };
      
      // If logo was uploaded, we would upload it here and get the URL
      // For now, if there's a logo preview, we'll need to handle file upload separately
      // This would require a separate endpoint for file uploads
      
      const resp$ = this.apiService.updateNgoProfile(payload);
      const response = await lastValueFrom(resp$);
      
      if (response?.success) {
        this.showToast('Profile updated successfully!');
        
        // In a real implementation, you would also upload the logo here
        // For now, we'll just show success and redirect after a delay
        setTimeout(() => {
          this.router.navigate(['/dashboard/ngo']);
        }, 1500);
      } else {
        this.formError = response?.message || 'Failed to update profile';
        this.showToast(this.formError, true);
      }
    } catch (err: any) {
      console.error('Failed to save profile', err);
      this.formError = err?.message || 'Failed to update profile';
      this.showToast(this.formError, true);
    } finally {
      this.isSaving = false;
    }
  }

  cancel() {
    this.router.navigate(['/dashboard/ngo']);
  }

  showToast(message: string, isError = false) {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: isError ? ['error-snackbar'] : ['success-snackbar']
    });
  }

  formatDate(date: any): string {
    if (!date) return 'Not available';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  triggerLogoUpload() {
    const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }
}

