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
  connect(token: string): void {
    if (this.isConnected && this.socket) {
      console.debug('[Socket] Already connected');
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
      console.debug('[Socket] Connected to server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.debug('[Socket] Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('[Socket] Connection error');
      this.isConnected = false;
    });
  }
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.debug('[Socket] Disconnected');
    }
  }
  onNgoStatsUpdate(callback: (stats: { totalDonationRequests: number; totalDonors: number }) => void): void {
    if (!this.socket) {
      console.error('[Socket] Not connected. Call connect() first.');
      return;
    }

    this.socket.on('ngo:stats:updated', (data: { totalDonationRequests: number; totalDonors: number }) => {
      console.debug('[Socket] NGO stats updated');
      callback(data);
    });
  }
  onDonorStatsUpdate(callback: (stats: { totalDonations: number }) => void): void {
    if (!this.socket) {
      console.error('[Socket] Not connected. Call connect() first.');
      return;
    }

    this.socket.on('donor:stats:updated', (data: { totalDonations: number }) => {
      console.debug('[Socket] Donor stats updated');
      callback(data);
    });
  }
  offNgoStatsUpdate(): void {
    if (this.socket) {
      this.socket.off('ngo:stats:updated');
    }
  }
  onNotification(callback: (notification: any) => void): () => void {
    if (!this.socket) {
      console.error('[Socket] Not connected. Call connect() first.');
      return () => {};
    }

    this.socket.on('notification:new', (data: any) => {
      console.debug('[Socket] New notification received');
      callback(data);
    });
    return () => {
      if (this.socket) {
        this.socket.off('notification:new');
      }
    };
  }
  onContributionStatusUpdate(callback: (data: { contributionId: number; status: string; message: string }) => void): void {
    if (!this.socket) {
      console.error('[Socket] Not connected. Call connect() first.');
      return;
    }

    this.socket.on('contribution:status-updated', (data: { contributionId: number; status: string; message: string }) => {
      console.debug('[Socket] Contribution status updated');
      callback(data);
    });
  }
  offContributionStatusUpdate(): void {
    if (this.socket) {
      this.socket.off('contribution:status-updated');
    }
  }
  offDonorStatsUpdate(): void {
    if (this.socket) {
      this.socket.off('donor:stats:updated');
    }
  }
  onDonationCreated(callback: (donation: any) => void): void {
    if (!this.socket) {
      console.error('[Socket] Not connected. Call connect() first.');
      return;
    }

    this.socket.on('donation:created', (data: any) => {
      console.debug('[Socket] New donation created');
      callback(data);
    });
  }
  offDonationCreated(): void {
    if (this.socket) {
      this.socket.off('donation:created');
    }
  }
  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

