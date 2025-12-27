import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { lastValueFrom } from 'rxjs';
import { HeaderComponent } from '../shared/header/header.component';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HeaderComponent],
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.css']
})
export class LeaderboardComponent implements OnInit {
  selectedType: 'donors' | 'ngos' = 'donors';
  selectedSortBy: 'count' | 'amount' = 'count';
  selectedPeriod: 'all' | 'monthly' | 'weekly' = 'all';
  
  donorsLeaderboard: any[] = [];
  ngosLeaderboard: any[] = [];
  
  isLoading = false;
  errorMessage = '';

  constructor(private apiService: ApiService) {}

  async ngOnInit() {
    await this.loadLeaderboard();
  }

  async loadLeaderboard() {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      const response = await lastValueFrom(
        this.apiService.getLeaderboard({
          type: this.selectedType,
          sortBy: this.selectedSortBy,
          period: this.selectedPeriod
        })
      );

      if (response?.success && response.data) {
        if (this.selectedType === 'donors') {
          this.donorsLeaderboard = response.data.leaderboard || [];
        } else {
          this.ngosLeaderboard = response.data.leaderboard || [];
        }
      }
    } catch (error: any) {
      console.error('Error loading leaderboard:', error);
      this.errorMessage = error?.error?.message || 'Failed to load leaderboard';
    } finally {
      this.isLoading = false;
    }
  }

  onTypeChange() {
    this.loadLeaderboard();
  }

  onSortByChange() {
    this.loadLeaderboard();
  }

  onPeriodChange() {
    this.loadLeaderboard();
  }

  getCurrentLeaderboard() {
    return this.selectedType === 'donors' ? this.donorsLeaderboard : this.ngosLeaderboard;
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  getRankBadgeClass(rank: number): string {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return 'rank-other';
  }
}

