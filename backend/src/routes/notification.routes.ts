import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '../controllers/notification.controller';

const router = Router();

/**
 * Notification Routes
 * All routes require authentication
 */

// Get notifications for logged-in user
router.get('/', authenticate, getNotifications);

// Mark notification as read
router.put('/:id/read', authenticate, markNotificationAsRead);

// Mark all notifications as read
router.put('/read-all', authenticate, markAllNotificationsAsRead);

// Delete notification
router.delete('/:id', authenticate, deleteNotification);

export default router;

