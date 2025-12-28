import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-slider-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data?.slider ? 'Edit Slider' : 'Create New Slider' }}</h2>
    <mat-dialog-content>
      <form #sliderForm="ngForm">
        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>Title *</mat-label>
          <input matInput [(ngModel)]="sliderData.title" name="title" required>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>Tagline</mat-label>
          <input matInput [(ngModel)]="sliderData.tagline" name="tagline">
        </mat-form-field>

        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>Description</mat-label>
          <textarea matInput [(ngModel)]="sliderData.description" name="description" rows="3"></textarea>
        </mat-form-field>

        <div style="margin: 16px 0;">
          <label style="display: block; margin-bottom: 8px; font-weight: 500;">Slider Image *</label>
          <input 
            type="file" 
            accept="image/*" 
            (change)="onImageSelect($event)"
            style="display: none;"
            #fileInput>
          <button type="button" mat-stroked-button (click)="fileInput.click()">
            <mat-icon>image</mat-icon>
            {{ sliderData.image ? 'Change Image' : 'Choose Image' }}
          </button>
          <div *ngIf="imagePreview" style="margin-top: 12px;">
            <img [src]="imagePreview" alt="Preview" style="max-width: 100%; max-height: 200px; border-radius: 8px; border: 2px solid #e5e7eb;">
          </div>
          <div *ngIf="data?.slider?.image_url && !imagePreview" style="margin-top: 12px;">
            <img [src]="getImageUrl(data.slider.image_url)" alt="Current" style="max-width: 100%; max-height: 200px; border-radius: 8px; border: 2px solid #e5e7eb;">
          </div>
        </div>

        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>Button 1 Text</mat-label>
          <input matInput [(ngModel)]="sliderData.button1_text" name="button1_text">
        </mat-form-field>

        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>Button 1 Link</mat-label>
          <input matInput [(ngModel)]="sliderData.button1_link" name="button1_link" placeholder="/donations, /signup, /leaderboard, /blog, etc.">
          <mat-hint>Internal routes: /donations, /signup, /leaderboard, /blog | External: https://example.com</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>Button 2 Text</mat-label>
          <input matInput [(ngModel)]="sliderData.button2_text" name="button2_text">
        </mat-form-field>

        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>Button 2 Link</mat-label>
          <input matInput [(ngModel)]="sliderData.button2_link" name="button2_link" placeholder="/donations, /signup, /leaderboard, /blog, etc.">
          <mat-hint>Internal routes: /donations, /signup, /leaderboard, /blog | External: https://example.com</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>Display Order</mat-label>
          <input matInput type="number" [(ngModel)]="sliderData.display_order" name="display_order" min="0">
        </mat-form-field>

        <div *ngIf="errorMessage" style="color: #dc3545; margin-top: 12px; padding: 12px; background: #fee; border-radius: 8px;">
          {{ errorMessage }}
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button 
        mat-raised-button 
        color="primary" 
        (click)="onSave()" 
        [disabled]="!sliderData.title || isSubmitting">
        {{ isSubmitting ? 'Saving...' : (data?.slider ? 'Update' : 'Create') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      padding: 20px 24px;
      max-height: 70vh;
      overflow-y: auto;
    }
    mat-form-field {
      margin-bottom: 16px;
    }
    mat-dialog-actions {
      padding: 8px 24px 16px;
    }
  `]
})
export class SliderDialogComponent implements OnInit {
  sliderData: any = {
    title: '',
    tagline: '',
    description: '',
    button1_text: '',
    button1_link: '',
    button2_text: '',
    button2_link: '',
    display_order: 0
  };
  imageFile: File | null = null;
  imagePreview: string | null = null;
  isSubmitting: boolean = false;
  errorMessage: string = '';

  constructor(
    public dialogRef: MatDialogRef<SliderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    if (this.data?.slider) {
      this.sliderData = {
        title: this.data.slider.title || '',
        tagline: this.data.slider.tagline || '',
        description: this.data.slider.description || '',
        button1_text: this.data.slider.button1_text || '',
        button1_link: this.data.slider.button1_link || '',
        button2_text: this.data.slider.button2_text || '',
        button2_link: this.data.slider.button2_link || '',
        display_order: this.data.slider.display_order || 0
      };
    }
  }

  onImageSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.imageFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  getImageUrl(imageUrl: string): string {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${imageUrl}`;
  }

  onCancel() {
    this.dialogRef.close();
  }

  async onSave() {
    if (!this.sliderData.title) {
      this.errorMessage = 'Title is required';
      return;
    }

    if (!this.data?.slider && !this.imageFile) {
      this.errorMessage = 'Image is required';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const formData = new FormData();
      formData.append('title', this.sliderData.title);
      if (this.sliderData.tagline) formData.append('tagline', this.sliderData.tagline);
      if (this.sliderData.description) formData.append('description', this.sliderData.description);
      if (this.sliderData.button1_text) formData.append('button1_text', this.sliderData.button1_text);
      if (this.sliderData.button1_link) formData.append('button1_link', this.sliderData.button1_link);
      if (this.sliderData.button2_text) formData.append('button2_text', this.sliderData.button2_text);
      if (this.sliderData.button2_link) formData.append('button2_link', this.sliderData.button2_link);
      formData.append('display_order', this.sliderData.display_order?.toString() || '0');
      
      if (this.imageFile) {
        formData.append('image', this.imageFile);
      }

      let response: any;
      if (this.data?.slider) {
        response = await lastValueFrom(this.apiService.updateSlider(this.data.slider.id, formData));
      } else {
        response = await lastValueFrom(this.apiService.createSlider(formData));
      }

      if (response?.success) {
        this.snackBar.open(
          this.data?.slider ? 'Slider updated successfully' : 'Slider created successfully',
          'Close',
          { duration: 2000 }
        );
        this.dialogRef.close(true); // Return true to indicate success
      } else {
        this.errorMessage = response?.message || 'Failed to save slider';
      }
    } catch (error: any) {
      console.error('Error saving slider:', error);
      this.errorMessage = error.error?.message || 'Failed to save slider. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }
}

