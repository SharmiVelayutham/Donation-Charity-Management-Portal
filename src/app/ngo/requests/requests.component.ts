import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

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

    try {
      const response = await this.apiService.getNgoDonations().toPromise();
      if (response?.success && response.data) {
        this.donations = Array.isArray(response.data) ? response.data : [];
      }
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'Failed to load donations';
      this.donations = [];
    } finally {
      this.isLoading = false;
    }
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  goToCreate() {
    this.router.navigate(['/ngo/create-request']);
  }
}
