"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.getNotifications = void 0;
const response_1 = require("../utils/response");
const mysql_1 = require("../config/mysql");
const getNotifications = async (req, res) => {
    try {
        const userId = parseInt(req.user.id);
        const userRole = req.user.role;
        let userType;
        if (userRole === 'NGO') {
            userType = 'NGO';
        }
        else if (userRole === 'ADMIN') {
            userType = 'ADMIN';
        }
        else {
            userType = 'DONOR';
        }
        const { limit = 50, unreadOnly = false } = req.query;
        let sql = `
      SELECT id, title, message, type, is_read, related_entity_type, related_entity_id, 
             metadata, created_at, read_at
      FROM notifications
      WHERE user_id = ? AND user_type = ?
    `;
        const params = [userId, userType];
        if (unreadOnly === 'true') {
            sql += ' AND is_read = FALSE';
        }
        sql += ' ORDER BY created_at DESC LIMIT ?';
        params.push(parseInt(limit) || 50);
        const notifications = await (0, mysql_1.query)(sql, params);
        const formattedNotifications = notifications.map((notif) => ({
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
        const unreadCountResult = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND user_type = ? AND is_read = FALSE', [userId, userType]);
        return (0, response_1.sendSuccess)(res, {
            notifications: formattedNotifications,
            unreadCount: (unreadCountResult === null || unreadCountResult === void 0 ? void 0 : unreadCountResult.count) || 0,
            totalCount: notifications.length
        }, 'Notifications fetched successfully');
    }
    catch (error) {
        console.error('[Notification Controller] Error fetching notifications:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch notifications'
        });
    }
};
exports.getNotifications = getNotifications;
const markNotificationAsRead = async (req, res) => {
    try {
        const userId = parseInt(req.user.id);
        const userRole = req.user.role;
        const notificationId = parseInt(req.params.id);
        if (isNaN(notificationId)) {
            return res.status(400).json({ success: false, message: 'Invalid notification ID' });
        }
        let userType;
        if (userRole === 'NGO') {
            userType = 'NGO';
        }
        else if (userRole === 'ADMIN') {
            userType = 'ADMIN';
        }
        else {
            userType = 'DONOR';
        }
        const notification = await (0, mysql_1.queryOne)('SELECT id FROM notifications WHERE id = ? AND user_id = ? AND user_type = ?', [notificationId, userId, userType]);
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        await (0, mysql_1.update)('UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ?', [notificationId]);
        return (0, response_1.sendSuccess)(res, { id: notificationId }, 'Notification marked as read');
    }
    catch (error) {
        console.error('[Notification Controller] Error marking notification as read:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to mark notification as read'
        });
    }
};
exports.markNotificationAsRead = markNotificationAsRead;
const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = parseInt(req.user.id);
        const userRole = req.user.role;
        let userType;
        if (userRole === 'NGO') {
            userType = 'NGO';
        }
        else if (userRole === 'ADMIN') {
            userType = 'ADMIN';
        }
        else {
            userType = 'DONOR';
        }
        const result = await (0, mysql_1.update)('UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND user_type = ? AND is_read = FALSE', [userId, userType]);
        return (0, response_1.sendSuccess)(res, { affectedRows: result.affectedRows }, 'All notifications marked as read');
    }
    catch (error) {
        console.error('[Notification Controller] Error marking all notifications as read:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to mark all notifications as read'
        });
    }
};
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
const deleteNotification = async (req, res) => {
    try {
        const userId = parseInt(req.user.id);
        const userRole = req.user.role;
        const notificationId = parseInt(req.params.id);
        if (isNaN(notificationId)) {
            return res.status(400).json({ success: false, message: 'Invalid notification ID' });
        }
        let userType;
        if (userRole === 'NGO') {
            userType = 'NGO';
        }
        else if (userRole === 'ADMIN') {
            userType = 'ADMIN';
        }
        else {
            userType = 'DONOR';
        }
        const notification = await (0, mysql_1.queryOne)('SELECT id FROM notifications WHERE id = ? AND user_id = ? AND user_type = ?', [notificationId, userId, userType]);
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        await (0, mysql_1.update)('DELETE FROM notifications WHERE id = ?', [notificationId]);
        return (0, response_1.sendSuccess)(res, { id: notificationId }, 'Notification deleted');
    }
    catch (error) {
        console.error('[Notification Controller] Error deleting notification:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete notification'
        });
    }
};
exports.deleteNotification = deleteNotification;
