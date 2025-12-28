import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { SignupComponent } from './auth/signup/signup.component';
import { authGuard, roleGuard } from './guards/auth.guard';

export const routes: Routes = [
  { 
    path: '', 
    loadComponent: () =>
      import('./home/home.component')
        .then(m => m.HomeComponent)
  },
  {
    path: 'leaderboard',
    loadComponent: () =>
      import('./leaderboard/leaderboard.component')
        .then(m => m.LeaderboardComponent)
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./pages/about/about.component')
        .then(m => m.AboutComponent)
  },
  {
    path: 'blog',
    loadComponent: () =>
      import('./pages/blog/blog.component')
        .then(m => m.BlogComponent)
  },
  {
    path: 'blog/:id',
    loadComponent: () =>
      import('./pages/blog/blog-detail/blog-detail.component')
        .then(m => m.BlogDetailComponent)
  },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  {
    path: 'verify-otp',
    loadComponent: () =>
      import('./auth/verify-otp/verify-otp.component')
        .then(m => m.VerifyOtpComponent)
  },
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
  {
    path: 'ngo/create-blog',
    loadComponent: () =>
      import('./ngo/create-blog/create-blog.component')
        .then(m => m.CreateBlogComponent),
    canActivate: [roleGuard(['NGO'])]
  },
  {
    path: 'ngo/edit-blog/:id',
    loadComponent: () =>
      import('./ngo/edit-blog/edit-blog.component')
        .then(m => m.EditBlogComponent),
    canActivate: [roleGuard(['NGO'])]
  },
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
  },
  {
    path: 'donations',
    loadComponent: () =>
      import('./donor/donation-list/donation-list.component')
        .then(m => m.DonationListComponent)
  },
  {
    path: 'dashboard/donor',
    loadComponent: () =>
      import('./donor/donor-dashboard/donor-dashboard.component')
        .then(m => m.DonorDashboardComponent),
    canActivate: [roleGuard(['DONOR'])]
  },
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
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found.component')
        .then(m => m.NotFoundComponent)
  }

];
