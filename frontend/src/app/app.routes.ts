import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { SignupComponent } from './auth/signup/signup.component';
import { authGuard, roleGuard } from './guards/auth.guard';

export const routes: Routes = [

  // ---------------- HOME ---------------- 
  { 
    path: '', 
    loadComponent: () =>
      import('./home/home.component')
        .then(m => m.HomeComponent)
  },

  // ---------------- LEADERBOARD (Public) ---------------- 
  {
    path: 'leaderboard',
    loadComponent: () =>
      import('./leaderboard/leaderboard.component')
        .then(m => m.LeaderboardComponent)
  },
  
  // ---------------- AUTH ---------------- 
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  {
    path: 'verify-otp',
    loadComponent: () =>
      import('./auth/verify-otp/verify-otp.component')
        .then(m => m.VerifyOtpComponent)
  },

  // ---------------- NGO ROUTES (Protected - NGO only) ---------------- 
  {
    path: 'dashboard/ngo',
    loadComponent: () =>
      import('./ngo/ngo-dashboard/ngo-dashboard.component')
        .then(m => m.NgoDashboardComponent),
    canActivate: [roleGuard(['NGO'])]
  },
  {
    path: 'ngo/create-request',
    loadComponent: () =>
      import('./ngo/create-request/create-request.component')
        .then(m => m.CreateRequestComponent),
    canActivate: [roleGuard(['NGO'])]
  },
  {
    path: 'ngo/requests',
    loadComponent: () =>
      import('./ngo/requests/requests.component')
        .then(m => m.RequestsComponent),
    canActivate: [roleGuard(['NGO'])]
  },


  // ---------------- DONATION REQUESTS (Public - anyone can view, but only donors can contribute) ---------------- 
  {
    path: 'donations/:id/contribute',
    loadComponent: () =>
      import('./donor/contribution/contribution.component')
        .then(m => m.ContributionComponent),
    canActivate: [roleGuard(['DONOR'])]
  },
  {
    path: 'donation-requests/:id/contribute',
    loadComponent: () =>
      import('./donor/contribution/contribution.component')
        .then(m => m.ContributionComponent),
    canActivate: [roleGuard(['DONOR'])]
  },
  {
    path: 'donations/:id',
    loadComponent: () =>
      import('./donor/donation-list/donation-list.component')
        .then(m => m.DonationListComponent)
    // No auth guard - anyone can view individual donation request
  },
  {
    path: 'donations',
    loadComponent: () =>
      import('./donor/donation-list/donation-list.component')
        .then(m => m.DonationListComponent)
    // No auth guard - anyone can view donation requests
  },
  {
    path: 'dashboard/donor',
    loadComponent: () =>
      import('./donor/donor-dashboard/donor-dashboard.component')
        .then(m => m.DonorDashboardComponent),
    canActivate: [roleGuard(['DONOR'])]
  },

  // ---------------- ADMIN ROUTES (Protected - ADMIN only) ---------------- 
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./admin/login/admin-login.component')
        .then(m => m.AdminLoginComponent)
  },
  {
    path: 'admin/register',
    loadComponent: () =>
      import('./admin/register/admin-register.component')
        .then(m => m.AdminRegisterComponent)
  },
  {
    path: 'admin/verify-otp',
    loadComponent: () =>
      import('./admin/verify-otp/admin-verify-otp.component')
        .then(m => m.AdminVerifyOtpComponent)
  },
  {
    path: 'admin/dashboard',
    loadComponent: () =>
      import('./admin/dashboard/admin-dashboard.component')
        .then(m => m.AdminDashboardComponent),
    canActivate: [roleGuard(['ADMIN'])]
  },

  // ---------------- FALLBACK (ALWAYS LAST) ---------------- 
  { path: '**', redirectTo: '' }

];
