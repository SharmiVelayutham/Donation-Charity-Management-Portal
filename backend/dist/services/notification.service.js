"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSystemErrorNotification = exports.sendDonorDonationEmail = exports.notifyAdminOnDonation = exports.notifyNgoOnDonation = exports.notifyAdminOnDonorRegistration = exports.notifyAdminOnNgoRegistration = exports.notifyNgoOnDonorRegistration = exports.createAndEmitNotification = exports.createNotification = void 0;
const mysql_1 = require("../config/mysql");
const socket_server_1 = require("../socket/socket.server");
const email_service_1 = require("../utils/email.service");
const email_template_service_1 = require("../utils/email-template.service");
const createNotification = async (data) => {
    try {
        const notificationId = await (0, mysql_1.insert)(`INSERT INTO notifications 
       (user_id, user_type, title, message, type, related_entity_type, related_entity_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            data.userId,
            data.userType,
            data.title,
            data.message,
            data.type,
            data.relatedEntityType || null,
            data.relatedEntityId || null,
            data.metadata ? JSON.stringify(data.metadata) : null
        ]);
        return notificationId;
    }
    catch (error) {
        console.error('[Notification Service] Error creating notification:', error);
        throw error;
    }
};
exports.createNotification = createNotification;
const createAndEmitNotification = async (data) => {
    try {
        const notificationId = await (0, exports.createNotification)(data);
        if (data.userType === 'NGO') {
            (0, socket_server_1.emitToNgo)(data.userId, 'notification:new', {
                id: notificationId,
                ...data,
                createdAt: new Date().toISOString()
            });
        }
        else if (data.userType === 'ADMIN') {
            (0, socket_server_1.emitToAdmin)('notification:new', {
                id: notificationId,
                ...data,
                createdAt: new Date().toISOString()
            });
        }
        else if (data.userType === 'DONOR') {
            (0, socket_server_1.emitToDonor)(data.userId, 'notification:new', {
                id: notificationId,
                ...data,
                createdAt: new Date().toISOString()
            });
        }
        return notificationId;
    }
    catch (error) {
        console.error('[Notification Service] Error creating and emitting notification:', error);
        throw error;
    }
};
exports.createAndEmitNotification = createAndEmitNotification;
const notifyNgoOnDonorRegistration = async (donorId, donorName, donorEmail) => {
    try {
        const ngos = await (0, mysql_1.query)('SELECT id, name, email FROM users WHERE role = "NGO"');
        for (const ngo of ngos) {
            await (0, exports.createAndEmitNotification)({
                userId: ngo.id,
                userType: 'NGO',
                title: 'New Donor Registration',
                message: `${donorName} (${donorEmail}) has registered as a new donor`,
                type: 'REGISTRATION',
                relatedEntityType: 'donor',
                relatedEntityId: donorId,
                metadata: { donorName, donorEmail }
            });
        }
    }
    catch (error) {
        console.error('[Notification Service] Error notifying NGOs on donor registration:', error);
    }
};
exports.notifyNgoOnDonorRegistration = notifyNgoOnDonorRegistration;
const notifyAdminOnNgoRegistration = async (ngoId, ngoName, ngoEmail) => {
    try {
        const admins = await (0, mysql_1.query)('SELECT id, name, email FROM admins');
        for (const admin of admins) {
            await (0, exports.createAndEmitNotification)({
                userId: admin.id,
                userType: 'ADMIN',
                title: 'New NGO Registration',
                message: `${ngoName} (${ngoEmail}) has registered as a new NGO and requires verification`,
                type: 'REGISTRATION',
                relatedEntityType: 'ngo',
                relatedEntityId: ngoId,
                metadata: { ngoName, ngoEmail }
            });
        }
    }
    catch (error) {
        console.error('[Notification Service] Error notifying admin on NGO registration:', error);
    }
};
exports.notifyAdminOnNgoRegistration = notifyAdminOnNgoRegistration;
const notifyAdminOnDonorRegistration = async (donorId, donorName, donorEmail) => {
    try {
        const admins = await (0, mysql_1.query)('SELECT id, name, email FROM admins');
        for (const admin of admins) {
            await (0, exports.createAndEmitNotification)({
                userId: admin.id,
                userType: 'ADMIN',
                title: 'New Donor Registration',
                message: `${donorName} (${donorEmail}) has registered as a new donor`,
                type: 'REGISTRATION',
                relatedEntityType: 'donor',
                relatedEntityId: donorId,
                metadata: { donorName, donorEmail }
            });
        }
    }
    catch (error) {
        console.error('[Notification Service] Error notifying admin on donor registration:', error);
    }
};
exports.notifyAdminOnDonorRegistration = notifyAdminOnDonorRegistration;
const notifyNgoOnDonation = async (ngoId, donorId, donorName, donorEmail, donationType, amount, contributionId) => {
    try {
        await (0, exports.createAndEmitNotification)({
            userId: ngoId,
            userType: 'NGO',
            title: 'New Donation Received',
            message: `${donorName} has contributed ${donationType === 'FUNDS' ? `₹${amount.toLocaleString('en-IN')}` : `${amount} ${donationType}`} to your request`,
            type: 'DONATION',
            relatedEntityType: 'contribution',
            relatedEntityId: contributionId,
            metadata: { donorName, donorEmail, donationType, amount, contributionId }
        });
        const ngo = await (0, mysql_1.query)('SELECT name, email FROM users WHERE id = ?', [ngoId]);
        if (ngo && ngo.length > 0) {
            try {
                const template = await (0, email_template_service_1.getEmailTemplate)('NGO_DONATION_RECEIVED');
                const amountDisplay = donationType === 'FUNDS' ? `₹${amount.toLocaleString('en-IN')}` : amount.toString();
                const emailSubject = (0, email_template_service_1.replaceTemplatePlaceholders)(template.subject, {
                    DONOR_NAME: donorName
                });
                const emailBody = (0, email_template_service_1.replaceTemplatePlaceholders)(template.bodyHtml, {
                    NGO_NAME: ngo[0].name,
                    DONOR_NAME: donorName,
                    DONOR_EMAIL: donorEmail,
                    DONATION_TYPE: donationType,
                    AMOUNT_OR_QUANTITY: amountDisplay
                });
                await (0, email_service_1.sendEmail)({
                    to: ngo[0].email,
                    subject: emailSubject,
                    html: emailBody
                });
            }
            catch (emailError) {
                console.error('[Notification Service] Failed to send email to NGO:', emailError);
            }
        }
    }
    catch (error) {
        console.error('[Notification Service] Error notifying NGO on donation:', error);
    }
};
exports.notifyNgoOnDonation = notifyNgoOnDonation;
const notifyAdminOnDonation = async (donorId, donorName, ngoName, donationType, amount, contributionId) => {
    try {
        const admins = await (0, mysql_1.query)('SELECT id, name, email FROM admins');
        for (const admin of admins) {
            await (0, exports.createAndEmitNotification)({
                userId: admin.id,
                userType: 'ADMIN',
                title: 'New Donation Activity',
                message: `${donorName} has donated ${donationType === 'FUNDS' ? `₹${amount.toLocaleString('en-IN')}` : `${amount} ${donationType}`} to ${ngoName}`,
                type: 'DONATION',
                relatedEntityType: 'contribution',
                relatedEntityId: contributionId,
                metadata: { donorName, ngoName, donationType, amount, contributionId }
            });
        }
    }
    catch (error) {
        console.error('[Notification Service] Error notifying admin on donation:', error);
    }
};
exports.notifyAdminOnDonation = notifyAdminOnDonation;
const sendDonorDonationEmail = async (donorEmail, donorName, ngoName, donationType, amount) => {
    try {
        const template = await (0, email_template_service_1.getEmailTemplate)('DONOR_DONATION_CONFIRMATION');
        const amountDisplay = donationType === 'FUNDS' ? `₹${amount.toLocaleString('en-IN')}` : amount.toString();
        const emailSubject = (0, email_template_service_1.replaceTemplatePlaceholders)(template.subject, {
            NGO_NAME: ngoName
        });
        const emailBody = (0, email_template_service_1.replaceTemplatePlaceholders)(template.bodyHtml, {
            DONOR_NAME: donorName,
            NGO_NAME: ngoName,
            DONATION_TYPE: donationType,
            AMOUNT_OR_QUANTITY: amountDisplay
        });
        await (0, email_service_1.sendEmail)({
            to: donorEmail,
            subject: emailSubject,
            html: emailBody
        });
    }
    catch (error) {
        console.error('[Notification Service] Failed to send donation email to donor:', error);
    }
};
exports.sendDonorDonationEmail = sendDonorDonationEmail;
const createSystemErrorNotification = async (userType, userId, errorMessage, context) => {
    try {
        await (0, exports.createAndEmitNotification)({
            userId,
            userType,
            title: 'System Error',
            message: `An error occurred: ${errorMessage}${context ? ` (${context})` : ''}`,
            type: 'ERROR',
            relatedEntityType: 'system',
            metadata: { errorMessage, context, timestamp: new Date().toISOString() }
        });
    }
    catch (error) {
        console.error('[Notification Service] Error creating system error notification:', error);
    }
};
exports.createSystemErrorNotification = createSystemErrorNotification;
