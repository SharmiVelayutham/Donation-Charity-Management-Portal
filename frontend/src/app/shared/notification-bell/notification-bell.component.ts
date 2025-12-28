import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../services/api.service';
import { SocketService } from '../../services/socket.service';
import { lastValueFrom } from 'rxjs';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DONATION' | 'REGISTRATION' | 'SYSTEM';
  isRead: boolean;
  relatedEntityType?: string;
  relatedEntityId?: number;
  metadata?: any;
  createdAt: string;
  readAt?: string;
}

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatBadgeModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule
  ],
  template: `
    <button mat-icon-button [matMenuTriggerFor]="notificationMenu" (click)="loadNotifications()">
      <mat-icon [matBadge]="unreadCount" [matBadgeHidden]="unreadCount === 0" matBadgeColor="warn" matBadgeSize="small">
        notifications
      </mat-icon>
    </button>

    <mat-menu #notificationMenu="matMenu" class="notification-menu">
      <div class="notification-header">
        <h3>Notifications</h3>
        <div class="notification-actions">
          <button mat-icon-button (click)="markAllAsRead()" *ngIf="unreadCount > 0" title="Mark all as read">
            <mat-icon>done_all</mat-icon>
          </button>
        </div>
      </div>
      
      <div class="notification-list" *ngIf="!isLoading && notifications.length > 0">
        <div 
          *ngFor="let notification of notifications" 
          class="notification-item"
          [class.unread]="!notification.isRead"
          [class.type-donation]="notification.type === 'DONATION'"
          [class.type-registration]="notification.type === 'REGISTRATION'"
          [class.type-error]="notification.type === 'ERROR'"
          (click)="markAsRead(notification.id)"
        >
          <div class="notification-icon">
            <mat-icon *ngIf="notification.type === 'DONATION'">volunteer_activism</mat-icon>
            <mat-icon *ngIf="notification.type === 'REGISTRATION'">person_add</mat-icon>
            <mat-icon *ngIf="notification.type === 'ERROR'">error</mat-icon>
            <mat-icon *ngIf="notification.type === 'SUCCESS'">check_circle</mat-icon>
            <mat-icon *ngIf="notification.type === 'WARNING'">warning</mat-icon>
            <mat-icon *ngIf="notification.type === 'INFO' || notification.type === 'SYSTEM'">info</mat-icon>
          </div>
          <div class="notification-content">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-message">{{ notification.message }}</div>
            <div class="notification-time">{{ formatTime(notification.createdAt) }}</div>
          </div>
          <button 
            mat-icon-button 
            class="notification-delete"
            (click)="deleteNotification(notification.id, $event)"
            title="Delete notification"
          >
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>
      
      <div class="notification-empty" *ngIf="!isLoading && notifications.length === 0">
        <mat-icon>notifications_none</mat-icon>
        <p>No notifications</p>
      </div>
      
      <div class="notification-loading" *ngIf="isLoading">
        <mat-icon class="spinning">refresh</mat-icon>
        <p>Loading notifications...</p>
      </div>
    </mat-menu>
  `,
  styles: [`
    .notification-menu {
      width: 400px;
      max-width: 90vw;
      max-height: 500px;
      padding: 0;
    }
    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    .notification-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    }
    .notification-actions {
      display: flex;
      gap: 8px;
    }
    .notification-list {
      max-height: 400px;
      overflow-y: auto;
    }
    .notification-item {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      transition: background-color 0.2s;
      position: relative;
    }
    .notification-item:hover {
      background-color: #f8fafc;
    }
    .notification-item.unread {
      background-color: #eff6ff;
      border-left: 3px solid #3b82f6;
    }
    .notification-item.type-donation {
      border-left-color: #10b981;
    }
    .notification-item.type-registration {
      border-left-color: #3b82f6;
    }
    .notification-item.type-error {
      border-left-color: #ef4444;
    }
    .notification-icon {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f1f5f9;
    }
    .notification-item.type-donation .notification-icon {
      background-color: #d1fae5;
      color: #10b981;
    }
    .notification-item.type-registration .notification-icon {
      background-color: #dbeafe;
      color: #3b82f6;
    }
    .notification-item.type-error .notification-icon {
      background-color: #fee2e2;
      color: #ef4444;
    }
    .notification-content {
      flex: 1;
      min-width: 0;
    }
    .notification-title {
      font-weight: 600;
      font-size: 14px;
      color: #1f2937;
      margin-bottom: 4px;
    }
    .notification-message {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 4px;
      line-height: 1.4;
    }
    .notification-time {
      font-size: 11px;
      color: #94a3b8;
    }
    .notification-delete {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .notification-item:hover .notification-delete {
      opacity: 1;
    }
    .notification-empty,
    .notification-loading {
      padding: 40px 20px;
      text-align: center;
      color: #94a3b8;
    }
    .notification-empty mat-icon,
    .notification-loading mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
      opacity: 0.5;
    }
    .spinning {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  @Input() userRole: 'NGO' | 'ADMIN' | 'DONOR' = 'DONOR';
  
  notifications: Notification[] = [];
  unreadCount: number = 0;
  isLoading: boolean = false;
  private socketSubscription: (() => void) | null = null;

  constructor(
    private apiService: ApiService,
    private socketService: SocketService
  ) {}

  ngOnInit() {
    this.setupSocketConnection();
    this.loadNotifications();
  }

  ngOnDestroy() {
    if (this.socketSubscription && typeof this.socketSubscription === 'function') {
      this.socketSubscription();
    }
  }

  setupSocketConnection() {
    this.socketSubscription = this.socketService.onNotification((notification: Notification) => {
      this.notifications.unshift(notification);
      if (!notification.isRead) {
        this.unreadCount++;
      }
    });
  }

  async loadNotifications() {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.apiService.getNotifications({ limit: 20 }));
      if (response?.success && response.data) {
        this.notifications = response.data.notifications || [];
        this.unreadCount = response.data.unreadCount || 0;
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async markAsRead(notificationId: number) {
    try {
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        
        await lastValueFrom(this.apiService.markNotificationAsRead(notificationId));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead() {
    if (this.unreadCount === 0) return;
    
    try {
      await lastValueFrom(this.apiService.markAllNotificationsAsRead());
      this.notifications.forEach(n => n.isRead = true);
      this.unreadCount = 0;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  async deleteNotification(notificationId: number, event: Event) {
    event.stopPropagation();
    try {
      await lastValueFrom(this.apiService.deleteNotification(notificationId));
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification && !notification.isRead) {
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
      this.notifications = this.notifications.filter(n => n.id !== notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
}

