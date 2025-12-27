import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  user?: any;
  admin?: any; // Admin-specific field for admin login/registration responses
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    });
  }

  // ==================== AUTH ====================
  register(data: { name: string; email: string; password: string; role: 'DONOR' | 'NGO'; contactInfo: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/register`, data, { headers: this.getHeaders() })
      .pipe(
        map(res => {
          // For registration, we should NOT normalize token/user since OTP flow doesn't return them
          // Only normalize if there's actually a token (which shouldn't happen)
          const normalized = this.normalizeResponse(res);
          // If token exists in registration response, it's an error (old backend code)
          if (normalized.token) {
            console.error('ERROR: Registration endpoint returned token. Backend needs to be updated!');
          }
          return normalized;
        }),
        catchError(err => this.handleError(err))
      );
  }

  verifyOTPAndRegister(data: { 
    name: string; 
    email: string; 
    password: string; 
    role: 'DONOR' | 'NGO'; 
    contactInfo: string; 
    otp: string;
    // NGO-specific fields (optional)
    registrationNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    contactPersonName?: string;
    phoneNumber?: string;
    aboutNgo?: string;
    websiteUrl?: string;
  }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/verify-otp`, data, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  login(email: string, password: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/login`, { email, password }, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // ==================== DONATIONS ====================
  getDonations(params?: { status?: string; category?: string; location?: string; date?: string }): Observable<ApiResponse> {
    let url = `${this.apiUrl}/donations`;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.category) queryParams.append('category', params.category);
      if (params.location) queryParams.append('location', params.location);
      if (params.date) queryParams.append('date', params.date);
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
    }
    return this.http.get<ApiResponse>(url, { headers: this.getHeaders() });
  }

  getDonationById(id: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/donations/${id}`, { headers: this.getHeaders() });
  }

  // ==================== NGO DONATIONS ====================
  // Create donation request (new simplified version - no pickup scheduling)
  createDonationRequest(formData: FormData): Observable<ApiResponse> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token && { Authorization: `Bearer ${token}` })
      // Don't set Content-Type for FormData - let browser set it with boundary
    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/donation-requests`, formData, { headers })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // Get all active donation requests (for donors)
  getActiveDonationRequests(donationType?: string): Observable<ApiResponse> {
    const params: any = {};
    if (donationType) {
      params.donationType = donationType;
    }
    return this.http.get<ApiResponse>(`${this.apiUrl}/donation-requests`, { params })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // Get donation request by ID
  getDonationRequestById(id: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/donation-requests/${id}`)
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // Donor submits donation to a request
  contributeToDonationRequest(requestId: string, formData: FormData): Observable<ApiResponse> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token && { Authorization: `Bearer ${token}` })
    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/donation-requests/${requestId}/contribute`, formData, { headers })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // Get my donation requests (NGO)
  getMyDonationRequests(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/donation-requests/my-requests`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // Update donation request status (NGO) - for cancel/close
  updateDonationRequestStatus(requestId: string, status: 'ACTIVE' | 'CLOSED'): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.apiUrl}/donation-requests/${requestId}/status`,
      { status },
      { headers: this.getHeaders() }
    )
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  createNgoDonation(formData: FormData): Observable<ApiResponse> {
    const token = localStorage.getItem('token');
    return this.http.post<ApiResponse>(`${this.apiUrl}/ngo/donations`, formData, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
        // Don't set Content-Type for FormData - browser will set it with boundary
      })
    });
  }

  getNgoDonations(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/ngo/donations`, { headers: this.getHeaders() });
  }

  updateNgoDonation(id: string, data: any): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/ngo/donations/${id}`, data, { headers: this.getHeaders() });
  }

  deleteNgoDonation(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/ngo/donations/${id}`, { headers: this.getHeaders() });
  }

  // ==================== CONTRIBUTIONS ====================
  createContribution(donationId: string, data: {
    notes?: string;
    pickupScheduledDateTime: string;
    donorAddress: string;
    donorContactNumber: string;
  }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/contributions/${donationId}`, data, { headers: this.getHeaders() });
  }

  getContributions(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/contributions`, { headers: this.getHeaders() });
  }

  // ==================== DONOR DASHBOARD ====================
  getDonorDashboard(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/donor/dashboard`, { headers: this.getHeaders() });
  }

  // Donor profile endpoints
  getDonorProfile(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/donor/dashboard/profile`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  updateDonorProfile(data: { name?: string; contactInfo?: string; password?: string; phoneNumber?: string; fullAddress?: string }): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/donor/dashboard/profile`, data, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // ==================== DASHBOARD STATISTICS ====================
  // Get NGO dashboard statistics (real-time)
  getNgoDashboardStats(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/ngo/dashboard-stats`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // Get Donor dashboard statistics (real-time)
  getDonorDashboardStats(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/donor/dashboard/stats`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // Download receipt for donation request contribution
  downloadReceipt(contributionId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/donor/dashboard/donation-request-contributions/${contributionId}/receipt`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  // Get Donor donation request contributions (new system)
  getDonorDonationRequestContributions(): Observable<ApiResponse> {
    // Add cache-busting parameter to force fresh data
    const timestamp = new Date().getTime();
    return this.http.get<ApiResponse>(`${this.apiUrl}/donor/dashboard/donation-request-contributions?t=${timestamp}`, { 
      headers: this.getHeaders(),
      // Force bypass cache
      observe: 'body',
      responseType: 'json'
    })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // Get NGO donation details (all contributions with donor info)
  getNgoDonationDetails(): Observable<ApiResponse> {
    // Add cache-busting parameter to force fresh data
    const timestamp = new Date().getTime();
    return this.http.get<ApiResponse>(`${this.apiUrl}/ngo/dashboard/donations/details?t=${timestamp}`, { 
      headers: this.getHeaders(),
      // Force bypass cache
      observe: 'body',
      responseType: 'json'
    })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // Get NGO donation summary (aggregated stats)
  getNgoDonationSummary(): Observable<ApiResponse> {
    // Add cache-busting parameter to force fresh data
    const timestamp = new Date().getTime();
    return this.http.get<ApiResponse>(`${this.apiUrl}/ngo/dashboard/donations/summary?t=${timestamp}`, { 
      headers: this.getHeaders(),
      // Force bypass cache
      observe: 'body',
      responseType: 'json'
    })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // Update contribution status
  updateContributionStatus(contributionId: number, status: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.apiUrl}/ngo/dashboard/donations/${contributionId}/status`,
      { status },
      { headers: this.getHeaders() }
    )
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // ==================== NGO DASHBOARD ====================
  getNgoDashboard(): Observable<ApiResponse> {
    const headers = this.getHeaders();
    const token = localStorage.getItem('token');
    console.log('[API Service] getNgoDashboard - URL:', `${this.apiUrl}/ngo/dashboard`);
    console.log('[API Service] getNgoDashboard - Token exists:', !!token);
    console.log('[API Service] getNgoDashboard - Headers:', headers.keys());
    if (token) {
      console.log('[API Service] getNgoDashboard - Token preview:', token.substring(0, 20) + '...');
    }
    return this.http.get<ApiResponse>(`${this.apiUrl}/ngo/dashboard`, { headers })
      .pipe(
        map(res => {
          console.log('[API Service] getNgoDashboard - Raw Response:', JSON.stringify(res, null, 2));
          console.log('[API Service] getNgoDashboard - Response success:', res?.success);
          console.log('[API Service] getNgoDashboard - Response data:', res?.data);
          console.log('[API Service] getNgoDashboard - Response data.profile:', res?.data?.profile);
          // Don't normalize for dashboard - it doesn't have token/user at top level
          // The normalizeResponse might be moving data around incorrectly
          return res;
        }),
        catchError(err => {
          console.error('[API Service] getNgoDashboard - Error:', err);
          console.error('[API Service] getNgoDashboard - Error status:', err.status);
          console.error('[API Service] getNgoDashboard - Error message:', err.message);
          return this.handleError(err);
        })
      );
  }

  // NGO profile endpoints (complete dashboard routes expose profile as well)
  getNgoProfile(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/ngo/dashboard/profile`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  updateNgoProfile(data: { 
    name?: string; 
    contactInfo?: string; 
    contactPersonName?: string;
    phoneNumber?: string;
    aboutNgo?: string;
    websiteUrl?: string;
    logoUrl?: string;
    password?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    saveAsPending?: boolean;
  }): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/ngo/dashboard/profile`, data, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // ==================== PICKUPS ====================
  getNgoPickups(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/ngo/pickups`, { headers: this.getHeaders() });
  }

  updatePickupStatus(pickupId: string, status: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/ngo/pickups/${pickupId}/status`, { status }, { headers: this.getHeaders() });
  }

  // ==================== PAYMENTS ====================
  confirmPayment(data: { donationId: string; amount: number; donorProvidedReference?: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/payments/confirm`, data, { headers: this.getHeaders() });
  }

  getPayments(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/payments`, { headers: this.getHeaders() });
  }

  // ==================== ADMIN ====================
  adminLogin(email: string, password: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/admin/auth/login`, { email, password }, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  adminRegister(data: { name: string; email: string; password: string; contactInfo: string; securityCode: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/admin/auth/register`, data, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  adminVerifyOTPAndRegister(data: { name: string; email: string; password: string; contactInfo: string; securityCode: string; otp: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/admin/auth/verify-otp`, data, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // Admin Dashboard
  getAllNgos(params?: { isBlocked?: string; search?: string }): Observable<ApiResponse> {
    let url = `${this.apiUrl}/admin/dashboard/ngos`;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.isBlocked) queryParams.append('isBlocked', params.isBlocked);
      if (params.search) queryParams.append('search', params.search);
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
    }
    console.log('[API Service] getAllNgos - URL:', url);
    console.log('[API Service] getAllNgos - Headers:', this.getHeaders().keys());
    return this.http.get<ApiResponse>(url, { headers: this.getHeaders() })
      .pipe(
        map(res => {
          console.log('[API Service] getAllNgos - Raw Response:', res);
          return this.normalizeResponse(res);
        }),
        catchError(err => {
          console.error('[API Service] getAllNgos - Error:', err);
          return this.handleError(err);
        })
      );
  }

  getAllDonors(params?: { isBlocked?: string; search?: string }): Observable<ApiResponse> {
    let url = `${this.apiUrl}/admin/dashboard/donors`;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.isBlocked) queryParams.append('isBlocked', params.isBlocked);
      if (params.search) queryParams.append('search', params.search);
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
    }
    console.log('[API Service] getAllDonors - URL:', url);
    return this.http.get<ApiResponse>(url, { headers: this.getHeaders() })
      .pipe(
        map(res => {
          console.log('[API Service] getAllDonors - Raw Response:', res);
          return this.normalizeResponse(res);
        }),
        catchError(err => {
          console.error('[API Service] getAllDonors - Error:', err);
          return this.handleError(err);
        })
      );
  }

  getNgoDetails(id: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin/dashboard/ngos/${id}`, { headers: this.getHeaders() });
  }

  getDonorDetails(id: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin/dashboard/donors/${id}`, { headers: this.getHeaders() });
  }

  blockNgo(id: string, blockReason: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/admin/dashboard/ngos/${id}/block`, {
      blockReason,
    }, { headers: this.getHeaders() });
  }

  unblockNgo(id: string, unblockReason: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/admin/dashboard/ngos/${id}/unblock`, {
      unblockReason,
    }, { headers: this.getHeaders() });
  }

  blockDonor(id: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/dashboard/donors/${id}/block`, {}, { headers: this.getHeaders() });
  }

  unblockDonor(id: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/dashboard/donors/${id}/unblock`, {}, { headers: this.getHeaders() });
  }

  approveNgo(id: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/dashboard/ngos/${id}/approve`, {}, { headers: this.getHeaders() });
  }

  rejectNgo(id: string, rejectionReason: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/dashboard/ngos/${id}/reject`, { rejectionReason }, { headers: this.getHeaders() });
  }

  approveNgoProfileUpdate(id: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/dashboard/ngos/${id}/approve-profile-update`, {}, { headers: this.getHeaders() });
  }

  rejectNgoProfileUpdate(id: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/dashboard/ngos/${id}/reject-profile-update`, {}, { headers: this.getHeaders() });
  }

  // ==================== ADMIN DONOR MANAGEMENT ====================
  getAdminDonors(params?: { page?: number; limit?: number; search?: string }): Observable<ApiResponse> {
    let url = `${this.apiUrl}/admin/donors`;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
    }
    return this.http.get<ApiResponse>(url, { headers: this.getHeaders() });
  }

  getAdminContributions(params?: {
    donorId?: string;
    ngoId?: string;
    donationType?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }): Observable<ApiResponse> {
    let url = `${this.apiUrl}/admin/contributions`;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.donorId) queryParams.append('donorId', params.donorId);
      if (params.ngoId) queryParams.append('ngoId', params.ngoId);
      if (params.donationType) queryParams.append('donationType', params.donationType);
      if (params.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params.toDate) queryParams.append('toDate', params.toDate);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
    }
    return this.http.get<ApiResponse>(url, { headers: this.getHeaders() });
  }

  getAdminDonorContributions(donorId: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin/contributions/${donorId}`, { headers: this.getHeaders() });
  }

  getAdminAnalytics(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin/analytics`, { headers: this.getHeaders() });
  }

  // ==================== EMAIL TEMPLATES ====================
  getEmailTemplate(templateType: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin/email-templates/${templateType}`, { headers: this.getHeaders() });
  }

  updateEmailTemplate(templateType: string, subject: string, bodyHtml: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/email-templates/${templateType}`, {
      subject,
      bodyHtml,
    }, { headers: this.getHeaders() });
  }

  restoreDefaultEmailTemplate(templateType: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/admin/email-templates/${templateType}/restore-default`, {}, { headers: this.getHeaders() });
  }

  // ==================== ERROR HANDLING ====================
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Normalizes API responses so token and user are available at top-level
   * Backend wraps payload under `data` (e.g. { success: true, message, data: { token, user } })
   * Also handles admin responses which have `admin` field instead of `user`
   * NOTE: For dashboard responses, we should NOT normalize as they have different structure
   */
  private normalizeResponse(res: ApiResponse): ApiResponse {
    // If backend nested token/user/admin inside data, lift them to top-level
    const dataAny: any = (res as any).data;
    
    // Only normalize if data contains token/user/admin (auth responses)
    // Dashboard responses have data.profile, data.statistics, etc. - don't normalize those
    if (dataAny && (dataAny.token || dataAny.user || dataAny.admin) && !dataAny.profile && !dataAny.statistics) {
      // Handle admin responses - convert admin to user for consistency
      const userData = dataAny.user || dataAny.admin;
      
      return {
        success: res.success,
        message: res.message,
        token: dataAny.token || res.token,
        user: userData,
        admin: dataAny.admin, // Keep admin field for admin-specific components
        data: dataAny
      };
    }
    
    // Also handle direct admin field at top level (not nested in data)
    if ((res as any).admin) {
      return {
        ...res,
        user: (res as any).admin, // Also set as user for consistency
      };
    }
    
    // For dashboard responses, return as-is
    return res;
  }

  // ==================== LEADERBOARD ====================
  /**
   * Get leaderboard
   * @param params type: 'donors' | 'ngos', sortBy: 'count' | 'amount', period: 'all' | 'monthly' | 'weekly'
   */
  getLeaderboard(params?: { type?: 'donors' | 'ngos'; sortBy?: 'count' | 'amount'; period?: 'all' | 'monthly' | 'weekly' }): Observable<ApiResponse> {
    let url = `${this.apiUrl}/leaderboard`;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.type) queryParams.append('type', params.type);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.period) queryParams.append('period', params.period);
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    // Leaderboard is public - no auth required
    return this.http.get<ApiResponse>(url)
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // ==================== NOTIFICATIONS ====================
  /**
   * Get notifications for logged-in user
   * @param params limit: number, unreadOnly: boolean
   */
  getNotifications(params?: { limit?: number; unreadOnly?: boolean }): Observable<ApiResponse> {
    let url = `${this.apiUrl}/notifications`;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.unreadOnly) queryParams.append('unreadOnly', params.unreadOnly.toString());
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return this.http.get<ApiResponse>(url, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId: number): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/notifications/${notificationId}/read`, {}, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  /**
   * Mark all notifications as read
   */
  markAllNotificationsAsRead(): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/notifications/read-all`, {}, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/notifications/${notificationId}`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // ==================== BLOGS ====================
  /**
   * Get all blogs (public)
   */
  getBlogs(params?: { category?: string; search?: string }): Observable<ApiResponse> {
    let url = `${this.apiUrl}/blogs`;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.category) queryParams.append('category', params.category);
      if (params.search) queryParams.append('search', params.search);
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
    }
    return this.http.get<ApiResponse>(url, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  /**
   * Get blog by ID (public)
   */
  getBlogById(id: number): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/blogs/${id}`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  /**
   * Create blog (NGO only)
   */
  createBlog(blogData: FormData): Observable<ApiResponse> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token && { Authorization: `Bearer ${token}` })
      // Don't set Content-Type for FormData - browser will set it with boundary
    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/blogs`, blogData, { headers })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  /**
   * Get my blogs (NGO only)
   */
  getMyBlogs(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/blogs/my-blogs`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  /**
   * Update blog (NGO only - own blogs)
   */
  updateBlog(id: number, blogData: FormData): Observable<ApiResponse> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token && { Authorization: `Bearer ${token}` })
      // Don't set Content-Type for FormData - browser will set it with boundary
    });
    return this.http.put<ApiResponse>(`${this.apiUrl}/blogs/${id}`, blogData, { headers })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  /**
   * Delete blog (NGO only - own blogs)
   */
  deleteBlog(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/blogs/${id}`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // ==================== SLIDERS ====================
  /**
   * Get all sliders (public - active only)
   */
  getSliders(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/sliders`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  /**
   * Get all sliders including inactive (Admin only)
   */
  getSlidersAdmin(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/sliders/all`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  /**
   * Create slider (Admin only)
   */
  createSlider(sliderData: FormData): Observable<ApiResponse> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token && { Authorization: `Bearer ${token}` })
    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/sliders`, sliderData, { headers })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  /**
   * Update slider (Admin only)
   */
  updateSlider(id: number, sliderData: FormData | any): Observable<ApiResponse> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(sliderData instanceof FormData ? {} : { 'Content-Type': 'application/json' })
    });
    return this.http.put<ApiResponse>(`${this.apiUrl}/sliders/${id}`, sliderData, { headers })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  /**
   * Delete slider (Admin only)
   */
  deleteSlider(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/sliders/${id}`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }
}

