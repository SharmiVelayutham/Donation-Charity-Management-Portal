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
  private apiUrl = (window as any).__env?.apiUrl || environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    });
  }

  register(data: { name: string; email: string; password: string; role: 'DONOR' | 'NGO'; contactInfo: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/register`, data, { headers: this.getHeaders() })
      .pipe(
        map(res => {


          const normalized = this.normalizeResponse(res);

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
    return this.http.get<ApiResponse>(url, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  getDonationById(id: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/donations/${id}`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }


  createDonationRequest(formData: FormData): Observable<ApiResponse> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token && { Authorization: `Bearer ${token}` })

    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/donation-requests`, formData, { headers })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

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

  getDonationRequestById(id: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/donation-requests/${id}`)
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

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

  getMyDonationRequests(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/donation-requests/my-requests`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

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

      })
    })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  getNgoDonations(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/ngo/donations`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  updateNgoDonation(id: string, data: any): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/ngo/donations/${id}`, data, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  deleteNgoDonation(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/ngo/donations/${id}`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  createContribution(donationId: string, data: {
    notes?: string;
    pickupScheduledDateTime: string;
    donorAddress: string;
    donorContactNumber: string;
  }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/contributions/${donationId}`, data, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  getContributions(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/contributions`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  getDonorDashboard(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/donor/dashboard`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

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


  getNgoDashboardStats(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/ngo/dashboard-stats`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  getDonorDashboardStats(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/donor/dashboard/stats`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  downloadReceipt(contributionId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/donor/dashboard/donation-request-contributions/${contributionId}/receipt`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    })
      .pipe(
        catchError(err => this.handleError(err))
      );
  }

  getDonorDonationRequestContributions(): Observable<ApiResponse> {

    const timestamp = new Date().getTime();
    return this.http.get<ApiResponse>(`${this.apiUrl}/donor/dashboard/donation-request-contributions?t=${timestamp}`, { 
      headers: this.getHeaders(),

      observe: 'body',
      responseType: 'json'
    })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  getNgoDonationDetails(): Observable<ApiResponse> {

    const timestamp = new Date().getTime();
    return this.http.get<ApiResponse>(`${this.apiUrl}/ngo/dashboard/donations/details?t=${timestamp}`, { 
      headers: this.getHeaders(),

      observe: 'body',
      responseType: 'json'
    })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  getNgoDonationSummary(): Observable<ApiResponse> {

    const timestamp = new Date().getTime();
    return this.http.get<ApiResponse>(`${this.apiUrl}/ngo/dashboard/donations/summary?t=${timestamp}`, { 
      headers: this.getHeaders(),

      observe: 'body',
      responseType: 'json'
    })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

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

  getNgoDashboard(): Observable<ApiResponse> {
    const headers = this.getHeaders();
    const token = localStorage.getItem('token');

    console.debug('[API Service] getNgoDashboard - URL:', `${this.apiUrl}/ngo/dashboard`);
    console.debug('[API Service] getNgoDashboard - Token present:', !!token);
    console.debug('[API Service] getNgoDashboard - Headers keys:', headers.keys());
    return this.http.get<ApiResponse>(`${this.apiUrl}/ngo/dashboard`, { headers })
      .pipe(
        map(res => {

          console.debug('[API Service] getNgoDashboard - Response received');
          return res;
        }),
        catchError(err => {
          console.error('[API Service] getNgoDashboard - Error:');
          console.error('[API Service] getNgoDashboard - Error status:', err?.status);
          console.error('[API Service] getNgoDashboard - Error message:', err?.message || err);
          return this.handleError(err);
        })
      );
  }

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

  getNgoPickups(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/ngo/pickups`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  updatePickupStatus(pickupId: string, status: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/ngo/pickups/${pickupId}/status`, { status }, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  confirmPayment(data: { donationId: string; amount: number; donorProvidedReference?: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/payments/confirm`, data, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  getPayments(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/payments`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

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

  getAllNgos(params?: { isBlocked?: string; search?: string }): Observable<ApiResponse> {
    let url = `${this.apiUrl}/admin/dashboard/ngos`;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.isBlocked) queryParams.append('isBlocked', params.isBlocked);
      if (params.search) queryParams.append('search', params.search);
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
    }
    console.debug('[API Service] getAllNgos - URL:', url);
    console.debug('[API Service] getAllNgos - Headers keys:', this.getHeaders().keys());
    return this.http.get<ApiResponse>(url, { headers: this.getHeaders() })
      .pipe(
        map(res => {
          console.debug('[API Service] getAllNgos - Response received');
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
    console.debug('[API Service] getAllDonors - URL:', url);
    return this.http.get<ApiResponse>(url, { headers: this.getHeaders() })
      .pipe(
        map(res => {
          console.debug('[API Service] getAllDonors - Response received');
          return this.normalizeResponse(res);
        }),
        catchError(err => {
          console.error('[API Service] getAllDonors - Error:', err);
          return this.handleError(err);
        })
      );
  }

  getNgoDetails(id: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin/dashboard/ngos/${id}`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  getDonorDetails(id: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin/dashboard/donors/${id}`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  blockNgo(id: string, blockReason: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/admin/dashboard/ngos/${id}/block`, {
      blockReason,
    }, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  unblockNgo(id: string, unblockReason: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/admin/dashboard/ngos/${id}/unblock`, {
      unblockReason,
    }, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  blockDonor(id: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/dashboard/donors/${id}/block`, {}, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  unblockDonor(id: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/dashboard/donors/${id}/unblock`, {}, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  approveNgo(id: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/dashboard/ngos/${id}/approve`, {}, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  rejectNgo(id: string, rejectionReason: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/dashboard/ngos/${id}/reject`, { rejectionReason }, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  approveNgoProfileUpdate(id: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/dashboard/ngos/${id}/approve-profile-update`, {}, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  rejectNgoProfileUpdate(id: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/dashboard/ngos/${id}/reject-profile-update`, {}, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  getAdminDonors(params?: { page?: number; limit?: number; search?: string }): Observable<ApiResponse> {
    let url = `${this.apiUrl}/admin/donors`;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
    }
    return this.http.get<ApiResponse>(url, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
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
    return this.http.get<ApiResponse>(url, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  getAdminDonorContributions(donorId: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin/contributions/${donorId}`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  getAdminAnalytics(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin/analytics`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  getEmailTemplate(templateType: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin/email-templates/${templateType}`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  updateEmailTemplate(templateType: string, subject: string, bodyHtml: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/email-templates/${templateType}`, {
      subject,
      bodyHtml,
    }, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  restoreDefaultEmailTemplate(templateType: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/admin/email-templates/${templateType}/restore-default`, {}, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  private handleError(error: any): Observable<never> {

    if (error.error || error.status) {
      console.error('[API Service] Error details:', {
        status: error.status,
        message: error.error?.message || error.message,
        url: error.url,
      });
    } else {
      console.error('[API Service] Network or unknown error:', error);
    }

    let errorMessage = 'Something went wrong. Please try again.';
    
    if (error.error?.message) {

      errorMessage = error.error.message;
    } else if (error.message) {

      if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        errorMessage = error.message;
      }
    } else if (error.status === 0) {

      errorMessage = 'Unable to connect to server. Please check your connection.';
    } else if (error.status === 401) {
      errorMessage = 'Your session has expired. Please log in again.';
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to perform this action.';
    } else if (error.status === 404) {
      errorMessage = 'The requested resource was not found.';
    } else if (error.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.status >= 400) {
      errorMessage = 'Invalid request. Please check your input and try again.';
    }

    return throwError(() => new Error(errorMessage));
  }
  private normalizeResponse(res: ApiResponse): ApiResponse {

    const dataAny: any = (res as any).data;


    if (dataAny && (dataAny.token || dataAny.user || dataAny.admin) && !dataAny.profile && !dataAny.statistics) {

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

    if ((res as any).admin) {
      return {
        ...res,
        user: (res as any).admin, // Also set as user for consistency
      };
    }

    return res;
  }
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

    return this.http.get<ApiResponse>(url)
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }
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
  markNotificationAsRead(notificationId: number): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/notifications/${notificationId}/read`, {}, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }
  markAllNotificationsAsRead(): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/notifications/read-all`, {}, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }
  deleteNotification(notificationId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/notifications/${notificationId}`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }
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
  getBlogById(id: number): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/blogs/${id}`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }
  createBlog(blogData: FormData): Observable<ApiResponse> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token && { Authorization: `Bearer ${token}` })

    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/blogs`, blogData, { headers })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }
  getMyBlogs(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/blogs/my-blogs`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }
  updateBlog(id: number, blogData: FormData): Observable<ApiResponse> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token && { Authorization: `Bearer ${token}` })

    });
    return this.http.put<ApiResponse>(`${this.apiUrl}/blogs/${id}`, blogData, { headers })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }
  deleteBlog(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/blogs/${id}`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }
  getSliders(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/sliders`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }
  getSlidersAdmin(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/sliders/all`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }
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
  deleteSlider(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/sliders/${id}`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }

  // Platform stats for home banner
  getPlatformStats(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/platform/stats`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => this.handleError(err))
      );
  }
}

