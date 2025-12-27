import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  isAuthenticated = false;
  userRole: string | null = null;
  userName: string = '';
  userInitial: string = '';
  menuOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.checkAuthStatus();
    this.authService.authStatus$.subscribe(() => {
      this.checkAuthStatus();
    });
  }

  checkAuthStatus() {
    this.isAuthenticated = this.authService.isAuthenticated();
    if (this.isAuthenticated) {
      const user = this.authService.getUser();
      this.userRole = user?.role || null;
      this.userName = user?.name || '';
      this.userInitial = this.userName ? this.userName.charAt(0).toUpperCase() : 'U';
    } else {
      this.userRole = null;
      this.userName = '';
      this.userInitial = '';
    }
  }

  navigateToDashboard() {
    if (this.userRole === 'DONOR') {
      this.router.navigate(['/dashboard/donor']);
    } else if (this.userRole === 'NGO') {
      this.router.navigate(['/dashboard/ngo']);
    } else if (this.userRole === 'ADMIN') {
      this.router.navigate(['/dashboard/admin']);
    }
  }
}

