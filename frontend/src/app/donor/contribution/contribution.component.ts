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
  donation: any = null;
  
  pickupScheduledDateTime: string = '';
  donorAddress: string = '';
  donorContactNumber: string = '';
  notes: string = '';

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
    try {
      const resp$: Observable<ApiResponse> = this.apiService.getDonationById(this.donationId);
      const response = await lastValueFrom(resp$);
      if (response?.success && response.data) {
        this.donation = response.data;
      }
    } catch (error: any) {
      this.errorMessage = 'Failed to load donation details';
    }
  }

  async submitContribution() {
    this.errorMessage = '';

    if (!this.pickupScheduledDateTime || !this.donorAddress || !this.donorContactNumber) {
      this.errorMessage = 'Please fill all required fields';
      return;
    }

    this.isLoading = true;

    try {
      const resp$: Observable<ApiResponse> = this.apiService.createContribution(this.donationId, {
        pickupScheduledDateTime: this.pickupScheduledDateTime,
        donorAddress: this.donorAddress,
        donorContactNumber: this.donorContactNumber,
        notes: this.notes
      });

      const response = await lastValueFrom(resp$);

      if (response?.success) {
        alert('Contribution submitted successfully!');
        this.router.navigate(['/dashboard/donor']);
      } else {
        this.errorMessage = response?.message || 'Failed to submit contribution';
      }
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'Failed to submit contribution';
    } finally {
      this.isLoading = false;
    }
  }
}
