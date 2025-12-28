import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { query, queryOne, update } from '../config/mysql';
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.user!.id);
    const userRole = req.user!.role;
    let userType: 'NGO' | 'ADMIN' | 'DONOR';
    if (userRole === 'NGO') {
      userType = 'NGO';
    } else if (userRole === 'ADMIN') {
      userType = 'ADMIN';
    } else {
      userType = 'DONOR';
    }

    const { limit = 50, unreadOnly = false } = req.query;

    let sql = `
      SELECT id, title, message, type, is_read, related_entity_type, related_entity_id, 
             metadata, created_at, read_at
      FROM notifications
      WHERE user_id = ? AND user_type = ?
    `;
    const params: any[] = [userId, userType];

    if (unreadOnly === 'true') {
      sql += ' AND is_read = FALSE';
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit as string) || 50);

    const notifications = await query<any>(sql, params);
    const formattedNotifications = notifications.map((notif: any) => ({
      id: notif.id,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      isRead: notif.is_read === 1 || notif.is_read === true,
      relatedEntityType: notif.related_entity_type,
      relatedEntityId: notif.related_entity_id,
      metadata: notif.metadata ? JSON.parse(notif.metadata) : null,
      createdAt: notif.created_at,
      readAt: notif.read_at
    }));
    const unreadCountResult = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND user_type = ? AND is_read = FALSE',
      [userId, userType]
    );

    return sendSuccess(res, {
      notifications: formattedNotifications,
      unreadCount: unreadCountResult?.count || 0,
      totalCount: notifications.length
    }, 'Notifications fetched successfully');
  } catch (error: any) {
    console.error('[Notification Controller] Error fetching notifications:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch notifications'
    });
  }
};
export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.user!.id);
    const userRole = req.user!.role;
    const notificationId = parseInt(req.params.id);

    if (isNaN(notificationId)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }
    let userType: 'NGO' | 'ADMIN' | 'DONOR';
    if (userRole === 'NGO') {
      userType = 'NGO';
    } else if (userRole === 'ADMIN') {
      userType = 'ADMIN';
    } else {
      userType = 'DONOR';
    }
    const notification = await queryOne<any>(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ? AND user_type = ?',
      [notificationId, userId, userType]
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    await update(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ?',
      [notificationId]
    );

    return sendSuccess(res, { id: notificationId }, 'Notification marked as read');
  } catch (error: any) {
    console.error('[Notification Controller] Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark notification as read'
    });
  }
};
export const markAllNotificationsAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.user!.id);
    const userRole = req.user!.role;
    let userType: 'NGO' | 'ADMIN' | 'DONOR';
    if (userRole === 'NGO') {
      userType = 'NGO';
    } else if (userRole === 'ADMIN') {
      userType = 'ADMIN';
    } else {
      userType = 'DONOR';
    }
    const result = await update(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND user_type = ? AND is_read = FALSE',
      [userId, userType]
    );

    return sendSuccess(res, { affectedRows: result.affectedRows }, 'All notifications marked as read');
  } catch (error: any) {
    console.error('[Notification Controller] Error marking all notifications as read:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark all notifications as read'
    });
  }
};
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.user!.id);
    const userRole = req.user!.role;
    const notificationId = parseInt(req.params.id);

    if (isNaN(notificationId)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }
    let userType: 'NGO' | 'ADMIN' | 'DONOR';
    if (userRole === 'NGO') {
      userType = 'NGO';
    } else if (userRole === 'ADMIN') {
      userType = 'ADMIN';
    } else {
      userType = 'DONOR';
    }
    const notification = await queryOne<any>(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ? AND user_type = ?',
      [notificationId, userId, userType]
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    await update('DELETE FROM notifications WHERE id = ?', [notificationId]);

    return sendSuccess(res, { id: notificationId }, 'Notification deleted');
  } catch (error: any) {
    console.error('[Notification Controller] Error deleting notification:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete notification'
    });
  }
};

