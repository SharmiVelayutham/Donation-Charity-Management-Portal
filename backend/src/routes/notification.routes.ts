import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '../controllers/notification.controller';

const router = Router();
router.get('/', authenticate, getNotifications);
router.put('/:id/read', authenticate, markNotificationAsRead);
router.put('/read-all', authenticate, markAllNotificationsAsRead);
router.delete('/:id', authenticate, deleteNotification);

export default router;

