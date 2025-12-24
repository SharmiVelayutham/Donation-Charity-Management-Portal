import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  constructor() {}

  /**
   * Connect to Socket.IO server
   */
  connect(token: string): void {
    if (this.isConnected && this.socket) {
      console.log('[Socket] Already connected');
      return;
    }

    const apiUrl = environment.apiUrl.replace('/api', '');
    
    this.socket = io(apiUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('[Socket] Connection error:', error);
      this.isConnected = false;
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('[Socket] Disconnected');
    }
  }

  /**
   * Subscribe to NGO stats updates
   */
  onNgoStatsUpdate(callback: (stats: { totalDonationRequests: number; totalDonors: number }) => void): void {
    if (!this.socket) {
      console.error('[Socket] Not connected. Call connect() first.');
      return;
    }

    this.socket.on('ngo:stats:updated', (data: { totalDonationRequests: number; totalDonors: number }) => {
      console.log('[Socket] NGO stats updated:', data);
      callback(data);
    });
  }

  /**
   * Subscribe to Donor stats updates
   */
  onDonorStatsUpdate(callback: (stats: { totalDonations: number }) => void): void {
    if (!this.socket) {
      console.error('[Socket] Not connected. Call connect() first.');
      return;
    }

    this.socket.on('donor:stats:updated', (data: { totalDonations: number }) => {
      console.log('[Socket] Donor stats updated:', data);
      callback(data);
    });
  }

  /**
   * Unsubscribe from NGO stats updates
   */
  offNgoStatsUpdate(): void {
    if (this.socket) {
      this.socket.off('ngo:stats:updated');
    }
  }

  /**
   * Unsubscribe from Donor stats updates
   */
  offDonorStatsUpdate(): void {
    if (this.socket) {
      this.socket.off('donor:stats:updated');
    }
  }

  /**
   * Subscribe to donation created events (for NGO)
   */
  onDonationCreated(callback: (donation: any) => void): void {
    if (!this.socket) {
      console.error('[Socket] Not connected. Call connect() first.');
      return;
    }

    this.socket.on('donation:created', (data: any) => {
      console.log('[Socket] New donation created:', data);
      callback(data);
    });
  }

  /**
   * Unsubscribe from donation created events
   */
  offDonationCreated(): void {
    if (this.socket) {
      this.socket.off('donation:created');
    }
  }

  /**
   * Check if socket is connected
   */
  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

