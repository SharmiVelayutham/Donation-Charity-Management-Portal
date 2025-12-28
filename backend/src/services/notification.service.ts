import { query, insert, update } from '../config/mysql';
import { emitToNgo, emitToAdmin, emitToDonor } from '../socket/socket.server';
import { sendEmail } from '../utils/email.service';
import { getEmailTemplate, replaceTemplatePlaceholders, getSupportEmail } from '../utils/email-template.service';

export interface NotificationData {
  userId: number;
  userType: 'NGO' | 'ADMIN' | 'DONOR';
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DONATION' | 'REGISTRATION' | 'SYSTEM';
  relatedEntityType?: string;
  relatedEntityId?: number;
  metadata?: any;
}
export const createNotification = async (data: NotificationData): Promise<number> => {
  try {
    const notificationId = await insert(
      `INSERT INTO notifications 
       (user_id, user_type, title, message, type, related_entity_type, related_entity_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.userId,
        data.userType,
        data.title,
        data.message,
        data.type,
        data.relatedEntityType || null,
        data.relatedEntityId || null,
        data.metadata ? JSON.stringify(data.metadata) : null
      ]
    );
    return notificationId;
  } catch (error: any) {
    console.error('[Notification Service] Error creating notification:', error);
    throw error;
  }
};
export const createAndEmitNotification = async (data: NotificationData): Promise<number> => {
  try {
    const notificationId = await createNotification(data);
    if (data.userType === 'NGO') {
      emitToNgo(data.userId, 'notification:new', {
        id: notificationId,
        ...data,
        createdAt: new Date().toISOString()
      });
    } else if (data.userType === 'ADMIN') {
      emitToAdmin('notification:new', {
        id: notificationId,
        ...data,
        createdAt: new Date().toISOString()
      });
    } else if (data.userType === 'DONOR') {
      emitToDonor(data.userId, 'notification:new', {
        id: notificationId,
        ...data,
        createdAt: new Date().toISOString()
      });
    }
    
    return notificationId;
  } catch (error: any) {
    console.error('[Notification Service] Error creating and emitting notification:', error);
    throw error;
  }
};
export const notifyNgoOnDonorRegistration = async (donorId: number, donorName: string, donorEmail: string): Promise<void> => {
  try {
    const ngos = await query<any>('SELECT id, name, email FROM users WHERE role = "NGO"');
    
    for (const ngo of ngos) {
      await createAndEmitNotification({
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
  } catch (error: any) {
    console.error('[Notification Service] Error notifying NGOs on donor registration:', error);
  }
};
export const notifyAdminOnNgoRegistration = async (ngoId: number, ngoName: string, ngoEmail: string): Promise<void> => {
  try {
    const admins = await query<any>('SELECT id, name, email FROM admins');
    
    for (const admin of admins) {
      await createAndEmitNotification({
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
  } catch (error: any) {
    console.error('[Notification Service] Error notifying admin on NGO registration:', error);
  }
};
export const notifyAdminOnDonorRegistration = async (donorId: number, donorName: string, donorEmail: string): Promise<void> => {
  try {
    const admins = await query<any>('SELECT id, name, email FROM admins');
    
    for (const admin of admins) {
      await createAndEmitNotification({
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
  } catch (error: any) {
    console.error('[Notification Service] Error notifying admin on donor registration:', error);
  }
};
export const notifyNgoOnDonation = async (
  ngoId: number,
  donorId: number,
  donorName: string,
  donorEmail: string,
  donationType: string,
  amount: number,
  contributionId: number
): Promise<void> => {
  try {
    await createAndEmitNotification({
      userId: ngoId,
      userType: 'NGO',
      title: 'New Donation Received',
      message: `${donorName} has contributed ${donationType === 'FUNDS' ? `₹${amount.toLocaleString('en-IN')}` : `${amount} ${donationType}`} to your request`,
      type: 'DONATION',
      relatedEntityType: 'contribution',
      relatedEntityId: contributionId,
      metadata: { donorName, donorEmail, donationType, amount, contributionId }
    });
    const ngo = await query<any>('SELECT name, email FROM users WHERE id = ?', [ngoId]);
    if (ngo && ngo.length > 0) {
      try {
        const template = await getEmailTemplate('NGO_DONATION_RECEIVED');
        const amountDisplay = donationType === 'FUNDS' ? `₹${amount.toLocaleString('en-IN')}` : amount.toString();
        
        const emailSubject = replaceTemplatePlaceholders(template.subject, {
          DONOR_NAME: donorName
        });
        
        const emailBody = replaceTemplatePlaceholders(template.bodyHtml, {
          NGO_NAME: ngo[0].name,
          DONOR_NAME: donorName,
          DONOR_EMAIL: donorEmail,
          DONATION_TYPE: donationType,
          AMOUNT_OR_QUANTITY: amountDisplay
        });
        
        await sendEmail({
          to: ngo[0].email,
          subject: emailSubject,
          html: emailBody
        });
      } catch (emailError) {
        console.error('[Notification Service] Failed to send email to NGO:', emailError);
      }
    }
  } catch (error: any) {
    console.error('[Notification Service] Error notifying NGO on donation:', error);
  }
};
export const notifyAdminOnDonation = async (
  donorId: number,
  donorName: string,
  ngoName: string,
  donationType: string,
  amount: number,
  contributionId: number
): Promise<void> => {
  try {
    const admins = await query<any>('SELECT id, name, email FROM admins');
    
    for (const admin of admins) {
      await createAndEmitNotification({
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
  } catch (error: any) {
    console.error('[Notification Service] Error notifying admin on donation:', error);
  }
};
export const sendDonorDonationEmail = async (
  donorEmail: string,
  donorName: string,
  ngoName: string,
  donationType: string,
  amount: number
): Promise<void> => {
  try {
    const template = await getEmailTemplate('DONOR_DONATION_CONFIRMATION');
    const amountDisplay = donationType === 'FUNDS' ? `₹${amount.toLocaleString('en-IN')}` : amount.toString();
    
    const emailSubject = replaceTemplatePlaceholders(template.subject, {
      NGO_NAME: ngoName
    });
    
    const emailBody = replaceTemplatePlaceholders(template.bodyHtml, {
      DONOR_NAME: donorName,
      NGO_NAME: ngoName,
      DONATION_TYPE: donationType,
      AMOUNT_OR_QUANTITY: amountDisplay
    });
    
    await sendEmail({
      to: donorEmail,
      subject: emailSubject,
      html: emailBody
    });
  } catch (error: any) {
    console.error('[Notification Service] Failed to send donation email to donor:', error);
  }
};
export const createSystemErrorNotification = async (
  userType: 'NGO' | 'ADMIN',
  userId: number,
  errorMessage: string,
  context?: string
): Promise<void> => {
  try {
    await createAndEmitNotification({
      userId,
      userType,
      title: 'System Error',
      message: `An error occurred: ${errorMessage}${context ? ` (${context})` : ''}`,
      type: 'ERROR',
      relatedEntityType: 'system',
      metadata: { errorMessage, context, timestamp: new Date().toISOString() }
    });
  } catch (error: any) {
    console.error('[Notification Service] Error creating system error notification:', error);
  }
};

