import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-donation-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule
  ],
  templateUrl: './donation-details.component.html',
  styleUrls: ['./donation-details.component.css']
})
export class DonationDetailsComponent {

  donationId!: string;

  // Temporary mock data (backend-independent)
  donation = {
    donationType: 'Food',
    quantity: 10,
    location: 'Chennai',
    pickupDateTime: '2025-01-10 10:00 AM',
    status: 'Pending'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.donationId = this.route.snapshot.paramMap.get('id') || '';
  }

  goToContribute(): void {
    this.router.navigate(['/donations', this.donationId, 'contribute']);
  }
}
