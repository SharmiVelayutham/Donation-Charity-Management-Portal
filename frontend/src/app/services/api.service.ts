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

  verifyOTPAndRegister(data: { name: string; email: string; password: string; role: 'DONOR' | 'NGO'; contactInfo: string; otp: string }): Observable<ApiResponse> {
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

  // ==================== NGO DASHBOARD ====================
  getNgoDashboard(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/ngo/dashboard`, { headers: this.getHeaders() });
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
    password?: string 
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

  adminRegister(data: { name: string; email: string; password: string; contactInfo: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/admin/auth/register`, data, { headers: this.getHeaders() })
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
    return this.http.get<ApiResponse>(url, { headers: this.getHeaders() });
  }

  getAllDonors(params?: { isBlocked?: string; search?: string }): Observable<ApiResponse> {
    let url = `${this.apiUrl}/admin/dashboard/donors`;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.isBlocked) queryParams.append('isBlocked', params.isBlocked);
      if (params.search) queryParams.append('search', params.search);
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
    }
    return this.http.get<ApiResponse>(url, { headers: this.getHeaders() });
  }

  getNgoDetails(id: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin/dashboard/ngos/${id}`, { headers: this.getHeaders() });
  }

  getDonorDetails(id: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin/dashboard/donors/${id}`, { headers: this.getHeaders() });
  }

  blockNgo(id: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/dashboard/ngos/${id}/block`, {}, { headers: this.getHeaders() });
  }

  unblockNgo(id: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/dashboard/ngos/${id}/unblock`, {}, { headers: this.getHeaders() });
  }

  blockDonor(id: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/dashboard/donors/${id}/block`, {}, { headers: this.getHeaders() });
  }

  unblockDonor(id: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/dashboard/donors/${id}/unblock`, {}, { headers: this.getHeaders() });
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
   */
  private normalizeResponse(res: ApiResponse): ApiResponse {
    // If backend nested token/user inside data, lift them to top-level
    const dataAny: any = (res as any).data;
    if (dataAny && (dataAny.token || dataAny.user)) {
      return {
        success: res.success,
        message: res.message,
        token: dataAny.token,
        user: dataAny.user,
        data: dataAny
      };
    }
    return res;
  }
}

